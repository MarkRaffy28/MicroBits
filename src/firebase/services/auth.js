import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { auth, db } from "../config";

const usersCol = collection(db, "users");

// =========================
// In-memory profile cache
// =========================
let cachedProfile   = null;
let cachedUid       = null;

const setCachedProfile = (uid, profile) => {
  cachedUid     = uid;
  cachedProfile = profile;
};

const clearCache = () => {
  cachedUid     = null;
  cachedProfile = null;
};

// =========================
// Helper Functions
// =========================

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Resolves a Firestore user document by email or username.
 */
const findUserByIdentifier = async (identifier) => {
  const field = isEmail(identifier) ? "email" : "usernameLower";
  const value = identifier.toLowerCase();

  const q        = query(usersCol, where(field, "==", value), limit(1));
  const snapshot = await getDocs(q);

  return snapshot.empty ? null : snapshot.docs[0].data();
};

// =========================
// Exported Functions
// =========================

export const getCachedProfile = (uid) => (cachedUid === uid ? cachedProfile : null);

/**
 * Signs in a user with either their username or email address.
 * Reuses the Firestore document already fetched during identifier lookup —
 * no second getDoc needed.
 */
export const login = async (identifier, password) => {
  const userData = await findUserByIdentifier(identifier.trim());

  if (!userData) throw new Error("Invalid credentials.");
  if (userData.status === "deleted") throw new Error("This account has been deactivated.");

  // Sign in — we already have the full profile from findUserByIdentifier
  const { user: authUser } = await signInWithEmailAndPassword(auth, userData.email, password);

  // Cache and return — no second getDoc
  setCachedProfile(authUser.uid, userData);
  return userData;
};

/**
 * Signs out and clears the profile cache.
 */
export const logout = async () => {
  clearCache();
  await firebaseSignOut(auth);
};

/**
 * Returns the current user's Firestore profile.
 * Serves from cache if the same UID is already loaded.
 */
export const getCurrentUser = async () => {
  const authUser = auth.currentUser;
  if (!authUser) return null;

  const cached = getCachedProfile(authUser.uid);
  if (cached) return cached;

  const docSnap = await getDoc(doc(usersCol, authUser.uid));
  const profile = docSnap.exists() ? docSnap.data() : null;
  if (profile) setCachedProfile(authUser.uid, profile);
  return profile;
};

/**
 * Subscribes to auth state changes.
 * Serves from cache on repeat triggers (token refresh, tab refocus)
 * to avoid redundant Firestore reads.
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (authUser) => {
    if (!authUser) {
      clearCache();
      return callback(null);
    }

    // Return cached profile immediately — avoids Firestore hit on
    // silent token refreshes and tab focus events
    const cached = getCachedProfile(authUser.uid);
    if (cached) return callback(cached);

    const docSnap = await getDoc(doc(usersCol, authUser.uid));
    const profile = docSnap.exists() ? docSnap.data() : null;
    if (profile) setCachedProfile(authUser.uid, profile);
    callback(profile);
  });
};