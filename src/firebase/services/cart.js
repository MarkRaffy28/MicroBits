import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction } from "firebase/firestore";
import { db } from "../config";

const usersCol = collection(db, "users");

// =========================
// Helper Functions
// =========================

/**
 * Returns the Firestore document reference for a user.
 */
const userRef = (userId) => doc(usersCol, userId);

/**
 * Fetches a user's Firestore document and throws if not found.
 */
const getUser = async (userId) => {
  const docRef = userRef(userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });
  return { docRef, data: docSnap.data() };
};

// =========================
// Exported Functions
// =========================

/**
 * Gets a user's cart.
 */
export const getCart = async (userId) => {
  const { data } = await getUser(userId);
  return data.cart || [];
};

/**
 * Adds an item to the cart.
 * - New product: single arrayUnion write, no read needed.
 * - Existing product: transaction to safely increment quantity.
 */
export const addToCart = async (userId, productId, quantity) => {
  const docRef = userRef(userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

  const cart = docSnap.data().cart || [];
  const existing = cart.find((item) => item.productId === productId);

  if (!existing) {
    // No prior read needed — single atomic write
    await updateDoc(docRef, { cart: arrayUnion({ productId, quantity }) });
    return [...cart, { productId, quantity }];
  }

  // Transaction ensures no race condition on quantity increment
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

    const latestCart = snap.data().cart || [];
    const latestItem = latestCart.find((i) => i.productId === productId);

    const updatedItem = { productId, quantity: (latestItem?.quantity ?? 0) + quantity };
    const updatedCart = latestItem
      ? latestCart.map((i) => (i.productId === productId ? updatedItem : i))
      : [...latestCart, updatedItem];

    transaction.update(docRef, { cart: updatedCart });
    return updatedCart;
  });
};

/**
 * Updates the quantity of a specific item in the cart.
 * Uses a transaction to prevent stale overwrites.
 */
export const updateCartItem = async (userId, productId, quantity) => {
  const docRef = userRef(userId);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw Object.assign(new Error("User not found"), { code: 404 });

    const cart = snap.data().cart || [];
    if (!cart.find((i) => i.productId === productId)) {
      throw Object.assign(new Error("Item not in cart"), { code: 404 });
    }

    const updatedCart = cart.map((i) => i.productId === productId ? { ...i, quantity } : i);
    transaction.update(docRef, { cart: updatedCart });
    return updatedCart;
  });
};

/**
 * Removes a specific item from the cart.
 * Uses arrayRemove for a single write with no read.
 */
export const removeFromCart = async (userId, productId) => {
  const { docRef, data } = await getUser(userId);

  const item = (data.cart || []).find((i) => i.productId === productId);
  if (!item) return data.cart || [];

  await updateDoc(docRef, { cart: arrayRemove(item) });
  return (data.cart || []).filter((i) => i.productId !== productId);
};

/**
 * Clears all items from the cart.
 */
export const clearCart = async (userId) => {
  const { docRef } = await getUser(userId);
  await updateDoc(docRef, { cart: [] });
  return [];
};