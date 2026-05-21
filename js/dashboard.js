import { db } from "./firebase.js?v=20260521-7";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  arrayRemove,
  arrayUnion,
  deleteField,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { watchAuth } from "./auth.js?v=20260521-7";
import {
  ACCESS_CODE_LENGTH,
  canEditFamily,
  generateAccessCode,
  getFamilyRole,
  getStoredFamilyId,
  setFamilyId,
} from "./helpers.js?v=20260521-7";

const listEl = document.getElementById("familyTreeList");
const statusEl = document.getElementById("dashboardStatus");
let currentUser = null;

const STARTER_TREE_NAME = "Colety Family Tree";
const STARTER_TREE_DESCRIPTION = "A simple starter tree for the birthday demo. Edit names and relationships as you add real family details.";

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
  ].filter(Boolean).join(" · ");
  detailsWrap.appendChild(membersMeta);

  if (isOwner && tree.joinCode) {
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

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "text-action reset-code-button";
    resetButton.textContent = "Reset";
    code.append(" ");
    code.appendChild(resetButton);

    detailsWrap.appendChild(code);
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
        roleSelect.setAttribute("aria-label", `Access for ${getMemberLabel(memberId, memberProfiles)}`);

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
    trees.find(tree => tree.birthdayDemoTree) ||
    trees.find(tree => tree.name === STARTER_TREE_NAME) ||
    trees[0]
  );
}

function renderDashboardEmptyState() {
  if (!listEl) return;

  const empty = document.createElement("article");
  empty.className = "empty-state";

  const heading = document.createElement("h3");
  heading.textContent = "No family tree yet";
  empty.appendChild(heading);

  const copy = document.createElement("p");
  copy.textContent = "Create a private family tree or join one with an access code from a relative.";
  empty.appendChild(copy);

  const actions = document.createElement("div");
  actions.className = "dashboard-actions";

  const createLink = document.createElement("a");
  createLink.className = "button";
  createLink.href = "/#createTreeFormCard";
  createLink.textContent = "Start Family Tree";
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

async function loadPeopleCount(familyId) {
  if (!familyId) return null;

  try {
    const peopleSnap = await getDocs(query(
      collection(db, "people"),
      where("familyId", "==", familyId)
    ));
    return peopleSnap.size;
  } catch (error) {
    console.warn("Could not load people count:", error);
    return null;
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
  const [memberProfiles, peopleCount] = await Promise.all([
    loadMemberProfiles(memberIds),
    loadPeopleCount(docSnap.id),
  ]);

  return {
    ...data,
    id: docSnap.id,
    currentUserId: user.uid,
    memberIds,
    memberRoles,
    memberProfiles,
    peopleCount,
    needsMembershipRepair: data.ownerId === user.uid && !Array.isArray(data.memberIds),
    needsRoleRepair: data.ownerId === user.uid && data.memberRoles?.[user.uid] !== "owner",
    needsJoinCodeRepair: data.ownerId === user.uid && !data.joinCode,
  };
}

function starterBirthDate(year, month, day) {
  return Timestamp.fromDate(new Date(year, month - 1, day));
}

function starterPerson(ref, firstName, lastName, birthDate, parentRefs = [], spouseRefs = []) {
  return {
    id: ref.id,
    firstName: firstName.toLowerCase(),
    lastName: lastName.toLowerCase(),
    birthDate,
    familyId: null,
    parentIds: parentRefs.map(parentRef => parentRef.id),
    spouseIds: spouseRefs.map(spouseRef => spouseRef.id),
    bio: "",
  };
}

async function createStarterColetyTree(user) {
  const joinCode = await generateAvailableJoinCode();
  const familyRef = await addDoc(collection(db, "families"), {
    name: STARTER_TREE_NAME,
    description: STARTER_TREE_DESCRIPTION,
    joinCode,
    createdAt: serverTimestamp(),
    ownerId: user.uid,
    memberIds: [user.uid],
    memberRoles: {
      [user.uid]: "owner",
    },
    starterTree: true,
  });

  await setDoc(doc(db, "joinCodes", joinCode), {
    familyId: familyRef.id,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });

  const refs = {
    grandpaDad: doc(collection(db, "people")),
    grandmaDad: doc(collection(db, "people")),
    grandpaMom: doc(collection(db, "people")),
    grandmaMom: doc(collection(db, "people")),
    dad: doc(collection(db, "people")),
    mom: doc(collection(db, "people")),
    spencer: doc(collection(db, "people")),
    sibling: doc(collection(db, "people")),
  };

  const people = [
    starterPerson(refs.grandpaDad, "Tim's Grandpa", "Colety", starterBirthDate(1930, 4, 12), [], [refs.grandmaDad]),
    starterPerson(refs.grandmaDad, "Tim's Grandma", "Colety", starterBirthDate(1932, 8, 18), [], [refs.grandpaDad]),
    starterPerson(refs.grandpaMom, "Mom's Grandpa", "Family", starterBirthDate(1931, 3, 9), [], [refs.grandmaMom]),
    starterPerson(refs.grandmaMom, "Mom's Grandma", "Family", starterBirthDate(1934, 11, 4), [], [refs.grandpaMom]),
    starterPerson(refs.dad, "Tim", "Colety", starterBirthDate(1960, 6, 15), [refs.grandpaDad, refs.grandmaDad], [refs.mom]),
    starterPerson(refs.mom, "Tim's Wife", "Colety", starterBirthDate(1962, 9, 22), [refs.grandpaMom, refs.grandmaMom], [refs.dad]),
    starterPerson(refs.spencer, "Spencer", "Colety", starterBirthDate(1995, 5, 21), [refs.dad, refs.mom]),
    starterPerson(refs.sibling, "Colety", "Sibling", starterBirthDate(1998, 1, 10), [refs.dad, refs.mom]),
  ].map(person => ({
    ...person,
    familyId: familyRef.id,
  }));

  await Promise.all(people.map(person => setDoc(doc(db, "people", person.id), person)));

  return createTreeFromDoc({
    id: familyRef.id,
    data: () => ({
      name: STARTER_TREE_NAME,
      description: STARTER_TREE_DESCRIPTION,
      joinCode,
      createdAt: null,
      ownerId: user.uid,
      memberIds: [user.uid],
      memberRoles: {
        [user.uid]: "owner",
      },
      starterTree: true,
    }),
  }, user);
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

async function updateMemberRole(card, tree, memberId, role) {
  if (!currentUser || tree.ownerId !== currentUser.uid || memberId === tree.ownerId) return;

  const nextRole = role === "editor" ? "editor" : "viewer";
  setCardStatus(card, "Updating access...");

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
    setCardStatus(card, nextRole === "editor" ? "Editor access granted." : "Changed to view-only access.");
  } catch (error) {
    console.error("Error updating member role:", error);
    setCardStatus(card, "Could not update access.");
  }
}

function setupTreeCardActions(card, tree, isOwner) {
  const form = card.querySelector(".family-tree-edit-form");
  const copyBtn = card.querySelector(".copy-code-button");
  const resetCodeBtn = card.querySelector(".reset-code-button");
  const archiveBtn = card.querySelector(".archive-tree-button");
  const leaveBtn = card.querySelector(".leave-tree-button");
  const removeMemberBtns = card.querySelectorAll(".remove-member-button");
  const roleSelects = card.querySelectorAll(".member-role-select");

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

  roleSelects.forEach(select => {
    select.addEventListener("change", () => updateMemberRole(card, tree, select.dataset.memberId, select.value));
  });
}

async function loadFamilyTrees(user) {
  if (!listEl) return;
  currentUser = user;
  listEl.replaceChildren();

  if (!user) {
    setStatus("Sign in to see your private family tree.");
    return;
  }

  setStatus("Loading your family tree...");

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
      setStatus("Creating a starter Colety family tree...");
      try {
        const starterTree = await createStarterColetyTree(user);
        setFamilyId(starterTree.id);
        setStatus("");
        listEl.appendChild(createTreeCard(starterTree));
      } catch (error) {
        console.error("Error creating starter tree:", error);
        setStatus("Could not create the starter family tree. You can still start one manually.");
        renderDashboardEmptyState();
      }
      return;
    }

    setStatus("");
    const trees = await Promise.all(docs.map(docSnap => createTreeFromDoc(docSnap, user)));

    const activeTrees = trees
      .filter(tree => !tree.archivedAt)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (activeTrees.length === 0) {
      setStatus("Creating a starter Colety family tree...");
      try {
        const starterTree = await createStarterColetyTree(user);
        setFamilyId(starterTree.id);
        setStatus("");
        listEl.appendChild(createTreeCard(starterTree));
      } catch (error) {
        console.error("Error creating starter tree:", error);
        setStatus("Could not create the starter family tree. You can still start one manually.");
        renderDashboardEmptyState();
      }
      return;
    }

    await Promise.all(activeTrees.map(repairLegacyTreeAccountState));

    const currentTree = chooseCurrentTree(activeTrees);
    if (currentTree) {
      setFamilyId(currentTree.id);
    }

    activeTrees.forEach(tree => {
      listEl.appendChild(createTreeCard(tree));
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    setStatus("Could not load your family tree. Check your connection and permissions.");
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
