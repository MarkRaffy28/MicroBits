import {
  collection, doc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, runTransaction, arrayUnion,
} from "firebase/firestore";
import { db } from "../config";

const ordersCol   = collection(db, "orders");
const productsCol = collection(db, "products");

// =========================
// Constants
// =========================

export const ORDER_STATUSES = [
  "to_pay",
  "to_ship",
  "to_receive",
  "completed",
  "cancelled",
  "return_refund",
];

export const ORDER_STATUS_LABELS = {
  to_pay:        "To Pay",
  to_ship:       "To Ship",
  to_receive:    "To Receive",
  completed:     "Completed",
  cancelled:     "Cancelled",
  return_refund: "Return / Refund",
};

export const TRACKING_STATUSES = [
  "shipment_created",
  "picked_up",
  "at_origin_facility",
  "in_transit",
  "arrived_at_facility",
  "departed_facility",
  "arrived_at_destination",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "returned_to_sender",
  "on_hold",
  "customs_clearance",
];

export const TRACKING_STATUS_LABELS = {
  shipment_created:       { title: "Shipment Created",          description: "Order has been confirmed and a shipment has been created." },
  picked_up:              { title: "Picked Up",                 description: "Package has been picked up by the courier." },
  at_origin_facility:     { title: "At Origin Facility",        description: "Package has arrived at the origin sorting facility." },
  in_transit:             { title: "In Transit",                description: "Package is on its way to the destination." },
  arrived_at_facility:    { title: "Arrived at Facility",       description: "Package has arrived at an intermediate facility." },
  departed_facility:      { title: "Departed Facility",         description: "Package has left the facility and is moving forward." },
  arrived_at_destination: { title: "Arrived at Destination",    description: "Package has arrived at the destination facility." },
  out_for_delivery:       { title: "Out for Delivery",          description: "Package is out for delivery and will arrive today." },
  delivered:              { title: "Delivered",                 description: "Package has been successfully delivered." },
  delivery_failed:        { title: "Delivery Failed",           description: "Delivery was attempted but unsuccessful. A re-delivery will be scheduled." },
  returned_to_sender:     { title: "Returned to Sender",        description: "Package could not be delivered and has been returned to the sender." },
  on_hold:                { title: "On Hold",                   description: "Package is temporarily on hold. Our team is working to resolve this." },
  customs_clearance:      { title: "Customs Clearance",         description: "Package is undergoing customs inspection and clearance." },
};

export const CANCELLABLE_STATUSES = ["to_pay", "to_ship"];

// =========================
// In-memory cache
// =========================

let ordersCache    = null;
let ordersCacheAt  = 0;
const CACHE_TTL_MS = 30_000;

const bustOrdersCache = () => { ordersCache = null; };

// =========================
// Exported Functions
// =========================

export const getAllOrders = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && ordersCache && now - ordersCacheAt < CACHE_TTL_MS) return ordersCache;

  const snapshot = await getDocs(ordersCol);
  ordersCache    = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  ordersCacheAt  = now;
  return ordersCache;
};

export const getOrdersByUser = async (userId) => {
  const snapshot = await getDocs(query(ordersCol, where("userId", "==", userId)));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getOrderById = async (orderId) => {
  const docSnap = await getDoc(doc(ordersCol, orderId));
  if (!docSnap.exists()) throw Object.assign(new Error("Order not found"), { code: 404 });
  return { id: docSnap.id, ...docSnap.data() };
};

export const createOrder = async (userId, items, paymentMethod) => {
  if (!items?.length) throw Object.assign(new Error("Cart is empty"), { code: 400 });

  const result = await runTransaction(db, async (transaction) => {
    const productSnaps = await Promise.all(
      items.map((item) => transaction.get(doc(productsCol, item.productId)))
    );

    let totalAmount = 0;

    for (let i = 0; i < items.length; i++) {
      const snap = productSnaps[i];
      if (!snap.exists()) throw Object.assign(new Error(`Product ${items[i].productId} not found`), { code: 404 });

      const product = snap.data();
      const qty     = Number(items[i].quantity);
      if (product.stock < qty) throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { code: 400 });

      totalAmount += Number(product.price) * qty;
    }

    for (let i = 0; i < items.length; i++) {
      transaction.update(doc(productsCol, items[i].productId), {
        stock: productSnaps[i].data().stock - Number(items[i].quantity),
      });
    }

    const newOrder = {
      userId,
      items: items.map((item, i) => ({
        productId: item.productId,
        quantity:  Number(item.quantity),
        price:     Number(productSnaps[i].data().price),
      })),
      totalAmount,
      status:        "to_pay",
      paymentMethod,
      tracking:      [],
      createdAt:     new Date().toISOString(),
    };

    const orderRef = doc(ordersCol);
    transaction.set(orderRef, newOrder);
    return { id: orderRef.id, ...newOrder };
  });

  bustOrdersCache();
  return result;
};

export const updateOrder = async (orderId, { status, paymentMethod }) => {
  if (status && !ORDER_STATUSES.includes(status)) {
    throw Object.assign(new Error(`Invalid status: ${status}`), { code: 400 });
  }

  const orderRef = doc(ordersCol, orderId);
  const patch    = {};
  if (status        !== undefined) patch.status        = status;
  if (paymentMethod !== undefined) patch.paymentMethod = paymentMethod;

  await updateDoc(orderRef, patch);
  bustOrdersCache();

  const updated = await getDoc(orderRef);
  return { id: updated.id, ...updated.data() };
};

export const updateOrderItems = async (orderId, items) => {
  if (!items?.length) throw Object.assign(new Error("Items cannot be empty"), { code: 400 });

  const result = await runTransaction(db, async (transaction) => {
    const orderRef  = doc(ordersCol, orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw Object.assign(new Error("Order not found"), { code: 404 });

    const oldOrder = { id: orderSnap.id, ...orderSnap.data() };

    const oldRefs = oldOrder.items.map((i) => doc(productsCol, i.productId));
    const newRefs = items.map((i) => doc(productsCol, i.productId));

    const [oldSnaps, newSnaps] = await Promise.all([
      Promise.all(oldRefs.map((r) => transaction.get(r))),
      Promise.all(newRefs.map((r) => transaction.get(r))),
    ]);

    oldOrder.items.forEach((oldItem, i) => {
      if (oldSnaps[i].exists()) {
        transaction.update(oldRefs[i], {
          stock: oldSnaps[i].data().stock + Number(oldItem.quantity),
        });
      }
    });

    let totalAmount = 0;
    for (let i = 0; i < items.length; i++) {
      const snap = newSnaps[i];
      if (!snap.exists()) throw Object.assign(new Error(`Product ${items[i].productId} not found`), { code: 404 });

      const product       = snap.data();
      const restoredQty   = oldOrder.items
        .filter((oi) => oi.productId === items[i].productId)
        .reduce((sum, oi) => sum + Number(oi.quantity), 0);
      const restoredStock = product.stock + restoredQty;
      const qty           = Number(items[i].quantity);

      if (restoredStock < qty) throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { code: 400 });

      transaction.update(newRefs[i], { stock: restoredStock - qty });
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
    };

    transaction.update(orderRef, updatedOrder);
    return updatedOrder;
  });

  bustOrdersCache();
  return result;
};

/**
 * Appends a tracking event to an order's tracking array.
 * locationId is optional — omit or pass null for events with no physical location.
 */
export const addTrackingEvent = async (orderId, { status, locationId = null }) => {
  if (!TRACKING_STATUSES.includes(status)) {
    throw Object.assign(new Error(`Invalid tracking status: ${status}`), { code: 400 });
  }

  const event = {
    status,
    title:      TRACKING_STATUS_LABELS[status].title,
    description: TRACKING_STATUS_LABELS[status].description,
    timestamp:  new Date().toISOString(),
    ...(locationId ? { locationId } : {}), // omitted entirely when not provided
  };

  await updateDoc(doc(ordersCol, orderId), {
    tracking: arrayUnion(event),
  });

  bustOrdersCache();
  return event;
};

export const deleteOrder = async (orderId) => {
  const docRef  = doc(ordersCol, orderId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("Order not found"), { code: 404 });

  const orderData = { id: docSnap.id, ...docSnap.data() };
  await deleteDoc(docRef);
  bustOrdersCache();
  return orderData;
};