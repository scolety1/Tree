// js/home.js
import { db } from "./firebase.js?v=20260612-emulator-qa";
import {
  addDoc,
  collection,
  doc,
  Timestamp,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  deleteField
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import {
    ACCESS_CODE_LENGTH,
    generateAccessCode,
    normalizeAccessCode,
    setFamilyId,
} from "./helpers.js?v=20260612-4";
import { getCurrentUser, watchAuth } from "./auth.js?v=20260612-4";

const createTreeBtn      = document.getElementById("createTreeBtn");
const joinTreeBtn        = document.getElementById("joinTreeBtn");
const createFamilyForm   = document.getElementById("createFamilyForm");
const joinFamilyForm     = document.getElementById("joinFamilyForm");
const createFormCard     = document.getElementById("createTreeFormCard");
const joinFormCard       = document.getElementById("joinTreeFormCard");
const familyFormStatus   = document.getElementById("familyFormStatus");
const formsSubtitle      = document.querySelector(".forms-subtitle");
const formsSignInCallout = document.getElementById("familyFormsSignInCallout");
const formsSignInLink    = document.getElementById("familyFormsSignInLink");
const previewBranchBtn   = document.getElementById("previewBranchBtn");
const previewBranchStatus = document.getElementById("previewBranchStatus");
let signedInUser = getCurrentUser();

const previewBranches = [
    {
        people: ["parent-a", "child-a"],
        label: "Graham connects to Alex through one parent-child line."
    },
    {
        people: ["parent-b", "child-b"],
        label: "Iris connects to Casey through one parent-child line."
    },
    {
        people: ["parent-a", "parent-b", "child-a", "child-b"],
        label: "This branch shows two parents and two children in one small family group."
    }
];
let previewBranchIndex = 0;

async function generateAvailableJoinCode(length = ACCESS_CODE_LENGTH) {
    for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateAccessCode(length);
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

function highlightPreviewBranch() {
    if (!previewBranchBtn) return;
    const branch = previewBranches[previewBranchIndex % previewBranches.length];
    const activePeople = new Set(branch.people);

    document.querySelectorAll("[data-preview-person]").forEach((card) => {
        const isActive = activePeople.has(card.dataset.previewPerson || "");
        card.classList.toggle("is-highlighted", isActive);
        card.classList.toggle("is-dimmed", !isActive);
    });

    if (previewBranchStatus) {
        previewBranchStatus.textContent = branch.label;
    }

    previewBranchIndex += 1;
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

function getCurrentReturnPath(hash = "") {
    const currentPath = `${window.location.pathname}${window.location.search}${hash || window.location.hash}`;
    return currentPath || "/";
}

function getSignInUrl(hash = "") {
    return `/signin?redirect=${encodeURIComponent(getCurrentReturnPath(hash))}`;
}

function setCardAuthNote(card, message, hash) {
    if (!card) return;

    let note = card.querySelector(".auth-required-note");
    if (!message) {
        note?.remove();
        card.classList.remove("requires-auth");
        return;
    }

    if (!note) {
        note = document.createElement("p");
        note.className = "auth-required-note";
        card.appendChild(note);
    }

    note.replaceChildren();
    note.append(`${message} `);
    const link = document.createElement("a");
    link.href = getSignInUrl(hash);
    link.textContent = "Sign in";
    note.appendChild(link);
    note.append(" and this section will reopen.");
    card.classList.add("requires-auth");
}

function setFormCardVisible(card, isVisible) {
    if (card) card.hidden = !isVisible;
}

function updateFamilyFormsForAuth(user) {
    signedInUser = user;
    const mustSignIn = !user;

    setFormDisabled(createFamilyForm, mustSignIn);
    setFormDisabled(joinFamilyForm, mustSignIn);
    setFormCardVisible(createFormCard, !mustSignIn);
    setFormCardVisible(joinFormCard, !mustSignIn);
    if (formsSignInCallout) formsSignInCallout.hidden = !mustSignIn;
    if (formsSignInLink) formsSignInLink.href = getSignInUrl("#createTreeFormCard");

    if (mustSignIn) {
        if (createTreeBtn) createTreeBtn.textContent = "Sign In to Start";
        if (joinTreeBtn) joinTreeBtn.textContent = "Sign In to Join";
        if (formsSubtitle) formsSubtitle.textContent = "Create and join controls appear after sign-in so private access codes stay private.";
        setCardAuthNote(createFormCard, "");
        setCardAuthNote(joinFormCard, "");
        setFamilyFormStatus("");
    } else {
        if (createTreeBtn) createTreeBtn.textContent = "Start a Tree";
        if (joinTreeBtn) joinTreeBtn.textContent = "Join with Code";
        if (formsSubtitle) formsSubtitle.textContent = "You are signed in. Create a new tree or join one with a code from a relative.";
        setCardAuthNote(createFormCard, "");
        setCardAuthNote(joinFormCard, "");
        setFamilyFormStatus("");
    }
}

function requireSignedInForFamilyAction(hash = "") {
    const user = signedInUser || getCurrentUser();
    if (user) return user;

    setFamilyFormStatus("Please sign in first. Then come back here to create or join a tree.");
    window.location.href = getSignInUrl(hash);
    return null;
}

/* -----------------------------------
   BUTTON BEHAVIOR (SCROLL TO FORMS)
----------------------------------- */

if (createTreeBtn && createFormCard) {
    createTreeBtn.addEventListener("click", () => {
        if (!signedInUser && !getCurrentUser()) {
            requireSignedInForFamilyAction("#createTreeFormCard");
            return;
        }
        createFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (joinTreeBtn && joinFormCard) {
    joinTreeBtn.addEventListener("click", () => {
        if (!signedInUser && !getCurrentUser()) {
            requireSignedInForFamilyAction("#joinTreeFormCard");
            return;
        }
        joinFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (previewBranchBtn) {
    previewBranchBtn.addEventListener("click", highlightPreviewBranch);
}

/* -----------------------------------
   CREATE FAMILY TREE FLOW
----------------------------------- */

if (createFamilyForm) {
    updateFamilyFormsForAuth(signedInUser);
    watchAuth(updateFamilyFormsForAuth);

    createFamilyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = requireSignedInForFamilyAction("#createTreeFormCard");
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
            const joinCode = await generateAvailableJoinCode();
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
    const user = requireSignedInForFamilyAction("#joinTreeFormCard");
    if (!user) return;

    const codeInput = /** @type {HTMLInputElement} */ (
      document.getElementById("joinCode")
    );
    const rawCode = codeInput?.value || "";
    const code = normalizeAccessCode(rawCode);

    if (!code) {
      setFamilyFormStatus("Enter the access code first.");
      return;
    }

    try{
      setFormBusy(joinFamilyForm, true);
      setFamilyFormStatus("Checking that access code...");
      const joinCodeRef = doc(db, "joinCodes", code);
      const joinCodeSnap = await getDoc(joinCodeRef);
      let familyId = null;

      if (joinCodeSnap.exists()) {
        familyId = joinCodeSnap.data().familyId;
      }

      if (!familyId) {
        setFamilyFormStatus("No family tree found with that access code. Double-check it and try again.");
        return;
      }

      await updateDoc(doc(db, "families", familyId), {
        memberIds: arrayUnion(user.uid),
        joinCodeAttempt: code
      });

      await updateDoc(doc(db, "families", familyId), {
        joinCodeAttempt: deleteField()
      }).catch((error) => {
        console.warn("Could not clear join-code attempt marker:", error);
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
