import { doc, getDoc, updateDoc, } from "firebase/firestore";

import { db } from "../config";

const usersCol = "users";

// =========================
// Helper Functions
// =========================

/**
 * Returns the Firestore document reference for a user.
 */
const userRef = (userId) => doc(db, usersCol, userId);

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
 * Adds an item to the cart. If the product already exists, increments quantity.
 */
export const addToCart = async (userId, productId, quantity) => {
  const { docRef, data } = await getUser(userId);

  const cart = data.cart || [];
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }

  await updateDoc(docRef, { cart });
  return cart;
};

/**
 * Updates the quantity of a specific item in the cart.
 */
export const updateCartItem = async (userId, productId, quantity) => {
  const { docRef, data } = await getUser(userId);

  const cart = data.cart || [];
  const item = cart.find((i) => i.productId === productId);
  if (!item) throw Object.assign(new Error("Item not in cart"), { code: 404 });

  item.quantity = quantity;

  await updateDoc(docRef, { cart });
  return cart;
};

/**
 * Removes a specific item from the cart.
 */
export const removeFromCart = async (userId, productId) => {
  const { docRef, data } = await getUser(userId);

  const cart = (data.cart || []).filter((i) => i.productId !== productId);

  await updateDoc(docRef, { cart });
  return cart;
};

/**
 * Clears all items from the cart.
 */
export const clearCart = async (userId) => {
  const { docRef } = await getUser(userId);
  await updateDoc(docRef, { cart: [] });
  return [];
};