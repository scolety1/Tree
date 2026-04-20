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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const memberCount = Array.isArray(tree.memberIds) ? tree.memberIds.length : 0;
  const memberProfiles = tree.memberProfiles || new Map();

  article.innerHTML = `
    <form class="family-tree-edit-form">
      <label>
        Tree name
        <input name="name" value="${escapeHtml(tree.name || "Untitled Family Tree")}" ${isOwner ? "" : "disabled"}>
      </label>
      <label>
        Description
        <textarea name="description" rows="3" ${isOwner ? "" : "disabled"}>${escapeHtml(tree.description || "")}</textarea>
      </label>
      ${isOwner ? `<button type="submit" class="button family-tree-save-button">Save Changes</button>` : ""}
    </form>
    <div>
      <p class="family-tree-meta">
        ${role ? `Role: ${role}` : ""}
        ${createdAt ? ` Created: ${createdAt}` : ""}
      </p>
      <p class="family-tree-meta">${memberCount} ${memberCount === 1 ? "member" : "members"}</p>
      ${tree.joinCode ? `
        <p class="family-tree-code">
          Access code: <strong class="join-code-text">${tree.joinCode}</strong>
          <button type="button" class="text-action copy-code-button">Copy</button>
          ${isOwner ? `<button type="button" class="text-action reset-code-button">Reset</button>` : ""}
        </p>
      ` : ""}
      <details class="member-details">
        <summary>Members</summary>
        <ul>
          ${(tree.memberIds || []).map(memberId => `
            <li>
              <span>${memberId === tree.ownerId ? "Owner" : "Member"}</span>
              <strong>${escapeHtml(getMemberLabel(memberId, memberProfiles))}</strong>
              <code>${escapeHtml(memberId)}</code>
              ${isOwner && memberId !== tree.ownerId
                ? `<button type="button" class="text-action remove-member-button" data-member-id="${escapeHtml(memberId)}">Remove</button>`
                : ""
              }
            </li>
          `).join("") || "<li>No members listed.</li>"}
        </ul>
      </details>
      <p class="family-tree-card-status" aria-live="polite"></p>
    </div>
    <div class="family-tree-card-actions">
      <a class="button" href="/tree?familyId=${encodeURIComponent(tree.id)}">Open Tree</a>
      <a class="button button-secondary" href="/search?familyId=${encodeURIComponent(tree.id)}">Search</a>
      ${isOwner
        ? `<button type="button" class="button danger-button archive-tree-button">Archive</button>`
        : `<button type="button" class="button danger-button leave-tree-button">Leave</button>`
      }
    </div>
  `;

  article.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => setFamilyId(tree.id));
  });

  setupTreeCardActions(article, tree, isOwner);

  return article;
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
  listEl.innerHTML = "";

  if (!user) {
    setStatus("Sign in to see your private family trees.");
    return;
  }

  setStatus("Loading your family trees...");

  try {
    const familiesRef = collection(db, "families");
    const q = query(familiesRef, where("memberIds", "array-contains", user.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      setStatus("No family trees yet. Create one or join with an access code.");
      return;
    }

    setStatus("");
    const trees = await Promise.all(snapshot.docs
      .map(async docSnap => {
        const data = docSnap.data();
        return {
        id: docSnap.id,
        currentUserId: user.uid,
          memberProfiles: await loadMemberProfiles(data.memberIds || []),
          ...data,
        };
      }));

    trees
      .filter(tree => !tree.archivedAt)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .forEach(tree => {
        listEl.appendChild(createTreeCard(tree));
      });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    setStatus("Could not load your family trees. Check your connection and permissions.");
  }
}

if (listEl) {
  watchAuth(loadFamilyTrees);
}
