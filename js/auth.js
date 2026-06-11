import { auth, db } from "./firebase.js?v=20260610-12";
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
const SAFE_REDIRECT_PATHS = new Set([
  "/",
  "/home",
  "/account",
  "/dashboard",
  "/tree",
  "/tree-spike",
  "/search",
  "/profile",
]);

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

function getSafeRedirectTarget() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect) return "/account";

  try {
    const parsed = new URL(redirect, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/account";
    if (!SAFE_REDIRECT_PATHS.has(parsed.pathname)) return "/account";
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/account";
  } catch (error) {
    return "/account";
  }
}

function getFriendlyAuthError(error, createMode = false) {
  const code = error?.code || "";

  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters.";
  }
  if (code === "auth/email-already-in-use") {
    return "That email already has an account. Try signing in instead.";
  }
  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }
  if (code === "auth/missing-password") {
    return "Enter your password.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password does not match an account.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in was closed before it finished.";
  }
  if (code === "auth/network-request-failed") {
    return "Network connection failed. Check your connection and try again.";
  }

  return createMode
    ? "Could not create the account. Check the details and try again."
    : "Could not sign in. Check the details and try again.";
}

function isLikelyEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function updateAuthStatus(user) {
  const authStatus = document.getElementById("authStatus");
  const accountEmail = document.getElementById("accountEmail");
  const authLink = document.getElementById("authLink");
  const signOutBtn = document.getElementById("signOutBtn");
  const linkText = authLink?.querySelector(".account-link-text");
  const isSignedIn = Boolean(user);
  const accountLabel = "your account";

  document.body.classList.remove("is-auth-loading");
  document.body.classList.add("is-auth-resolved");
  document.body.classList.toggle("is-signed-in", isSignedIn);
  document.body.classList.toggle("is-signed-out", !isSignedIn);

  if (authStatus) {
    authStatus.textContent = user ? "Signed in" : "Browsing as guest";
  }

  if (accountEmail) {
    accountEmail.textContent = user ? "Signed in with your family tree account." : "Sign in to manage your family tree account.";
  }

  if (authLink) {
    authLink.href = user ? "/account" : "/signin";
    authLink.setAttribute("aria-label", user ? `Open account settings for ${accountLabel}` : "Sign in");
    authLink.hidden = !user && window.location.pathname === "/signin";
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
  const resetBackBtn = document.getElementById("authResetBackBtn");
  const modeToggle = document.getElementById("authModeToggle");
  const title = document.getElementById("authTitle");
  const intro = document.getElementById("authIntro");
  const submitBtn = document.getElementById("authSubmitBtn");
  const status = document.getElementById("authFormStatus");
  const passwordGroup = document.getElementById("authPasswordGroup");
  let createMode = false;
  let resetMode = false;

  function getAuthStatusTone(message = "") {
    if (!message) return "";
    if (/creating|signing in|opening|sending/i.test(message)) return "loading";
    if (/signed in|reset link|sent/i.test(message)) return "success";
    return "error";
  }

  function setStatus(message, tone = getAuthStatusTone(message)) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-loading", tone === "loading");
    status.classList.toggle("is-success", tone === "success");
    status.classList.toggle("is-error", tone === "error");
  }

  function renderMode() {
    const passwordInput = document.getElementById("authPassword");

    if (resetMode) {
      if (title) title.textContent = "Reset password";
      if (intro) intro.textContent = "Enter the email for your family tree account. If it exists, Firebase will send a reset link.";
      if (submitBtn) submitBtn.textContent = "Send reset link";
      if (passwordGroup) passwordGroup.hidden = true;
      if (passwordInput) {
        passwordInput.disabled = true;
        passwordInput.required = false;
        passwordInput.removeAttribute("aria-invalid");
      }
      if (googleBtn) googleBtn.hidden = true;
      if (modeToggle) modeToggle.hidden = true;
      if (resetBtn) resetBtn.hidden = true;
      if (resetBackBtn) resetBackBtn.hidden = false;
      return;
    }

    if (title) title.textContent = createMode ? "Create Your Account" : "Sign In";
    if (intro) {
      intro.textContent = createMode
        ? "Create a private family tree account when you are ready to add people, photos, and stories."
        : "Browse the example tree without signing in. Sign in when you want to create, edit, or share a private family tree.";
    }
    if (submitBtn) submitBtn.textContent = createMode ? "Create Account" : "Sign In";
    if (passwordGroup) passwordGroup.hidden = false;
    if (passwordInput) {
      passwordInput.disabled = false;
      passwordInput.required = true;
      passwordInput.autocomplete = createMode ? "new-password" : "current-password";
    }
    if (googleBtn) googleBtn.hidden = false;
    if (modeToggle) {
      modeToggle.hidden = false;
      modeToggle.textContent = createMode ? "Already have an account? Sign in" : "New here? Create an account";
      modeToggle.setAttribute("aria-pressed", createMode ? "true" : "false");
    }
    if (resetBtn) resetBtn.hidden = createMode;
    if (resetBackBtn) resetBackBtn.hidden = true;
  }

  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      createMode = !createMode;
      resetMode = false;
      setStatus("");
      renderMode();
    });
  }

  if (resetBackBtn) {
    resetBackBtn.addEventListener("click", () => {
      resetMode = false;
      createMode = false;
      setStatus("");
      renderMode();
      document.getElementById("authEmail")?.focus();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("authEmail")?.value.trim();
      const password = document.getElementById("authPassword")?.value;
      const emailInput = document.getElementById("authEmail");
      const passwordInput = document.getElementById("authPassword");

      emailInput?.removeAttribute("aria-invalid");
      passwordInput?.removeAttribute("aria-invalid");

      if (resetMode) {
        if (!email) {
          emailInput?.setAttribute("aria-invalid", "true");
          setStatus("Enter your email to send a reset link.");
          emailInput?.focus();
          return;
        }

        if (!isLikelyEmail(email)) {
          emailInput?.setAttribute("aria-invalid", "true");
          setStatus("Enter a valid email address.");
          emailInput?.focus();
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        setStatus("Sending reset link...");
        try {
          await resetPassword(email);
          setStatus("If an account exists for that email, a reset link has been sent.", "success");
        } catch (error) {
          const safeResetCodes = new Set(["auth/user-not-found", "auth/invalid-credential"]);
          if (safeResetCodes.has(error?.code)) {
            setStatus("If an account exists for that email, a reset link has been sent.", "success");
          } else {
            console.error("Password reset error:", error);
            setStatus(getFriendlyAuthError(error));
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
        return;
      }

      if (!email || !password) {
        if (!email) emailInput?.setAttribute("aria-invalid", "true");
        if (!password) passwordInput?.setAttribute("aria-invalid", "true");
        setStatus("Enter your email and password.");
        (email ? passwordInput : emailInput)?.focus();
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
        window.location.href = getSafeRedirectTarget();
      } catch (error) {
        console.error("Auth error:", error);
        setStatus(getFriendlyAuthError(error, createMode));
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      googleBtn.disabled = true;
      setStatus("Opening Google sign-in...");
      try {
        await signInWithGoogle();
        setStatus("You're signed in.");
        window.location.href = getSafeRedirectTarget();
      } catch (error) {
        console.error("Google sign-in error:", error);
        setStatus(getFriendlyAuthError(error));
      } finally {
        googleBtn.disabled = false;
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetMode = true;
      createMode = false;
      setStatus("");
      renderMode();
      document.getElementById("authEmail")?.focus();
    });
  }

  renderMode();
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-auth-loading");
  setupSignOutButton();
  setupAuthForm();
  watchAuth((user) => {
    updateAuthStatus(user);
    syncUserProfile(user);
  });
});
