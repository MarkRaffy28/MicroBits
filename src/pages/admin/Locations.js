import React, { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import AnimatedTableRows from "../../react_bits/AnimatedTableRows";
import { getAllLocations, createLocation, updateLocation, deactivateLocation, deleteLocation as firebaseDeleteLocation, LOCATION_TYPES, } from "../../firebase/services/locations";
import "../../styles/StyleSheet.css";

// =========================
// Module-level components
// =========================

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const inputCls  = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";
const selectCls = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";

const Field = ({ id, label, value, onChange, required = false, placeholder = " ", type = "text" }) => (
  <div className="mb-3 relative">
    <input id={id} type={type} placeholder={placeholder} value={value ?? ""}
      onChange={onChange} required={required} className={inputCls} />
    <label htmlFor={id} className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">{label}</label>
  </div>
);

const LocationForm = ({ data, setData, onSubmit, isLoading, onClose, submitLabel, loadingLabel }) => (
  <form onSubmit={onSubmit}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <div className="sm:col-span-2">
        <Field id={`${submitLabel}_name`} label="Name *" value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })} required />
      </div>
      <div className="mb-3 relative">
        <select id={`${submitLabel}_type`} value={data.type}
          onChange={(e) => setData({ ...data, type: e.target.value })} className={selectCls}>
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <label htmlFor={`${submitLabel}_type`} className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Type</label>
      </div>
      <Field id={`${submitLabel}_postal`} label="Postal Code" value={data.postalCode}
        onChange={(e) => setData({ ...data, postalCode: e.target.value })} />
      <div className="sm:col-span-2">
        <Field id={`${submitLabel}_address`} label="Address *" value={data.address}
          onChange={(e) => setData({ ...data, address: e.target.value })} required />
      </div>
      <Field id={`${submitLabel}_city`} label="City *" value={data.city}
        onChange={(e) => setData({ ...data, city: e.target.value })} required />
      <Field id={`${submitLabel}_country`} label="Country *" value={data.country}
        onChange={(e) => setData({ ...data, country: e.target.value })} required />
      <Field id={`${submitLabel}_lat`} label="Latitude" type="number"
        value={data.coordinates?.lat ?? ""}
        onChange={(e) => setData({ ...data, coordinates: { ...data.coordinates, lat: Number(e.target.value) } })} />
      <Field id={`${submitLabel}_lng`} label="Longitude" type="number"
        value={data.coordinates?.lng ?? ""}
        onChange={(e) => setData({ ...data, coordinates: { ...data.coordinates, lng: Number(e.target.value) } })} />
    </div>
    <div className="pt-2 flex justify-center gap-3">
      <button type="button" onClick={onClose} disabled={isLoading}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
        Cancel
      </button>
      <button type="submit" disabled={isLoading}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
        {isLoading ? <><Spinner />{loadingLabel}</> : submitLabel}
      </button>
    </div>
  </form>
);

const typeBadge = (type) => {
  const colors = {
    warehouse:            "bg-blue-700",
    origin_facility:      "bg-purple-700",
    transit_hub:          "bg-yellow-700 text-gray-900",
    destination_facility: "bg-green-700",
    delivery_zone:        "bg-teal-700",
    customs:              "bg-red-700",
    post_office:          "bg-orange-700",
    pickup_point:         "bg-pink-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white ${colors[type] ?? "bg-gray-600"}`}>
      {type?.replace(/_/g, " ")}
    </span>
  );
};

const statusBadge = (active) => (
  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
    active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
  }`}>
    {active ? "Active" : "Inactive"}
  </span>
);

/* ─── Sort columns ─── */
const SORT_COLUMNS = [
  { key: "id",      label: "ID"      },
  { key: "name",    label: "Name"    },
  { key: "type",    label: "Type"    },
  { key: "city",    label: "City"    },
  { key: "country", label: "Country" },
  { key: "active",  label: "Status"  },
];

// =========================
// Main Component
// =========================

const blankLocation = {
  name: "", type: "warehouse", address: "", city: "",
  country: "", postalCode: "", coordinates: null,
};

const blankEdit = {
  name: "", type: "warehouse", address: "", city: "",
  country: "", postalCode: "", coordinates: null, active: true,
};

function Locations() {
  const { addToast } = useToast();
  const { setPageTitle, setHeaderAction } = useOutletContext();

  /* ─── Search & sort ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol,     setSortCol]     = useState("name");
  const [sortDir,     setSortDir]     = useState("asc");
  const [sortOpen,    setSortOpen]    = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─── Modal state ─── */
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [showEditModal,    setShowEditModal]     = useState(false);
  const [showDeleteModal,  setShowDeleteModal]   = useState(false);
  const [showViewModal,    setShowViewModal]     = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hardDelete,       setHardDelete]        = useState(false);

  const handleAddClose    = () => setShowAddModal(false);
  const handleAddShow     = () => { setNewLocation(blankLocation); setShowAddModal(true); };
  const handleEditClose   = () => setShowEditModal(false);
  const handleEditShow    = (loc) => {
    setSelectedLocation(loc);
    setEditingLocation({
      name:        loc.name        || "",
      type:        loc.type        || "warehouse",
      address:     loc.address     || "",
      city:        loc.city        || "",
      country:     loc.country     || "",
      postalCode:  loc.postalCode  || "",
      coordinates: loc.coordinates || null,
      active:      loc.active      ?? true,
    });
    setShowEditModal(true);
  };
  const handleDeleteClose = () => { setShowDeleteModal(false); setHardDelete(false); };
  const handleDeleteShow  = (loc) => { setSelectedLocation(loc); setShowDeleteModal(true); };
  const handleViewClose   = () => setShowViewModal(false);
  const handleViewShow    = (loc) => { setSelectedLocation(loc); setShowViewModal(true); };

  /* ─── Data state ─── */
  const [locations,         setLocations]         = useState([]);
  const [fetchingLocations, setFetchingLocations] = useState(true);

  /* ─── Per-operation loading ─── */
  const [isAdding,   setIsAdding]   = useState(false);
  const [isEditing,  setIsEditing]  = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─── Form state ─── */
  const [newLocation,     setNewLocation]     = useState(blankLocation);
  const [editingLocation, setEditingLocation] = useState(blankEdit);

  useEffect(() => {
    setPageTitle("Locations");
    setHeaderAction(
      <div className="flex items-center gap-2 w-full">
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations…"
            className="pl-7 pr-7 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full sm:w-36 md:w-48 h-8"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <i className="bi bi-x text-sm" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-all h-8 ${
              sortOpen ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}>
            <i className="bi bi-sort-down text-base" />
            <span className="hidden sm:inline">Sort</span>
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Column</p>
                <div className="space-y-0.5">
                  {SORT_COLUMNS.map(({ key, label }) => (
                    <button key={key}
                      onClick={() => setSortCol(key)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-sm transition-colors ${
                        sortCol === key ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
                      }`}>
                      {sortCol === key && <i className="bi bi-check mr-1.5 text-xs" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-700 mx-3 my-2" />
              <div className="px-3 pb-2.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Direction</p>
                <div className="flex gap-1.5">
                  {[
                    { val: "asc",  icon: "bi-sort-up",   label: "Asc"  },
                    { val: "desc", icon: "bi-sort-down",  label: "Desc" },
                  ].map(({ val, icon, label }) => (
                    <button key={val}
                      onClick={() => setSortDir(val)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-sm transition-colors ${
                        sortDir === val ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}>
                      <i className={`bi ${icon}`} />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          className="bg-green-600 hover:bg-green-700 text-neutral-200 text-sm px-3 py-1 rounded transition-all duration-200 transform hover:scale-105"
          onClick={handleAddShow}>
          Add
        </button>
      </div>
    );
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, [searchQuery, sortCol, sortDir, sortOpen]);

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    setFetchingLocations(true);
    try {
      const data = await getAllLocations({ force: true });
      setLocations(data);
    } catch {
      addToast("Failed to fetch locations.", "error");
    } finally {
      setFetchingLocations(false);
    }
  };

  /* ─── Filter + sort ─── */
  const displayedLocations = [...locations]
    .filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.id?.toString().toLowerCase().includes(q) ||
        l.name?.toLowerCase().includes(q) ||
        l.type?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.country?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q) ||
        l.postalCode?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortCol === "active") { aVal = a.active ? 1 : 0; bVal = b.active ? 1 : 0; }
      else { aVal = (a[sortCol] ?? "").toString().toLowerCase(); bVal = (b[sortCol] ?? "").toString().toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  /* ─── Add ─── */
  const addLocation = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const created = await createLocation(newLocation);
      setLocations((prev) => [...prev, created]);
      setNewLocation(blankLocation);
      handleAddClose();
      addToast(`"${created.name}" added successfully.`, "success");
    } catch (err) {
      addToast(err.message || "Failed to add location.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  /* ─── Edit ─── */
  const editLocation = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const updated = await updateLocation(selectedLocation.id, editingLocation);
      setLocations((prev) => prev.map((l) => (l.id === selectedLocation.id ? updated : l)));
      handleEditClose();
      addToast(`"${updated.name}" updated successfully.`, "success");
    } catch (err) {
      addToast(err.message || "Failed to update location.", "error");
    } finally {
      setIsEditing(false);
    }
  };

  /* ─── Delete / Deactivate ─── */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (hardDelete) {
        await firebaseDeleteLocation(selectedLocation.id);
        setLocations((prev) => prev.filter((l) => l.id !== selectedLocation.id));
        addToast(`"${selectedLocation.name}" permanently deleted.`, "success");
      } else {
        const updated = await deactivateLocation(selectedLocation.id);
        setLocations((prev) => prev.map((l) => (l.id === selectedLocation.id ? updated : l)));
        addToast(`"${selectedLocation.name}" deactivated.`, "success");
      }
      handleDeleteClose();
    } catch {
      addToast("Failed to delete location.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-lg w-full mx-4 lg:w-1/2 lg:mx-auto max-h-[90vh] overflow-y-auto animate-slideUp";

  /* ─── Table rows ─── */
  const locationRows = displayedLocations.map((loc) => (
    <>
      <td className="text-center px-4 py-3 font-mono">
        <span className="inline-block max-w-[80px] truncate align-bottom text-xs text-gray-500" title={loc.id}>{loc.id}</span>
      </td>
      <td className="text-center px-4 py-3 font-medium">{loc.name}</td>
      <td className="text-center px-4 py-3">{typeBadge(loc.type)}</td>
      <td className="text-center px-4 py-3 text-sm text-gray-300">{loc.city}</td>
      <td className="text-center px-4 py-3 text-sm text-gray-300">{loc.country}</td>
      <td className="text-center px-4 py-3">
        {loc.coordinates
          ? <span className="text-xs text-gray-400">{loc.coordinates.lat?.toFixed(4)}, {loc.coordinates.lng?.toFixed(4)}</span>
          : <span className="text-gray-600 text-xs italic">N/A</span>
        }
      </td>
      <td className="text-center px-4 py-3">{statusBadge(loc.active)}</td>
      <td className="text-center px-4 py-3 whitespace-nowrap">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleViewShow(loc); }}>
          <i className="bi bi-eye mr-1" />View
        </button>
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleEditShow(loc); }}>
          <i className="bi bi-pencil mr-1" />Edit
        </button>
        <button
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          onClick={(e) => { e.stopPropagation(); handleDeleteShow(loc); }}
          disabled={!loc.active}>
          <i className="bi bi-trash mr-1" />Delete
        </button>
      </td>
    </>
  ));

  return (
    <>
      <div className="container mx-auto p-4">
        {fetchingLocations ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Spinner />
            <span>Loading locations...</span>
          </div>
        ) : displayedLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <i className="bi bi-search text-5xl mb-3" />
            <p>No locations found for "<span className="text-gray-300">{searchQuery}</span>"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="border-b-4 border-blue-600">
                <tr className="align-middle">
                  <th className="text-center px-4 py-3">ID</th>
                  <th className="text-center px-4 py-3">Name</th>
                  <th className="text-center px-4 py-3">Type</th>
                  <th className="text-center px-4 py-3">City</th>
                  <th className="text-center px-4 py-3">Country</th>
                  <th className="text-center px-4 py-3">Coordinates</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatedTableRows items={locationRows} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────── VIEW MODAL ─────────── */}
      {showViewModal && selectedLocation && (
        <div className={modalOverlay} onClick={handleViewClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">LOCATION DETAILS</h2>
              <button onClick={handleViewClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <div className="flex justify-center gap-2 mb-6">
                {typeBadge(selectedLocation.type)}
                {statusBadge(selectedLocation.active)}
              </div>
              <div className="space-y-3">
                {[
                  { label: "ID",          value: selectedLocation.id },
                  { label: "Name",        value: selectedLocation.name },
                  { label: "Address",     value: selectedLocation.address },
                  { label: "City",        value: selectedLocation.city },
                  { label: "Country",     value: selectedLocation.country },
                  { label: "Postal Code", value: selectedLocation.postalCode || <span className="text-gray-500 italic">N/A</span> },
                  { label: "Coordinates", value: selectedLocation.coordinates
                    ? `${selectedLocation.coordinates.lat}, ${selectedLocation.coordinates.lng}`
                    : <span className="text-gray-500 italic">N/A</span> },
                  { label: "Created At",  value: selectedLocation.createdAt
                    ? new Date(selectedLocation.createdAt).toLocaleDateString()
                    : <span className="text-gray-500 italic">N/A</span> },
                  ...(selectedLocation.deactivatedAt ? [{
                    label: "Deactivated At",
                    value: new Date(selectedLocation.deactivatedAt).toLocaleDateString(),
                  }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start gap-4 py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm whitespace-nowrap">{label}</span>
                    <span className="text-white text-sm text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-6 gap-3">
                <button onClick={handleViewClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-all duration-200 transform hover:scale-105">
                  Close
                </button>
                <button onClick={() => { handleViewClose(); handleEditShow(selectedLocation); }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-6 py-2 rounded transition-all duration-200 transform hover:scale-105">
                  <i className="bi bi-pencil mr-1" />Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── ADD MODAL ─────────── */}
      {showAddModal && (
        <div className={modalOverlay} onClick={handleAddClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">ADD LOCATION</h2>
              <button onClick={handleAddClose} disabled={isAdding}
                className="hover:opacity-70 text-2xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4">
              <LocationForm
                data={newLocation}     setData={setNewLocation}
                onSubmit={addLocation} isLoading={isAdding}
                onClose={handleAddClose}
                submitLabel="Add"      loadingLabel="Adding..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────── EDIT MODAL ─────────── */}
      {showEditModal && selectedLocation && (
        <div className={modalOverlay} onClick={handleEditClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">EDIT LOCATION</h2>
              <button onClick={handleEditClose} disabled={isEditing}
                className="hover:opacity-70 text-2xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4 bg-gray-800 border border-gray-700 rounded px-4 py-3">
                <span className="text-gray-300 text-sm font-medium">Location Active</span>
                <button type="button"
                  onClick={() => setEditingLocation((prev) => ({ ...prev, active: !prev.active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${editingLocation.active ? "bg-green-500" : "bg-gray-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${editingLocation.active ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <LocationForm
                data={editingLocation}  setData={setEditingLocation}
                onSubmit={editLocation} isLoading={isEditing}
                onClose={handleEditClose}
                submitLabel="Update"    loadingLabel="Updating..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────── DELETE MODAL ─────────── */}
      {showDeleteModal && selectedLocation && (
        <div className={modalOverlay} onClick={handleDeleteClose}>
          <div className="bg-gray-900 rounded-lg w-full mx-4 lg:w-1/2 lg:mx-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">DELETE LOCATION?</h2>
              <button onClick={handleDeleteClose} disabled={isDeleting}
                className="hover:opacity-70 text-2xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-3 animate-bounce" />
              <p className="mb-4 px-2">
                Are you sure you want to delete <span className="font-bold">"{selectedLocation.name}"</span>?
              </p>
              <div className="flex items-center justify-center gap-3 bg-gray-800 border border-gray-700 rounded px-4 py-3 mx-4">
                <input type="checkbox" id="hard_delete" checked={hardDelete}
                  onChange={(e) => setHardDelete(e.target.checked)}
                  className="w-4 h-4 accent-red-500 cursor-pointer" />
                <label htmlFor="hard_delete" className="text-sm text-gray-300 cursor-pointer">
                  Permanently delete <span className="text-red-400 font-medium">(cannot be undone)</span>
                </label>
              </div>
              <p className="text-gray-500 text-xs mt-3 px-4">
                {hardDelete
                  ? "This will permanently remove the location and cannot be recovered."
                  : "Default: deactivates the location and preserves tracking history."}
              </p>
            </div>
            <div className="p-4 flex justify-center gap-3">
              <button onClick={handleDeleteClose} disabled={isDeleting}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                {isDeleting
                  ? <><Spinner />{hardDelete ? "Deleting..." : "Deactivating..."}</>
                  : hardDelete ? "Yes, Delete" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Locations;