// profile.js
import { db, storage } from "./firebase.js?v=20260612-emulator-qa";
import {
  doc,
  getDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-storage.js";

import { 
  buildFullName,
  canEditFamily,
  filterActivePeople,
  findPersonByNameString,
  getDisplayName,
  getFamilyRole,
  toTitleFullName, 
  toTitle, 
  getChildren,
  getAllPeople,
  getCurrentFamilyId as getFamilyIdFromHelper,
  getImageFileExtension,
  getImageUploadMetadata,
  isDeletedPerson,
  normalizeImageUrl,
  prepareImageFileForUpload,
  resolvePersonParentIds,
  resolvePersonSpouseIds,
  safeImageFileName,
} from "./helpers.js?v=20260612-4";
import { getCurrentUser, watchAuth } from "./auth.js?v=20260612-4";
import { getAuthUserOnce } from "./familyContext.js?v=20260612-4";
import { generateLargeDemoTree } from "./demoTreeData.js?v=20260612-4";


let personId = null;
let familyId = null;
let collectionName = "example";
let allPeople = [];
let currentAuthUser = getCurrentUser();
let profileSource = "tree";
let profileCanEdit = false;
let profileCanDelete = false;
let currentProfileImageUrl = "";
let profileDemoContext = "";

const PROFILE_SOURCE_ROUTES = {
  search: {
    path: "/search",
    label: "Back to People",
  },
  tree: {
    path: "/tree",
    label: "Back to Family Tree",
  },
};

const EMPTY_RELATIONSHIP_LABEL = "None listed";
const EMPTY_BIO_LABEL = "No story has been added yet. Add a favorite memory, nickname, or bit of family context when this becomes a private family tree.";
const DEFAULT_MEMORY_SUMMARY = "Open a profile to see which stories, photos, and family details are already here.";

function getProfileSourceFromParams(params = new URLSearchParams(window.location.search)) {
  const from = params.get("from");
  const source = params.get("source");

  if (PROFILE_SOURCE_ROUTES[from]) return from;
  if (source === "search" || source === "directory") return "search";
  if (params.has("query") || params.has("searchQuery") || params.has("sort")) return "search";
  return "tree";
}

function isGeneratedDemoPersonId(currentPersonId) {
  return /^demo-/.test(String(currentPersonId || ""));
}

function getProfileDemoContext(params = new URLSearchParams(window.location.search)) {
  const demo = params.get("demo");
  const source = params.get("source");

  if (demo === "example" || demo === "large") return demo;
  if (source === "large") return "large";
  if (source === "example" || source === "demo") return "example";
  return "";
}

function resolveProfileFamilyId(params = new URLSearchParams(window.location.search)) {
  profileDemoContext = getProfileDemoContext(params);

  if (!profileDemoContext && isGeneratedDemoPersonId(params.get("person"))) {
    profileDemoContext = "example";
  }

  if (profileDemoContext) return null;

  const urlFamilyId = params.get("familyId");
  if (urlFamilyId) return urlFamilyId;

  return getFamilyIdFromHelper();
}

function setPublicDemoBannerVisible(isVisible) {
  const banner = document.getElementById("publicDemoBanner");
  if (!banner) return;
  banner.hidden = !isVisible;
}

function getReturnTreeView() {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "chart" || view === "cards" ? view : "";
}

function shouldUseGeneratedDemoProfile() {
  return !familyId && (Boolean(profileDemoContext) || String(personId || "").startsWith("demo-"));
}

function findGeneratedDemoPerson(currentPersonId) {
  return generateLargeDemoTree().find(person => person.id === currentPersonId) || null;
}

function getProfileStatusTone(message = "") {
  if (!message) return "";
  if (/loading|uploading|saving|reloading/i.test(message)) return "loading";
  if (/saved|uploaded|removed|updated/i.test(message)) return "success";
  if (/could not|blocked|failed|unavailable|sign in|required|choose|use a secure/i.test(message)) return "error";
  return "";
}

function setProfileStatus(message, tone = getProfileStatusTone(message)) {
  const status = document.getElementById("profileStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-loading", tone === "loading");
  status.classList.toggle("is-success", tone === "success");
  status.classList.toggle("is-error", tone === "error");
}

function setProfileText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setFactText(id, value, { empty = false } = {}) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = value;
  element.classList.toggle("is-empty", empty);
}

function setProfileStoryLead(message = "") {
  const element = document.getElementById("profileStoryLead");
  if (element) element.textContent = message || "Profiles collect the person, relationships, photos, and family notes in one place.";
}

function setProfileMemoryPanel({
  fullName = "",
  hasBirthday = false,
  hasBio = false,
  hasPhoto = false,
  parentItems = [],
  spouseItems = [],
  children = [],
  summary = "",
  prompts = [],
} = {}) {
  const summaryEl = document.getElementById("profileMemorySummary");
  const promptsEl = document.getElementById("profileMemoryPrompts");
  if (!summaryEl || !promptsEl) return;

  const firstName = getFirstNameForLead(fullName);
  const hasRelationships = parentItems.length > 0 || spouseItems.length > 0 || children.length > 0;
  const notes = [...prompts];

  if (notes.length === 0 && !hasBio) {
    notes.push(`Add a favorite memory, nickname, or story about ${firstName}.`);
  }
  if (notes.length === 0 && !hasPhoto) {
    notes.push(`Add a photo that family members will recognize.`);
  }
  if (notes.length === 0 && !hasBirthday) {
    notes.push(`Add a birthday or approximate year if the exact date is not known.`);
  }
  if (notes.length === 0 && !hasRelationships) {
    notes.push(`Connect parents, a partner, or children when they are added to the tree.`);
  }
  if (notes.length === 0) {
    notes.push(`Keep adding small memories over time: places, traditions, photos, or favorite stories.`);
  }

  if (summary) {
    summaryEl.textContent = summary;
  } else if (profileDemoContext) {
    summaryEl.textContent = "This read-only example shows where a private family tree can collect story notes without making the profile feel cluttered.";
  } else if (hasBio || hasPhoto || hasRelationships) {
    const pieces = [];
    if (hasBio) pieces.push("a story note");
    if (hasPhoto) pieces.push("a photo");
    if (hasRelationships) pieces.push("family connections");
    summaryEl.textContent = `${firstName}'s profile already includes ${pieces.join(", ")}. This section can grow as relatives add more context.`;
  } else {
    summaryEl.textContent = `${firstName}'s profile is ready for memories, photos, and family context when the family fills it in.`;
  }

  promptsEl.replaceChildren();
  notes.slice(0, 4).forEach(note => {
    const item = document.createElement("li");
    item.textContent = note;
    promptsEl.appendChild(item);
  });
}

function getProfileInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "FT";
}

function setProfilePhotoPlaceholder({
  name = "",
  title = "No photo yet",
  text = "Add a photo later.",
  initials = "",
  isPrivate = false,
} = {}) {
  const placeholder = document.getElementById("profilePhotoPlaceholder");
  const initialsEl = document.getElementById("profilePhotoInitials");
  const titleEl = document.getElementById("profilePhotoPlaceholderTitle");
  const textEl = document.getElementById("profilePhotoPlaceholderText");
  if (!placeholder) return;

  const safeInitials = isPrivate ? "FT" : (initials || getProfileInitials(name));
  placeholder.hidden = false;
  placeholder.setAttribute("aria-label", `${title}. ${text}`);
  if (initialsEl) initialsEl.textContent = safeInitials;
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
}

function setProfilePhoto(imageUrl, {
  name = "",
  isPrivate = false,
  placeholderTitle = "No photo yet",
  placeholderText = "Add a photo later.",
} = {}) {
  const profileImgEl = document.getElementById("profileImage");
  const profileCardEl = document.getElementById("profileCard");
  const placeholder = document.getElementById("profilePhotoPlaceholder");
  const cleanUrl = String(imageUrl || "").trim();

  if (profileImgEl && cleanUrl) {
    profileImgEl.src = cleanUrl;
    profileImgEl.hidden = false;
    profileImgEl.removeAttribute("aria-hidden");
    profileImgEl.alt = name ? `${name} profile photo` : "Profile photo";
    profileImgEl.style.display = "block";
    if (placeholder) placeholder.hidden = true;
    if (profileCardEl) profileCardEl.classList.remove("no-photo");
    currentProfileImageUrl = cleanUrl;
    return;
  }

  if (profileImgEl) {
    profileImgEl.removeAttribute("src");
    profileImgEl.hidden = true;
    profileImgEl.setAttribute("aria-hidden", "true");
    profileImgEl.alt = "";
    profileImgEl.style.display = "none";
  }
  setProfilePhotoPlaceholder({
    name,
    title: placeholderTitle,
    text: placeholderText,
    isPrivate,
  });
  if (profileCardEl) profileCardEl.classList.add("no-photo");
  currentProfileImageUrl = "";
}

function clearProfilePhoto(options = {}) {
  setProfilePhoto("", options);
}

function setProfileUnavailable({
  title,
  status = "",
  editMessage = "Open a person from Family Tree to view profile details.",
  birthday = "-",
  parents = "-",
  spouse = "-",
  children = "-",
  bio = "-",
  funFact = "-",
  storyLead = "",
} = {}) {
  setProfileText("name", title || "Profile unavailable");
  setProfileStatus(status);
  setProfileStoryLead(storyLead || status || "Open a family member from the tree to see their relationships, story notes, and photos.");
  setFactText("birthDate", birthday, { empty: /-|unknown|private/i.test(String(birthday)) });
  setFactText("parents", parents, { empty: /-|unknown|sign in|private/i.test(String(parents)) });
  setFactText("spouse", spouse, { empty: /-|unknown|private/i.test(String(spouse)) });
  setFactText("children", children, { empty: /-|unknown|private/i.test(String(children)) });
  setFactText("bio", bio, { empty: /-|no matching|private|belongs to/i.test(String(bio)) });
  setFactText("funFact", funFact, { empty: /-|sign in|open a family|birthday/i.test(String(funFact)) });
  setProfileMemoryPanel({
    fullName: title || "This profile",
    summary: storyLead || status || DEFAULT_MEMORY_SUMMARY,
    prompts: [editMessage || "Open a family member from the tree to see their notes."],
  });
  clearProfilePhoto({
    isPrivate: /private|sign in/i.test(`${status} ${bio} ${birthday}`),
    placeholderTitle: /private|sign in/i.test(`${status} ${bio} ${birthday}`)
      ? "Private profile"
      : "No photo yet",
    placeholderText: /private|sign in/i.test(`${status} ${bio} ${birthday}`)
      ? "Sign in with an invited account to see this person's photo."
      : "This profile is ready for a favorite photo.",
  });
  profileCanEdit = false;
  profileCanDelete = false;
  setProfileEditState({
    editable: false,
    message: editMessage,
  });
}

function setEditingAvailable({ canEdit = false, canDelete = false } = {}) {
  const editBtn = document.getElementById("editPersonBtn");
  const deleteBtn = document.getElementById("deletePersonBtn");

  if (editBtn) editBtn.hidden = !canEdit;
  if (deleteBtn) deleteBtn.hidden = !canDelete;
}

function setProfileEditState({ editable, canDelete = false, message }) {
  const state = document.getElementById("profileEditState");
  if (!state) return;

  state.textContent = message;
  state.classList.toggle("is-editable", editable);
  state.classList.toggle("is-read-only", !editable);
  setEditingAvailable({ canEdit: editable, canDelete });
}

async function currentUserCanEditProfile(user, currentFamilyId) {
  if (!user || !currentFamilyId) return false;

  try {
    const familySnap = await getDoc(doc(db, "families", currentFamilyId));
    return familySnap.exists() && canEditFamily(familySnap.data(), user);
  } catch (error) {
    console.error("Error checking profile edit access:", error);
    return false;
  }
}

async function currentUserCanDeleteProfile(user, currentFamilyId) {
  if (!user || !currentFamilyId) return false;

  try {
    const familySnap = await getDoc(doc(db, "families", currentFamilyId));
    return familySnap.exists() && getFamilyRole(familySnap.data(), user) === "owner";
  } catch (error) {
    console.error("Error checking profile delete access:", error);
    return false;
  }
}

function refreshProfileEditState() {
  const signedIn = Boolean(currentAuthUser || getCurrentUser());

  if (!personId) {
    profileCanEdit = false;
    profileCanDelete = false;
    setProfileEditState({
      editable: false,
      canDelete: false,
      message: "Open a person profile before editing.",
    });
    return;
  }

  if (!familyId) {
    profileCanEdit = false;
    profileCanDelete = false;
    setProfileEditState({
      editable: false,
      canDelete: false,
      message: "This is the read-only example tree. Open a private family tree to edit people.",
    });
    return;
  }

  if (!signedIn) {
    profileCanEdit = false;
    profileCanDelete = false;
    setProfileEditState({
      editable: false,
      canDelete: false,
      message: "Sign in to edit or remove people in this private family tree.",
    });
    return;
  }

  setProfileEditState({
    editable: false,
    canDelete: false,
    message: "Checking edit access...",
  });

  const user = currentAuthUser || getCurrentUser();
  Promise.all([
    currentUserCanEditProfile(user, familyId),
    currentUserCanDeleteProfile(user, familyId),
  ]).then(([canEdit, canDelete]) => {
    profileCanEdit = canEdit;
    profileCanDelete = canDelete;
    setProfileEditState({
      editable: canEdit,
      canDelete,
      message: canEdit
        ? canDelete
          ? "You can edit this profile because this account has owner access."
          : "You can edit this profile because this account has editor access. Removing people is owner-only for the birthday release."
        : "You can view this profile. Ask the owner for editor access before changing people or photos.",
    });
  }).catch((error) => {
    console.error("Error refreshing edit state:", error);
    profileCanEdit = false;
    profileCanDelete = false;
    setProfileEditState({
      editable: false,
      canDelete: false,
      message: "Could not confirm edit access for this profile.",
    });
  });
}

function getFirstNameForLead(fullName = "") {
  return String(fullName || "This person").trim().split(/\s+/)[0] || "This person";
}

function setLoadedProfileStoryLead({ fullName, parentItems = [], spouseItems = [], children = [], hasBio = false, hasPhoto = false } = {}) {
  const firstName = getFirstNameForLead(fullName);
  const relationshipNotes = [];

  if (parentItems.length > 0) relationshipNotes.push("parents");
  if (spouseItems.length > 0) relationshipNotes.push("partner");
  if (children.length > 0) relationshipNotes.push("children");

  if (profileDemoContext) {
    setProfileStoryLead(`This read-only demo shows how ${firstName}'s private family profile can collect relatives, birthday details, and story notes in one place.`);
    return;
  }

  if (relationshipNotes.length > 0 || hasBio || hasPhoto) {
    const pieces = [];
    if (relationshipNotes.length > 0) pieces.push("family relationships");
    if (hasBio) pieces.push("a story note");
    if (hasPhoto) pieces.push("a photo");
    setProfileStoryLead(`${firstName}'s profile has ${pieces.join(", ")}. Add memories over time so this page feels more personal.`);
    return;
  }

  setProfileStoryLead(`${firstName}'s profile is ready for family context: a photo, birthday, relationships, or a favorite memory.`);
}

function fillRelationshipSelect(select, people, selectedId, placeholder) {
  if (!select) return;

  select.replaceChildren();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = placeholder;
  select.appendChild(emptyOption);

  filterActivePeople(people)
    .filter(person => person.id !== personId)
    .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)))
    .forEach(person => {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = getRelationshipOptionLabel(person);
      select.appendChild(option);
    });

  select.value = [...select.options].some(option => option.value === selectedId) ? selectedId : "";
}

function getPersonBirthYear(person) {
  const birthDate = person?.birthDate;
  if (!birthDate) return "";
  if (typeof birthDate.toDate === "function") {
    return String(birthDate.toDate().getFullYear());
  }
  if (birthDate instanceof Date) {
    return String(birthDate.getFullYear());
  }
  const parsedDate = new Date(birthDate);
  return Number.isNaN(parsedDate.getTime()) ? "" : String(parsedDate.getFullYear());
}

function getRelationshipOptionLabel(person) {
  const name = getDisplayName(person);
  const birthYear = getPersonBirthYear(person);
  return birthYear ? `${name} - born ${birthYear}` : name;
}

function resolveLegacyPersonId(name) {
  return findPersonByNameString(name, allPeople)?.id || "";
}

function getDirectParentIds(person) {
  return resolvePersonParentIds(person, allPeople);
}

function isDescendantOf(candidateId, ancestorId, visited = new Set()) {
  if (!candidateId || !ancestorId || visited.has(candidateId)) return false;
  visited.add(candidateId);

  const candidate = allPeople.find(person => person.id === candidateId);
  if (!candidate) return false;

  const parentIds = getDirectParentIds(candidate);
  if (parentIds.includes(ancestorId)) return true;

  return parentIds.some(parentId => isDescendantOf(parentId, ancestorId, visited));
}

async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  personId = params.get("person");
  profileSource = getProfileSourceFromParams(params);
  
  familyId = resolveProfileFamilyId(params);
  setPublicDemoBannerVisible(Boolean(profileDemoContext));
  updateBackLink();

  if (!personId) {
    setProfileUnavailable({
      title: "Choose a family member",
      status: "This profile link is missing a person. Go back and open someone from the tree or search results.",
      editMessage: "Open a person profile before editing.",
      birthday: "Not selected yet",
      parents: "Not selected yet",
      spouse: "Not selected yet",
      children: "Not selected yet",
      bio: "No profile is selected yet.",
      funFact: "Open a family member to see their birthday note.",
      storyLead: "Open a person from the family map or People Directory to see their details here.",
    });
    return;
  }

  try {
    if (familyId) {
      currentAuthUser = await getAuthUserOnce();
      if (!currentAuthUser) {
        setProfileUnavailable({
          title: "Sign in to view this profile",
          status: "This person belongs to a private family tree.",
          editMessage: "Sign in with an invited account before viewing or editing this private profile.",
          birthday: "Private",
          parents: "Sign in to continue.",
          spouse: "Private",
          children: "Private",
          bio: "This profile belongs to a private family tree.",
          funFact: "Sign in with an invited account to see the full profile.",
          storyLead: "This private profile is protected until an invited family account signs in.",
        });
        return;
      }
    }

    let docRef;
    let docSnap;
    let generatedDemoPerson = null;
    
    if (familyId) {
      docRef = doc(db, "people", personId);
      docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setProfileUnavailable({
          title: "Profile not found",
          status: "That person is not in this family tree, or the profile was removed.",
          editMessage: "Open another person from Family Tree.",
          bio: "No matching profile was found in this family tree.",
          funFact: "Return to the tree and choose another person.",
          storyLead: "This profile link no longer matches a person in the selected family tree.",
        });
        return;
      }

      if (docSnap.exists() && docSnap.data().familyId !== familyId) {
        setProfileUnavailable({
          title: "Profile not found",
          status: "That person does not belong to the selected family tree.",
          editMessage: "Return to the family tree and open a person from that tree.",
          bio: "This profile link does not match the selected family tree.",
          funFact: "Return to the tree and choose another person.",
          storyLead: "This profile was opened with the wrong family context.",
        });
        return;
      }
    }
    
    if (!familyId) {
      if (shouldUseGeneratedDemoProfile()) {
        generatedDemoPerson = findGeneratedDemoPerson(personId);
      }

      if (!generatedDemoPerson) {
        docRef = doc(db, "example", personId);
        docSnap = await getDoc(docRef);
      }
      collectionName = "example";
    } else {
      collectionName = "people";
    }

    if (!generatedDemoPerson && !docSnap.exists()) {
      setProfileUnavailable({
        title: "Profile not found",
        status: "That profile could not be found.",
        editMessage: "Open another person from Family Tree.",
        bio: "No matching profile was found.",
        funFact: "Return to the tree and choose another person.",
        storyLead: "This profile link is missing matching person data.",
      });
      return;
    }

    const data = generatedDemoPerson || docSnap.data();
    const person = { id: personId, ...data };
    currentProfileImageUrl = data.image || "";

    if (familyId && isDeletedPerson(person)) {
      setProfileUnavailable({
        title: "This profile has been removed",
        status: "This person is hidden from the active family tree.",
        editMessage: "Removed profiles cannot be edited from this page.",
        birthday: "Removed from active tree",
        parents: "Hidden from active tree",
        spouse: "Hidden from active tree",
        children: "Hidden from active tree",
        bio: "This person is hidden from the active family tree.",
        funFact: "Restore this person from a future owner tool before viewing birthday notes.",
        storyLead: "This removed profile is not part of the active family tree view.",
      });
      return;
    }
    

    if (!familyId && data.familyId && !profileDemoContext) {
      familyId = data.familyId;
      updateBackLink();
    }

    refreshProfileEditState();

    // NAME
    const fullName = toTitleFullName(data.firstName || "", data.lastName || "");
    document.getElementById("name").textContent = fullName || "Unnamed";
    setProfileStatus("");

    // BIRTHDATE
    const hasBirthday = Boolean(data.birthDate && typeof data.birthDate.toDate === "function");
    if (hasBirthday) {
      setFactText("birthDate", data.birthDate
        .toDate()
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }));
    } else {
      setFactText("birthDate", "Birthday not listed yet.", { empty: true });
    }

    allPeople = shouldUseGeneratedDemoProfile() ? generateLargeDemoTree() : await getAllPeople(familyId);

    // PARENTS
    const parentIds = resolvePersonParentIds(person, allPeople);
    const parentItems = parentIds
      .map(parentId => allPeople.find(person => person.id === parentId))
      .filter(Boolean)
      .map(parent => ({ person: parent }));

    if (parentItems.length === 0) {
      [data.parent1, data.parent2].filter(Boolean).forEach(parentName => {
        const matchedParent = findPersonByNameString(parentName, allPeople);
        if (matchedParent) {
          parentItems.push({ person: matchedParent });
          return;
        }

        const parts = parentName.split(" ");
        if (parts.length >= 2) {
          parentItems.push({ label: toTitleFullName(parts[0], parts.slice(1).join(" ")) });
        } else {
          parentItems.push({ label: toTitle(parentName) });
        }
      });
    }

    renderRelationshipList("parents", parentItems, EMPTY_RELATIONSHIP_LABEL, "and");

    // SPOUSE
    const spouseIds = resolvePersonSpouseIds(person, allPeople);
    const spouseItems = spouseIds
      .map(spouseId => allPeople.find(person => person.id === spouseId))
      .filter(Boolean)
      .map(spouse => ({ person: spouse }));

    const legacySpouseName = toTitleFullName(
      data.spouseFirstName || "",
      data.spouseLastName || ""
    );

    if (spouseItems.length === 0 && legacySpouseName) {
      const matchedSpouse = findPersonByNameString(
        buildFullName(data.spouseFirstName, data.spouseLastName),
        allPeople
      );
      spouseItems.push(matchedSpouse ? { person: matchedSpouse } : { label: legacySpouseName });
    }

    renderRelationshipList("spouse", spouseItems, EMPTY_RELATIONSHIP_LABEL, "and");

    // CHILDREN
    const children = getChildren(person, allPeople);
    renderRelationshipList(
      "children",
      children.map(child => ({ person: child })),
      EMPTY_RELATIONSHIP_LABEL
    );

    // BIO
    setFactText(
      "bio",
      data.bio || EMPTY_BIO_LABEL,
      { empty: !data.bio }
    );

    setProfilePhoto(data.image, {
      name: fullName,
      placeholderTitle: "No photo yet",
      placeholderText: profileDemoContext
        ? "Photo can be added in a private family tree."
        : "Add a portrait, snapshot, or family memory when you have one.",
    });

    setLoadedProfileStoryLead({
      fullName,
      parentItems,
      spouseItems,
      children,
      hasBio: Boolean(data.bio),
      hasPhoto: Boolean(data.image),
    });

    setProfileMemoryPanel({
      fullName,
      hasBirthday,
      hasBio: Boolean(data.bio),
      hasPhoto: Boolean(data.image),
      parentItems,
      spouseItems,
      children,
    });

    // FUN FACT
    if (hasBirthday) {
        const birthDate = data.birthDate.toDate();
        await fetchFunFact(birthDate);
    } else {
        setFactText("funFact", "Add a birthday to show a birthday note here.", { empty: true });
    }


    // --- FILL EDIT FORM IF IT EXISTS ---
    const editFirstName  = document.getElementById("editFirstName");
    const editMiddleInit = document.getElementById("editMiddleInitial");
    const editLastName   = document.getElementById("editLastName");
    const editBirthDate  = document.getElementById("editBirthDate");
    const editParent1    = document.getElementById("editParent1");
    const editParent2    = document.getElementById("editParent2");
    const editSpouse     = document.getElementById("editSpouse");
    const editBio        = document.getElementById("editBio");
    const editImageUrl   = document.getElementById("editImageUrl");
    const removeImage    = document.getElementById("removeImage");

    if (editFirstName) {
        editFirstName.value = toTitle(data.firstName || "");
    }

    if (editMiddleInit) {
        editMiddleInit.value = (data.middleInitial || "").toUpperCase();
    }

    if (editLastName) {
        editLastName.value = toTitle(data.lastName || "");
    }

    const selectedParent1Id = parentIds[0] || resolveLegacyPersonId(data.parent1);
    const selectedParent2Id = parentIds[1] || resolveLegacyPersonId(data.parent2);
    const selectedSpouseId = spouseIds[0] || resolveLegacyPersonId(
      buildFullName(data.spouseFirstName, data.spouseLastName)
    );

    fillRelationshipSelect(editParent1, allPeople, selectedParent1Id, "None listed");
    fillRelationshipSelect(editParent2, allPeople, selectedParent2Id, "None listed");
    fillRelationshipSelect(editSpouse, allPeople, selectedSpouseId, "None listed");

    if (editBio) {
        editBio.value = data.bio || "";
    }

    if (editImageUrl) {
        editImageUrl.value = String(data.image || "").startsWith("https://") ? data.image : "";
    }

    if (removeImage) {
        removeImage.checked = false;
    }

    // Birthdate
    if (editBirthDate && data.birthDate && typeof data.birthDate.toDate === "function") {
        const d = data.birthDate.toDate();
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, "0");
        const dd   = String(d.getDate()).padStart(2, "0");
        editBirthDate.value = `${yyyy}-${mm}-${dd}`;
    }


  } catch (error) {
    console.error("Error loading profile:", error);
    setProfileUnavailable({
      title: "Could not load profile",
      status: "This profile could not load. Refresh the page, then confirm this account can access the selected family tree.",
      editMessage: "Profile editing is unavailable until this profile loads.",
      bio: "The profile data could not be loaded.",
    });
  }
}

function updateBackLink() {
  const backLink = document.getElementById("profileBackLink");
  if (!backLink) return;

  const source = PROFILE_SOURCE_ROUTES[profileSource] ? profileSource : "tree";
  const { path, label } = PROFILE_SOURCE_ROUTES[source];
  const params = new URLSearchParams(window.location.search);
  const searchQuery = params.get("query") || params.get("searchQuery") || "";
  const directorySort = params.get("sort") || "";
  const treeQuery = params.get("treeQuery") || "";
  const backParams = new URLSearchParams();

  if (familyId) {
    backParams.set("familyId", familyId);
  } else if (profileDemoContext) {
    backParams.set("demo", profileDemoContext);
  }

  if (source === "search" && searchQuery) {
    backParams.set("query", searchQuery);
  }

  if (source === "search" && directorySort) {
    backParams.set("sort", directorySort);
  }

  if (source === "tree" && treeQuery) {
    backParams.set("treeQuery", treeQuery);
  }

  if (source === "tree" && personId) {
    backParams.set("focus", personId);
  }

  const returnView = getReturnTreeView();
  if (source === "tree" && returnView) {
    backParams.set("view", returnView);
  }

  backLink.textContent = label;
  const queryString = backParams.toString();
  backLink.href = queryString ? `${path}?${queryString}` : path;
  backLink.title = source === "search"
    ? "Return to the People Directory with your search and sort context."
    : "Return to the family tree with this person focused.";
  backLink.setAttribute("aria-label", backLink.title);
}

function createRelationshipLink(person) {
  const link = document.createElement("a");
  const currentParams = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  params.set("person", person.id);
  if (familyId) {
    params.set("familyId", familyId);
  } else if (profileDemoContext) {
    params.set("demo", profileDemoContext);
  }
  params.set("from", profileSource === "search" ? "search" : "tree");
  if (profileSource === "search") {
    const searchQuery = currentParams.get("query") || currentParams.get("searchQuery") || "";
    const directorySort = currentParams.get("sort") || "";
    if (searchQuery) params.set("query", searchQuery);
    if (directorySort) params.set("sort", directorySort);
  } else {
    const treeQuery = getDisplayName(person) || currentParams.get("treeQuery") || "";
    if (treeQuery) params.set("treeQuery", treeQuery);
  }
  const returnView = getReturnTreeView();
  if (returnView) {
    params.set("view", returnView);
  }

  link.href = `/profile?${params.toString()}`;
  link.className = "profile-relation-link";
  link.textContent = getDisplayName(person);
  link.title = `Open ${getDisplayName(person)}'s profile`;
  link.setAttribute("aria-label", link.title);
  return link;
}

function renderRelationshipList(elementId, items, emptyText, joinWord = "and") {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.replaceChildren();

  const cleanItems = items.filter(item => item?.person || item?.label);
  if (cleanItems.length === 0) {
    element.textContent = emptyText;
    element.classList.add("is-empty");
    return;
  }

  element.classList.remove("is-empty");
  cleanItems.forEach((item, index) => {
    if (index > 0) {
      element.append(index === cleanItems.length - 1 && cleanItems.length === 2 ? ` ${joinWord} ` : ", ");
    }

    if (item.person) {
      element.appendChild(createRelationshipLink(item.person));
    } else {
      const label = document.createElement("span");
      label.className = "profile-relation-label";
      label.textContent = item.label;
      element.append(label);
    }
  });
}

function getModalFocusableElements(modal) {
  return [...modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(element => element.offsetParent !== null);
}

function setEditFieldInvalid(input, isInvalid) {
  if (!input) return;
  input.toggleAttribute("aria-invalid", isInvalid);
}

function showEditValidationError(message, input = null) {
  setProfileStatus(message);
  setEditFieldInvalid(input, true);
  input?.focus();
}

function clearEditValidationState() {
  editForm?.querySelectorAll("[aria-invalid='true']").forEach(input => {
    input.removeAttribute("aria-invalid");
  });
}

function hideModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.hidden = true;
}

async function uploadProfileImage(currentFamilyId, currentPersonId, imageFile) {
  const preparedFile = await prepareImageFileForUpload(imageFile);
  const uploaderId = getCurrentUser()?.uid;
  if (!uploaderId) {
    throw new Error("Sign in before uploading a profile photo.");
  }
  const imagePath = `families/${currentFamilyId}/people/${currentPersonId}/uploads/${uploaderId}/${Date.now()}-${safeImageFileName(preparedFile.name)}.${getImageFileExtension(preparedFile)}`;
  const imageRef = ref(storage, imagePath);

  await uploadBytes(imageRef, preparedFile, getImageUploadMetadata(preparedFile));
  return getDownloadURL(imageRef);
}

function getManagedProfileImagePath(imageUrl, currentFamilyId, currentPersonId) {
  if (!imageUrl || !currentFamilyId || !currentPersonId) return "";

  try {
    const parsedUrl = new URL(imageUrl);
    const encodedPath = parsedUrl.pathname.split("/o/")[1];
    if (!encodedPath) return "";

    const storagePath = decodeURIComponent(encodedPath.split("?")[0]);
    const expectedPrefix = `families/${currentFamilyId}/people/${currentPersonId}/`;
    return storagePath.startsWith(expectedPrefix) ? storagePath : "";
  } catch (error) {
    return "";
  }
}

async function deleteManagedProfileImage(imageUrl, currentFamilyId, currentPersonId) {
  const storagePath = getManagedProfileImagePath(imageUrl, currentFamilyId, currentPersonId);
  if (!storagePath) return;

  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    console.warn("Could not delete old profile image from Storage:", error);
  }
}

function getPhotoUploadErrorMessage(error) {
  const message = String(error?.message || "");
  if (/unauthorized|permission/i.test(message)) {
    return "Firebase Storage blocked that photo. Confirm this account has editor access, then try a JPG, PNG, WebP, or GIF under 5 MB.";
  }
  return message || "Photo upload failed. Use a JPG, PNG, WebP, or GIF under 5 MB.";
}



const editForm = document.getElementById("editPersonForm");

if (editForm) {
  editForm.noValidate = true;

  editForm.addEventListener("input", (event) => {
    setEditFieldInvalid(event.target, false);
  });

  editForm.addEventListener("change", (event) => {
    setEditFieldInvalid(event.target, false);
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearEditValidationState();
    const submitButton = editForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    function finishSubmit() {
      if (submitButton) submitButton.disabled = false;
    }

    if (!personId) {
      console.error("No personId set for editing");
      finishSubmit();
      return;
    }

    if (!familyId || !getCurrentUser()) {
      setProfileStatus("Sign in and open a private family tree before editing people.");
      finishSubmit();
      return;
    }

    const canEditNow = profileCanEdit || await currentUserCanEditProfile(getCurrentUser(), familyId);

    if (!canEditNow) {
      setProfileStatus("Only the owner and editors can change people or photos.");
      refreshProfileEditState();
      finishSubmit();
      return;
    }

    const rawFirstName      = document.getElementById("editFirstName").value.trim();
    const rawMiddleInitial  = document.getElementById("editMiddleInitial").value.trim();
    const rawLastName       = document.getElementById("editLastName").value.trim();
    const parent1Id         = document.getElementById("editParent1").value;
    const parent2Id         = document.getElementById("editParent2").value;
    const spouseId          = document.getElementById("editSpouse").value;
    const birthDateRaw      = document.getElementById("editBirthDate").value; // "YYYY-MM-DD"
    const rawBio            = document.getElementById("editBio").value.trim();
    const rawImageUrl       = document.getElementById("editImageUrl")?.value.trim() || "";
    const removeImage       = document.getElementById("removeImage")?.checked || false;
    const imageFileInput    = document.getElementById("editImageFile");
    const imageFile         = imageFileInput && imageFileInput.files[0];

    const firstName     = rawFirstName.toLowerCase();
    const middleInitial = rawMiddleInitial.toLowerCase();
    const lastName      = rawLastName.toLowerCase();

    const selectedParent1 = allPeople.find(person => person.id === parent1Id);
    const selectedParent2 = allPeople.find(person => person.id === parent2Id);
    const selectedSpouse = allPeople.find(person => person.id === spouseId);

    if (!rawFirstName) {
      showEditValidationError("First name is required.", document.getElementById("editFirstName"));
      finishSubmit();
      return;
    }

    if (!rawLastName) {
      showEditValidationError("Last name is required.", document.getElementById("editLastName"));
      finishSubmit();
      return;
    }

    if (parent1Id && parent2Id && parent1Id === parent2Id) {
      setEditFieldInvalid(document.getElementById("editParent1"), true);
      showEditValidationError("Choose two different parents, or leave one blank.", document.getElementById("editParent2"));
      finishSubmit();
      return;
    }

    if (
      (parent1Id && isDescendantOf(parent1Id, personId)) ||
      (parent2Id && isDescendantOf(parent2Id, personId))
    ) {
      if (parent1Id && isDescendantOf(parent1Id, personId)) {
        setEditFieldInvalid(document.getElementById("editParent1"), true);
      }
      if (parent2Id && isDescendantOf(parent2Id, personId)) {
        setEditFieldInvalid(document.getElementById("editParent2"), true);
      }
      showEditValidationError("Choose someone who is not already this person's child or descendant.", document.getElementById("editParent1"));
      finishSubmit();
      return;
    }

    const parentIds = [...new Set([selectedParent1?.id, selectedParent2?.id].filter(Boolean))];
    const spouseIds = selectedSpouse ? [selectedSpouse.id] : [];
    const parent1 = selectedParent1 ? buildFullName(selectedParent1.firstName, selectedParent1.lastName) : "";
    const parent2 = selectedParent2 ? buildFullName(selectedParent2.firstName, selectedParent2.lastName) : "";
    const normalizedImageUrl = normalizeImageUrl(rawImageUrl);

    if (rawImageUrl && !normalizedImageUrl) {
      showEditValidationError("Use a secure https:// photo URL, or upload an image file instead.", document.getElementById("editImageUrl"));
      finishSubmit();
      return;
    }

    if (rawImageUrl && imageFile) {
      setEditFieldInvalid(document.getElementById("editImageUrl"), true);
      showEditValidationError("Choose either a photo URL or an upload, not both.", imageFileInput);
      finishSubmit();
      return;
    }

    const isReplacingUrlWhileRemoving = Boolean(removeImage && rawImageUrl && rawImageUrl !== currentProfileImageUrl);
    if (removeImage && (isReplacingUrlWhileRemoving || imageFile)) {
      setEditFieldInvalid(document.getElementById("removeImage"), true);
      showEditValidationError("Choose either a new photo or remove the current one.", isReplacingUrlWhileRemoving ? document.getElementById("editImageUrl") : imageFileInput);
      finishSubmit();
      return;
    }

    let spouseFirstName = "";
    let spouseLastName  = "";

    if (selectedSpouse) {
      spouseFirstName = selectedSpouse.firstName || "";
      spouseLastName  = selectedSpouse.lastName || "";
    }

    let birthDate = null;
    if (birthDateRaw) {
      const [yearStr, monthStr, dayStr] = birthDateRaw.split("-");
      const year  = Number(yearStr);
      const month = Number(monthStr) - 1;
      const day   = Number(dayStr);

      const jsDate = new Date(year, month, day);
      birthDate = Timestamp.fromDate(jsDate);
    }

    const previousImageUrl = currentProfileImageUrl;
    let imageUrl = removeImage ? null : normalizedImageUrl || null;

    if (imageFile) {
      try {
        setProfileStatus("Uploading photo...");
        imageUrl = await uploadProfileImage(familyId, personId, imageFile);
      } catch (err) {
        console.error("Error uploading image:", err);
        setProfileStatus(getPhotoUploadErrorMessage(err));
        finishSubmit();
        return;
      }
    }

    const personData = {
      firstName,
      lastName,
      middleInitial: middleInitial || deleteField(),
      birthDate: birthDate || deleteField(),
      parent1: parent1 || deleteField(),
      parent2: parent2 || deleteField(),
      parentIds: parentIds.length ? parentIds : deleteField(),
      spouseFirstName: spouseFirstName || deleteField(),
      spouseLastName: spouseLastName || deleteField(),
      spouseIds: spouseIds.length ? spouseIds : deleteField(),
      bio: rawBio || deleteField(),
    };

    if (imageUrl) {
      personData.image = imageUrl;
    } else if (removeImage) {
      personData.image = deleteField();
    }

    try {
      setProfileStatus("Saving profile...");
      const personRef = doc(db, collectionName, personId);
      await updateDoc(personRef, personData);

      const imageWasReplaced = Boolean(
        previousImageUrl &&
        imageUrl &&
        previousImageUrl !== imageUrl
      );
      const imageWasRemoved = Boolean(previousImageUrl && removeImage);
      if (imageWasReplaced || imageWasRemoved) {
        await deleteManagedProfileImage(previousImageUrl, familyId, personId);
      }

      setProfileStatus("Profile saved. Reloading...");
      const modal = document.getElementById("editPersonModal");
      hideModal(modal);

      window.location.reload();
    } catch (error) {
      console.error("Error updating person:", error);
      setProfileStatus("Could not save profile changes. Check editor access and try again.");
      finishSubmit();
    }
  });
}

async function fetchFunFact(birthDate) {
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  setFactText("funFact", `Born on ${monthNames[month - 1]} ${day}. Add a story, photo, or memory to make this profile feel more personal.`);
}

function setupEditPersonModal() {
  const modal    = document.getElementById("editPersonModal");
  const btn      = document.getElementById("editPersonBtn");
  const closeBtn = modal?.querySelector(".close");
  const modalContent = modal?.querySelector(".modal-content");
  let previouslyFocusedElement = null;

  if (!modal || !btn) return;

  function openModal() {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : btn;
    modal.hidden = false;
    modal.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    const firstNameInput = document.getElementById("editFirstName");
    if (firstNameInput && !firstNameInput.disabled) {
      firstNameInput.focus();
      return;
    }
    modalContent?.focus();
  }

  function closeModal() {
    hideModal(modal);
    btn.setAttribute("aria-expanded", "false");
    if (previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
      previouslyFocusedElement.focus();
    } else {
      btn.focus();
    }
  }

  btn.addEventListener("click", openModal);

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getModalFocusableElements(modal);
    if (focusableElements.length === 0) {
      event.preventDefault();
      modalContent?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  window.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  if (new URLSearchParams(window.location.search).get("edit") === "1") {
    let attempts = 0;
    const tryOpenRequestedEdit = () => {
      attempts += 1;
      if (!btn.hidden && profileCanEdit) {
        openModal();
        return;
      }
      if (attempts < 20) {
        window.setTimeout(tryOpenRequestedEdit, 250);
      }
    };
    window.setTimeout(tryOpenRequestedEdit, 250);
  }
}


// DELETE BUTTON
const deletePersonBtn = document.getElementById("deletePersonBtn");
if (deletePersonBtn) {
  deletePersonBtn.addEventListener("click", async () => {
    if (!personId) return;
    if (!familyId || !getCurrentUser()) {
      setProfileStatus("Sign in and open a private family tree before removing people.");
      return;
    }

    const canDeleteNow = profileCanDelete || await currentUserCanDeleteProfile(getCurrentUser(), familyId);
    if (!canDeleteNow) {
      setProfileStatus("Only the tree owner can remove people for the birthday release.");
      refreshProfileEditState();
      return;
    }

    const confirmDelete = confirm(
      "Remove this person from the active tree? This will hide them from the tree and directory."
    );
    if (!confirmDelete) return;

    try {
      setProfileStatus("Removing person...");
      await updateDoc(doc(db, "people", personId), {
        deletedAt: serverTimestamp(),
        deletedBy: getCurrentUser().uid,
        deletedSource: "profile",
      });
      const returnParams = new URLSearchParams();
      if (familyId) {
        returnParams.set("familyId", familyId);
      }
      const returnView = getReturnTreeView();
      if (returnView) {
        returnParams.set("view", returnView);
      }
      const treeQuery = new URLSearchParams(window.location.search).get("treeQuery") || "";
      if (treeQuery) {
        returnParams.set("treeQuery", treeQuery);
      }
      const redirectQuery = returnParams.toString();
      const redirectUrl = redirectQuery ? `/tree?${redirectQuery}` : "/tree";
      setProfileStatus("Person removed from the active tree.");
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error removing person from active tree:", error);
      setProfileStatus("Could not remove this person. Confirm owner access and try again.");
    }
  });
}

// Load the profile when the page opens
if (document.getElementById("profileCard")) {
  loadProfile();
  setupEditPersonModal();
  watchAuth((user) => {
    currentAuthUser = user;
    refreshProfileEditState();
  });
}
