import { db, storage } from "./firebase.js?v=20260521-6";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-storage.js";
import {
  buildFullName,
  canEditFamily,
  getAllPeople,
  getCurrentFamilyId,
  getDisplayName,
  normalizeImageUrl,
} from "./helpers.js?v=20260521-6";
import { getCurrentUser, watchAuth } from "./auth.js?v=20260521-6";

const form = document.getElementById("addPersonForm");
const statusEl = document.getElementById("addPersonStatus");
let peopleOptions = [];
let currentUser = getCurrentUser();

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function setAddFormDisabled(disabled) {
  if (!form) return;
  form.querySelectorAll("input, select, textarea, button").forEach(control => {
    control.disabled = disabled;
  });
}

function setAddButtonAvailable(isAvailable) {
  const addPersonBtn = document.getElementById("addPersonBtn");
  if (!addPersonBtn) return;
  addPersonBtn.hidden = !isAvailable;
  addPersonBtn.disabled = !isAvailable;
}

async function userCanEditCurrentTree(user, familyId) {
  if (!user || !familyId) return false;

  try {
    const familySnap = await getDoc(doc(db, "families", familyId));
    return familySnap.exists() && canEditFamily(familySnap.data(), user);
  } catch (error) {
    console.error("Error checking tree edit access:", error);
    return false;
  }
}

async function updateAddFormAvailability(user = getCurrentUser()) {
  if (!form) return;

  currentUser = user;
  const familyId = getCurrentFamilyId();

  if (!familyId) {
    setAddFormDisabled(true);
    setAddButtonAvailable(false);
    setStatus("The example tree is read-only. Sign in and open a private tree to add people.");
    return;
  }

  if (!user) {
    setAddFormDisabled(true);
    setAddButtonAvailable(false);
    setStatus("Sign in to add people to this family tree.");
    return;
  }

  const canEdit = await userCanEditCurrentTree(user, familyId);
  setAddFormDisabled(!canEdit);
  setAddButtonAvailable(canEdit);

  if (!canEdit) {
    setStatus("You can view this tree. Ask the owner for editor access before adding people.");
    return;
  }

  setStatus("");
}

function refreshAddFormAvailability(user = currentUser) {
  updateAddFormAvailability(user).catch(error => {
    console.error("Error updating add form availability:", error);
    setAddFormDisabled(true);
    setAddButtonAvailable(false);
    setStatus("Could not confirm edit access for this tree.");
  });
}

function getSelectedPerson(selectId) {
  const select = document.getElementById(selectId);
  if (!select || !select.value) return null;
  return peopleOptions.find(person => person.id === select.value) || null;
}

function populateRelationshipSelects(people) {
  const selects = ["parent1", "parent2", "spouse"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  selects.forEach(select => {
    const currentValue = select.value;
    const placeholder = select.querySelector("option[value='']")?.textContent || "Select Person";
    select.replaceChildren();

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholder;
    select.appendChild(emptyOption);

    people.forEach(person => {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = getDisplayName(person);
      select.appendChild(option);
    });

    select.value = currentValue;
  });
}

async function refreshRelationshipOptions() {
  if (!form) return;
  const familyId = getCurrentFamilyId();
  if (!familyId || !currentUser) {
    peopleOptions = [];
    populateRelationshipSelects(peopleOptions);
    return;
  }

  peopleOptions = await getAllPeople(familyId);
  populateRelationshipSelects(peopleOptions);
}

function safeFileName(fileName) {
  return String(fileName || "profile-photo")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 90);
}

async function uploadPersonImage(familyId, personId, imageFile) {
  const imagePath = `families/${familyId}/people/${personId}/${Date.now()}-${safeFileName(imageFile.name)}`;
  const imageRef = ref(storage, imagePath);
  await uploadBytes(imageRef, imageFile);
  return getDownloadURL(imageRef);
}

if (form) {
  refreshAddFormAvailability(currentUser);
  watchAuth((user) => {
    refreshAddFormAvailability(user);
    refreshRelationshipOptions().catch(error => {
      console.error("Error loading relationship options:", error);
      setStatus("Could not load relationship options.");
    });
  });

  window.addEventListener("family-id-changed", () => {
    refreshAddFormAvailability(currentUser);
    refreshRelationshipOptions().catch(error => {
      console.error("Error loading relationship options:", error);
      setStatus("Could not load relationship options.");
    });
  });
}

if(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (statusEl) statusEl.textContent = "Saving family member...";

    // Get familyId from URL if present
    const familyId = getCurrentFamilyId();
    const user = currentUser || getCurrentUser();

    if (!familyId) {
      setStatus("The example tree is read-only. Open a private tree to add people.");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    if (!user) {
      setStatus("Sign in to add people to this family tree.");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    if (!await userCanEditCurrentTree(user, familyId)) {
      setStatus("You can view this tree, but only the owner and editors can add people.");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    // ----- GET & CLEAN INPUT VALUES -----
    const rawFirstName   = document.getElementById("firstName").value.trim();
    const rawMiddleInitial = document.getElementById("middleInitial").value.trim();
    const rawLastName    = document.getElementById("lastName").value.trim();
    const selectedSpouse = getSelectedPerson("spouse");
    const selectedParent1 = getSelectedPerson("parent1");
    const selectedParent2 = getSelectedPerson("parent2");
    const birthDateRaw   = document.getElementById("birthDate").value; // "YYYY-MM-DD"
    const rawBio         = document.getElementById("personBio")?.value.trim() || "";
    const rawImageUrl    = document.getElementById("personImageUrl")?.value.trim() || "";
    const imageFile      = document.getElementById("personImageFile")?.files?.[0] || null;

    if (!rawFirstName || !rawLastName) {
      setStatus("First and last name are required.");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    if (selectedParent1 && selectedParent2 && selectedParent1.id === selectedParent2.id) {
      setStatus("Choose two different parents, or leave one blank.");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    const firstName      = rawFirstName.toLowerCase();
    const middleInitial  = rawMiddleInitial.toLowerCase();
    const lastName       = rawLastName.toLowerCase();

    const parentIds = [...new Set([selectedParent1?.id, selectedParent2?.id].filter(Boolean))];
    const spouseIds = selectedSpouse ? [selectedSpouse.id] : [];
    const parent1 = selectedParent1 ? buildFullName(selectedParent1.firstName, selectedParent1.lastName) : "";
    const parent2 = selectedParent2 ? buildFullName(selectedParent2.firstName, selectedParent2.lastName) : "";
    const imageUrl = normalizeImageUrl(rawImageUrl);

    if (rawImageUrl && !imageUrl) {
      setStatus("Use a secure https:// photo URL, or upload an image file instead.");
      if (submitButton) submitButton.disabled = false;
      return;
    }
    
    let spouseFirstName = "";
    let spouseLastName = "";

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

    // ----- BUILD PERSON OBJECT (ONLY REQUIRED FIELDS FIRST) -----
    const personData = { 
      firstName,
      lastName
    };

    // Optional fields added only if provided
    if (middleInitial)    personData.middleInitial    = middleInitial;
    if (birthDate)        personData.birthDate        = birthDate;
    if (parent1)          personData.parent1          = parent1;
    if (parent2)          personData.parent2          = parent2;
    if (parentIds.length) personData.parentIds        = parentIds;
    if (spouseFirstName)  personData.spouseFirstName  = spouseFirstName;
    if (spouseLastName)   personData.spouseLastName   = spouseLastName;
    if (spouseIds.length) personData.spouseIds        = spouseIds;
    if (rawBio)           personData.bio              = rawBio;
    if (imageUrl)         personData.image            = imageUrl;
    
    if (familyId) {
      personData.familyId = familyId;
    }
    
    // ----- SAVE TO FIRESTORE -----
    try {
      const collectionName = familyId ? "people" : "example";
      if (imageFile) {
        const personRef = doc(collection(db, collectionName));
        try {
          personData.image = await uploadPersonImage(familyId, personRef.id, imageFile);
        } catch (error) {
          console.error("Error uploading person photo:", error);
          setStatus("Photo upload failed, so the profile is being saved without the photo.");
        }
        await setDoc(personRef, personData);
      } else {
        await addDoc(collection(db, collectionName), personData);
      }
      form.reset();
      await refreshRelationshipOptions();
      setStatus(`Saved ${rawFirstName} ${rawLastName}. The tree has been updated.`);
      window.dispatchEvent(new CustomEvent("person-added"));
    } catch (error) {
      console.error("Error adding person:", error);
      setStatus("Something went wrong while saving. Check that you are signed in and have access to this tree.");
    } finally {
      if (submitButton) submitButton.disabled = false;
      refreshAddFormAvailability();
    }
  });
  
}
