import { createUserWithEmailAndPassword, updateProfile, verifyBeforeUpdateEmail, updatePassword, deleteUser as deleteAuthUser, } from "firebase/auth";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, limit, } from "firebase/firestore";

import { auth, db } from "../config";
import { getCachedProfile } from "./auth"; // reuse auth cache for admin check

const usersCol = collection(db, "users");

// =========================
// Helper Functions
// =========================

/**
 * Returns true if the currently signed-in user has the role "admin".
 * Reads from the auth cache — avoids a redundant Firestore hit.
 */
const isCurrentUserAdmin = () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const cached = getCachedProfile(currentUser.uid);
  // Fall back to false if cache is cold — deleteUser already has the doc in hand
  return cached?.role === "admin";
};

/**
 * Converts a File/Blob to a base64 WebP data URL using OffscreenCanvas.
 */
const fileToBase64 = async (file) => {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx    = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

// =========================
// Exported Functions
// =========================

export const getAllUsers = async () => {
  const snapshot = await getDocs(usersCol);
  return snapshot.docs.map((d) => d.data());
};

export const getUserByEmail = async (email) => {
  const snapshot = await getDocs(
    query(usersCol, where("email", "==", email.toLowerCase().trim()), limit(1))
  );
  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  return {
    ...data,
    emailVerified: data.emailVerified ?? false,
  };
};

export const getUserById = async (userId) => {
  const docSnap = await getDoc(doc(usersCol, userId));
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });
  return docSnap.data();
};

export const isUsernameTaken = async (username) => {
  const snapshot = await getDocs(
    query(usersCol, where("usernameLower", "==", username.toLowerCase()), limit(1))
  );
  return !snapshot.empty;
};

/**
 * Creates a new user in Firebase Auth and Firestore.
 * Auth creation and image conversion run in parallel.
 */
export const createUser = async (fields, imageFile = null) => {
  const {
    username, email, password,
    firstName = "", middleName = "", lastName = "",
    phoneNumber = "", address = "", role = "user",
  } = fields;

  if (!username || !password) throw Object.assign(new Error("Username and password are required"), { code: 400 });
  if (!email)                 throw Object.assign(new Error("Email is required"), { code: 400 });

  // Run Auth creation and image conversion in parallel
  const [{ user: authUser }, profilePicture] = await Promise.all([
    createUserWithEmailAndPassword(auth, email, password),
    imageFile ? fileToBase64(imageFile) : Promise.resolve(null),
  ]);

  await updateProfile(authUser, { displayName: username });

  const newUser = {
    id:             authUser.uid,
    username,
    usernameLower:  username.toLowerCase(),
    email,
    firstName,
    middleName,
    lastName,
    phoneNumber,
    address,
    role,
    status:         "active",
    profilePicture,
    cart:           [],
    emailVerified:  false, 
    createdAt:      new Date().toISOString(),
  };

  try {
    await setDoc(doc(usersCol, authUser.uid), newUser);
    return newUser;
  } catch (err) {
    await deleteAuthUser(authUser).catch(() => {});
    throw err;
  }
};

/**
 * Updates a user's Firestore data and Firebase Auth profile.
 * Eliminates the second getDoc by merging updates locally.
 */
export const updateUser = async (userId, fields, imageFile = null) => {
  const docRef  = doc(usersCol, userId);

  // Run existence check and image conversion in parallel
  const [docSnap, profilePicture] = await Promise.all([
    getDoc(docRef),
    imageFile ? fileToBase64(imageFile) : Promise.resolve(undefined),
  ]);

  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

  const { email, username, password, ...rest } = fields;
  const currentUser = auth.currentUser;
  const isSelf      = currentUser?.uid === userId;

  if (isSelf) {
    await Promise.all([
      username ? updateProfile(currentUser, { displayName: username }) : Promise.resolve(),
      email    ? verifyBeforeUpdateEmail(currentUser, email)           : Promise.resolve(),
      password ? updatePassword(currentUser, password)                 : Promise.resolve(),
    ]);
  }

  const firestoreUpdates = { ...rest };
  if (email)                   firestoreUpdates.email          = email;
  if (username) {
    firestoreUpdates.username      = username;
    firestoreUpdates.usernameLower = username.toLowerCase();
  }
  if (profilePicture !== undefined) firestoreUpdates.profilePicture = profilePicture;

  if (Object.keys(firestoreUpdates).length > 0) {
    await updateDoc(docRef, firestoreUpdates);
  }

  // Merge locally — no second getDoc needed
  return { ...docSnap.data(), ...firestoreUpdates };
};

/**
 * Deletes a user.
 * Admin check reads from the auth cache — no extra Firestore read.
 */
export const deleteUser = async (userId) => {
  const docRef  = doc(usersCol, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

  const userData    = docSnap.data();
  const admin       = isCurrentUserAdmin(); // cache-read, no await needed
  const currentUser = auth.currentUser;
  const isSelf      = currentUser?.uid === userId;

  if (admin) {
    await updateDoc(docRef, { status: "deleted", deletedAt: new Date().toISOString() });
    return { ...userData, status: "deleted" };
  }

  if (isSelf) {
    await deleteDoc(docRef);
    await deleteAuthUser(currentUser).catch((err) => {
      console.warn("Auth deleteUser warning:", err.message);
    });
    return userData;
  }

  throw Object.assign(new Error("Unauthorized: cannot delete another user's account"), { code: 403 });
};

/**
 * Restores a soft-deleted user.
 * Admin check reads from the auth cache — no extra Firestore read.
 */
export const restoreUser = async (userId) => {
  const docRef  = doc(usersCol, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

  const userData = docSnap.data();
  const admin    = isCurrentUserAdmin(); // cache-read, no await needed

  if (admin) {
    await updateDoc(docRef, { status: "active", deletedAt: null });
    return { ...userData, status: "active", deletedAt: null };
  }

  throw Object.assign(new Error("Unauthorized: only admins can restore users"), { code: 403 });
};