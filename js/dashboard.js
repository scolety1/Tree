import { db } from "./firebase.js?v=20260612-4";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  arrayRemove,
  arrayUnion,
  deleteField,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { watchAuth } from "./auth.js?v=20260612-4";
import {
  ACCESS_CODE_LENGTH,
  canEditFamily,
  generateAccessCode,
  getAllPeople,
  getFamilyRole,
  getStoredFamilyId,
  isDeletedPerson,
  normalizeRelationshipIds,
  setFamilyId,
} from "./helpers.js?v=20260612-4";
import {
  STARTER_TREE_ID,
  STARTER_TREE_NAME,
} from "./starterTree.js?v=20260612-4";

const listEl = document.getElementById("familyTreeList");
const archivedTreesSectionEl = document.getElementById("archivedTreesSection");
const archivedTreesListEl = document.getElementById("archivedTreesList");
const archivedTreesStatusEl = document.getElementById("archivedTreesStatus");
const removedPeopleSectionEl = document.getElementById("removedPeopleSection");
const removedPeopleListEl = document.getElementById("removedPeopleList");
const removedPeopleStatusEl = document.getElementById("removedPeopleStatus");
const statusEl = document.getElementById("dashboardStatus");
let currentUser = null;

function formatDate(value) {
  if (!value || typeof value.toDate !== "function") return "";
  return value.toDate().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function setStatus(message, tone = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("is-loading", tone === "loading");
  statusEl.classList.toggle("is-error", tone === "error");
  statusEl.classList.toggle("is-success", tone === "success");
}

function setRemovedPeopleStatus(message, tone = "") {
  if (!removedPeopleStatusEl) return;
  removedPeopleStatusEl.textContent = message;
  removedPeopleStatusEl.classList.toggle("is-loading", tone === "loading");
  removedPeopleStatusEl.classList.toggle("is-error", tone === "error");
  removedPeopleStatusEl.classList.toggle("is-success", tone === "success");
}

function resetRemovedPeopleSection() {
  if (removedPeopleSectionEl) removedPeopleSectionEl.hidden = true;
  if (removedPeopleListEl) removedPeopleListEl.replaceChildren();
  setRemovedPeopleStatus("");
}

function setArchivedTreesStatus(message, tone = "") {
  if (!archivedTreesStatusEl) return;
  archivedTreesStatusEl.textContent = message;
  archivedTreesStatusEl.classList.toggle("is-loading", tone === "loading");
  archivedTreesStatusEl.classList.toggle("is-error", tone === "error");
  archivedTreesStatusEl.classList.toggle("is-success", tone === "success");
}

function resetArchivedTreesSection() {
  if (archivedTreesSectionEl) archivedTreesSectionEl.hidden = true;
  if (archivedTreesListEl) archivedTreesListEl.replaceChildren();
  setArchivedTreesStatus("");
}

function getRoleLabel(role) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  if (role === "viewer" || role === "member") return "Viewer";
  return "Guest";
}

function getMemberRole(tree, memberId) {
  if (memberId === tree.ownerId) return "owner";
  return tree.memberRoles?.[memberId] === "editor" ? "editor" : "viewer";
}

function getTreeInviteUrl(tree) {
  const origin = window.location.origin || "";
  return `${origin}/#joinTreeFormCard`;
}

function hasMeaningfulBio(person) {
  const bio = String(person?.bio || "").trim();
  if (!bio) return false;
  const lowerBio = bio.toLowerCase();
  return !(
    lowerBio.startsWith("starter profile") ||
    lowerBio.includes("placeholder") ||
    lowerBio.includes("for testing")
  );
}

function hasBirthDate(person) {
  return Boolean(person?.birthDate && typeof person.birthDate.toDate === "function");
}

function hasProfilePhoto(person) {
  return Boolean(String(person?.image || "").trim());
}

function hasRelationshipData(person, linkedPersonIds) {
  return Boolean(
    normalizeRelationshipIds(person?.parentIds).length > 0 ||
    normalizeRelationshipIds(person?.spouseIds).length > 0 ||
    person?.parent1 ||
    person?.parent2 ||
    person?.spouse ||
    linkedPersonIds.has(person.id)
  );
}

function getPersonDisplayName(person) {
  const firstName = String(person?.firstName || "").trim();
  const lastName = String(person?.lastName || "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name || person?.id || "Unnamed person";
}

function normalizeHealthText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function createHealthIssue(label, detail, severity = "warning") {
  return { label, detail, severity };
}

function summarizeRelationshipHealth(people) {
  const idToPerson = new Map();
  const issues = [];

  people.forEach(person => {
    if (person?.id && !idToPerson.has(person.id)) {
      idToPerson.set(person.id, person);
    }
  });

  people.forEach(person => {
    const name = getPersonDisplayName(person);
    const parentIds = normalizeRelationshipIds(person.parentIds);
    const spouseIds = normalizeRelationshipIds(person.spouseIds);

    if (typeof person.parentIds === "string") {
      issues.push(createHealthIssue("Legacy parent IDs", `${name} stores parent IDs as text. The app can read it, but saving this profile will modernize it.`));
    }

    if (typeof person.spouseIds === "string") {
      issues.push(createHealthIssue("Legacy spouse IDs", `${name} stores spouse IDs as text. The app can read it, but saving this profile will modernize it.`));
    }

    parentIds.forEach(parentId => {
      if (parentId === person.id) {
        issues.push(createHealthIssue("Self parent link", `${name} lists themselves as a parent.`, "error"));
      } else if (!idToPerson.has(parentId)) {
        issues.push(createHealthIssue("Missing parent", `${name} points to missing parent ID ${parentId}.`, "error"));
      }
    });

    spouseIds.forEach(spouseId => {
      if (spouseId === person.id) {
        issues.push(createHealthIssue("Self spouse link", `${name} lists themselves as spouse/partner.`, "error"));
        return;
      }

      const spouse = idToPerson.get(spouseId);
      if (!spouse) {
        issues.push(createHealthIssue("Missing spouse", `${name} points to missing spouse ID ${spouseId}.`, "error"));
        return;
      }

      if (!normalizeRelationshipIds(spouse.spouseIds).includes(person.id)) {
        issues.push(createHealthIssue(
          "One-way spouse link",
          `${name} lists ${getPersonDisplayName(spouse)}, but ${getPersonDisplayName(spouse)} does not list them back.`
        ));
      }
    });

    if (parentIds.length > 2) {
      issues.push(createHealthIssue("Many parents", `${name} has ${parentIds.length} parent links. Confirm this is intentional.`));
    }

    if (parentIds.length >= 2) {
      const knownParents = parentIds
        .map(parentId => idToPerson.get(parentId))
        .filter(Boolean);

      for (let i = 0; i < knownParents.length; i += 1) {
        for (let j = i + 1; j < knownParents.length; j += 1) {
          const parentA = knownParents[i];
          const parentB = knownParents[j];
          const parentASpouses = normalizeRelationshipIds(parentA.spouseIds);
          const parentBSpouses = normalizeRelationshipIds(parentB.spouseIds);

          if (!parentASpouses.includes(parentB.id) && !parentBSpouses.includes(parentA.id)) {
            issues.push(createHealthIssue(
              "Parent pair not linked",
              `${name} lists ${getPersonDisplayName(parentA)} and ${getPersonDisplayName(parentB)} as parents, but those parent profiles are not linked as spouses/partners.`
            ));
          }
        }
      }
    }
  });

  const linkedPersonIds = new Set();
  people.forEach(person => {
    normalizeRelationshipIds(person.parentIds).forEach(id => linkedPersonIds.add(id));
    normalizeRelationshipIds(person.spouseIds).forEach(id => linkedPersonIds.add(id));
  });

  const disconnected = people
    .filter(person => !hasRelationshipData(person, linkedPersonIds))
    .map(getPersonDisplayName);

  return {
    issues,
    disconnected,
    errorCount: issues.filter(issue => issue.severity === "error").length,
    warningCount: issues.filter(issue => issue.severity !== "error").length + disconnected.length,
  };
}

function getDuplicateTreeIssues(tree, allTrees) {
  if (!Array.isArray(allTrees) || allTrees.length <= 1) return [];

  const treeName = normalizeHealthText(tree.name);
  const sameNameTrees = allTrees.filter(other => (
    other.id !== tree.id &&
    treeName &&
    normalizeHealthText(other.name) === treeName
  ));

  const flaggedTrees = allTrees.filter(other => (
    other.id !== tree.id &&
    (other.starterTree || other.birthdayDemoTree) &&
    (tree.starterTree || tree.birthdayDemoTree)
  ));

  const issues = [];
  if (sameNameTrees.length > 0) {
    issues.push(createHealthIssue(
      "Similar family tree",
      `${sameNameTrees.length} other accessible tree${sameNameTrees.length === 1 ? "" : "s"} use the same name. Confirm you are opening the right one.`
    ));
  }

  if (flaggedTrees.length > 0) {
    issues.push(createHealthIssue(
      "Multiple primary trees",
      `${flaggedTrees.length} other accessible tree${flaggedTrees.length === 1 ? " is" : "s are"} marked as a primary birthday tree.`
    ));
  }

  return issues;
}

function createAccountHealthReport(tree, allTrees = []) {
  const people = tree.prepSummary?.people || [];
  const relationshipReport = summarizeRelationshipHealth(people);
  const duplicateTreeIssues = getDuplicateTreeIssues(tree, allTrees);
  const issues = [...duplicateTreeIssues, ...relationshipReport.issues];
  const warningCount = relationshipReport.warningCount + duplicateTreeIssues.length;

  return {
    peopleCount: people.length,
    issues,
    disconnected: relationshipReport.disconnected,
    errorCount: relationshipReport.errorCount,
    warningCount,
  };
}

function buildInviteMessage(tree, variant = "friendly") {
  const treeName = tree.name || "our family tree";
  const code = tree.joinCode || "";
  const joinUrl = getTreeInviteUrl(tree);

  if (variant === "short") {
    return `Join ${treeName}: go to ${joinUrl} and use access code ${code}.`;
  }

  return [
    `Hey! I made a private family tree for ${treeName}.`,
    "",
    `You can join here: ${joinUrl}`,
    `Access code: ${code}`,
    "",
    "Once you join, you can browse the tree and help fill in family details."
  ].join("\n");
}

function createChecklistItem({ label, detail, status = "todo", href = "" }) {
  const item = document.createElement(href ? "a" : "div");
  item.className = `birthday-prep-item is-${status}`;
  if (href) item.href = href;

  const marker = document.createElement("span");
  marker.className = "birthday-prep-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = status === "done" ? "Done" : status === "review" ? "Review" : "To do";
  item.appendChild(marker);

  const copy = document.createElement("span");
  copy.className = "birthday-prep-copy";

  const title = document.createElement("strong");
  title.textContent = label;
  copy.appendChild(title);

  const note = document.createElement("span");
  note.textContent = detail;
  copy.appendChild(note);

  item.appendChild(copy);
  return item;
}

function createBirthdayPrepChecklist(tree, isOwner) {
  if (!isOwner) return null;

  const prep = tree.prepSummary || {
    peopleCount: tree.peopleCount || 0,
    photoCount: 0,
    missingBirthdays: 0,
    missingBios: 0,
    missingRelationships: 0,
  };
  const peopleCount = prep.peopleCount || 0;
  const treeUrl = `/tree?familyId=${encodeURIComponent(tree.id)}`;
  const directoryUrl = `/search?familyId=${encodeURIComponent(tree.id)}`;

  const section = document.createElement("section");
  section.className = "birthday-prep-checklist";
  section.setAttribute("aria-labelledby", `birthday-prep-${tree.id}`);

  const header = document.createElement("div");
  header.className = "birthday-prep-header";

  const heading = document.createElement("h3");
  heading.id = `birthday-prep-${tree.id}`;
  heading.textContent = "Getting ready";
  header.appendChild(heading);

  const intro = document.createElement("p");
  intro.textContent = "A quick owner pass before sharing this tree with relatives.";
  header.appendChild(intro);
  section.appendChild(header);

  const list = document.createElement("div");
  list.className = "birthday-prep-list";

  list.appendChild(createChecklistItem({
    label: "Photos",
    detail: peopleCount
      ? prep.photoCount > 0
        ? `${prep.photoCount} profile${prep.photoCount === 1 ? "" : "s"} include profile images. Replace temporary avatars with real family photos whenever you have them.`
        : "No photos yet. The tree still works with initials until the family adds pictures."
      : "Add people first, then photos can come later.",
    status: peopleCount > 0 && prep.photoCount === peopleCount ? "done" : "todo",
    href: directoryUrl,
  }));

  list.appendChild(createChecklistItem({
    label: "Birthdays",
    detail: peopleCount === 0
      ? "Add people before birthday prep."
      : prep.missingBirthdays === 0
      ? "Every profile has a birthday."
      : `${prep.missingBirthdays} profile${prep.missingBirthdays === 1 ? "" : "s"} still need birthdays.`,
    status: peopleCount > 0 && prep.missingBirthdays === 0 ? "done" : "todo",
    href: directoryUrl,
  }));

  list.appendChild(createChecklistItem({
    label: "Stories",
    detail: peopleCount === 0
      ? "Add people before story prep."
      : prep.missingBios === 0
      ? "Every profile has a story note."
      : `${prep.missingBios} profile${prep.missingBios === 1 ? "" : "s"} could use a story or note.`,
    status: peopleCount > 0 && prep.missingBios === 0 ? "done" : "todo",
    href: directoryUrl,
  }));

  list.appendChild(createChecklistItem({
    label: "Relationships",
    detail: peopleCount === 0
      ? "Add people before relationship prep."
      : prep.missingRelationships === 0
      ? "All profiles are connected to the family map."
      : `${prep.missingRelationships} profile${prep.missingRelationships === 1 ? "" : "s"} may be disconnected.`,
    status: peopleCount > 0 && prep.missingRelationships === 0 ? "done" : "todo",
    href: treeUrl,
  }));

  list.appendChild(createChecklistItem({
    label: "Invite code",
    detail: tree.joinCode ? "Ready to copy for trusted relatives." : "Missing an invite code.",
    status: tree.joinCode ? "done" : "todo",
  }));

  section.appendChild(list);
  return section;
}

function createAccountHealthDetails(tree, isOwner) {
  if (!isOwner) return null;

  const report = tree.healthReport;
  if (!report) return null;

  const totalNotes = report.errorCount + report.warningCount;
  const details = document.createElement("details");
  details.className = "tree-health-details";

  const summary = document.createElement("summary");
  const label = document.createElement("span");
  label.textContent = "Tree data health";
  const note = document.createElement("small");
  note.textContent = totalNotes === 0
    ? "No relationship issues found"
    : `${totalNotes} ${totalNotes === 1 ? "note" : "notes"} to review`;
  summary.append(label, note);
  details.appendChild(summary);

  const intro = document.createElement("p");
  intro.className = "tree-health-note";
  intro.textContent = "Owner-only read-only check. Nothing changes here; use it to spot broken links, old relationship formats, or duplicate tree records before sharing.";
  details.appendChild(intro);

  const scoreList = document.createElement("div");
  scoreList.className = "tree-health-scores";
  [
    ["Errors", report.errorCount],
    ["Warnings", report.warningCount],
    ["People", report.peopleCount],
  ].forEach(([scoreLabel, value]) => {
    const score = document.createElement("span");
    score.className = "tree-health-score";
    const valueEl = document.createElement("strong");
    valueEl.textContent = String(value);
    const labelEl = document.createElement("small");
    labelEl.textContent = scoreLabel;
    score.append(valueEl, labelEl);
    scoreList.appendChild(score);
  });
  details.appendChild(scoreList);

  const issues = [
    ...report.issues,
    ...report.disconnected.map(name => createHealthIssue("Disconnected profile", `${name} is not connected to parents, spouse/partner, or children yet.`)),
  ];

  if (issues.length === 0) {
    const empty = document.createElement("p");
    empty.className = "tree-health-empty";
    empty.textContent = "This tree is in good shape for the current account checks.";
    details.appendChild(empty);
    return details;
  }

  const list = document.createElement("ul");
  list.className = "tree-health-list";
  issues.slice(0, 8).forEach(issue => {
    const item = document.createElement("li");
    item.className = `tree-health-issue is-${issue.severity === "error" ? "error" : "warning"}`;
    const issueLabel = document.createElement("strong");
    issueLabel.textContent = issue.label;
    const issueDetail = document.createElement("span");
    issueDetail.textContent = issue.detail;
    item.append(issueLabel, issueDetail);
    list.appendChild(item);
  });

  if (issues.length > 8) {
    const extra = document.createElement("li");
    extra.className = "tree-health-issue";
    extra.textContent = `+${issues.length - 8} more notes. Open the tree Data checks panel for a fuller review.`;
    list.appendChild(extra);
  }

  details.appendChild(list);
  return details;
}

async function generateAvailableJoinCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateAccessCode(ACCESS_CODE_LENGTH);
    const codeSnap = await getDoc(doc(db, "joinCodes", code));
    if (!codeSnap.exists()) return code;
  }

  throw new Error("Could not generate a unique join code.");
}

function createTreeCard(tree) {
  const article = document.createElement("article");
  article.className = "family-tree-card";
  article.dataset.familyId = tree.id;

  const createdAt = formatDate(tree.createdAt);
  const role = getFamilyRole(tree, { uid: tree.currentUserId });
  const isOwner = role === "owner" || tree.ownerId === tree.currentUserId;
  const canEdit = canEditFamily(tree, { uid: tree.currentUserId });
  const memberCount = tree.memberIds.length;
  const peopleCount = Number.isInteger(tree.peopleCount) ? tree.peopleCount : null;
  const memberProfiles = tree.memberProfiles || new Map();

  const form = document.createElement("form");
  form.className = "family-tree-edit-form";

  const nameLabel = document.createElement("label");
  nameLabel.append("Tree name");
  const nameInput = document.createElement("input");
  nameInput.name = "name";
  nameInput.placeholder = "e.g., Colety Family Tree";
  nameInput.value = tree.name || "Untitled Family Tree";
  nameInput.disabled = !isOwner;
  nameLabel.appendChild(nameInput);
  form.appendChild(nameLabel);

  const descriptionLabel = document.createElement("label");
  descriptionLabel.append("Description");
  const descriptionInput = document.createElement("textarea");
  descriptionInput.name = "description";
  descriptionInput.rows = 3;
  descriptionInput.placeholder = "Optional note about this branch of the family";
  descriptionInput.value = tree.description || "";
  descriptionInput.disabled = !isOwner;
  descriptionLabel.appendChild(descriptionInput);
  form.appendChild(descriptionLabel);

  if (isOwner) {
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "button family-tree-save-button";
    saveButton.textContent = "Save Changes";
    form.appendChild(saveButton);
  }

  article.appendChild(form);

  const detailsWrap = document.createElement("div");

  const meta = document.createElement("p");
  meta.className = "family-tree-meta";
  meta.textContent = [role ? `Your role: ${getRoleLabel(role)}` : "", createdAt ? `Created ${createdAt}` : ""]
    .filter(Boolean)
    .join(" ");
  detailsWrap.appendChild(meta);

  const accessMeta = document.createElement("p");
  accessMeta.className = "family-tree-meta";
  accessMeta.textContent = canEdit
    ? "Editing enabled for this account."
    : "View-only access for this account.";
  detailsWrap.appendChild(accessMeta);

  const membersMeta = document.createElement("p");
  membersMeta.className = "family-tree-meta";
  membersMeta.textContent = [
    `${memberCount} ${memberCount === 1 ? "member" : "members"}`,
    peopleCount == null ? "" : `${peopleCount} ${peopleCount === 1 ? "person" : "people"}`,
  ].filter(Boolean).join(" | ");
  detailsWrap.appendChild(membersMeta);

  if (isOwner && tree.joinCode) {
    const code = document.createElement("div");
    code.className = "family-tree-code invite-code-panel";

    const codeIntro = document.createElement("div");
    codeIntro.className = "invite-code-display";
    const codeLabel = document.createElement("span");
    codeLabel.className = "invite-code-label";
    codeLabel.textContent = "Invite code";
    codeIntro.appendChild(codeLabel);

    const codeText = document.createElement("strong");
    codeText.className = "join-code-text";
    codeText.textContent = tree.joinCode;
    codeText.setAttribute("aria-label", `Invite code ${tree.joinCode}`);
    codeIntro.appendChild(codeText);
    code.appendChild(codeIntro);

    const codeHelp = document.createElement("p");
    codeHelp.textContent = "Share this code with family members so they can join as viewers.";
    code.appendChild(codeHelp);

    const codeActions = document.createElement("div");
    codeActions.className = "invite-code-actions invite-code-primary-actions";
    codeActions.setAttribute("aria-label", "Invite code actions");

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "text-action copy-code-button";
    copyButton.textContent = "Copy Code";
    copyButton.setAttribute("aria-label", `Copy invite code for ${tree.name || "this family tree"}`);
    codeActions.appendChild(copyButton);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "text-action reset-code-button";
    resetButton.textContent = "Reset Code";
    resetButton.setAttribute("aria-label", `Reset invite code for ${tree.name || "this family tree"}`);
    codeActions.appendChild(resetButton);
    code.appendChild(codeActions);

    const resetConfirm = document.createElement("div");
    resetConfirm.className = "invite-code-confirm";
    resetConfirm.hidden = true;
    resetConfirm.setAttribute("role", "group");
    resetConfirm.setAttribute("aria-label", "Confirm invite code reset");

    const resetConfirmText = document.createElement("p");
    resetConfirmText.textContent = "Reset this invite code? The old code will stop working.";
    resetConfirm.appendChild(resetConfirmText);

    const resetConfirmActions = document.createElement("div");
    resetConfirmActions.className = "invite-code-confirm-actions";

    const cancelResetButton = document.createElement("button");
    cancelResetButton.type = "button";
    cancelResetButton.className = "text-action cancel-reset-code-button";
    cancelResetButton.textContent = "Cancel";
    resetConfirmActions.appendChild(cancelResetButton);

    const confirmResetButton = document.createElement("button");
    confirmResetButton.type = "button";
    confirmResetButton.className = "text-action confirm-reset-code-button";
    confirmResetButton.textContent = "Reset code";
    resetConfirmActions.appendChild(confirmResetButton);

    resetConfirm.appendChild(resetConfirmActions);
    code.appendChild(resetConfirm);

    const helper = document.createElement("details");
    helper.className = "invite-helper";
    const helperSummary = document.createElement("summary");
    helperSummary.textContent = "Invite message";
    helper.appendChild(helperSummary);

    const helperCopy = document.createElement("p");
    helperCopy.textContent = "Copy a ready-to-send message for relatives. It includes the private access code, so only send it to people you want in this tree.";
    helper.appendChild(helperCopy);

    const inviteTextarea = document.createElement("textarea");
    inviteTextarea.className = "invite-message-text";
    inviteTextarea.rows = 7;
    inviteTextarea.readOnly = true;
    inviteTextarea.value = buildInviteMessage(tree, "friendly");
    inviteTextarea.setAttribute("aria-label", `Invite message for ${tree.name || "this family tree"}`);
    helper.appendChild(inviteTextarea);

    const helperActions = document.createElement("div");
    helperActions.className = "invite-code-actions invite-message-actions";
    helperActions.setAttribute("aria-label", "Invite message actions");

    const copyInviteButton = document.createElement("button");
    copyInviteButton.type = "button";
    copyInviteButton.className = "text-action copy-invite-message-button";
    copyInviteButton.textContent = "Copy Message";
    copyInviteButton.setAttribute("aria-label", `Copy invite message for ${tree.name || "this family tree"}`);
    helperActions.appendChild(copyInviteButton);

    const friendlyButton = document.createElement("button");
    friendlyButton.type = "button";
    friendlyButton.className = "text-action invite-message-variant-button";
    friendlyButton.dataset.inviteVariant = "friendly";
    friendlyButton.textContent = "Friendly";
    friendlyButton.setAttribute("aria-pressed", "true");
    friendlyButton.setAttribute("aria-label", `Use friendly invite message for ${tree.name || "this family tree"}`);
    helperActions.appendChild(friendlyButton);

    const shortButton = document.createElement("button");
    shortButton.type = "button";
    shortButton.className = "text-action invite-message-variant-button";
    shortButton.dataset.inviteVariant = "short";
    shortButton.textContent = "Short";
    shortButton.setAttribute("aria-pressed", "false");
    shortButton.setAttribute("aria-label", `Use short invite message for ${tree.name || "this family tree"}`);
    helperActions.appendChild(shortButton);

    helper.appendChild(helperActions);
    code.appendChild(helper);

    detailsWrap.appendChild(code);
  }

  const prepChecklist = createBirthdayPrepChecklist(tree, isOwner);
  if (prepChecklist) {
    detailsWrap.appendChild(prepChecklist);
  }

  const healthDetails = createAccountHealthDetails(tree, isOwner);
  if (healthDetails) {
    detailsWrap.appendChild(healthDetails);
  }

  const memberDetails = document.createElement("details");
  memberDetails.className = "member-details";
  const summary = document.createElement("summary");
  summary.textContent = "Members";
  memberDetails.appendChild(summary);

  const membersList = document.createElement("ul");
  const memberIds = tree.memberIds;

  if (memberIds.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No members listed.";
    membersList.appendChild(item);
  } else {
    memberIds.forEach(memberId => {
      const item = document.createElement("li");

      const memberRole = getMemberRole(tree, memberId);
      const roleLabel = document.createElement("span");
      roleLabel.textContent = getRoleLabel(memberRole);
      item.appendChild(roleLabel);

      const name = document.createElement("strong");
      name.textContent = getMemberLabel(memberId, memberProfiles);
      item.append(" ");
      item.appendChild(name);

      if (isOwner && memberId !== tree.ownerId) {
        const roleSelect = document.createElement("select");
        roleSelect.className = "member-role-select";
        roleSelect.dataset.memberId = memberId;
        roleSelect.setAttribute("aria-label", `Access level for ${getMemberLabel(memberId, memberProfiles)}`);
        roleSelect.title = "Viewer can read only. Editor can add people and photos.";

        [
          ["viewer", "Can view only"],
          ["editor", "Can edit people and photos"],
        ].forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          roleSelect.appendChild(option);
        });

        roleSelect.value = memberRole === "editor" ? "editor" : "viewer";
        item.appendChild(roleSelect);
      }

      if (isOwner && memberId !== tree.ownerId) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "text-action remove-member-button";
        removeButton.dataset.memberId = memberId;
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${getMemberLabel(memberId, memberProfiles)} from this family tree`);
        item.append(" ");
        item.appendChild(removeButton);
      }

      membersList.appendChild(item);
    });
  }

  memberDetails.appendChild(membersList);
  detailsWrap.appendChild(memberDetails);

  const cardStatus = document.createElement("p");
  cardStatus.className = "family-tree-card-status";
  cardStatus.setAttribute("aria-live", "polite");
  detailsWrap.appendChild(cardStatus);

  article.appendChild(detailsWrap);

  const actions = document.createElement("div");
  actions.className = "family-tree-card-actions";

  const openLink = document.createElement("a");
  openLink.className = "button";
  openLink.href = `/tree?familyId=${encodeURIComponent(tree.id)}`;
  openLink.textContent = "Open Tree";
  actions.appendChild(openLink);

  if (isOwner || role !== "guest") {
    const dangerButton = document.createElement("button");
    dangerButton.type = "button";
    dangerButton.className = isOwner
      ? "button danger-button archive-tree-button"
      : "button danger-button leave-tree-button";
    dangerButton.textContent = isOwner ? "Archive" : "Leave";
    actions.appendChild(dangerButton);
  }

  article.appendChild(actions);

  article.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => setFamilyId(tree.id));
  });

  setupTreeCardActions(article, tree, isOwner);

  return article;
}

function setRemovedPersonCardStatus(card, message, tone = "") {
  const cardStatus = card.querySelector(".family-tree-card-status");
  if (!cardStatus) return;
  cardStatus.textContent = message;
  cardStatus.classList.toggle("is-loading", tone === "loading");
  cardStatus.classList.toggle("is-error", tone === "error");
  cardStatus.classList.toggle("is-success", tone === "success");
}

function createRemovedPersonCard(person, tree) {
  const article = document.createElement("article");
  article.className = "family-tree-card removed-person-card";
  article.dataset.personId = person.id;
  article.dataset.familyId = tree.id;

  const details = document.createElement("div");

  const heading = document.createElement("h3");
  heading.textContent = getPersonDisplayName(person);
  details.appendChild(heading);

  const treeLabel = document.createElement("p");
  treeLabel.className = "family-tree-meta";
  treeLabel.textContent = `Tree: ${tree.name || "Untitled Family Tree"}`;
  details.appendChild(treeLabel);

  const removedAt = formatDate(person.deletedAt);
  const removedMeta = document.createElement("p");
  removedMeta.className = "family-tree-meta";
  removedMeta.textContent = removedAt ? `Removed ${removedAt}` : "Removed from active tree";
  details.appendChild(removedMeta);

  const status = document.createElement("p");
  status.className = "family-tree-card-status";
  status.setAttribute("aria-live", "polite");
  details.appendChild(status);

  article.appendChild(details);

  const actions = document.createElement("div");
  actions.className = "family-tree-card-actions";

  const restoreButton = document.createElement("button");
  restoreButton.type = "button";
  restoreButton.className = "button button-secondary restore-person-button";
  restoreButton.textContent = "Restore";
  restoreButton.setAttribute("aria-label", `Restore ${getPersonDisplayName(person)} to ${tree.name || "this family tree"}`);
  restoreButton.addEventListener("click", () => restorePerson(article, person, tree));
  actions.appendChild(restoreButton);

  article.appendChild(actions);
  return article;
}

function createArchivedTreeCard(tree) {
  const article = document.createElement("article");
  article.className = "family-tree-card archived-tree-card";
  article.dataset.familyId = tree.id;

  const details = document.createElement("div");

  const heading = document.createElement("h3");
  heading.textContent = tree.name || "Untitled Family Tree";
  details.appendChild(heading);

  const archivedAt = formatDate(tree.archivedAt);
  const archivedMeta = document.createElement("p");
  archivedMeta.className = "family-tree-meta";
  archivedMeta.textContent = archivedAt ? `Archived ${archivedAt}` : "Archived tree";
  details.appendChild(archivedMeta);

  const countMeta = document.createElement("p");
  countMeta.className = "family-tree-meta";
  countMeta.textContent = [
    `${tree.memberIds.length} ${tree.memberIds.length === 1 ? "member" : "members"}`,
    Number.isInteger(tree.peopleCount) ? `${tree.peopleCount} ${tree.peopleCount === 1 ? "person" : "people"}` : "",
  ].filter(Boolean).join(" | ");
  details.appendChild(countMeta);

  const status = document.createElement("p");
  status.className = "family-tree-card-status";
  status.setAttribute("aria-live", "polite");
  details.appendChild(status);

  article.appendChild(details);

  const actions = document.createElement("div");
  actions.className = "family-tree-card-actions";

  const restoreButton = document.createElement("button");
  restoreButton.type = "button";
  restoreButton.className = "button button-secondary restore-archived-tree-button";
  restoreButton.textContent = "Restore";
  restoreButton.setAttribute("aria-label", `Restore ${tree.name || "this archived family tree"}`);
  restoreButton.addEventListener("click", () => restoreArchivedTree(article, tree));
  actions.appendChild(restoreButton);

  article.appendChild(actions);
  return article;
}

function dedupeTrees(trees) {
  const byId = new Map();
  trees.forEach(tree => {
    if (!tree?.id || byId.has(tree.id)) return;
    byId.set(tree.id, tree);
  });
  return [...byId.values()];
}

function chooseCurrentTree(trees) {
  if (!Array.isArray(trees) || trees.length === 0) return null;

  const storedFamilyId = getStoredFamilyId();
  return (
    trees.find(tree => tree.id === storedFamilyId) ||
    trees.find(tree => tree.id === STARTER_TREE_ID) ||
    trees.find(tree => tree.birthdayDemoTree) ||
    trees.find(tree => tree.name === STARTER_TREE_NAME) ||
    trees[0]
  );
}

function renderDashboardEmptyState(options = {}) {
  if (!listEl) return;

  const empty = document.createElement("article");
  empty.className = "empty-state";

  const heading = document.createElement("h3");
  heading.textContent = options.title || "No family tree yet";
  empty.appendChild(heading);

  const copy = document.createElement("p");
  copy.textContent = options.message || "Create a private family tree or join one with an access code from a relative.";
  empty.appendChild(copy);

  const actions = document.createElement("div");
  actions.className = "dashboard-actions";

  const createLink = document.createElement("a");
  createLink.className = "button";
  createLink.href = options.primaryHref || "/#createTreeFormCard";
  createLink.textContent = options.primaryLabel || "Start Family Tree";
  actions.appendChild(createLink);

  if (options.secondaryLabel !== null) {
    const joinLink = document.createElement("a");
    joinLink.className = "button button-secondary";
    joinLink.href = options.secondaryHref || "/#joinTreeFormCard";
    joinLink.textContent = options.secondaryLabel || "Join with Code";
    actions.appendChild(joinLink);
  }

  empty.appendChild(actions);
  listEl.replaceChildren(empty);
}

function renderDashboardLoadingState() {
  if (!listEl) return;

  const loading = document.createElement("article");
  loading.className = "loading-state";
  loading.setAttribute("aria-hidden", "true");
  listEl.replaceChildren(loading);
}

function renderDashboardUnavailableState() {
  if (!listEl) return;

  const state = document.createElement("article");
  state.className = "empty-state";

  const heading = document.createElement("h3");
  heading.textContent = "Family tree unavailable";
  state.appendChild(heading);

  const copy = document.createElement("p");
  copy.textContent = "Refresh the page first. If this keeps happening, confirm this account is listed as owner, editor, or viewer in the family tree.";
  state.appendChild(copy);

  const actions = document.createElement("div");
  actions.className = "empty-state-actions";
  const refreshButton = document.createElement("button");
  refreshButton.className = "button";
  refreshButton.type = "button";
  refreshButton.textContent = "Refresh";
  refreshButton.addEventListener("click", () => window.location.reload());
  const homeLink = document.createElement("a");
  homeLink.className = "button button-secondary";
  homeLink.href = "/";
  homeLink.textContent = "Go Home";
  actions.append(refreshButton, homeLink);
  state.appendChild(actions);

  listEl.replaceChildren(state);
}

async function renderRemovedPeopleForOwnedTrees(trees) {
  if (!removedPeopleSectionEl || !removedPeopleListEl || !currentUser) return;

  resetRemovedPeopleSection();
  const ownedTrees = (Array.isArray(trees) ? trees : [])
    .filter(tree => tree.ownerId === currentUser.uid);

  if (ownedTrees.length === 0) return;

  const deletedGroups = await Promise.all(ownedTrees.map(async (tree) => {
    try {
      const people = await getAllPeople(tree.id, { includeDeleted: true });
      return {
        tree,
        people: people.filter(isDeletedPerson),
      };
    } catch (error) {
      console.warn("Could not load removed people for owner tools:", error);
      return { tree, people: [] };
    }
  }));

  const deletedItems = deletedGroups
    .flatMap(group => group.people.map(person => ({ person, tree: group.tree })))
    .sort((a, b) => getPersonDisplayName(a.person).localeCompare(getPersonDisplayName(b.person)));

  if (deletedItems.length === 0) return;

  removedPeopleSectionEl.hidden = false;
  setRemovedPeopleStatus(`${deletedItems.length} removed ${deletedItems.length === 1 ? "person" : "people"} available to restore.`);
  removedPeopleListEl.replaceChildren(...deletedItems.map(({ person, tree }) => createRemovedPersonCard(person, tree)));
}

function renderArchivedTreesForOwner(trees) {
  if (!archivedTreesSectionEl || !archivedTreesListEl || !currentUser) return;

  resetArchivedTreesSection();
  const archivedTrees = (Array.isArray(trees) ? trees : [])
    .filter(tree => tree.ownerId === currentUser.uid && tree.archivedAt)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  if (archivedTrees.length === 0) return;

  archivedTreesSectionEl.hidden = false;
  setArchivedTreesStatus(`${archivedTrees.length} archived ${archivedTrees.length === 1 ? "tree" : "trees"} available to restore.`);
  archivedTreesListEl.replaceChildren(...archivedTrees.map(createArchivedTreeCard));
}

function getMemberLabel(memberId, memberProfiles) {
  const profile = memberProfiles.get(memberId);
  return profile?.displayName || profile?.email || "Family member";
}

async function loadMemberProfiles(memberIds, currentUserId) {
  const readableMemberIds = [...new Set(memberIds || [])]
    .filter(memberId => memberId && memberId === currentUserId);

  const entries = await Promise.all(
    readableMemberIds.map(async (memberId) => {
      try {
        const snap = await getDoc(doc(db, "users", memberId));
        return [memberId, snap.exists() ? snap.data() : null];
      } catch (error) {
        console.error("Error loading member profile:", error);
        return [memberId, null];
      }
    })
  );

  return new Map(entries);
}

async function loadBirthdayPrepSummary(familyId) {
  if (!familyId) {
    return {
      peopleCount: null,
      photoCount: 0,
      missingBirthdays: 0,
      missingBios: 0,
      missingRelationships: 0,
    };
  }

  try {
    const peopleSnap = await getDocs(query(
      collection(db, "people"),
      where("familyId", "==", familyId)
    ));
    const people = peopleSnap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })).filter(person => !isDeletedPerson(person));
    const linkedPersonIds = new Set();

    people.forEach(person => {
      normalizeRelationshipIds(person.parentIds).forEach(id => linkedPersonIds.add(id));
      normalizeRelationshipIds(person.spouseIds).forEach(id => linkedPersonIds.add(id));
    });

    return {
      peopleCount: people.length,
      people,
      photoCount: people.filter(hasProfilePhoto).length,
      missingBirthdays: people.filter(person => !hasBirthDate(person)).length,
      missingBios: people.filter(person => !hasMeaningfulBio(person)).length,
      missingRelationships: people.filter(person => !hasRelationshipData(person, linkedPersonIds)).length,
    };
  } catch (error) {
    console.warn("Could not load birthday prep summary:", error);
    return {
      peopleCount: null,
      photoCount: 0,
      missingBirthdays: 0,
      missingBios: 0,
      missingRelationships: 0,
    };
  }
}

function normalizeMemberIds(data, user) {
  const ids = new Set(Array.isArray(data.memberIds) ? data.memberIds : []);

  if (data.ownerId) ids.add(data.ownerId);
  if (user?.uid && (data.ownerId === user.uid || ids.has(user.uid))) {
    ids.add(user.uid);
  }

  return [...ids].filter(Boolean);
}

function normalizeMemberRoles(data, user) {
  const roles = { ...(data.memberRoles || {}) };

  if (data.ownerId) {
    roles[data.ownerId] = roles[data.ownerId] || "owner";
  }

  if (user?.uid && data.ownerId === user.uid) {
    roles[user.uid] = "owner";
  }

  return roles;
}

async function createTreeFromDoc(docSnap, user) {
  const data = docSnap.data();
  const memberIds = normalizeMemberIds(data, user);
  const memberRoles = normalizeMemberRoles(data, user);
  const [memberProfiles, prepSummary] = await Promise.all([
    loadMemberProfiles(memberIds, user.uid),
    loadBirthdayPrepSummary(docSnap.id),
  ]);

  return {
    ...data,
    id: docSnap.id,
    currentUserId: user.uid,
    memberIds,
    memberRoles,
    memberProfiles,
    peopleCount: prepSummary.peopleCount,
    prepSummary,
    needsMembershipRepair: data.ownerId === user.uid && !Array.isArray(data.memberIds),
    needsRoleRepair: data.ownerId === user.uid && data.memberRoles?.[user.uid] !== "owner",
    needsJoinCodeRepair: data.ownerId === user.uid && !data.joinCode,
  };
}

function setCardStatus(card, message, tone = "") {
  const cardStatus = card.querySelector(".family-tree-card-status");
  if (!cardStatus) return;
  cardStatus.textContent = message;
  cardStatus.classList.toggle("is-loading", tone === "loading");
  cardStatus.classList.toggle("is-error", tone === "error");
  cardStatus.classList.toggle("is-success", tone === "success");
}

async function copyInviteCode(card, joinCode) {
  try {
    await navigator.clipboard.writeText(joinCode);
    setCardStatus(card, "Access code copied.", "success");
  } catch {
    setCardStatus(card, "Select the access code and copy it manually.", "error");
  }
}

async function copyInviteMessage(card) {
  const message = card.querySelector(".invite-message-text")?.value || "";
  if (!message.trim()) return;

  try {
    await navigator.clipboard.writeText(message);
    setCardStatus(card, "Invite message copied.", "success");
  } catch (error) {
    console.error("Invite message copy failed:", error);
    const textarea = card.querySelector(".invite-message-text");
    textarea?.focus();
    textarea?.select();
    setCardStatus(card, "Message selected. Press Ctrl+C to copy it.", "error");
  }
}

function setInviteMessageVariant(card, tree, variant) {
  const textarea = card.querySelector(".invite-message-text");
  if (!textarea) return;

  textarea.value = buildInviteMessage(tree, variant);
  card.querySelectorAll(".invite-message-variant-button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.inviteVariant === variant));
  });
}

async function resetInviteCode(card, tree) {
  setCardStatus(card, "Resetting access code...", "loading");

  try {
    const newCode = await generateAvailableJoinCode();
    await setDoc(doc(db, "joinCodes", newCode), {
      familyId: tree.id,
      createdAt: serverTimestamp(),
      createdBy: currentUser?.uid || null,
    });

    await updateDoc(doc(db, "families", tree.id), {
      joinCode: newCode,
      inviteResetAt: serverTimestamp(),
      inviteResetBy: currentUser?.uid || null,
    });

    if (tree.joinCode) {
      await deleteDoc(doc(db, "joinCodes", tree.joinCode));
    }

    tree.joinCode = newCode;
    const codeText = card.querySelector(".join-code-text");
    if (codeText) codeText.textContent = newCode;
    const activeVariant = card.querySelector(".invite-message-variant-button[aria-pressed='true']")?.dataset.inviteVariant || "friendly";
    setInviteMessageVariant(card, tree, activeVariant);
    const confirmPanel = card.querySelector(".invite-code-confirm");
    if (confirmPanel) confirmPanel.hidden = true;
    setCardStatus(card, "Access code reset.", "success");
  } catch (error) {
    console.error("Error resetting access code:", error);
    setCardStatus(card, "Could not reset the access code. Check owner access and try again.", "error");
  }
}

async function saveTreeDetails(card, tree) {
  const form = card.querySelector(".family-tree-edit-form");
  const name = form?.elements.name.value.trim();
  const description = form?.elements.description.value.trim();

  if (!name) {
    setCardStatus(card, "Tree name is required.", "error");
    return;
  }

  setCardStatus(card, "Saving changes...", "loading");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      name,
      description,
    });
    setCardStatus(card, "Changes saved.", "success");
  } catch (error) {
    console.error("Error saving tree:", error);
    setCardStatus(card, "Could not save changes. Check owner access and try again.", "error");
  }
}

async function archiveTree(card, tree) {
  const confirmed = confirm(`Archive "${tree.name || "this family tree"}"? Owners can restore it later from Account.`);
  if (!confirmed) return;

  setCardStatus(card, "Archiving tree...", "loading");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      archivedAt: serverTimestamp(),
      archivedBy: currentUser?.uid || null,
    });
    card.remove();
    setStatus("Tree archived.", "success");
  } catch (error) {
    console.error("Error archiving tree:", error);
    setCardStatus(card, "Could not archive this tree. Check owner access and try again.", "error");
  }
}

async function restoreArchivedTree(card, tree) {
  if (!currentUser || tree.ownerId !== currentUser.uid) {
    setCardStatus(card, "Only the tree owner can restore archived trees.", "error");
    return;
  }

  const confirmed = confirm(`Restore "${tree.name || "this family tree"}" to your active account list?`);
  if (!confirmed) return;

  setCardStatus(card, "Restoring tree...", "loading");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      archivedAt: deleteField(),
      archivedBy: deleteField(),
      archivedReason: deleteField(),
      archivedSource: deleteField(),
      restoredAt: serverTimestamp(),
      restoredBy: currentUser.uid,
    });

    setCardStatus(card, "Tree restored.", "success");
    await loadFamilyTrees(currentUser);
  } catch (error) {
    console.error("Error restoring archived tree:", error);
    setCardStatus(card, "Could not restore this tree. Confirm owner access and try again.", "error");
  }
}

async function leaveTree(card, tree) {
  if (!currentUser) return;
  const confirmed = confirm(`Leave "${tree.name || "this family tree"}"?`);
  if (!confirmed) return;

  setCardStatus(card, "Leaving tree...", "loading");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      memberIds: arrayRemove(currentUser.uid),
      [`memberRoles.${currentUser.uid}`]: deleteField(),
    });
    card.remove();
    setStatus("You left the tree.", "success");
  } catch (error) {
    console.error("Error leaving tree:", error);
    setCardStatus(card, "Could not leave this tree. Check your connection and try again.", "error");
  }
}

async function removeMember(card, tree, memberId) {
  const memberLabel = getMemberLabel(memberId, tree.memberProfiles || new Map());
  const confirmed = confirm(`Remove ${memberLabel} from "${tree.name || "this family tree"}"?`);
  if (!confirmed) return;

  setCardStatus(card, "Removing member...", "loading");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      memberIds: arrayRemove(memberId),
      [`memberRoles.${memberId}`]: deleteField(),
    });

    tree.memberIds = (tree.memberIds || []).filter(id => id !== memberId);
    card.querySelector(`[data-member-id="${CSS.escape(memberId)}"]`)?.closest("li")?.remove();
    setCardStatus(card, "Member removed.", "success");
  } catch (error) {
    console.error("Error removing member:", error);
    setCardStatus(card, "Could not remove that member. Check owner access and try again.", "error");
  }
}

async function restorePerson(card, person, tree) {
  if (!currentUser || tree.ownerId !== currentUser.uid) {
    setRemovedPersonCardStatus(card, "Only the tree owner can restore removed people.", "error");
    return;
  }

  const personName = getPersonDisplayName(person);
  const confirmed = confirm(`Restore ${personName} to the active tree and directory?`);
  if (!confirmed) return;

  setRemovedPersonCardStatus(card, "Restoring person...", "loading");

  try {
    await updateDoc(doc(db, "people", person.id), {
      deletedAt: deleteField(),
      deletedBy: deleteField(),
      deletedSource: deleteField(),
      deletedReason: deleteField(),
      restoredAt: serverTimestamp(),
      restoredBy: currentUser.uid,
    });

    setRemovedPersonCardStatus(card, "Person restored.", "success");
    if (currentUser) {
      await loadFamilyTrees(currentUser);
    }
  } catch (error) {
    console.error("Error restoring removed person:", error);
    setRemovedPersonCardStatus(card, "Could not restore this person. Confirm owner access and try again.", "error");
  }
}

async function updateMemberRole(card, tree, memberId, role) {
  if (!currentUser || tree.ownerId !== currentUser.uid || memberId === tree.ownerId) return;

  const nextRole = role === "editor" ? "editor" : "viewer";
  setCardStatus(card, "Updating access...", "loading");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      [`memberRoles.${memberId}`]: nextRole === "editor" ? "editor" : deleteField(),
    });

    tree.memberRoles = tree.memberRoles || {};
    if (nextRole === "editor") {
      tree.memberRoles[memberId] = "editor";
    } else {
      delete tree.memberRoles[memberId];
    }

    const item = card.querySelector(`[data-member-id="${CSS.escape(memberId)}"]`)?.closest("li");
    const label = item?.querySelector("span");
    if (label) label.textContent = getRoleLabel(nextRole);
    setCardStatus(card, nextRole === "editor" ? "Editor access granted." : "Changed to view-only access.", "success");
  } catch (error) {
    console.error("Error updating member role:", error);
    setCardStatus(card, "Could not update access. Check owner access and try again.", "error");
  }
}

function setupTreeCardActions(card, tree, isOwner) {
  const form = card.querySelector(".family-tree-edit-form");
  const copyBtn = card.querySelector(".copy-code-button");
  const copyInviteMessageBtn = card.querySelector(".copy-invite-message-button");
  const resetCodeBtn = card.querySelector(".reset-code-button");
  const resetConfirmPanel = card.querySelector(".invite-code-confirm");
  const cancelResetCodeBtn = card.querySelector(".cancel-reset-code-button");
  const confirmResetCodeBtn = card.querySelector(".confirm-reset-code-button");
  const archiveBtn = card.querySelector(".archive-tree-button");
  const leaveBtn = card.querySelector(".leave-tree-button");
  const removeMemberBtns = card.querySelectorAll(".remove-member-button");
  const roleSelects = card.querySelectorAll(".member-role-select");
  const inviteVariantBtns = card.querySelectorAll(".invite-message-variant-button");

  if (form && isOwner) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveTreeDetails(card, tree);
    });
  }

  if (copyBtn && tree.joinCode) {
    copyBtn.addEventListener("click", () => copyInviteCode(card, tree.joinCode));
  }

  if (copyInviteMessageBtn && isOwner && tree.joinCode) {
    copyInviteMessageBtn.addEventListener("click", () => copyInviteMessage(card));
  }

  inviteVariantBtns.forEach(button => {
    button.addEventListener("click", () => setInviteMessageVariant(card, tree, button.dataset.inviteVariant || "friendly"));
  });

  if (resetCodeBtn && isOwner) {
    resetCodeBtn.addEventListener("click", () => {
      if (!resetConfirmPanel) return;
      resetConfirmPanel.hidden = false;
      setCardStatus(card, "");
      confirmResetCodeBtn?.focus({ preventScroll: true });
    });
  }

  if (cancelResetCodeBtn) {
    cancelResetCodeBtn.addEventListener("click", () => {
      if (resetConfirmPanel) resetConfirmPanel.hidden = true;
      setCardStatus(card, "Invite code reset canceled.");
      resetCodeBtn?.focus({ preventScroll: true });
    });
  }

  if (confirmResetCodeBtn && isOwner) {
    confirmResetCodeBtn.addEventListener("click", () => resetInviteCode(card, tree));
  }

  if (archiveBtn) {
    archiveBtn.addEventListener("click", () => archiveTree(card, tree));
  }

  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => leaveTree(card, tree));
  }

  removeMemberBtns.forEach(button => {
    button.addEventListener("click", () => removeMember(card, tree, button.dataset.memberId));
  });

  roleSelects.forEach(select => {
    select.addEventListener("change", () => updateMemberRole(card, tree, select.dataset.memberId, select.value));
  });
}

async function loadFamilyTrees(user) {
  if (!listEl) return;
  currentUser = user;
  listEl.replaceChildren();
  resetArchivedTreesSection();
  resetRemovedPeopleSection();

  if (!user) {
    setStatus("Sign in to see your private family tree.");
    renderDashboardEmptyState({
      title: "Sign in to manage your tree",
      message: "Your private family tree, access code, and member controls appear here after sign-in.",
      primaryLabel: "Sign In",
      primaryHref: "/signin",
      secondaryLabel: "Preview Example Tree",
      secondaryHref: "/tree",
    });
    return;
  }

  setStatus("Loading your family tree...", "loading");
  renderDashboardLoadingState();

  try {
    const familiesRef = collection(db, "families");
    const memberQuery = query(familiesRef, where("memberIds", "array-contains", user.uid));
    const ownerQuery = query(familiesRef, where("ownerId", "==", user.uid));
    const queryResults = await Promise.allSettled([
      getDocs(memberQuery),
      getDocs(ownerQuery),
    ]);

    const successfulSnapshots = queryResults
      .filter(result => result.status === "fulfilled")
      .map(result => result.value);

    queryResults.forEach(result => {
      if (result.status === "rejected") {
        console.warn("Family tree account query failed:", result.reason);
      }
    });

    if (successfulSnapshots.length === 0) {
      throw new Error("No family tree queries were allowed.");
    }

    const docs = dedupeTrees(successfulSnapshots.flatMap(snapshot => snapshot.docs));
    const storedFamilyId = getStoredFamilyId();

    if (!docs.some(docSnap => docSnap.id === STARTER_TREE_ID)) {
      try {
        const starterFamilySnap = await getDoc(doc(db, "families", STARTER_TREE_ID));
        if (starterFamilySnap.exists()) {
          docs.push(starterFamilySnap);
        }
      } catch (error) {
        console.warn("Could not load the birthday family tree for this account:", error);
      }
    }

    if (storedFamilyId && !docs.some(docSnap => docSnap.id === storedFamilyId)) {
      try {
        const storedFamilySnap = await getDoc(doc(db, "families", storedFamilyId));
        if (storedFamilySnap.exists()) {
          docs.push(storedFamilySnap);
        }
      } catch (error) {
        console.warn("Could not load the last opened family tree:", error);
      }
    }

    if (docs.length === 0) {
      setStatus("No private family tree is connected to this account yet.");
      renderDashboardEmptyState();
      return;
    }

    setStatus("");
    const trees = await Promise.all(docs.map(docSnap => createTreeFromDoc(docSnap, user)));

    const activeTrees = trees
      .filter(tree => !tree.archivedAt)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const hasOwnedArchivedTrees = trees.some(tree => tree.ownerId === user.uid && tree.archivedAt);

    if (activeTrees.length === 0) {
      setStatus("No active family tree is connected to this account yet.");
      renderDashboardEmptyState({
        title: "No active family tree yet",
        message: hasOwnedArchivedTrees
          ? "Create a private family tree, join one with an access code from a relative, or restore an archived tree below."
          : "Create a private family tree or join one with an access code from a relative.",
      });
      renderArchivedTreesForOwner(trees);
      return;
    }

    await Promise.all(activeTrees.map(repairLegacyTreeAccountState));

    const currentTree = chooseCurrentTree(activeTrees);
    if (currentTree) {
      setFamilyId(currentTree.id);
    }

    activeTrees.forEach(tree => {
      tree.healthReport = createAccountHealthReport(tree, activeTrees);
      listEl.appendChild(createTreeCard(tree));
    });

    renderArchivedTreesForOwner(trees);
    await renderRemovedPeopleForOwnedTrees(activeTrees);
  } catch (error) {
    console.error("Error loading dashboard:", error);
    setStatus("Could not load your family tree. Refresh the page, then confirm this account has access.", "error");
    resetArchivedTreesSection();
    resetRemovedPeopleSection();
    renderDashboardUnavailableState();
  }
}

async function repairLegacyTreeAccountState(tree) {
  if (!currentUser || tree.ownerId !== currentUser.uid) return;

  const update = {};

  if (tree.needsMembershipRepair) {
    update.memberIds = arrayUnion(currentUser.uid);
  }

  if (tree.needsRoleRepair) {
    update[`memberRoles.${currentUser.uid}`] = "owner";
  }

  if (tree.needsJoinCodeRepair) {
    try {
      const newCode = await generateAvailableJoinCode();
      await setDoc(doc(db, "joinCodes", newCode), {
        familyId: tree.id,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
      update.joinCode = newCode;
      tree.joinCode = newCode;
    } catch (error) {
      console.warn("Could not generate missing access code:", error);
    }
  }

  if (Object.keys(update).length === 0) return;

  try {
    await updateDoc(doc(db, "families", tree.id), update);
    if (tree.needsMembershipRepair && !tree.memberIds.includes(currentUser.uid)) {
      tree.memberIds.push(currentUser.uid);
    }
    if (tree.needsRoleRepair) {
      tree.memberRoles[currentUser.uid] = "owner";
    }
  } catch (error) {
    console.warn("Could not repair legacy tree account state:", error);
  }
}

if (listEl) {
  watchAuth(loadFamilyTrees);
}
