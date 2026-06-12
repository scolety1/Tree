// firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { connectAuthEmulator, getAuth } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { connectFirestoreEmulator, getFirestore } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { connectStorageEmulator, getStorage } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBw5SGaLMuQ3U-d4ID08tkHxDtEchp4gy8",
  authDomain: "tree-72e80.firebaseapp.com",
  projectId: "tree-72e80",
  storageBucket: "tree-72e80.firebasestorage.app",
  messagingSenderId: "794600869996",
  appId: "1:794600869996:web:bef802290914e20f088849"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const EMULATOR_OPT_IN_KEY = "familyTreeUseEmulators";
const EMULATOR_CONNECTION_KEY = "__familyTreeEmulatorsConnected";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PRODUCTION_HOSTS = new Set(["tree-72e80.web.app", "tree-72e80.firebaseapp.com"]);

function shouldUseEmulators() {
  if (typeof window === "undefined") return false;

  const { hostname, searchParams } = new URL(window.location.href);
  if (PRODUCTION_HOSTS.has(hostname)) return false;
  if (!LOCAL_HOSTS.has(hostname)) return false;

  const emulatorParam = searchParams.get("emulators");
  if (emulatorParam === "1") {
    localStorage.setItem(EMULATOR_OPT_IN_KEY, "1");
    return true;
  }

  if (emulatorParam === "0") {
    localStorage.removeItem(EMULATOR_OPT_IN_KEY);
    return false;
  }

  return localStorage.getItem(EMULATOR_OPT_IN_KEY) === "1";
}

if (shouldUseEmulators() && !globalThis[EMULATOR_CONNECTION_KEY]) {
  connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 18080);
  connectStorageEmulator(storage, "127.0.0.1", 19199);
  globalThis[EMULATOR_CONNECTION_KEY] = true;
  console.info("Family Tree Firebase emulators enabled for local QA.");
}

export { app, auth, db, storage };
