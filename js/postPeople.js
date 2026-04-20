import { db } from "./firebase.js";
import {
  addDoc,
  collection,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import {
  buildFullName,
  getAllPeople,
  getCurrentFamilyId,
  getDisplayName,
} from "./helpers.js";

const form = document.getElementById("addPersonForm");
const statusEl = document.getElementById("addPersonStatus");
let peopleOptions = [];

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
    select.innerHTML = `<option value="">${placeholder}</option>`;

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
  peopleOptions = await getAllPeople(familyId);
  populateRelationshipSelects(peopleOptions);
}

refreshRelationshipOptions().catch(error => {
  console.error("Error loading relationship options:", error);
});

if(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (statusEl) statusEl.textContent = "Saving family member...";

    // Get familyId from URL if present
    const familyId = getCurrentFamilyId();

    // ----- GET & CLEAN INPUT VALUES -----
    const rawFirstName   = document.getElementById("firstName").value.trim();
    const rawMiddleInitial = document.getElementById("middleInitial").value.trim();
    const rawLastName    = document.getElementById("lastName").value.trim();
    const selectedSpouse = getSelectedPerson("spouse");
    const selectedParent1 = getSelectedPerson("parent1");
    const selectedParent2 = getSelectedPerson("parent2");
    const birthDateRaw   = document.getElementById("birthDate").value; // "YYYY-MM-DD"

    if (selectedParent1 && selectedParent2 && selectedParent1.id === selectedParent2.id) {
      if (statusEl) statusEl.textContent = "Choose two different parents, or leave one blank.";
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
    
    if (familyId) {
      personData.familyId = familyId;
    }
    
    // ----- SAVE TO FIRESTORE -----
    try {
      const collectionName = familyId ? "people" : "example";
      await addDoc(collection(db, collectionName), personData);
      form.reset();
      await refreshRelationshipOptions();
      if (statusEl) statusEl.textContent = "Saved. The tree has been updated.";
      window.dispatchEvent(new CustomEvent("person-added"));
    } catch (error) {
      console.error("Error adding person:", error);
      if (statusEl) statusEl.textContent = "Something went wrong while saving.";
      alert("Something went wrong while saving to Firestore.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
  
}
