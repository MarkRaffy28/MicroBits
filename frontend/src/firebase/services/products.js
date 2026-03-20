import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, } from "firebase/firestore";

import { db } from "../config";

const productsCol = collection(db, "products");

// =========================
// Helper Functions
// =========================

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
 * Gets all products. Image is included inline from Firestore.
 */
export const getAllProducts = async () => {
  const snapshot = await getDocs(productsCol);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Gets a single product by its Firestore document ID.
 */
export const getProductById = async (productId) => {
  const docSnap = await getDoc(doc(productsCol, productId));
  if (!docSnap.exists()) throw Object.assign(new Error("Product not found"), { code: 404 });
  return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Creates a new product in Firestore.
 * Optionally stores a product image as a base64 string in Firestore.
 */
export const createProduct = async (fields, imageFile = null) => {
  const { name, category, description, price, stock } = fields;

  if (!name || !category || !description || price === undefined || stock === undefined) {
    throw Object.assign(new Error("All fields are required"), { code: 400 });
  }

  const docRef = doc(productsCol);

  const newProduct = {
    id:          docRef.id,
    name,
    category,
    description,
    price:       Number(price),
    stock:       Number(stock),
    image:       imageFile ? await fileToBase64(imageFile) : null,
  };

  await setDoc(docRef, newProduct);
  return newProduct;
};

/**
 * Updates an existing product in Firestore.
 * Optionally replaces the product image (stored as base64 in Firestore).
 */
export const updateProduct = async (productId, fields, imageFile = null) => {
  const docRef  = doc(productsCol, productId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("Product not found"), { code: 404 });

  const updates = { ...fields };
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.stock !== undefined) updates.stock = Number(updates.stock);
  if (imageFile) updates.image = await fileToBase64(imageFile);

  await updateDoc(docRef, updates);

  const updated = (await getDoc(docRef)).data();
  return { id: productId, ...updated };
};

/**
 * Deletes a product from Firestore.
 */
export const deleteProduct = async (productId) => {
  const docSnap = await getDoc(doc(productsCol, productId));
  if (!docSnap.exists()) throw Object.assign(new Error("Product not found"), { code: 404 });

  const productData = { id: productId, ...docSnap.data() };
  await deleteDoc(doc(productsCol, productId));
  return productData;
};