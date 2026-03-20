import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, limit, } from "firebase/firestore";

import { auth, db } from "../config";

const usersCol = collection(db, "users");

/**
 * Detects whether the given string looks like an email address.
 */
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Resolves a Firestore user document by email or username.
 * Returns null if no matching user is found.
 */
const findUserByIdentifier = async (identifier) => {
  const field = isEmail(identifier) ? "email" : "usernameLower";
  const value = isEmail(identifier) ? identifier.toLowerCase() : identifier.toLowerCase();

  const q = query(usersCol, where(field, "==", value), limit(1));
  const snapshot = await getDocs(q);

  return snapshot.empty ? null : snapshot.docs[0].data();
};

/**
 * Signs in a user with either their username or email address.
 * Throws if credentials are invalid or the account has been deactivated.
 */
export const login = async (identifier, password) => {
  // 1. Find the user's Firestore record to resolve their email
  const userData = await findUserByIdentifier(identifier.trim());

  if (!userData) {
    throw new Error("Invalid credentials.");
  }

  // 2. Block deleted accounts before attempting sign-in
  if (userData.status === "deleted") {
    throw new Error("This account has been deactivated.");
  }

  // 3. Sign in with Firebase Auth using the resolved email
  const { user: authUser } = await signInWithEmailAndPassword(
    auth,
    userData.email,
    password
  );

  // 4. Return the full Firestore profile
  const docSnap = await getDoc(doc(usersCol, authUser.uid));
  return docSnap.data();
};

/**
 * Signs out the currently signed-in user.
 */
export const logout = async () => {
  await firebaseSignOut(auth);
};

/**
 * Returns the currently signed-in user's Firestore profile.
 * Returns null if no user is signed in.
 */
export const getCurrentUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const docSnap = await getDoc(doc(usersCol, currentUser.uid));
  return docSnap.exists() ? docSnap.data() : null;
};

/**
 * Subscribes to Firebase Auth state changes and resolves the full
 * Firestore user profile on each change.
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (authUser) => {
    if (!authUser) return callback(null);

    const docSnap = await getDoc(doc(usersCol, authUser.uid));
    callback(docSnap.exists() ? docSnap.data() : null);
  });
};