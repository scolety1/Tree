import { auth, db } from "./firebase.js?v=20260521-8";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function createAccountWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function signOutCurrentUser() {
  return signOut(auth);
}

function updateAuthStatus(user) {
  const authStatus = document.getElementById("authStatus");
  const accountEmail = document.getElementById("accountEmail");
  const authLink = document.getElementById("authLink");
  const signOutBtn = document.getElementById("signOutBtn");
  const linkText = authLink?.querySelector(".account-link-text");
  const isSignedIn = Boolean(user);
  const displayEmail = user?.email || "Family member";

  document.body.classList.toggle("is-signed-in", isSignedIn);
  document.body.classList.toggle("is-signed-out", !isSignedIn);

  if (authStatus) {
    authStatus.textContent = user ? displayEmail : "Browsing as guest";
  }

  if (accountEmail) {
    accountEmail.textContent = user ? `Signed in as ${displayEmail}` : "Sign in to manage your family tree account.";
  }

  if (authLink) {
    authLink.href = user ? "/account" : "/signin";
    authLink.setAttribute("aria-label", user ? "Open account settings" : "Sign in");
  }

  if (linkText) {
    linkText.textContent = user ? "Account" : "Sign In";
  }

  if (signOutBtn) {
    signOutBtn.hidden = !user;
  }

  window.dispatchEvent(new CustomEvent("family-auth-state-changed", {
    detail: {
      isSignedIn,
      email: user?.email || null,
    },
  }));

}

async function syncUserProfile(user) {
  if (!user) return;

  try {
    await setDoc(doc(db, "users", user.uid), {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error syncing user profile:", error);
  }
}

function setupSignOutButton() {
  const signOutBtn = document.getElementById("signOutBtn");
  if (!signOutBtn) return;

  signOutBtn.addEventListener("click", async () => {
    try {
      await signOutCurrentUser();
    } catch (error) {
      console.error("Error signing out:", error);
      const authStatus = document.getElementById("authStatus");
      if (authStatus) authStatus.textContent = "Could not sign out. Please try again.";
    }
  });
}

function setupAuthForm() {
  const form = document.getElementById("authForm");
  const googleBtn = document.getElementById("googleSignInBtn");
  const resetBtn = document.getElementById("resetPasswordBtn");
  const modeToggle = document.getElementById("authModeToggle");
  const title = document.getElementById("authTitle");
  const submitBtn = document.getElementById("authSubmitBtn");
  const status = document.getElementById("authFormStatus");
  let createMode = false;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function renderMode() {
    if (title) title.textContent = createMode ? "Create Your Account" : "Sign In";
    if (submitBtn) submitBtn.textContent = createMode ? "Create Account" : "Sign In";
    if (modeToggle) modeToggle.textContent = createMode ? "Already have an account? Sign in" : "New here? Create an account";
  }

  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      createMode = !createMode;
      setStatus("");
      renderMode();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("authEmail")?.value.trim();
      const password = document.getElementById("authPassword")?.value;

      if (!email || !password) {
        setStatus("Enter your email and password.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setStatus(createMode ? "Creating account..." : "Signing in...");

      try {
        if (createMode) {
          await createAccountWithEmail(email, password);
        } else {
          await signInWithEmail(email, password);
        }
        setStatus("You're signed in.");
        window.location.href = "/account";
      } catch (error) {
        console.error("Auth error:", error);
        setStatus(error.message || "Could not complete sign in.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      setStatus("Opening Google sign-in...");
      try {
        await signInWithGoogle();
        setStatus("You're signed in.");
        window.location.href = "/account";
      } catch (error) {
        console.error("Google sign-in error:", error);
        setStatus(error.message || "Could not sign in with Google.");
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      const email = document.getElementById("authEmail")?.value.trim();
      if (!email) {
        setStatus("Enter your email first, then reset your password.");
        return;
      }

      try {
        await resetPassword(email);
        setStatus("Password reset email sent.");
      } catch (error) {
        console.error("Password reset error:", error);
        setStatus(error.message || "Could not send password reset email.");
      }
    });
  }

  renderMode();
}

document.addEventListener("DOMContentLoaded", () => {
  setupSignOutButton();
  setupAuthForm();
  watchAuth((user) => {
    updateAuthStatus(user);
    syncUserProfile(user);
  });
});
