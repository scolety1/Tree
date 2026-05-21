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
import { getCurrentUser, watchAuth } from "./auth.js";

const createTreeBtn      = document.getElementById("createTreeBtn");
const joinTreeBtn        = document.getElementById("joinTreeBtn");
const createFamilyForm   = document.getElementById("createFamilyForm");
const joinFamilyForm     = document.getElementById("joinFamilyForm");
const createFormCard     = document.getElementById("createTreeFormCard");
const joinFormCard       = document.getElementById("joinTreeFormCard");
const familyFormStatus   = document.getElementById("familyFormStatus");
let signedInUser = getCurrentUser();

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

async function generateAvailableJoinCode(length = 6) {
    for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateJoinCode(length);
        const codeSnap = await getDoc(doc(db, "joinCodes", code));
        if (!codeSnap.exists()) return code;
    }

    throw new Error("Could not generate a unique access code.");
}

function setFamilyFormStatus(message) {
    if (familyFormStatus) {
        familyFormStatus.textContent = message;
    }
}

function setFormBusy(form, isBusy) {
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = isBusy;
}

function setFormDisabled(form, disabled) {
    if (!form) return;
    form.querySelectorAll("input, textarea, button, select").forEach((control) => {
        control.disabled = disabled;
    });
}

function updateFamilyFormsForAuth(user) {
    signedInUser = user;
    const mustSignIn = !user;

    setFormDisabled(createFamilyForm, mustSignIn);
    setFormDisabled(joinFamilyForm, mustSignIn);

    if (mustSignIn) {
        setFamilyFormStatus("Sign in to create or join a private family tree.");
    } else {
        setFamilyFormStatus("");
    }
}

function requireSignedInForFamilyAction() {
    const user = signedInUser || getCurrentUser();
    if (user) return user;

    setFamilyFormStatus("Please sign in first. Then come back here to create or join a tree.");
    window.location.href = "/signin";
    return null;
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
    updateFamilyFormsForAuth(signedInUser);
    watchAuth(updateFamilyFormsForAuth);

    createFamilyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = requireSignedInForFamilyAction();
        if (!user) return;

        const nameInput = /** @type {HTMLInputElement} */ (
            document.getElementById("familyName")
        );
        const descInput = /** @type {HTMLTextAreaElement} */ (
            document.getElementById("familyDescription")
        );

        const rawName = nameInput?.value.trim() || "";
        const rawDesc = descInput?.value.trim() || "";

        if (!rawName) {
            setFamilyFormStatus("Give your family tree a name first.");
            return;
        }

        try {
            setFormBusy(createFamilyForm, true);
            setFamilyFormStatus("Creating your family tree...");
            const joinCode = await generateAvailableJoinCode(6);
            const familyData = {
                name: rawName,
                description: rawDesc || "",
                joinCode: joinCode,
                createdAt: Timestamp.now(),
                ownerId: user.uid,
                memberIds: [user.uid],
                memberRoles: {
                    [user.uid]: "owner"
                }
            };

            const familiesRef = collection(db, "families");
            const docRef = await addDoc(familiesRef, familyData);

            const familyId = docRef.id;

            await setDoc(doc(db, "joinCodes", joinCode), {
                familyId,
                createdAt: Timestamp.now()
            });

            setFamilyId(familyId);
            setFamilyFormStatus(`Created "${rawName}". Opening the tree now...`);

            window.location.href = `/tree?familyId=${familyId}`;
        } catch (err) {
            console.error("Error creating family tree:", err);
            setFamilyFormStatus("Could not create the tree. Check that you are signed in and try again.");
        } finally {
            setFormBusy(createFamilyForm, false);
        }
    });
}

/* -----------------------------------
   JOIN FAMILY TREE FLOW
----------------------------------- */

if (joinFamilyForm) {
  if (!createFamilyForm) {
    updateFamilyFormsForAuth(signedInUser);
    watchAuth(updateFamilyFormsForAuth);
  }

  joinFamilyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = requireSignedInForFamilyAction();
    if (!user) return;

    const codeInput = /** @type {HTMLInputElement} */ (
      document.getElementById("joinCode")
    );
    const rawCode = codeInput?.value || "";
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      setFamilyFormStatus("Enter the access code first.");
      return;
    }

    try{
      setFormBusy(joinFamilyForm, true);
      setFamilyFormStatus("Checking that access code...");
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
        setFamilyFormStatus("No family tree found with that access code. Double-check it and try again.");
        return;
      }

      if (!familyId) {
        const familyDoc = snap.docs[0];
        familyId = familyDoc.id;
      }

      await updateDoc(doc(db, "families", familyId), {
        memberIds: arrayUnion(user.uid),
        [`memberRoles.${user.uid}`]: "editor"
      });

      setFamilyId(familyId);
      setFamilyFormStatus("Access code accepted. Opening the tree now...");

      window.location.href = `/tree?familyId=${familyId}`;
    } catch (err) {
      console.error("Error joining family tree:", err);
      setFamilyFormStatus("Could not join that tree. Check that you are signed in and try again.");
    } finally {
      setFormBusy(joinFamilyForm, false);
    }
    });
}
