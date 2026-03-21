import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, query, where, limit, orderBy,
} from "firebase/firestore";
import { db } from "../config";

const locationsCol = collection(db, "locations");

// =========================
// In-memory cache
// =========================

let locationsCache   = null;
let locationsCacheAt = 0;
const CACHE_TTL_MS   = 60_000; // 1 minute — locations change infrequently

const bustCache = () => { locationsCache = null; };

// =========================
// Constants
// =========================

export const LOCATION_TYPES = [
  "warehouse",
  "origin_facility",
  "transit_hub",
  "destination_facility",
  "delivery_zone",
  "customs",
  "post_office",
  "pickup_point",
];

// =========================
// Exported Functions
// =========================

/**
 * Gets all locations. Served from cache if fresh.
 */
export const getAllLocations = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && locationsCache && now - locationsCacheAt < CACHE_TTL_MS) return locationsCache;

  const snapshot  = await getDocs(query(locationsCol, orderBy("name")));
  locationsCache  = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  locationsCacheAt = now;
  return locationsCache;
};

/**
 * Gets a single location by ID.
 * Checks cache first.
 */
export const getLocationById = async (locationId) => {
  if (locationsCache) {
    const cached = locationsCache.find((l) => l.id === locationId);
    if (cached) return cached;
  }

  const docSnap = await getDoc(doc(locationsCol, locationId));
  if (!docSnap.exists()) throw Object.assign(new Error("Location not found"), { code: 404 });
  return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Gets locations filtered by type.
 */
export const getLocationsByType = async (type) => {
  if (!LOCATION_TYPES.includes(type)) {
    throw Object.assign(new Error(`Invalid location type: ${type}`), { code: 400 });
  }

  // Serve from cache if warm
  if (locationsCache) return locationsCache.filter((l) => l.type === type);

  const snapshot = await getDocs(query(locationsCol, where("type", "==", type), orderBy("name")));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Creates a new location.
 */
export const createLocation = async (fields) => {
  const { name, type, address, city, country, postalCode = "", coordinates = null } = fields;

  if (!name)    throw Object.assign(new Error("Location name is required"),    { code: 400 });
  if (!type)    throw Object.assign(new Error("Location type is required"),    { code: 400 });
  if (!address) throw Object.assign(new Error("Location address is required"), { code: 400 });
  if (!city)    throw Object.assign(new Error("Location city is required"),    { code: 400 });
  if (!country) throw Object.assign(new Error("Location country is required"), { code: 400 });

  if (!LOCATION_TYPES.includes(type)) {
    throw Object.assign(new Error(`Invalid location type: ${type}`), { code: 400 });
  }

  const docRef      = doc(locationsCol);
  const newLocation = {
    id: docRef.id,
    name,
    type,
    address,
    city,
    country,
    postalCode,
    coordinates, // { lat, lng } or null
    active:    true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(docRef, newLocation);
  bustCache();
  return newLocation;
};

/**
 * Updates an existing location.
 * Merges locally — no second getDoc needed.
 */
export const updateLocation = async (locationId, fields) => {
  const docRef  = doc(locationsCol, locationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("Location not found"), { code: 404 });

  if (fields.type && !LOCATION_TYPES.includes(fields.type)) {
    throw Object.assign(new Error(`Invalid location type: ${fields.type}`), { code: 400 });
  }

  await updateDoc(docRef, fields);
  bustCache();
  return { id: locationId, ...docSnap.data(), ...fields };
};

/**
 * Soft-deactivates a location (sets active: false).
 * Preferred over hard delete to preserve tracking history integrity.
 */
export const deactivateLocation = async (locationId) => {
  const docRef  = doc(locationsCol, locationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("Location not found"), { code: 404 });

  await updateDoc(docRef, { active: false, deactivatedAt: new Date().toISOString() });
  bustCache();
  return { id: locationId, ...docSnap.data(), active: false };
};

/**
 * Hard deletes a location.
 * Use deactivateLocation instead if location is referenced in tracking history.
 */
export const deleteLocation = async (locationId) => {
  const docRef  = doc(locationsCol, locationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw Object.assign(new Error("Location not found"), { code: 404 });

  const locationData = { id: locationId, ...docSnap.data() };
  await deleteDoc(docRef);
  bustCache();
  return locationData;
};

/**
 * Resolves a list of locationIds to full location objects.
 * Useful for hydrating tracking history in order views.
 * Batches cache lookups — only fetches uncached IDs from Firestore.
 */
export const resolveLocations = async (locationIds) => {
  const unique = [...new Set(locationIds.filter(Boolean))];
  if (!unique.length) return {};

  const result  = {};
  const missing = [];

  // Hit cache first
  for (const id of unique) {
    const cached = locationsCache?.find((l) => l.id === id);
    if (cached) result[id] = cached;
    else missing.push(id);
  }

  // Fetch only what's missing
  if (missing.length) {
    await Promise.all(
      missing.map(async (id) => {
        const docSnap = await getDoc(doc(locationsCol, id));
        if (docSnap.exists()) result[id] = { id: docSnap.id, ...docSnap.data() };
      })
    );
  }

  return result; // { [locationId]: locationObject }
};