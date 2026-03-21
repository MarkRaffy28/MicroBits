import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../config";

const productsCol = collection(db, "products");

// =========================
// Simple in-memory cache for product list
// =========================
let productsCache    = null;
let productsCacheAt  = 0;
const CACHE_TTL_MS   = 60_000; // 1 minute

const bustCache = () => { productsCache = null; };

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
 * Gets all products, served from cache if fresh.
 */
export const getAllProducts = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && productsCache && now - productsCacheAt < CACHE_TTL_MS) {
    return productsCache;
  }
  const snapshot  = await getDocs(productsCol);
  productsCache   = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  productsCacheAt = now;
  return productsCache;
};

/**
 * Gets a single product by ID.
 * Tries the in-memory cache first before hitting Firestore.
 */
export const getProductById = async (productId) => {
  // Serve from cache if available — avoids a Firestore read on ProductDetail navigation
  if (productsCache) {
    const cached = productsCache.find((p) => p.id === productId);
    if (cached) return cached;
  }

  const docSnap = await getDoc(doc(productsCol, productId));
  if (!docSnap.exists()) throw Object.assign(new Error("Product not found"), { code: 404 });
  return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Creates a new product. Uses a batch so the write is atomic.
 */
export const createProduct = async (fields, imageFile = null) => {
  const { name, category, description, price, stock } = fields;

  if (!name || !category || !description || price === undefined || stock === undefined) {
    throw Object.assign(new Error("All fields are required"), { code: 400 });
  }

  // Kick off image conversion and doc ref creation in parallel
  const [image, docRef] = await Promise.all([
    imageFile ? fileToBase64(imageFile) : Promise.resolve(null),
    Promise.resolve(doc(productsCol)),
  ]);

  const newProduct = {
    id: docRef.id,
    name,
    category,
    description,
    price: Number(price),
    stock: Number(stock),
    image,
  };

  await setDoc(docRef, newProduct);
  bustCache();
  return newProduct;
};

/**
 * Updates an existing product.
 * Eliminates the second getDoc by merging updates over the first snapshot locally.
 */
export const updateProduct = async (productId, fields, imageFile = null) => {
  const docRef  = doc(productsCol, productId);

  // Run existence check and image conversion in parallel
  const [docSnap, image] = await Promise.all([
    getDoc(docRef),
    imageFile ? fileToBase64(imageFile) : Promise.resolve(undefined),
  ]);

  if (!docSnap.exists()) throw Object.assign(new Error("Product not found"), { code: 404 });

  const updates = { ...fields };
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.stock !== undefined) updates.stock = Number(updates.stock);
  if (image !== undefined)         updates.image = image;

  await updateDoc(docRef, updates);
  bustCache();

  // Merge locally — no second getDoc needed
  return { id: productId, ...docSnap.data(), ...updates };
};

/**
 * Deletes a product. Fires read and delete in parallel via batch.
 */
export const deleteProduct = async (productId) => {
  const docRef  = doc(productsCol, productId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("Product not found"), { code: 404 });

  const productData = { id: productId, ...docSnap.data() };
  await deleteDoc(docRef);
  bustCache();
  return productData;
};