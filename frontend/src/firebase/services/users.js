import { createUserWithEmailAndPassword, updateProfile, updateEmail, updatePassword, deleteUser as deleteAuthUser } from "firebase/auth";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, limit, } from "firebase/firestore";

import { auth, db } from "../config";

const usersCol = collection(db, "users");

// =========================
// Helper Functions
// =========================

/**
 * Returns true if the currently signed-in user has the role "admin" in Firestore.
 */
const isCurrentUserAdmin = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const docSnap = await getDoc(doc(usersCol, currentUser.uid));
  return docSnap.exists() && docSnap.data().role === "admin";
};

/**
 * Converts a File/Blob to a base64 WebP data URL using OffscreenCanvas.
 * Falls back to plain base64 of the original file if conversion is unsupported.
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
    // Fallback — read the original file as base64
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

/**
 * Gets all users. profilePicture is included inline from Firestore.
 */
export const getAllUsers = async () => {
  const q = query(usersCol, where("status", "==", "active"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
};

/**
 * Gets a single user by their Firebase Auth UID.
 * @param {string} userIdK
 */
export const getUserById = async (userId) => {
  const docSnap = await getDoc(doc(usersCol, userId));
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });
  return docSnap.data();
};

/**
 * Checks whether a username is already taken (case-insensitive).
 */
export const isUsernameTaken = async (username) => {
  const q = query(
    usersCol,
    where("usernameLower", "==", username.toLowerCase()),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Creates a new user in Firebase Auth and Firestore.
 * Optionally stores a profile picture as a base64 string in Firestore.
 */
export const createUser = async (fields, imageFile = null) => {
  const {
    username, email, password,
    firstName = "", middleName = "", lastName = "",
    phoneNumber = "", address = "", role = "user",
  } = fields;

  if (!username || !password) throw Object.assign(new Error("Username and password are required"), { code: 400 });
  if (!email)                 throw Object.assign(new Error("Email is required"), { code: 400 });

  // 1. Create Firebase Auth account
  const { user: authUser } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(authUser, { displayName: username });
  const userId = authUser.uid;

  try {
    const newUser = {
      id: userId,
      username,
      usernameLower: username.toLowerCase(),
      email,
      firstName,
      middleName,
      lastName,
      phoneNumber,
      address,
      role,
      status:          "active",
      profilePicture:  imageFile ? await fileToBase64(imageFile) : null,
      cart:            [],
      createdAt:       new Date().toISOString(),
    };

    // 2. Save to Firestore (includes profilePicture base64 inline)
    await setDoc(doc(usersCol, userId), newUser);

    return newUser;
  } catch (err) {
    // Roll back Auth account if Firestore write fails
    await deleteAuthUser(authUser).catch(() => {});
    throw err;
  }
};

/**
 * Updates a user's Firestore data and Firebase Auth profile.
 * Optionally replaces their profile picture (stored as base64 in Firestore).
 */
export const updateUser = async (userId, fields, imageFile = null) => {
  const docRef  = doc(usersCol, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

  const { email, username, password, ...rest } = fields;
  const currentUser = auth.currentUser;
  const isSelf      = currentUser?.uid === userId;

  // Auth fields can only be changed for the currently signed-in user
  if (isSelf) {
    if (username) await updateProfile(currentUser, { displayName: username });
    if (email)    await updateEmail(currentUser, email);
    if (password) await updatePassword(currentUser, password);
  }

  // Build Firestore update payload
  const firestoreUpdates = { ...rest };
  if (email)    firestoreUpdates.email = email;
  if (username) {
    firestoreUpdates.username      = username;
    firestoreUpdates.usernameLower = username.toLowerCase();
  }
  if (imageFile) {
    firestoreUpdates.profilePicture = await fileToBase64(imageFile);
  }

  if (Object.keys(firestoreUpdates).length > 0) {
    await updateDoc(docRef, firestoreUpdates);
  }

  return (await getDoc(docRef)).data();
};

/**
 * Deletes a user based on who is calling:
 * - Admin: SOFT DELETE — sets status to "deleted" and records deletedAt.
 * - Regular user (self): HARD DELETE — removes Firestore doc and Auth account.
 */
export const deleteUser = async (userId) => {
  const docRef  = doc(usersCol, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

  const userData    = docSnap.data();
  const admin       = await isCurrentUserAdmin();
  const currentUser = auth.currentUser;
  const isSelf      = currentUser?.uid === userId;

  if (admin) {
    // Soft delete — preserve data, mark as deleted
    await updateDoc(docRef, {
      status:    "deleted",
      deletedAt: new Date().toISOString(),
    });
    return { ...userData, status: "deleted" };
  } else if (isSelf) {
    // Hard delete — remove Firestore doc and Auth account
    await deleteDoc(docRef);
    await deleteAuthUser(currentUser).catch((err) => {
      console.warn("Auth deleteUser warning:", err.message);
    });
    return userData;
  } else {
    throw Object.assign(new Error("Unauthorized: cannot delete another user's account"), { code: 403 });
  }
};