import { db } from "./firebase.js?v=20260612-4";
import {
  collection,
  getDocs,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

/* -----------------------------------
   FAMILY ID PERSISTENCE HELPERS
----------------------------------- */

const FAMILY_ID_STORAGE_KEY = "currentFamilyId";
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ACCESS_CODE_LENGTH = 10;
export const PROFILE_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ALLOWED_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const PROFILE_IMAGE_TYPE_BY_EXTENSION = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};


export function setFamilyId(familyId) {
  const nextFamilyId = familyId || null;
  const previousFamilyId = sessionStorage.getItem(FAMILY_ID_STORAGE_KEY);

  if (previousFamilyId === nextFamilyId) {
    return;
  }

  if (familyId) {
    sessionStorage.setItem(FAMILY_ID_STORAGE_KEY, familyId);
  } else {
    sessionStorage.removeItem(FAMILY_ID_STORAGE_KEY);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("family-id-changed", {
      detail: {
        familyId: nextFamilyId,
      },
    }));
  }
}


export function getStoredFamilyId() {
  return sessionStorage.getItem(FAMILY_ID_STORAGE_KEY);
}


export function clearFamilyId() {
  const previousFamilyId = sessionStorage.getItem(FAMILY_ID_STORAGE_KEY);
  sessionStorage.removeItem(FAMILY_ID_STORAGE_KEY);

  if (previousFamilyId && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("family-id-changed", {
      detail: {
        familyId: null,
      },
    }));
  }
}


export function getCurrentFamilyId(useStored = true) {
  const params = new URLSearchParams(window.location.search);
  const urlFamilyId = params.get("familyId");
  
  if (urlFamilyId) {
    setFamilyId(urlFamilyId);
    return urlFamilyId;
  }
  
  if (params.has("familyId") && !urlFamilyId) {
    clearFamilyId();
    return null;
  }
  
  if (useStored) {
    const storedFamilyId = getStoredFamilyId();
    return storedFamilyId || null;
  }
  
  return null;
}

export function generateAccessCode(length = ACCESS_CODE_LENGTH) {
  const codeLength = Number.isInteger(length) && length > 0 ? length : ACCESS_CODE_LENGTH;
  let code = "";

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random access-code generation is unavailable in this browser.");
  }

  const values = new Uint32Array(codeLength);
  globalThis.crypto.getRandomValues(values);
  values.forEach((value) => {
    code += ACCESS_CODE_ALPHABET[value % ACCESS_CODE_ALPHABET.length];
  });

  return code;
}

export function normalizeAccessCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeImageUrl(url) {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) return "";

  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.protocol === "https:" ? parsedUrl.toString() : "";
  } catch (error) {
    return "";
  }
}

export function safeImageFileName(fileName) {
  return String(fileName || "profile-photo")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "profile-photo";
}

export function getImageFileExtension(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";

  const nameMatch = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = nameMatch?.[1];
  return ["png", "webp", "gif", "jpeg", "jpg"].includes(extension) ? (extension === "jpeg" ? "jpg" : extension) : "jpg";
}

function getRawImageFileExtension(file) {
  const nameMatch = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return nameMatch?.[1] || "";
}

function getProfileImageContentType(file) {
  const type = String(file?.type || "").toLowerCase();
  const extension = getRawImageFileExtension(file);
  return type || PROFILE_IMAGE_TYPE_BY_EXTENSION[extension] || "";
}

export function validateProfileImageFile(file, options = {}) {
  if (!file) return;

  const type = String(file.type || "").toLowerCase();
  const extension = getRawImageFileExtension(file);
  const contentType = getProfileImageContentType(file);
  const maxBytes = options.maxBytes || PROFILE_IMAGE_MAX_BYTES;

  if (type.includes("heic") || type.includes("heif") || ["heic", "heif"].includes(extension)) {
    throw new Error("HEIC photos are not supported yet. Export the photo as JPG, PNG, WebP, or GIF and try again.");
  }

  if (!PROFILE_IMAGE_ALLOWED_TYPES.has(contentType)) {
    throw new Error("Choose a JPG, PNG, WebP, or GIF photo.");
  }

  if (file.size > maxBytes) {
    throw new Error("That photo is over 5 MB. Choose a smaller image before uploading.");
  }
}

export function getImageUploadMetadata(file) {
  const extension = getImageFileExtension(file);
  const contentType = getProfileImageContentType(file);

  return {
    contentType: PROFILE_IMAGE_ALLOWED_TYPES.has(contentType)
      ? contentType
      : PROFILE_IMAGE_TYPE_BY_EXTENSION[extension] || "image/jpeg",
  };
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image file."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not prepare that image for upload."));
      }
    }, "image/jpeg", quality);
  });
}

function getImageCanvas(image, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare that image for upload.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function prepareImageFileForUpload(file, options = {}) {
  if (!file) return null;
  validateProfileImageFile(file, options);

  const maxBytes = options.maxBytes || PROFILE_IMAGE_MAX_BYTES;
  const maxDimension = options.maxDimension || 1800;

  if (file.size <= maxBytes) {
    return file;
  }

  const image = await loadImageElement(file);
  const canvas = getImageCanvas(image, maxDimension);

  let quality = 0.84;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > maxBytes && quality > 0.52) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > maxBytes) {
    throw new Error("That photo is still too large. Try a smaller image.");
  }

  return new File([blob], `${safeImageFileName(file.name)}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function prepareImageDataUrl(file, options = {}) {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Choose an image file, like a JPG or PNG.");
  }

  const image = await loadImageElement(file);
  const canvas = getImageCanvas(image, options.maxDimension || 900);
  const dataUrl = canvas.toDataURL("image/jpeg", options.quality || 0.78);

  if (dataUrl.length > (options.maxLength || 850000)) {
    throw new Error("That photo is still too large. Try a smaller image.");
  }

  return dataUrl;
}

export function getFamilyRole(family, user) {
  if (!family || !user?.uid) return "guest";
  if (family.ownerId === user.uid) return "owner";

  const role = family.memberRoles?.[user.uid];
  if (role === "editor") return "editor";

  const memberIds = Array.isArray(family.memberIds) ? family.memberIds : [];
  return memberIds.includes(user.uid) ? "viewer" : "guest";
}

export function canEditFamily(family, user) {
  const role = getFamilyRole(family, user);
  return role === "owner" || role === "editor";
}

/* -----------------------------------
   NORMALIZATION HELPERS
----------------------------------- */

export function normalizeNamePart(name) {
  if (!name) return "";
  return name.trim().toLowerCase();
}

export function buildFullName(firstName, lastName) {
  const f = normalizeNamePart(firstName);
  const l = normalizeNamePart(lastName);
  return `${f} ${l}`.trim();
}

const TITLECASE_ACRONYMS = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["css", "CSS"],
  ["dna", "DNA"],
  ["html", "HTML"],
  ["js", "JS"],
  ["qa", "QA"],
  ["ui", "UI"],
  ["url", "URL"],
  ["us", "US"],
  ["usa", "USA"],
]);

function titleCaseToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) return "";

  const acronym = TITLECASE_ACRONYMS.get(cleanToken.toLowerCase());
  if (acronym) return acronym;

  return cleanToken.charAt(0).toUpperCase() + cleanToken.slice(1).toLowerCase();
}

export function toTitle(str) {
  if (!str) return "";
  return String(str)
    .trim()
    .split(/([\s'-]+)/)
    .map(part => (/^[\s'-]+$/.test(part) ? part : titleCaseToken(part)))
    .join("");
}

export function toTitleFullName(firstName, lastName) {
  return `${toTitle(firstName)} ${toTitle(lastName)}`.trim();
}

export function getDisplayName(person) {
  if (!person) return "";
  return toTitleFullName(person.firstName || "", person.lastName || "") || "Unnamed";
}

export function getPersonNameKey(person) {
  if (!person) return "";
  return buildFullName(person.firstName, person.lastName);
}

export function findPersonByNameString(name, allPeople) {
  const cleanName = normalizeNamePart(name);
  if (!cleanName || !Array.isArray(allPeople)) return null;
  return allPeople.find(person => getPersonNameKey(person) === cleanName) || null;
}

function getRelationshipLookups(allPeople) {
  const people = Array.isArray(allPeople) ? allPeople : [];
  const idToPerson = new Map();
  const nameToPerson = new Map();

  people.forEach(person => {
    if (person?.id) {
      idToPerson.set(person.id, person);
    }

    const nameKey = getPersonNameKey(person);
    if (nameKey && !nameToPerson.has(nameKey)) {
      nameToPerson.set(nameKey, person);
    }
  });

  return { people, idToPerson, nameToPerson };
}

function addKnownId(idSet, id, idToPerson) {
  if (!id) return;
  if (idToPerson.size > 0 && !idToPerson.has(id)) return;
  idSet.add(id);
}

function addLegacyNameMatch(idSet, name, nameToPerson) {
  if (!name) return;
  const matchedPerson = nameToPerson.get(normalizeNamePart(name));
  if (matchedPerson?.id) {
    idSet.add(matchedPerson.id);
  }
}

export function normalizeRelationshipIds(ids) {
  if (Array.isArray(ids)) {
    return ids
      .map(id => String(id || "").trim())
      .filter(Boolean);
  }

  if (typeof ids === "string") {
    const trimmedId = ids.trim();
    if (!trimmedId) return [];
    return trimmedId
      .split(",")
      .map(id => id.trim())
      .filter(Boolean);
  }

  return [];
}

export function resolvePersonParentIds(person, allPeople) {
  if (!person) return [];

  const { idToPerson, nameToPerson } = getRelationshipLookups(allPeople);
  const parentIds = new Set();

  normalizeRelationshipIds(person.parentIds)
    .forEach(parentId => addKnownId(parentIds, parentId, idToPerson));

  [person.parent1, person.parent2].forEach(parentName => {
    addLegacyNameMatch(parentIds, parentName, nameToPerson);
  });

  return [...parentIds];
}

export function resolvePersonSpouseIds(person, allPeople) {
  if (!person) return [];

  const { people, idToPerson, nameToPerson } = getRelationshipLookups(allPeople);
  const spouseIds = new Set();
  const personName = getPersonNameKey(person);

  normalizeRelationshipIds(person.spouseIds)
    .forEach(spouseId => addKnownId(spouseIds, spouseId, idToPerson));

  addLegacyNameMatch(
    spouseIds,
    buildFullName(person.spouseFirstName, person.spouseLastName),
    nameToPerson
  );

  people.forEach(candidate => {
    if (!candidate?.id || candidate.id === person.id) return;

    if (normalizeRelationshipIds(candidate.spouseIds).includes(person.id)) {
      spouseIds.add(candidate.id);
      return;
    }

    const candidateSpouseName = buildFullName(candidate.spouseFirstName, candidate.spouseLastName);
    if (personName && candidateSpouseName === personName) {
      spouseIds.add(candidate.id);
    }
  });

  return [...spouseIds];
}

export function derivePersonChildren(person, allPeople) {
  if (!person || !Array.isArray(allPeople)) return [];

  return allPeople.filter(candidate => (
    candidate?.id !== person.id &&
    resolvePersonParentIds(candidate, allPeople).includes(person.id)
  ));
}

/* -----------------------------------
   FIRESTORE LOOKUPS
----------------------------------- */

export async function getAllPeople(familyId = null) {
  if (familyId) {
    const peopleRef = collection(db, "people");
    const qPeople = query(peopleRef, where("familyId", "==", familyId));
    const snapshot = await getDocs(qPeople);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  const snapshot = await getDocs(collection(db, "example"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}


export async function findPersonByFullName(firstName, lastName, familyId = null) {
  const cleanFirst = normalizeNamePart(firstName);
  const cleanLast = normalizeNamePart(lastName);

  if (!cleanFirst || !cleanLast) return null;

  const collectionName = familyId ? "people" : "example";
  const peopleRef = collection(db, collectionName);

  const constraints = [
    where("firstName", "==", cleanFirst),
    where("lastName", "==", cleanLast)
  ];

  if (familyId) {
    constraints.push(where("familyId", "==", familyId));
  }

  const qPeople = query(peopleRef, ...constraints, limit(1));

  const snap = await getDocs(qPeople);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}


/* -----------------------------------
   RELATIONSHIP HELPERS
----------------------------------- */

export function areSpouses(personA, personB) {
  if (!personA || !personB) return false;

  const aSpouseIds = normalizeRelationshipIds(personA.spouseIds);
  const bSpouseIds = normalizeRelationshipIds(personB.spouseIds);

  if (aSpouseIds.includes(personB.id) || bSpouseIds.includes(personA.id)) {
    return true;
  }

  const aSpouseFull = buildFullName(
    personA.spouseFirstName,
    personA.spouseLastName
  );
  const bFull = buildFullName(personB.firstName, personB.lastName);

  const bSpouseFull = buildFullName(
    personB.spouseFirstName,
    personB.spouseLastName
  );
  const aFull = buildFullName(personA.firstName, personA.lastName);

  return (
    (aSpouseFull && aSpouseFull === bFull) ||
    (bSpouseFull && bSpouseFull === aFull)
  );
}

export function hasParents(person) {
  if (!person) return false;
  if (normalizeRelationshipIds(person.parentIds).length > 0) return true;
  return Boolean(
    (person.parent1 && person.parent1.trim() !== "") ||
    (person.parent2 && person.parent2.trim() !== "")
  );
}

export function hasTwoParents(person) {
  if (!person) return false;
  if (normalizeRelationshipIds(person.parentIds).length >= 2) return true;
  return Boolean(
    (person.parent1 && person.parent1.trim() !== "") &&
    (person.parent2 && person.parent2.trim() !== "")
  );
}


export function getChildren(person, allPeople) {
  if (!person) return [];
  return derivePersonChildren(person, allPeople);
}

export function getSiblings(person, allPeople) {
  if (!person) return [];

  return allPeople.filter(p => {
    if (p.id === person.id) return false;

    const sameOrder =
      p.parent1 === person.parent1 &&
      p.parent2 === person.parent2;

    const swappedOrder =
      p.parent1 === person.parent2 &&
      p.parent2 === person.parent1;

    const personParentIds = normalizeRelationshipIds(person.parentIds);
    const otherParentIds = normalizeRelationshipIds(p.parentIds);
    const sameParentIds =
      personParentIds.length > 0 &&
      personParentIds.length === otherParentIds.length &&
      personParentIds.every(parentId => otherParentIds.includes(parentId));

    return sameParentIds || sameOrder || swappedOrder;
  });
}

// Shared children between two people (bio co-parents)
export function getSharedChildren(personA, personB, allPeople) {
  if (!personA || !personB) return [];

  const aName = buildFullName(personA.firstName, personA.lastName);
  const bName = buildFullName(personB.firstName, personB.lastName);

  return allPeople.filter(child => {
    const parentIds = normalizeRelationshipIds(child.parentIds);
    if (parentIds.length) return parentIds.includes(personA.id) && parentIds.includes(personB.id);

    const parents = [child.parent1, child.parent2].filter(Boolean);
    return parents.includes(aName) && parents.includes(bName);
  });
}

// All co-parents of a given person (anyone they share a child with)
export function getCoParents(person, allPeople) {
  if (!person) return [];

  const myName = buildFullName(person.firstName, person.lastName);
  const coParentIds = new Set();
  const coParentNames = new Set();

  // Find all name-strings of people who are the "other" parent
  allPeople.forEach(child => {
    const parentIds = normalizeRelationshipIds(child.parentIds);
    if (parentIds.includes(person.id)) {
      parentIds.forEach(parentId => {
        if (parentId !== person.id) coParentIds.add(parentId);
      });
    }

    const parents = [child.parent1, child.parent2].filter(Boolean);
    if (!parents.includes(myName)) return;

    parents.forEach(pName => {
      if (pName && pName !== myName) {
        coParentNames.add(pName);
      }
    });
  });

  // Convert those name-strings back to actual person objects
  const result = [];
  allPeople.forEach(p => {
    const full = buildFullName(p.firstName, p.lastName);
    if (coParentIds.has(p.id) || coParentNames.has(full)) {
      result.push(p);
    }
  });

  return result;
}

export function areSplitUpCoParents(personA, personB, allPeople) {
  if (!personA || !personB) return false;

  if (areSpouses(personA, personB)) return false;

  const sharedKids = getSharedChildren(personA, personB, allPeople);
  return sharedKids.length > 0;
}


export function getHalfSiblings(person, allPeople) {
  if (!person) return [];

  return allPeople.filter(p => {
    if (p.id === person.id) return false; // skip self

    // share at least one parent (either slot)
    const personParentIds = normalizeRelationshipIds(person.parentIds);
    const otherParentIds = normalizeRelationshipIds(p.parentIds);
    const shareAnyId =
      personParentIds.length > 0 &&
      personParentIds.some(parentId => otherParentIds.includes(parentId));

    const shareAny =
      shareAnyId ||
      p.parent1 === person.parent1 ||
      p.parent2 === person.parent1 ||
      p.parent1 === person.parent2 ||
      p.parent2 === person.parent2;

    // share both parents (full sibling)
    const shareBoth =
      (
        personParentIds.length > 0 &&
        personParentIds.length === otherParentIds.length &&
        personParentIds.every(parentId => otherParentIds.includes(parentId))
      ) ||
      (p.parent1 === person.parent1 && p.parent2 === person.parent2) ||
      (p.parent1 === person.parent2 && p.parent2 === person.parent1);

    return shareAny && !shareBoth;
  });
}

// Very simple sibling check: do they share at least one parent string?
export function areSiblings(personA, personB) {
  if (!personA || !personB) return false;

  const parentsA = [personA.parent1, personA.parent2].filter(Boolean);
  const parentsB = [personB.parent1, personB.parent2].filter(Boolean);
  const parentIdsA = normalizeRelationshipIds(personA.parentIds);
  const parentIdsB = normalizeRelationshipIds(personB.parentIds);

  if (parentIdsA.some(parentId => parentIdsB.includes(parentId))) return true;
  if (parentsA.length === 0 || parentsB.length === 0) return false;

  return parentsA.some(pa => parentsB.includes(pa));
}

// Convenience: does this person have *any* siblings?
export function hasSiblings(person, allPeople) {
  return !!getSiblings(person, allPeople).length;
}

// Convenience: does this person have *any* children?
export function hasChildren(person, allPeople) {
  return !!getChildren(person, allPeople).length;
}

/* -----------------------------------
   GENERATION + BFS LAYOUT HELPERS
----------------------------------- */

// Internal: build lookup "first last" -> person
function buildNameToPerson(people) {
  const map = new Map();
  people.forEach(p => {
    const full = buildFullName(p.firstName, p.lastName);
    if (full) {
      map.set(full, p);
    }
  });
  return map;
}

function buildIdToPerson(people) {
  const map = new Map();
  people.forEach(p => {
    if (p.id) {
      map.set(p.id, p);
    }
  });
  return map;
}

// Internal: build parentName -> [children] map
function buildChildrenMap(people) {
  const childrenMap = new Map();

  people.forEach(child => {
    normalizeRelationshipIds(child.parentIds).forEach(parentId => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId).push(child);
    });

    [child.parent1, child.parent2].forEach(parentName => {
      if (!parentName) return;
      if (!childrenMap.has(parentName)) {
        childrenMap.set(parentName, []);
      }
      childrenMap.get(parentName).push(child);
    });
  });

  return childrenMap;
}

// NEW: align spouse generations so married couple stays in same row
function alignSpouseGenerations(people) {
  const n = people.length;

  for (let i = 0; i < n; i++) {
    const p = people[i];

    // Find their spouse in the list, if any
    const spouse = people.find(other => other.id !== p.id && areSpouses(p, other));
    if (!spouse) continue;

    if (p.generation === spouse.generation) continue;

    const pHasParents = hasParents(p);
    const sHasParents = hasParents(spouse);

    let targetGen;

    if (pHasParents && !sHasParents) {
      // Anchor spouse with no parents to the one that has parents
      targetGen = p.generation;
    } else if (!pHasParents && sHasParents) {
      targetGen = spouse.generation;
    } else {
      // Both have (or both don't have) parents, so keep kids below them by using the higher generation.
      targetGen = Math.max(
        typeof p.generation === "number" ? p.generation : 1,
        typeof spouse.generation === "number" ? spouse.generation : 1
      );
    }

    p.generation = targetGen;
    spouse.generation = targetGen;
  }
}

// NEW: align co-parents (people who share a child) so they stay in same generation
function alignCoParentGenerations(people) {
  const nameToPerson = buildNameToPerson(people);
  const idToPerson = buildIdToPerson(people);

  people.forEach(child => {
    const childParentIds = normalizeRelationshipIds(child.parentIds);
    if (childParentIds.length >= 2) {
      const parents = childParentIds
        .map(parentId => idToPerson.get(parentId))
        .filter(Boolean);

      const parentGenerations = parents
        .map(parent => parent.generation)
        .filter(generation => typeof generation === "number");

      if (parents.length >= 2 && parentGenerations.length === parents.length) {
        const targetGen = Math.max(...parentGenerations);
        parents.forEach(parent => {
          parent.generation = targetGen;
        });
      }
    }

    const p1Name = child.parent1;
    const p2Name = child.parent2;

    if (!p1Name || !p2Name) return; // need both parents to align

    const p1 = nameToPerson.get(p1Name);
    const p2 = nameToPerson.get(p2Name);

    if (!p1 || !p2) return;
    if (typeof p1.generation !== "number" || typeof p2.generation !== "number") return;

    if (p1.generation === p2.generation) return;

    // Keep them both in the higher generation so kids stay below
    const targetGen = Math.max(p1.generation, p2.generation);
    p1.generation = targetGen;
    p2.generation = targetGen;
  });
}


// Internal: assign generation + BFS index so siblings stay together
function assignGenerationsBFS(people) {
  if (!Array.isArray(people) || people.length === 0) return people;

  const nameToPerson = buildNameToPerson(people);
  const idToPerson = buildIdToPerson(people);
  const childrenMap = buildChildrenMap(people);

  // Reset any previous generation / bfs index
  people.forEach(p => {
    p.generation = undefined;
    p._bfsIndex = undefined;
  });

  // 1. Roots = people with no known parents in the dataset
  const roots = [];
  people.forEach(p => {
    const hasParentIds =
      normalizeRelationshipIds(p.parentIds).some(parentId => idToPerson.has(parentId));
    const hasParent1 = !!p.parent1 && nameToPerson.has(p.parent1);
    const hasParent2 = !!p.parent2 && nameToPerson.has(p.parent2);
    if (!hasParentIds && !hasParent1 && !hasParent2) {
      roots.push(p);
    }
  });

  if (roots.length === 0 && people.length > 0) {
    // fallback: treat the first person as a root if everything looks connected / messy
    roots.push(people[0]);
  }

  const queue = [];
  const visited = new Set();
  let bfsIndex = 0;

  roots.forEach(root => {
    if (visited.has(root.id)) return;
    root.generation = 1;
    queue.push(root);
    visited.add(root.id);
  });

  while (queue.length > 0) {
    const current = queue.shift();
    current._bfsIndex = bfsIndex++;

    const parentFull = buildFullName(current.firstName, current.lastName);
    const idChildren = childrenMap.get(current.id) || [];
    const nameChildren = childrenMap.get(parentFull) || [];
    const children = dedupeById([...idChildren, ...nameChildren]);

    children.forEach(child => {
      const proposedGen = (current.generation || 1) + 1;

      // Allow child to upgrade to a higher generation if a later parent is deeper.
      if (
        typeof child.generation !== "number" ||
        child.generation < proposedGen
      ) {
        child.generation = proposedGen;
      }

      if (!visited.has(child.id)) {
        visited.add(child.id);
        queue.push(child);
      }
    });
  }

  // Any leftover disconnected people get default generation and index
  people.forEach(p => {
    if (typeof p.generation !== "number") {
      p.generation = 1;
    }
    if (p._bfsIndex == null) {
      p._bfsIndex = bfsIndex++;
    }
  });

  // First: fix spouse generations after BFS
  alignSpouseGenerations(people);

  // Then: fix co-parent generations (people who share a child)
  alignCoParentGenerations(people);

  return people;
}

// Legacy-style helper: figure out a single person's generation given the full list
export function figureOutGeneration(person, allPeople) {
  if (!person || !Array.isArray(allPeople)) return 1;
  assignGenerationsBFS(allPeople);

  const full = buildFullName(person.firstName, person.lastName);
  const match =
    allPeople.find(p => p.id === person.id) ||
    allPeople.find(p => buildFullName(p.firstName, p.lastName) === full);

  if (match && typeof match.generation === "number") {
    return match.generation;
  }
  return 1;
}

// Sort generation keys: [1,2,3,...]
export function sortGenerationKeys(genMap) {
  return [...genMap.keys()].sort((a, b) => a - b);
}


// Group people by generation, using BFS assignment and BFS order
export function groupByGeneration(people) {
  const list = assignGenerationsBFS([...people]); // shallow copy just in case

  const map = new Map();
  list.forEach(p => {
    const gen = p.generation;
    if (!map.has(gen)) map.set(gen, []);
    map.get(gen).push(p);
  });

  // Within each generation, keep BFS order (siblings together),
  // and within siblings, optionally sort by birth date if available.
  map.forEach(arr => {
    arr.sort((a, b) => {
      const ai = a._bfsIndex ?? 0;
      const bi = b._bfsIndex ?? 0;
      const idxDiff = ai - bi;
      if (idxDiff !== 0) return idxDiff;

      // Same BFS cluster; use birthdate to order siblings from oldest to youngest if possible.
      const ta = a.birthDate && typeof a.birthDate.toDate === "function"
        ? a.birthDate.toDate().getTime()
        : null;
      const tb = b.birthDate && typeof b.birthDate.toDate === "function"
        ? b.birthDate.toDate().getTime()
        : null;

      if (ta != null && tb != null) {
        return ta - tb;
      }

      // fallback: alphabetical
      const lastDiff = (a.lastName || "").localeCompare(b.lastName || "");
      if (lastDiff !== 0) return lastDiff;
      return (a.firstName || "").localeCompare(b.firstName || "");
    });
  });

  return map;
}

// Sort people alphabetically 
export function sortPeopleByName(people) {
  return [...people].sort((a, b) => {
    const lastDiff = (a.lastName || "").localeCompare(b.lastName || "");
    if (lastDiff !== 0) return lastDiff;
    return (a.firstName || "").localeCompare(b.firstName || "");
  });
}

/*helpers*/

export function isEmpty(value) {
  return value === undefined || value === null || value === "";
}

// Very simple base validation, you can expand this later
export function validatePersonData(person) {
  if (!person) return false;
  if (!person.firstName || !person.lastName) return false;
  return true;
}

export function dedupeByFullName(people) {
  const seen = new Set();
  const result = [];

  people.forEach(p => {
    const full = buildFullName(p.firstName, p.lastName);
    if (!full) return;
    if (seen.has(full)) return;
    seen.add(full);
    result.push(p);
  });

  return result;
}

export function dedupeById(people) {
  const seen = new Set();
  const result = [];

  people.forEach(person => {
    if (!person || !person.id || seen.has(person.id)) return;
    seen.add(person.id);
    result.push(person);
  });

  return result;
}
