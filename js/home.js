// js/home.js
import { db } from "./firebase.js";
import {
  addDoc,
  collection,
  doc,
  Timestamp,
  query,
  where,
  getDocs,
  getDoc,
  limit,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { setFamilyId } from "./helpers.js";
import { getCurrentUser } from "./auth.js";

const createTreeBtn      = document.getElementById("createTreeBtn");
const joinTreeBtn        = document.getElementById("joinTreeBtn");
const createFamilyForm   = document.getElementById("createFamilyForm");
const joinFamilyForm     = document.getElementById("joinFamilyForm");
const createFormCard     = document.getElementById("createTreeFormCard");
const joinFormCard       = document.getElementById("joinTreeFormCard");

/* -----------------------------------
   HELPER: JOIN CODE GENERATOR
----------------------------------- */

function generateJoinCode(length = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        const idx = Math.floor(Math.random() * chars.length);
        code += chars[idx];
    }
    return code;
}

/* -----------------------------------
   BUTTON BEHAVIOR (SCROLL TO FORMS)
----------------------------------- */

if (createTreeBtn && createFormCard) {
    createTreeBtn.addEventListener("click", () => {
        createFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (joinTreeBtn && joinFormCard) {
    joinTreeBtn.addEventListener("click", () => {
        joinFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

/* -----------------------------------
   CREATE FAMILY TREE FLOW
----------------------------------- */

if (createFamilyForm) {
    createFamilyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nameInput = /** @type {HTMLInputElement} */ (
            document.getElementById("familyName")
        );
        const descInput = /** @type {HTMLTextAreaElement} */ (
            document.getElementById("familyDescription")
        );

        const rawName = nameInput?.value.trim() || "";
        const rawDesc = descInput?.value.trim() || "";

        if (!rawName) {
            alert("Please enter a name for your family tree.");
            return;
        }

        try {
            const joinCode = generateJoinCode(6);

            const user = getCurrentUser();
            const familyData = {
                name: rawName,
                description: rawDesc || "",
                joinCode: joinCode,
                createdAt: Timestamp.now()
            };

            if (user) {
                familyData.ownerId = user.uid;
                familyData.memberIds = [user.uid];
                familyData.memberRoles = {
                    [user.uid]: "owner"
                };
            }

            const familiesRef = collection(db, "families");
            const docRef = await addDoc(familiesRef, familyData);

            const familyId = docRef.id;

            await setDoc(doc(db, "joinCodes", joinCode), {
                familyId,
                createdAt: Timestamp.now()
            });

            setFamilyId(familyId);

            alert(`Your family tree "${rawName}" has been created! The access code is displayed on the tree page.`);

            window.location.href = `/tree?familyId=${familyId}`;
        } catch (err) {
            console.error("Error creating family tree:", err);
            alert("Sorry, something went wrong creating the family tree. Please try again.");
        }
    });
}

/* -----------------------------------
   JOIN FAMILY TREE FLOW
----------------------------------- */

if (joinFamilyForm) {
  joinFamilyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codeInput = /** @type {HTMLInputElement} */ (
      document.getElementById("joinCode")
    );
    const rawCode = codeInput?.value || "";
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      alert("Please enter an access code.");
      return;
    }

    try{
      const familiesRef = collection(db, "families");
      const joinCodeRef = doc(db, "joinCodes", code);
      const joinCodeSnap = await getDoc(joinCodeRef);
      let familyId = null;

      if (joinCodeSnap.exists()) {
        familyId = joinCodeSnap.data().familyId;
      }

      // Legacy fallback for family trees created before joinCodes existed.
      const q = query(
        familiesRef,
        where("joinCode", "==", code),
        limit(1)
      );

      const snap = familyId ? null : await getDocs(q);

      if (!familyId && snap.empty) {
        alert("No family tree found with that access code. Double-check and try again.");
        return;
      }

      if (!familyId) {
        const familyDoc = snap.docs[0];
        familyId = familyDoc.id;
      }

      const user = getCurrentUser();

      if (user) {
        await updateDoc(doc(db, "families", familyId), {
          memberIds: arrayUnion(user.uid),
          [`memberRoles.${user.uid}`]: "editor"
        });
      }

      setFamilyId(familyId);

      window.location.href = `/tree?familyId=${familyId}`;
    } catch (err) {
      console.error("Error joining family tree:", err);
      alert("Sorry, there was an issue joining that family tree. Please try again.");
    }
    });
}
