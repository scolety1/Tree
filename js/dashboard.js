import { db } from "./firebase.js";
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
import { watchAuth } from "./auth.js";
import { setFamilyId } from "./helpers.js";

const listEl = document.getElementById("familyTreeList");
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

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function generateJoinCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    code += chars[idx];
  }
  return code;
}

async function generateAvailableJoinCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateJoinCode();
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
  const role = tree.memberRoles?.[tree.currentUserId] || (tree.ownerId === tree.currentUserId ? "owner" : "member");
  const isOwner = role === "owner" || tree.ownerId === tree.currentUserId;
  const memberCount = Array.isArray(tree.memberIds)
    ? tree.memberIds.length
    : (tree.ownerId ? 1 : 0);
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
  meta.textContent = [role ? `Your role: ${role}` : "", createdAt ? `Created ${createdAt}` : ""]
    .filter(Boolean)
    .join(" ");
  detailsWrap.appendChild(meta);

  const membersMeta = document.createElement("p");
  membersMeta.className = "family-tree-meta";
  membersMeta.textContent = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
  detailsWrap.appendChild(membersMeta);

  if (tree.joinCode) {
    const code = document.createElement("p");
    code.className = "family-tree-code";
    code.append("Access code: ");

    const codeText = document.createElement("strong");
    codeText.className = "join-code-text";
    codeText.textContent = tree.joinCode;
    code.appendChild(codeText);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "text-action copy-code-button";
    copyButton.textContent = "Copy";
    code.append(" ");
    code.appendChild(copyButton);

    if (isOwner) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "text-action reset-code-button";
      resetButton.textContent = "Reset";
      code.append(" ");
      code.appendChild(resetButton);
    }

    detailsWrap.appendChild(code);
  }

  const memberDetails = document.createElement("details");
  memberDetails.className = "member-details";
  const summary = document.createElement("summary");
  summary.textContent = "Members";
  memberDetails.appendChild(summary);

  const membersList = document.createElement("ul");
  const memberIds = Array.isArray(tree.memberIds)
    ? tree.memberIds
    : [tree.ownerId].filter(Boolean);

  if (memberIds.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No members listed.";
    membersList.appendChild(item);
  } else {
    memberIds.forEach(memberId => {
      const item = document.createElement("li");

      const roleLabel = document.createElement("span");
      roleLabel.textContent = memberId === tree.ownerId ? "Owner" : "Member";
      item.appendChild(roleLabel);

      const name = document.createElement("strong");
      name.textContent = getMemberLabel(memberId, memberProfiles);
      item.append(" ");
      item.appendChild(name);

      const id = document.createElement("code");
      id.textContent = memberId;
      item.append(" ");
      item.appendChild(id);

      if (isOwner && memberId !== tree.ownerId) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "text-action remove-member-button";
        removeButton.dataset.memberId = memberId;
        removeButton.textContent = "Remove";
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

  const searchLink = document.createElement("a");
  searchLink.className = "button button-secondary";
  searchLink.href = `/search?familyId=${encodeURIComponent(tree.id)}`;
  searchLink.textContent = "Search People";
  actions.appendChild(searchLink);

  const dangerButton = document.createElement("button");
  dangerButton.type = "button";
  dangerButton.className = isOwner
    ? "button danger-button archive-tree-button"
    : "button danger-button leave-tree-button";
  dangerButton.textContent = isOwner ? "Archive" : "Leave";
  actions.appendChild(dangerButton);

  article.appendChild(actions);

  article.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => setFamilyId(tree.id));
  });

  setupTreeCardActions(article, tree, isOwner);

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

function renderDashboardEmptyState() {
  if (!listEl) return;

  const empty = document.createElement("article");
  empty.className = "empty-state";

  const heading = document.createElement("h3");
  heading.textContent = "No trees yet";
  empty.appendChild(heading);

  const copy = document.createElement("p");
  copy.textContent = "Create a private tree or join one with an access code from a relative.";
  empty.appendChild(copy);

  const actions = document.createElement("div");
  actions.className = "dashboard-actions";

  const createLink = document.createElement("a");
  createLink.className = "button";
  createLink.href = "/#createTreeFormCard";
  createLink.textContent = "Start New Tree";
  actions.appendChild(createLink);

  const joinLink = document.createElement("a");
  joinLink.className = "button button-secondary";
  joinLink.href = "/#joinTreeFormCard";
  joinLink.textContent = "Join with Code";
  actions.appendChild(joinLink);

  empty.appendChild(actions);
  listEl.appendChild(empty);
}

function getMemberLabel(memberId, memberProfiles) {
  const profile = memberProfiles.get(memberId);
  return profile?.displayName || profile?.email || "Family member";
}

async function loadMemberProfiles(memberIds) {
  const entries = await Promise.all(
    [...new Set(memberIds || [])].map(async (memberId) => {
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

function setCardStatus(card, message) {
  const cardStatus = card.querySelector(".family-tree-card-status");
  if (cardStatus) cardStatus.textContent = message;
}

async function copyInviteCode(card, joinCode) {
  try {
    await navigator.clipboard.writeText(joinCode);
    setCardStatus(card, "Access code copied.");
  } catch (error) {
    console.error("Copy failed:", error);
    setCardStatus(card, "Select the access code and copy it manually.");
  }
}

async function resetInviteCode(card, tree) {
  const confirmed = confirm(`Reset the access code for "${tree.name || "this family tree"}"? The old code will stop working.`);
  if (!confirmed) return;

  setCardStatus(card, "Resetting access code...");

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
    setCardStatus(card, "Access code reset.");
  } catch (error) {
    console.error("Error resetting access code:", error);
    setCardStatus(card, "Could not reset access code.");
  }
}

async function saveTreeDetails(card, tree) {
  const form = card.querySelector(".family-tree-edit-form");
  const name = form?.elements.name.value.trim();
  const description = form?.elements.description.value.trim();

  if (!name) {
    setCardStatus(card, "Tree name is required.");
    return;
  }

  setCardStatus(card, "Saving changes...");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      name,
      description,
    });
    setCardStatus(card, "Changes saved.");
  } catch (error) {
    console.error("Error saving tree:", error);
    setCardStatus(card, "Could not save changes.");
  }
}

async function archiveTree(card, tree) {
  const confirmed = confirm(`Archive "${tree.name || "this family tree"}"? You can restore it later once archive management is added.`);
  if (!confirmed) return;

  setCardStatus(card, "Archiving tree...");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      archivedAt: serverTimestamp(),
      archivedBy: currentUser?.uid || null,
    });
    card.remove();
    setStatus("Tree archived.");
  } catch (error) {
    console.error("Error archiving tree:", error);
    setCardStatus(card, "Could not archive tree.");
  }
}

async function leaveTree(card, tree) {
  if (!currentUser) return;
  const confirmed = confirm(`Leave "${tree.name || "this family tree"}"?`);
  if (!confirmed) return;

  setCardStatus(card, "Leaving tree...");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      memberIds: arrayRemove(currentUser.uid),
      [`memberRoles.${currentUser.uid}`]: deleteField(),
    });
    card.remove();
    setStatus("You left the tree.");
  } catch (error) {
    console.error("Error leaving tree:", error);
    setCardStatus(card, "Could not leave tree.");
  }
}

async function removeMember(card, tree, memberId) {
  const memberLabel = getMemberLabel(memberId, tree.memberProfiles || new Map());
  const confirmed = confirm(`Remove ${memberLabel} from "${tree.name || "this family tree"}"?`);
  if (!confirmed) return;

  setCardStatus(card, "Removing member...");

  try {
    await updateDoc(doc(db, "families", tree.id), {
      memberIds: arrayRemove(memberId),
      [`memberRoles.${memberId}`]: deleteField(),
    });

    tree.memberIds = (tree.memberIds || []).filter(id => id !== memberId);
    card.querySelector(`[data-member-id="${CSS.escape(memberId)}"]`)?.closest("li")?.remove();
    setCardStatus(card, "Member removed.");
  } catch (error) {
    console.error("Error removing member:", error);
    setCardStatus(card, "Could not remove member.");
  }
}

function setupTreeCardActions(card, tree, isOwner) {
  const form = card.querySelector(".family-tree-edit-form");
  const copyBtn = card.querySelector(".copy-code-button");
  const resetCodeBtn = card.querySelector(".reset-code-button");
  const archiveBtn = card.querySelector(".archive-tree-button");
  const leaveBtn = card.querySelector(".leave-tree-button");
  const removeMemberBtns = card.querySelectorAll(".remove-member-button");

  if (form && isOwner) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveTreeDetails(card, tree);
    });
  }

  if (copyBtn && tree.joinCode) {
    copyBtn.addEventListener("click", () => copyInviteCode(card, tree.joinCode));
  }

  if (resetCodeBtn && isOwner) {
    resetCodeBtn.addEventListener("click", () => resetInviteCode(card, tree));
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
}

async function loadFamilyTrees(user) {
  if (!listEl) return;
  currentUser = user;
  listEl.replaceChildren();

  if (!user) {
    setStatus("Sign in to see your private family trees.");
    return;
  }

  setStatus("Loading your family trees...");

  try {
    const familiesRef = collection(db, "families");
    const memberQuery = query(familiesRef, where("memberIds", "array-contains", user.uid));
    const ownerQuery = query(familiesRef, where("ownerId", "==", user.uid));
    const [memberSnapshot, ownerSnapshot] = await Promise.all([
      getDocs(memberQuery),
      getDocs(ownerQuery),
    ]);

    const docs = dedupeTrees([...memberSnapshot.docs, ...ownerSnapshot.docs]);

    if (docs.length === 0) {
      setStatus("");
      renderDashboardEmptyState();
      return;
    }

    setStatus("");
    const trees = await Promise.all(docs
      .map(async docSnap => {
        const data = docSnap.data();
        const memberIds = Array.isArray(data.memberIds)
          ? data.memberIds
          : [data.ownerId].filter(Boolean);

        return {
          id: docSnap.id,
          currentUserId: user.uid,
          memberIds,
          memberRoles: data.memberRoles || (data.ownerId === user.uid ? { [user.uid]: "owner" } : {}),
          memberProfiles: await loadMemberProfiles(memberIds),
          ...data,
        };
      }));

    const activeTrees = trees
      .filter(tree => !tree.archivedAt)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (activeTrees.length === 0) {
      renderDashboardEmptyState();
      return;
    }

    activeTrees.forEach(tree => {
      repairLegacyTreeMembership(tree);
    });

    activeTrees.forEach(tree => {
      listEl.appendChild(createTreeCard(tree));
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    setStatus("Could not load your family trees. Check your connection and permissions.");
  }
}

async function repairLegacyTreeMembership(tree) {
  if (!currentUser || tree.ownerId !== currentUser.uid || Array.isArray(tree.memberIds)) return;

  try {
    await updateDoc(doc(db, "families", tree.id), {
      memberIds: arrayUnion(currentUser.uid),
      [`memberRoles.${currentUser.uid}`]: "owner",
    });
  } catch (error) {
    console.warn("Could not repair legacy tree membership:", error);
  }
}

if (listEl) {
  watchAuth(loadFamilyTrees);
}
