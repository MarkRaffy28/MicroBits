import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, runTransaction, } from "firebase/firestore";

import { db } from "../config";

const ordersCol  = collection(db, "orders");
const productsCol = collection(db, "products");

// =========================
// Helper Functions
// =========================

/**
 * Fetches a product document by ID.
 * Returns { docRef, data } or throws if not found.
 */
const getProduct = async (productId) => {
  const docRef  = doc(productsCol, productId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error(`Product ${productId} not found`), { code: 404 });
  return { docRef, data: { id: docSnap.id, ...docSnap.data() } };
};

// =========================
// Exported Functions
// =========================

/**
 * Gets all orders (admin).
 */
export const getAllOrders = async () => {
  const snapshot = await getDocs(ordersCol);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Gets all orders belonging to a specific user.
 */
export const getOrdersByUser = async (userId) => {
  const q        = query(ordersCol, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Gets a single order by its Firestore document ID.
 */
export const getOrderById = async (orderId) => {
  const docSnap = await getDoc(doc(ordersCol, orderId));
  if (!docSnap.exists()) throw Object.assign(new Error("Order not found"), { code: 404 });
  return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Creates a new order.
 * Validates stock and deducts quantities atomically via a Firestore transaction.
 */
export const createOrder = async (userId, items, paymentMethod) => {
  if (!items || items.length === 0) {
    throw Object.assign(new Error("Cart is empty"), { code: 400 });
  }

  return runTransaction(db, async (transaction) => {
    // Read all products first (Firestore requires all reads before writes in a transaction)
    const productSnapshots = await Promise.all(
      items.map((item) => transaction.get(doc(productsCol, item.productId)))
    );

    let totalAmount = 0;

    // Validate stock
    for (let i = 0; i < items.length; i++) {
      const snap = productSnapshots[i];
      if (!snap.exists()) {
        throw Object.assign(new Error(`Product ${items[i].productId} not found`), { code: 404 });
      }

      const product = snap.data();
      const qty     = Number(items[i].quantity);

      if (product.stock < qty) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { code: 400 });
      }

      totalAmount += Number(product.price) * qty;
    }

    // Deduct stock
    for (let i = 0; i < items.length; i++) {
      const snap    = productSnapshots[i];
      const product = snap.data();
      transaction.update(doc(productsCol, items[i].productId), {
        stock: product.stock - Number(items[i].quantity),
      });
    }

    // Build order document
    const newOrder = {
      userId,
      items: items.map((item, i) => ({
        productId: item.productId,
        quantity:  Number(item.quantity),
        price:     Number(productSnapshots[i].data().price),
      })),
      totalAmount,
      status:        "pending",
      paymentMethod,
      createdAt:     new Date().toISOString(),
    };

    // Write order
    const orderRef = doc(ordersCol);
    transaction.set(orderRef, newOrder);

    return { id: orderRef.id, ...newOrder };
  });
};

/**
 * Updates an order (admin).
 * If items are provided, restores old stock and deducts new stock atomically.
 * If only status/paymentMethod are provided, updates those fields only.
 */
export const updateOrder = async (orderId, fields) => {
  const { items, paymentMethod, status } = fields;
  const orderRef = doc(ordersCol, orderId);

  return runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw Object.assign(new Error("Order not found"), { code: 404 });

    const oldOrder = { id: orderSnap.id, ...orderSnap.data() };

    if (items && items.length > 0) {
      // Read all old + new product docs
      const oldProductRefs = oldOrder.items.map((i) => doc(productsCol, i.productId));
      const newProductRefs = items.map((i) => doc(productsCol, i.productId));
      const allRefs        = [...oldProductRefs, ...newProductRefs];

      const allSnaps = await Promise.all(allRefs.map((r) => transaction.get(r)));

      const oldSnaps = allSnaps.slice(0, oldOrder.items.length);
      const newSnaps = allSnaps.slice(oldOrder.items.length);

      // Restore old stock
      oldOrder.items.forEach((oldItem, i) => {
        if (oldSnaps[i].exists()) {
          transaction.update(oldProductRefs[i], {
            stock: oldSnaps[i].data().stock + Number(oldItem.quantity),
          });
        }
      });

      // Validate & deduct new stock
      let totalAmount = 0;
      for (let i = 0; i < items.length; i++) {
        const snap = newSnaps[i];
        if (!snap.exists()) {
          throw Object.assign(new Error(`Product ${items[i].productId} not found`), { code: 404 });
        }

        const product    = snap.data();
        const restoredStock = product.stock + (
          // If same product appears in old items, its stock was already restored above
          oldOrder.items
            .filter((oi) => oi.productId === items[i].productId)
            .reduce((sum, oi) => sum + Number(oi.quantity), 0)
        );
        const qty = Number(items[i].quantity);

        if (restoredStock < qty) {
          throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { code: 400 });
        }

        transaction.update(newProductRefs[i], { stock: restoredStock - qty });
        totalAmount += Number(product.price) * qty;
      }

      const updatedOrder = {
        ...oldOrder,
        items: items.map((item, i) => ({
          productId: item.productId,
          quantity:  Number(item.quantity),
          price:     Number(newSnaps[i].data().price),
        })),
        totalAmount,
        paymentMethod: paymentMethod ?? oldOrder.paymentMethod,
        status:        status        ?? oldOrder.status,
      };

      transaction.update(orderRef, updatedOrder);
      return updatedOrder;
    } else {
      // No item changes — update status / paymentMethod only
      const patch = {};
      if (paymentMethod !== undefined) patch.paymentMethod = paymentMethod;
      if (status        !== undefined) patch.status        = status;

      transaction.update(orderRef, patch);
      return { ...oldOrder, ...patch };
    }
  });
};

/**
 * Deletes an order (admin).
 */
export const deleteOrder = async (orderId) => {
  const docSnap = await getDoc(doc(ordersCol, orderId));
  if (!docSnap.exists()) throw Object.assign(new Error("Order not found"), { code: 404 });

  const orderData = { id: docSnap.id, ...docSnap.data() };
  await deleteDoc(doc(ordersCol, orderId));
  return orderData;
};