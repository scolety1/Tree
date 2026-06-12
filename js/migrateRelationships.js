import { db } from "./firebase.js?v=20260612-emulator-qa";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { watchAuth } from "./auth.js?v=20260612-4";
import {
  buildFullName,
  getAllPeople,
  getCurrentFamilyId,
  getDisplayName,
  normalizeNamePart,
} from "./helpers.js?v=20260612-4";

const previewBtn = document.getElementById("previewMigrationBtn");
const applyBtn = document.getElementById("applyMigrationBtn");
const statusEl = document.getElementById("migrationStatus");
const resultsEl = document.getElementById("migrationResults");

let migrationPlan = [];
let currentFamilyId = null;
let currentUser = null;
let currentFamilyIsOwnedByUser = false;

function setStatus(message, tone = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("is-loading", tone === "loading");
  statusEl.classList.toggle("is-success", tone === "success");
  statusEl.classList.toggle("is-error", tone === "error");
}

function setControls({ canPreview = false, canApply = false } = {}) {
  if (previewBtn) previewBtn.disabled = !canPreview;
  if (applyBtn) applyBtn.disabled = !canApply;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getExplicitFamilyId() {
  return getCurrentFamilyId(false);
}

async function verifyOwnerAccess(user = currentUser, familyId = currentFamilyId) {
  if (!user || !familyId) return false;

  const familySnap = await getDoc(doc(db, "families", familyId));
  return familySnap.exists() && familySnap.data().ownerId === user.uid;
}

function findMatchesByName(name, people) {
  const cleanName = normalizeNamePart(name);
  if (!cleanName) return [];
  return people.filter(person => buildFullName(person.firstName, person.lastName) === cleanName);
}

function addResolvedRelationship({ label, name, people, targetIds, issues }) {
  if (!name) return;

  const matches = findMatchesByName(name, people);

  if (matches.length === 1) {
    const match = matches[0];
    if (!targetIds.includes(match.id)) {
      targetIds.push(match.id);
    }
    return;
  }

  if (matches.length > 1) {
    issues.push(`${label}: multiple matches for "${name}"`);
    return;
  }

  issues.push(`${label}: no match for "${name}"`);
}

function analyzePerson(person, people) {
  const parentIds = Array.isArray(person.parentIds) ? [...person.parentIds] : [];
  const spouseIds = Array.isArray(person.spouseIds) ? [...person.spouseIds] : [];
  const issues = [];

  addResolvedRelationship({
    label: "Parent 1",
    name: person.parent1,
    people,
    targetIds: parentIds,
    issues,
  });

  addResolvedRelationship({
    label: "Parent 2",
    name: person.parent2,
    people,
    targetIds: parentIds,
    issues,
  });

  addResolvedRelationship({
    label: "Spouse",
    name: buildFullName(person.spouseFirstName, person.spouseLastName),
    people,
    targetIds: spouseIds,
    issues,
  });

  const update = {};
  const existingParentIds = Array.isArray(person.parentIds) ? person.parentIds : [];
  const existingSpouseIds = Array.isArray(person.spouseIds) ? person.spouseIds : [];

  if (parentIds.length && parentIds.some(id => !existingParentIds.includes(id))) {
    update.parentIds = [...new Set(parentIds)];
  }

  if (spouseIds.length && spouseIds.some(id => !existingSpouseIds.includes(id))) {
    update.spouseIds = [...new Set(spouseIds)];
  }

  return {
    person,
    update,
    issues,
    safeToApply: Object.keys(update).length > 0 && issues.length === 0,
  };
}

function renderPlan(plan) {
  if (!resultsEl) return;
  resultsEl.replaceChildren();

  if (!plan.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No people found in this family tree.";
    resultsEl.appendChild(emptyMessage);
    return;
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Person", "Status", "Planned Update", "Notes"].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  plan.forEach(item => {
    const updateParts = [];
    if (item.update.parentIds) updateParts.push(`${item.update.parentIds.length} parent ID(s)`);
    if (item.update.spouseIds) updateParts.push(`${item.update.spouseIds.length} spouse ID(s)`);

    const status = item.safeToApply
      ? "Ready"
      : item.issues.length
        ? "Needs review"
        : "Already migrated";

    const row = document.createElement("tr");
    [
      getDisplayName(item.person),
      status,
      updateParts.join(", ") || "No update needed",
      item.issues.join("; ") || "None",
    ].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  tableWrap.appendChild(table);
  resultsEl.appendChild(tableWrap);
}

async function initializeOwnerGate(user) {
  currentUser = user || null;
  currentFamilyId = getExplicitFamilyId();
  currentFamilyIsOwnedByUser = false;
  migrationPlan = [];
  if (resultsEl) resultsEl.replaceChildren();
  setControls();

  if (!previewBtn || !applyBtn) return;

  if (!currentFamilyId) {
    setStatus("Open this tool with a familyId query parameter.", "error");
    return;
  }

  if (!currentUser) {
    setStatus("Sign in as the family tree owner before running a migration.", "error");
    return;
  }

  setStatus("Checking owner access...", "loading");

  try {
    currentFamilyIsOwnedByUser = await verifyOwnerAccess();
  } catch (error) {
    console.error("Error checking migration owner access:", error);
    setStatus("Only the tree owner can run this migration.", "error");
    return;
  }

  if (!currentFamilyIsOwnedByUser) {
    setStatus("Only the tree owner can run this migration.", "error");
    return;
  }

  setControls({ canPreview: true });
  setStatus("Owner verified. Preview the migration when ready.", "success");
}

async function previewMigration() {
  setControls();
  migrationPlan = [];
  if (resultsEl) resultsEl.replaceChildren();

  if (!currentFamilyId || !currentUser) {
    await initializeOwnerGate(currentUser);
    return;
  }

  setStatus("Loading family members for preview...", "loading");

  try {
    currentFamilyIsOwnedByUser = await verifyOwnerAccess();
    if (!currentFamilyIsOwnedByUser) {
      setStatus("Only the tree owner can run this migration.", "error");
      return;
    }

    const people = await getAllPeople(currentFamilyId);
    migrationPlan = people.map(person => analyzePerson(person, people));
    const safeCount = migrationPlan.filter(item => item.safeToApply).length;
    const reviewCount = migrationPlan.filter(item => item.issues.length > 0).length;

    renderPlan(migrationPlan);
    setControls({ canPreview: true, canApply: safeCount > 0 });
    setStatus(`${safeCount} safe update(s) ready. ${reviewCount} record(s) need manual review.`, "success");
  } catch (error) {
    console.error("Error previewing migration:", error);
    setControls({ canPreview: currentFamilyIsOwnedByUser });
    setStatus("Could not preview migration.", "error");
  }
}

async function applyMigration() {
  const safeUpdates = migrationPlan.filter(item => item.safeToApply);

  if (!currentFamilyId || !safeUpdates.length || !currentFamilyIsOwnedByUser) {
    setStatus("Preview safe updates before applying anything.", "error");
    return;
  }

  const confirmed = confirm(`Apply ${safeUpdates.length} safe relationship update(s)?`);
  if (!confirmed) return;

  setControls();
  setStatus("Confirming owner access before writing...", "loading");

  try {
    currentFamilyIsOwnedByUser = await verifyOwnerAccess();
    if (!currentFamilyIsOwnedByUser) {
      setStatus("Only the tree owner can run this migration.", "error");
      return;
    }

    setStatus("Applying migration updates...", "loading");
    await Promise.all(safeUpdates.map(item =>
      updateDoc(doc(db, "people", item.person.id), item.update)
    ));

    setStatus("Migration updates applied. Preview again to confirm everything is clean.", "success");
    setControls({ canPreview: true });
    migrationPlan = [];
  } catch (error) {
    console.error("Error applying migration:", error);
    setControls({ canPreview: currentFamilyIsOwnedByUser, canApply: safeUpdates.length > 0 });
    setStatus("Could not apply migration updates.", "error");
  }
}

if (previewBtn && applyBtn) {
  setControls();
  watchAuth(initializeOwnerGate);
  previewBtn.addEventListener("click", previewMigration);
  applyBtn.addEventListener("click", applyMigration);
}
