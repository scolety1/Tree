import { auth, db } from "./firebase.js?v=20260521-6";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { getStoredFamilyId, setFamilyId } from "./helpers.js?v=20260521-6";

const STARTER_TREE_NAME = "Colety Family Tree";

export function getAuthUserOnce() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function dedupeDocSnaps(docSnaps) {
  const byId = new Map();
  docSnaps.forEach((docSnap) => {
    if (!docSnap?.id || byId.has(docSnap.id)) return;
    byId.set(docSnap.id, docSnap);
  });
  return [...byId.values()];
}

function userCanAccessFamily(family, user) {
  if (!family || !user?.uid) return false;
  const memberIds = Array.isArray(family.memberIds) ? family.memberIds : [];
  return family.ownerId === user.uid || memberIds.includes(user.uid);
}

async function getUserFamilyDocs(user) {
  const familiesRef = collection(db, "families");
  const memberQuery = query(familiesRef, where("memberIds", "array-contains", user.uid));
  const ownerQuery = query(familiesRef, where("ownerId", "==", user.uid));
  const queryResults = await Promise.allSettled([
    getDocs(memberQuery),
    getDocs(ownerQuery),
  ]);

  queryResults.forEach(result => {
    if (result.status === "rejected") {
      console.warn("Family context query failed:", result.reason);
    }
  });

  const docs = dedupeDocSnaps(queryResults
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value.docs));
  const storedFamilyId = getStoredFamilyId();

  if (storedFamilyId && !docs.some((docSnap) => docSnap.id === storedFamilyId)) {
    try {
      const storedFamilySnap = await getDoc(doc(db, "families", storedFamilyId));
      if (storedFamilySnap.exists()) {
        docs.push(storedFamilySnap);
      }
    } catch (error) {
      console.warn("Could not load stored family tree:", error);
    }
  }

  return dedupeDocSnaps(docs);
}

export async function resolveCurrentUserFamilyId() {
  const params = new URLSearchParams(window.location.search);
  const urlFamilyId = params.get("familyId");

  if (urlFamilyId) {
    const user = await getAuthUserOnce();
    setFamilyId(urlFamilyId);
    return {
      familyId: urlFamilyId,
      user,
      source: "url",
    };
  }

  const user = await getAuthUserOnce();
  if (!user) {
    return {
      familyId: null,
      user: null,
      source: "guest",
    };
  }

  const docs = await getUserFamilyDocs(user);
  const families = docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((family) => !family.archivedAt && userCanAccessFamily(family, user));

  const storedFamilyId = getStoredFamilyId();
  const currentFamily = (
    families.find((family) => family.id === storedFamilyId) ||
    families.find((family) => family.birthdayDemoTree) ||
    families.find((family) => family.starterTree || family.name === STARTER_TREE_NAME) ||
    families[0]
  );

  if (currentFamily) {
    setFamilyId(currentFamily.id);
    return {
      familyId: currentFamily.id,
      user,
      source: "firebase",
    };
  }

  return {
    familyId: null,
    user,
    source: "none",
  };
}
