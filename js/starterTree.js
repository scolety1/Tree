import { db } from "./firebase.js?v=20260610-12";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import {
  ACCESS_CODE_LENGTH,
  generateAccessCode,
} from "./helpers.js?v=20260610-12";

export const STARTER_TREE_ID = "colety-birthday-tree";
export const STARTER_TREE_NAME = "Colety Family Tree";
export const STARTER_TREE_DESCRIPTION = "A private Colety family tree for collecting relatives, photos, birthdays, and stories.";

async function generateAvailableJoinCode(length = ACCESS_CODE_LENGTH) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateAccessCode(length);
    const codeSnap = await getDoc(doc(db, "joinCodes", code));
    if (!codeSnap.exists()) return code;
  }

  throw new Error("Could not generate a unique join code.");
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
    bio: `${firstName} ${lastName}`.trim() === "Spencer Colety"
      ? "Part of the Colety family tree. Add favorite stories, photos, and details when you are ready."
      : "Part of the Colety family tree. Add favorite memories, photos, and details as the family fills this in.",
  };
}

export async function createStarterColetyTree(user) {
  if (!user?.uid) {
    throw new Error("A signed-in user is required to create a starter tree.");
  }

  const joinCode = await generateAvailableJoinCode();
  const familyData = {
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
    birthdayDemoTree: true,
  };

  let familyRef = doc(db, "families", STARTER_TREE_ID);

  try {
    await setDoc(familyRef, familyData);
  } catch (error) {
    console.warn("Could not create deterministic starter tree; falling back to a generated tree id.", error);
    familyRef = await addDoc(collection(db, "families"), familyData);
  }

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
    starterPerson(refs.grandpaDad, "Frank", "Colety", starterBirthDate(1930, 4, 12), [], [refs.grandmaDad]),
    starterPerson(refs.grandmaDad, "Rose", "Colety", starterBirthDate(1932, 8, 18), [], [refs.grandpaDad]),
    starterPerson(refs.grandpaMom, "Arthur", "Marsh", starterBirthDate(1931, 3, 9), [], [refs.grandmaMom]),
    starterPerson(refs.grandmaMom, "Evelyn", "Marsh", starterBirthDate(1934, 11, 4), [], [refs.grandpaMom]),
    starterPerson(refs.dad, "Tim", "Colety", starterBirthDate(1960, 6, 15), [refs.grandpaDad, refs.grandmaDad], [refs.mom]),
    starterPerson(refs.mom, "Iris", "Marsh", starterBirthDate(1962, 9, 22), [refs.grandpaMom, refs.grandmaMom], [refs.dad]),
    starterPerson(refs.spencer, "Spencer", "Colety", starterBirthDate(1995, 5, 21), [refs.dad, refs.mom]),
    starterPerson(refs.sibling, "Riley", "Colety", starterBirthDate(1998, 1, 10), [refs.dad, refs.mom]),
  ].map(person => ({
    ...person,
    familyId: familyRef.id,
  }));

  await Promise.all(people.map(person => setDoc(doc(db, "people", person.id), person)));

  return familyRef.id;
}
