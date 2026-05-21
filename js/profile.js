// profile.js
import { db, storage } from "./firebase.js?v=20260521-8";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-storage.js";

import { 
  buildFullName,
  canEditFamily,
  findPersonByNameString,
  getDisplayName,
  toTitleFullName, 
  toTitle, 
  getChildren,
  getAllPeople,
  getCurrentFamilyId as getFamilyIdFromHelper,
  getImageFileExtension,
  getImageUploadMetadata,
  normalizeImageUrl,
  prepareImageDataUrl,
  prepareImageFileForUpload,
  safeImageFileName,
} from "./helpers.js?v=20260521-8";
import { getCurrentUser, watchAuth } from "./auth.js?v=20260521-8";


let personId = null;
let familyId = null;
let collectionName = "example";
let allPeople = [];
let currentAuthUser = getCurrentUser();
let profileSource = "tree";
let profileCanEdit = false;

function setProfileStatus(message) {
  const status = document.getElementById("profileStatus");
  if (status) status.textContent = message;
}

function setEditingAvailable(isAvailable) {
  const editBtn = document.getElementById("editPersonBtn");
  const deleteBtn = document.getElementById("deletePersonBtn");

  [editBtn, deleteBtn].forEach(button => {
    if (button) button.hidden = !isAvailable;
  });
}

function setProfileEditState({ editable, message }) {
  const state = document.getElementById("profileEditState");
  if (!state) return;

  state.textContent = message;
  state.classList.toggle("is-editable", editable);
  state.classList.toggle("is-read-only", !editable);
  setEditingAvailable(editable);
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

function refreshProfileEditState() {
  const signedIn = Boolean(currentAuthUser || getCurrentUser());

  if (!personId) {
    profileCanEdit = false;
    setProfileEditState({
      editable: false,
      message: "Open a person profile before editing.",
    });
    return;
  }

  if (!familyId) {
    profileCanEdit = false;
    setProfileEditState({
      editable: false,
      message: "This is the read-only example tree. Open a private family tree to edit people.",
    });
    return;
  }

  if (!signedIn) {
    profileCanEdit = false;
    setProfileEditState({
      editable: false,
      message: "Sign in to edit or remove people in this private family tree.",
    });
    return;
  }

  setProfileEditState({
    editable: false,
    message: "Checking edit access...",
  });

  currentUserCanEditProfile(currentAuthUser || getCurrentUser(), familyId).then((canEdit) => {
    profileCanEdit = canEdit;
    setProfileEditState({
      editable: canEdit,
      message: canEdit
        ? "You can edit this profile because this account has owner or editor access."
        : "You can view this profile. Ask the owner for editor access before changing people or photos.",
    });
  }).catch((error) => {
    console.error("Error refreshing edit state:", error);
    profileCanEdit = false;
    setProfileEditState({
      editable: false,
      message: "Could not confirm edit access for this profile.",
    });
  });
}

function fillRelationshipSelect(select, people, selectedId, placeholder) {
  if (!select) return;

  select.replaceChildren();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = placeholder;
  select.appendChild(emptyOption);

  people
    .filter(person => person.id !== personId)
    .forEach(person => {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = getDisplayName(person);
      select.appendChild(option);
    });

  select.value = selectedId || "";
}

function resolveLegacyPersonId(name) {
  return findPersonByNameString(name, allPeople)?.id || "";
}

function getDirectParentIds(person) {
  if (!person) return [];

  const parentIds = Array.isArray(person.parentIds) ? person.parentIds.filter(Boolean) : [];
  if (parentIds.length > 0) return parentIds;

  return [person.parent1, person.parent2]
    .filter(Boolean)
    .map(parentName => resolveLegacyPersonId(parentName))
    .filter(Boolean);
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
  profileSource = params.get("from") === "search" ? "search" : "tree";
  
  familyId = params.get("familyId") || getFamilyIdFromHelper();
  updateBackLink();

  if (!personId) {
    document.getElementById("name").textContent =
      "No person ID provided in URL.";
    refreshProfileEditState();
    return;
  }

  try {
    let docRef;
    let docSnap;
    
    if (familyId) {
      docRef = doc(db, "people", personId);
      docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        document.getElementById("name").textContent = "Profile not found in this family tree.";
        refreshProfileEditState();
        return;
      }

      if (docSnap.exists() && docSnap.data().familyId !== familyId) {
        document.getElementById("name").textContent = "Profile not found in this family tree.";
        refreshProfileEditState();
        return;
      }
    }
    
    if (!familyId) {
      docRef = doc(db, "example", personId);
      docSnap = await getDoc(docRef);
      collectionName = "example";
    } else {
      collectionName = "people";
    }

    if (!docSnap.exists()) {
      document.getElementById("name").textContent = "Profile not found.";
      refreshProfileEditState();
      return;
    }

    const data = docSnap.data();
    const person = { id: personId, ...data };
    

    if (!familyId && data.familyId) {
      familyId = data.familyId;
      updateBackLink();
    }

    refreshProfileEditState();

    // NAME
    const fullName = toTitleFullName(data.firstName || "", data.lastName || "");
    document.getElementById("name").textContent = fullName || "Unnamed";

    // BIRTHDATE
    const birthDateEl = document.getElementById("birthDate");
    if (data.birthDate && typeof data.birthDate.toDate === "function") {
      birthDateEl.textContent = data.birthDate
        .toDate()
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
    } else {
      birthDateEl.textContent = "Unknown";
    }

    allPeople = await getAllPeople(familyId);

    // PARENTS
    const parentIds = Array.isArray(data.parentIds) ? data.parentIds : [];
    const parentsList = parentIds
      .map(parentId => allPeople.find(person => person.id === parentId))
      .filter(Boolean)
      .map(getDisplayName);

    if (parentsList.length === 0) {
      [data.parent1, data.parent2].filter(Boolean).forEach(parentName => {
        const matchedParent = findPersonByNameString(parentName, allPeople);
        if (matchedParent) {
          parentsList.push(getDisplayName(matchedParent));
          return;
        }

        const parts = parentName.split(" ");
        if (parts.length >= 2) {
          parentsList.push(toTitleFullName(parts[0], parts.slice(1).join(" ")));
        } else {
          parentsList.push(toTitle(parentName));
        }
      });
    }

    document.getElementById("parents").textContent =
      parentsList.length > 0 ? parentsList.join(" and ") : "Unknown";

    // SPOUSE
    const spouseIds = Array.isArray(data.spouseIds) ? data.spouseIds : [];
    const spouseName = spouseIds
      .map(spouseId => allPeople.find(person => person.id === spouseId))
      .filter(Boolean)
      .map(getDisplayName)
      .join(", ") || toTitleFullName(
        data.spouseFirstName || "",
        data.spouseLastName || ""
      );

    document.getElementById("spouse").textContent =
      spouseName || "No spouse listed.";

    // CHILDREN
    const children = getChildren(person, allPeople);
    if (children.length > 0) {
      const childrenNames = children.map(child => 
        toTitleFullName(child.firstName || "", child.lastName || "")
      );
      document.getElementById("children").textContent = childrenNames.join(", ");
    } else {
      document.getElementById("children").textContent = "No children.";
    }

    // BIO
    document.getElementById("bio").textContent =
      data.bio || "No bio available.";

      const profileImgEl = document.getElementById("profileImage");
      const profileCardEl = document.getElementById("profileCard");

      if (profileImgEl) {
        if (data.image) {
          profileImgEl.src = data.image;
          profileImgEl.style.display = "block";
          if (profileCardEl) profileCardEl.classList.remove("no-photo");
        } else {
          profileImgEl.style.display = "none";
          if (profileCardEl) profileCardEl.classList.add("no-photo");
        }
      }

    // FUN FACT
    if (data.birthDate && typeof data.birthDate.toDate === "function") {
        const birthDate = data.birthDate.toDate();
        await fetchFunFact(birthDate);
    } else {
        document.getElementById("funFact").textContent = "No birthdate available for fun fact.";
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

    fillRelationshipSelect(editParent1, allPeople, selectedParent1Id, "Select Parent 1");
    fillRelationshipSelect(editParent2, allPeople, selectedParent2Id, "Select Parent 2");
    fillRelationshipSelect(editSpouse, allPeople, selectedSpouseId, "Select Spouse");

    if (editBio) {
        editBio.value = data.bio || "";
    }

    if (editImageUrl) {
        editImageUrl.value = data.image || "";
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
    document.getElementById("name").textContent =
      "Error loading profile.";
    refreshProfileEditState();
  }
}

function updateBackLink() {
  const backLink = document.getElementById("profileBackLink");
  if (!backLink) return;

  const path = profileSource === "search" ? "/search" : "/tree";
  const label = profileSource === "search" ? "Back to Search" : "Back to Family Tree";

  backLink.textContent = label;
  backLink.href = familyId
    ? `${path}?familyId=${encodeURIComponent(familyId)}`
    : path;
}

async function uploadProfileImage(currentFamilyId, currentPersonId, imageFile) {
  const preparedFile = await prepareImageFileForUpload(imageFile);
  const imagePath = `families/${currentFamilyId}/people/${currentPersonId}/${Date.now()}-${safeImageFileName(preparedFile.name)}.${getImageFileExtension(preparedFile)}`;
  const imageRef = ref(storage, imagePath);

  try {
    await uploadBytes(imageRef, preparedFile, getImageUploadMetadata(preparedFile));
    return getDownloadURL(imageRef);
  } catch (error) {
    console.warn("Storage upload failed; using embedded profile image fallback.", error);
    return prepareImageDataUrl(preparedFile);
  }
}



const editForm = document.getElementById("editPersonForm");

if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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
    if (parent1Id && parent2Id && parent1Id === parent2Id) {
      setProfileStatus("Choose two different parents, or leave one blank.");
      finishSubmit();
      return;
    }

    if (
      (parent1Id && isDescendantOf(parent1Id, personId)) ||
      (parent2Id && isDescendantOf(parent2Id, personId))
    ) {
      setProfileStatus("Choose someone who is not already this person's child or descendant.");
      finishSubmit();
      return;
    }

    const parentIds = [...new Set([selectedParent1?.id, selectedParent2?.id].filter(Boolean))];
    const spouseIds = selectedSpouse ? [selectedSpouse.id] : [];
    const parent1 = selectedParent1 ? buildFullName(selectedParent1.firstName, selectedParent1.lastName) : "";
    const parent2 = selectedParent2 ? buildFullName(selectedParent2.firstName, selectedParent2.lastName) : "";
    const normalizedImageUrl = normalizeImageUrl(rawImageUrl);

    if (rawImageUrl && !normalizedImageUrl) {
      setProfileStatus("Use a secure https:// photo URL, or upload an image file instead.");
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

    let imageUrl = removeImage ? null : normalizedImageUrl || null;

    if (imageFile) {
      try {
        setProfileStatus("Uploading photo...");
        imageUrl = await uploadProfileImage(familyId, personId, imageFile);
      } catch (err) {
        console.error("Error uploading image:", err);
        setProfileStatus(err.message || "Photo upload failed. Try a smaller JPG/PNG or paste a secure photo URL.");
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

      setProfileStatus("Profile saved. Reloading...");
      const modal = document.getElementById("editPersonModal");
      if (modal) modal.style.display = "none";

      window.location.reload();
    } catch (error) {
      console.error("Error updating person:", error);
      setProfileStatus("Something went wrong while saving changes.");
      finishSubmit();
    }
  });
}

async function fetchFunFact(birthDate) {
  const funFactEl = document.getElementById("funFact");
  funFactEl.textContent = "Loading fun fact...";
  
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  try {
    const apiUrl = `/api/funfact?month=${month}&day=${day}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    funFactEl.textContent = data.text || `On ${monthNames[month - 1]} ${day}, many interesting historical events have occurred throughout history!`;
  } catch (error) {
    console.error("Error fetching fun fact:", error);
    funFactEl.textContent = `On ${monthNames[month - 1]} ${day}, many significant historical events have occurred! Did you know that people born on this date share it with many notable figures throughout history?`;
  }
}

function setupEditPersonModal() {
  const modal    = document.getElementById("editPersonModal");
  const btn      = document.getElementById("editPersonBtn");
  const closeBtn = document.querySelector(".modal .close");

  if (!modal || !btn) return;

  btn.onclick = () => {
    modal.style.display = "block";
  };

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
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

    const canEditNow = profileCanEdit || await currentUserCanEditProfile(getCurrentUser(), familyId);
    if (!canEditNow) {
      setProfileStatus("Only the owner and editors can remove people.");
      refreshProfileEditState();
      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete this person? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      setProfileStatus("Removing person...");
      await deleteDoc(doc(db, collectionName, personId));
      const redirectUrl = familyId ? `/tree?familyId=${familyId}` : "/tree";
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error deleting person:", error);
      setProfileStatus("Failed to delete this person.");
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
