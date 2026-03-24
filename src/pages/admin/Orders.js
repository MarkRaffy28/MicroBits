import React, { useEffect, useState, useRef } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import AnimatedTableRows from "../../react_bits/AnimatedTableRows";
import { getAllOrders, updateOrder, updateOrderItems, addTrackingEvent, deleteOrder as firebaseDeleteOrder, ORDER_STATUSES, ORDER_STATUS_LABELS, TRACKING_STATUSES, TRACKING_STATUS_LABELS, } from "../../firebase/services/orders";
import { getAllProducts } from "../../firebase/services/products";
import { getAllUsers }    from "../../firebase/services/users";
import { getAllLocations } from "../../firebase/services/locations";
import "../../styles/StyleSheet.css";

// =========================
// Module-level helpers
// =========================

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const STATUS_COLORS = {
  to_pay:        "bg-yellow-600",
  to_ship:       "bg-blue-600",
  to_receive:    "bg-purple-600",
  completed:     "bg-green-600",
  cancelled:     "bg-red-600",
  return_refund: "bg-orange-600",
};

const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white whitespace-nowrap ${STATUS_COLORS[status] ?? "bg-gray-600"}`}>
    {ORDER_STATUS_LABELS[status] ?? status}
  </span>
);

const formatDate = (d) => {
  if (!d) return "N/A";
  const date = new Date(d);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const selectCls = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";

/* ─── Sort columns ─── */
const SORT_COLUMNS = [
  { key: "id",          label: "Order ID"  },
  { key: "fullName",    label: "Full Name" },
  { key: "itemCount",   label: "Items"     },
  { key: "totalAmount", label: "Total"     },
  { key: "status",      label: "Status"    },
  { key: "paymentMethod", label: "Payment" },
  { key: "createdAt",   label: "Date"      },
];

// =========================
// Main Component
// =========================

function Orders() {
  const { addToast } = useToast();
  const { status }   = useParams();
  const { setPageTitle, setHeaderAction } = useOutletContext();
  const activeStatus = status || "all";

  /* ─── Search & sort ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol,     setSortCol]     = useState("createdAt");
  const [sortDir,     setSortDir]     = useState("desc");
  const [sortOpen,    setSortOpen]    = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setPageTitle("Orders");
    setHeaderAction(
      <div className="flex items-center gap-2 w-full">
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders…"
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
      </div>
    );
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, [searchQuery, sortCol, sortDir, sortOpen]);

  /* ─── Modal state ─── */
  const [showDetailsModal,  setShowDetailsModal]  = useState(false);
  const [showEditModal,     setShowEditModal]      = useState(false);
  const [showDeleteModal,   setShowDeleteModal]    = useState(false);
  const [showTrackingModal, setShowTrackingModal]  = useState(false);
  const [selectedOrder,     setSelectedOrder]      = useState(null);

  const handleDetailsClose = () => setShowDetailsModal(false);
  const handleDetailsShow  = (order) => { setSelectedOrder(order); setShowDetailsModal(true); };

  const handleEditClose = () => {
    setShowEditModal(false);
    setEditingOrder({ items: [], paymentMethod: "", status: "" });
  };
  const handleEditShow = (order) => {
    setSelectedOrder(order);
    setEditingOrder({
      items:         order.items.map((i) => ({ ...i })),
      paymentMethod: order.paymentMethod,
      status:        order.status,
    });
    setShowEditModal(true);
  };

  const handleDeleteClose = () => setShowDeleteModal(false);
  const handleDeleteShow  = (order) => { setSelectedOrder(order); setShowDeleteModal(true); };

  const handleTrackingShow = () => {
    setNewTracking({ status: TRACKING_STATUSES[0], locationId: "" });
    setShowEditModal(false);
    setShowTrackingModal(true);
  };
  const handleTrackingClose = () => {
    setShowTrackingModal(false);
    setShowEditModal(true);
  };

  /* ─── Data ─── */
  const [orders,    setOrders]    = useState([]);
  const [products,  setProducts]  = useState([]);
  const [users,     setUsers]     = useState([]);
  const [locations, setLocations] = useState([]);

  const [fetchingOrders, setFetchingOrders] = useState(true);

  /* ─── Per-operation loading ─── */
  const [isEditing,  setIsEditing]  = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  /* ─── Edit state ─── */
  const [editingOrder, setEditingOrder] = useState({ items: [], paymentMethod: "", status: "" });

  /* ─── Tracking state ─── */
  const [newTracking, setNewTracking] = useState({ status: TRACKING_STATUSES[0], locationId: "" });

  useEffect(() => { fetchAll(); }, [activeStatus]);

  const fetchAll = async () => {
    setFetchingOrders(true);
    try {
      const [allOrders, allProducts, allUsers, allLocations] = await Promise.all([
        getAllOrders({ force: true }),
        getAllProducts(),
        getAllUsers(),
        getAllLocations(),
      ]);
      setOrders(activeStatus === "all" ? allOrders : allOrders.filter((o) => o.status === activeStatus));
      setProducts(allProducts);
      setUsers(allUsers);
      setLocations(allLocations);
    } catch {
      addToast("Failed to fetch orders.", "error");
    } finally {
      setFetchingOrders(false);
    }
  };

  /* ─── Helpers ─── */
  const getProduct      = (id) => products.find((p) => p.id === id);
  const getProductName  = (id) => getProduct(id)?.name  ?? "Unknown Product";
  const getProductStock = (id) => getProduct(id)?.stock ?? 1;
  const getProductPrice = (id) => getProduct(id)?.price ?? 0;
  const getUser         = (id) => users.find((u) => u.id === id);
  const getFullName     = (userId) => {
    const u = getUser(userId);
    if (!u) return "Unknown User";
    const parts = [u.firstName, u.middleName, u.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : u.username;
  };

  const updateItemQuantity = (index, quantity) => {
    const items = [...editingOrder.items];
    items[index] = { ...items[index], quantity: Number(quantity) };
    setEditingOrder({ ...editingOrder, items });
  };
  const removeItem = (index) => {
    setEditingOrder({ ...editingOrder, items: editingOrder.items.filter((_, i) => i !== index) });
  };

  const previewTotal = editingOrder.items.reduce((sum, item) =>
    sum + getProductPrice(item.productId) * Number(item.quantity), 0
  );

  /* ─── Filter + sort ─── */
  const displayedOrders = [...orders]
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.id?.toString().toLowerCase().includes(q) ||
        getFullName(o.userId).toLowerCase().includes(q) ||
        o.status?.toLowerCase().includes(q) ||
        ORDER_STATUS_LABELS[o.status]?.toLowerCase().includes(q) ||
        o.paymentMethod?.toLowerCase().includes(q) ||
        o.totalAmount?.toString().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortCol === "fullName")  { aVal = getFullName(a.userId).toLowerCase(); bVal = getFullName(b.userId).toLowerCase(); }
      else if (sortCol === "itemCount")   { aVal = a.items?.length ?? 0;   bVal = b.items?.length ?? 0; }
      else if (sortCol === "totalAmount") { aVal = a.totalAmount ?? 0;      bVal = b.totalAmount ?? 0; }
      else if (sortCol === "createdAt")   { aVal = new Date(a.createdAt || 0); bVal = new Date(b.createdAt || 0); }
      else { aVal = (a[sortCol] ?? "").toString().toLowerCase(); bVal = (b[sortCol] ?? "").toString().toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  /* ─── Edit order ─── */
  const editOrder = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const statusChanged  = editingOrder.status        !== selectedOrder.status;
      const paymentChanged = editingOrder.paymentMethod !== selectedOrder.paymentMethod;
      const itemsChanged   = JSON.stringify(editingOrder.items) !== JSON.stringify(selectedOrder.items);

      const [updatedMeta, updatedItems] = await Promise.all([
        (statusChanged || paymentChanged)
          ? updateOrder(selectedOrder.id, { status: editingOrder.status, paymentMethod: editingOrder.paymentMethod })
          : Promise.resolve(null),
        itemsChanged
          ? updateOrderItems(selectedOrder.id, editingOrder.items)
          : Promise.resolve(null),
      ]);

      const merged = { ...selectedOrder, ...updatedMeta, ...updatedItems };
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? merged : o)));
      setSelectedOrder(merged);
      handleEditClose();
      addToast(`Order #${selectedOrder.id} updated successfully.`, "success");
    } catch (err) {
      addToast(err.message || "Failed to update order.", "error");
    } finally {
      setIsEditing(false);
    }
  };

  /* ─── Add tracking event ─── */
  const submitTracking = async (e) => {
    e.preventDefault();
    setIsTracking(true);
    try {
      const event = await addTrackingEvent(selectedOrder.id, {
        status:     newTracking.status,
        locationId: newTracking.locationId || null,
      });

      const updatedOrder = {
        ...selectedOrder,
        tracking: [...(selectedOrder.tracking ?? []), event],
      };
      setSelectedOrder(updatedOrder);
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)));

      addToast(`Tracking event "${TRACKING_STATUS_LABELS[event.status].title}" added.`, "success");
      handleTrackingClose();
    } catch (err) {
      addToast(err.message || "Failed to add tracking event.", "error");
    } finally {
      setIsTracking(false);
    }
  };

  /* ─── Delete tracking event ─── */
  const deleteTrackingEvent = (index) => {
    // index is from the reversed array, convert back to original
    const originalIndex = (selectedOrder.tracking.length - 1) - index;
    const updatedTracking = selectedOrder.tracking.filter((_, i) => i !== originalIndex);
    const updatedOrder = { ...selectedOrder, tracking: updatedTracking };
    setSelectedOrder(updatedOrder);
    setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)));
  };

  /* ─── Delete order ─── */
  const deleteOrder = async () => {
    setIsDeleting(true);
    try {
      await firebaseDeleteOrder(selectedOrder.id);
      setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));
      handleDeleteClose();
      addToast(`Order #${selectedOrder.id} deleted.`, "success");
    } catch {
      addToast("Failed to delete order.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp";

  /* ─── Table rows ─── */
  const orderRows = displayedOrders.map((order) => (
    <>
      <td className="text-center px-4 py-3 font-mono">
        <span className="inline-block max-w-[80px] truncate align-bottom text-xs text-gray-400" title={order.id}>
          {order.id}
        </span>
      </td>
      <td className="text-center px-4 py-3">{getFullName(order.userId)}</td>
      <td className="text-center px-4 py-3">{order.items?.length ?? 0}</td>
      <td className="text-center px-4 py-3">${order.totalAmount?.toFixed(2)}</td>
      <td className="text-center px-4 py-3"><StatusBadge status={order.status} /></td>
      <td className="text-center px-4 py-3">{order.paymentMethod}</td>
      <td className="text-center px-4 py-3 text-sm">{formatDate(order.createdAt)}</td>
      <td className="text-center px-4 py-3 whitespace-nowrap">
        <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleDetailsShow(order); }}>
          <i className="bi bi-eye mr-1" />View
        </button>
        <button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleEditShow(order); }}>
          <i className="bi bi-pencil mr-1" />Edit
        </button>
        <button className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleDeleteShow(order); }}>
          <i className="bi bi-trash mr-1" />Delete
        </button>
      </td>
    </>
  ));

  return (
    <>
      {/* ─── Table ─── */}
      <div className="container mx-auto p-4">
        {fetchingOrders ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Spinner /><span>Loading orders...</span>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <i className="bi bi-search text-5xl mb-3" />
            <p>No orders found for "<span className="text-gray-300">{searchQuery}</span>"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="border-b-4 border-blue-600">
                <tr>
                  <th className="text-center px-4 py-3">Order ID</th>
                  <th className="text-center px-4 py-3">Full Name</th>
                  <th className="text-center px-4 py-3">Items</th>
                  <th className="text-center px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Payment</th>
                  <th className="text-center px-4 py-3">Date</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatedTableRows items={orderRows} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────── VIEW MODAL ─────────── */}
      {showDetailsModal && selectedOrder && (
        <div className={modalOverlay} onClick={handleDetailsClose}>
          <div className={`${modalBox} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">ORDER DETAILS</h2>
              <button onClick={handleDetailsClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Order Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-400 text-xs">Order ID</p><p className="text-white font-semibold text-xs">#{selectedOrder.id}</p></div>
                  <div><p className="text-gray-400 text-xs">Status</p><StatusBadge status={selectedOrder.status} /></div>
                  <div><p className="text-gray-400 text-xs">Payment Method</p><p className="text-white font-semibold">{selectedOrder.paymentMethod}</p></div>
                  <div><p className="text-gray-400 text-xs">Total Amount</p><p className="text-white font-semibold text-lg">${selectedOrder.totalAmount?.toFixed(2)}</p></div>
                  <div className="col-span-2"><p className="text-gray-400 text-xs">Order Date</p><p className="text-white font-semibold">{formatDate(selectedOrder.createdAt)}</p></div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Customer Info</h3>
                {(() => {
                  const user = getUser(selectedOrder.userId);
                  return user ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-gray-400 text-xs">Username</p><p className="text-white font-semibold">{user.username}</p></div>
                      <div><p className="text-gray-400 text-xs">Full Name</p><p className="text-white font-semibold">{getFullName(selectedOrder.userId)}</p></div>
                      <div><p className="text-gray-400 text-xs">Email</p><p className="text-white font-semibold">{user.email || <span className="text-gray-500 italic">N/A</span>}</p></div>
                      <div><p className="text-gray-400 text-xs">Phone</p><p className="text-white font-semibold">{user.phoneNumber || <span className="text-gray-500 italic">N/A</span>}</p></div>
                      <div className="col-span-2"><p className="text-gray-400 text-xs">Address</p><p className="text-white font-semibold">{user.address || <span className="text-gray-500 italic">N/A</span>}</p></div>
                    </div>
                  ) : <p className="text-gray-500 italic">User not found.</p>;
                })()}
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{getProductName(item.productId)}</p>
                        <p className="text-gray-400 text-xs">ID: {item.productId} · Unit: ${Number(item.price ?? getProductPrice(item.productId)).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">Qty: {item.quantity}</p>
                        <p className="text-gray-400 text-xs">${(Number(item.price ?? getProductPrice(item.productId)) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.tracking?.length > 0 && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Tracking History</h3>
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-700" />
                    {[...selectedOrder.tracking].reverse().map((event, i) => {
                      const loc = event.locationId ? locations.find((l) => l.id === event.locationId) : null;
                      return (
                        <div key={i} className="relative">
                          <div className="absolute -left-[13px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-900" />
                          <p className="text-white text-sm font-semibold">{event.title}</p>
                          <p className="text-gray-400 text-xs">{event.description}</p>
                          {loc && <p className="text-blue-400 text-xs mt-0.5"><i className="bi bi-geo-alt mr-1" />{loc.name}, {loc.city}</p>}
                          <p className="text-gray-600 text-xs mt-0.5">{formatDate(event.timestamp)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <button onClick={handleDetailsClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-all duration-200 transform hover:scale-105">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── EDIT MODAL ─────────── */}
      {showEditModal && selectedOrder && (
        <div className={modalOverlay} onClick={handleEditClose}>
          <div className={`${modalBox} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">EDIT ORDER</h2>
              <button onClick={handleEditClose} disabled={isEditing}
                className="hover:opacity-70 text-2xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={editOrder}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="text-gray-400 text-xs">Order ID</p><p className="text-white font-semibold text-xs">#{selectedOrder.id}</p></div>
                  <div><p className="text-gray-400 text-xs">Customer</p><p className="text-white font-semibold">{getFullName(selectedOrder.userId)}</p></div>
                </div>

                <div className="mb-3 relative">
                  <select id="edit_status" value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                    required className={selectCls}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <label htmlFor="edit_status" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Status</label>
                </div>

                <div className="mb-4 relative">
                  <select id="edit_payment" value={editingOrder.paymentMethod}
                    onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                    required className={selectCls}>
                    <option value="">Select payment method</option>
                    {["Cash on Delivery", "Credit Card", "Debit Card", "GCash", "PayPal"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <label htmlFor="edit_payment" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Payment Method</label>
                </div>

                <div className="mb-4">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Order Items</h3>
                  {editingOrder.items.length === 0 && (
                    <p className="text-gray-500 italic text-sm text-center py-4">No items remaining.</p>
                  )}
                  <div className="space-y-3">
                    {editingOrder.items.map((item, index) => {
                      const currentStock = getProductStock(item.productId);
                      const stock        = currentStock + item.quantity;
                      const lineTotal    = getProductPrice(item.productId) * item.quantity;
                      return (
                        <div key={index} className="bg-gray-800 p-4 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex-1">
                              <p className="text-white font-semibold">{getProductName(item.productId)}</p>
                              <p className="text-gray-400 text-xs">ID: {item.productId} · Unit: ${getProductPrice(item.productId).toFixed(2)} · Stock: {stock}</p>
                            </div>
                            <button type="button" onClick={() => removeItem(index)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-all ml-3">
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-gray-400 text-sm whitespace-nowrap">Quantity:</label>
                            <input type="number" min="1" max={stock} value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, e.target.value)}
                              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
                            <span className="text-gray-500 text-xs">/ {stock} max ({currentStock} in stock)</span>
                            <span className="ml-auto text-white text-sm font-semibold">${lineTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {editingOrder.items.length > 0 && (
                    <div className="flex justify-end mt-3 border-t border-gray-700 pt-3">
                      <span className="text-gray-400 text-sm mr-2">New Total:</span>
                      <span className="text-white font-bold">${previewTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4 border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Tracking History ({selectedOrder.tracking?.length ?? 0})
                    </h3>
                    <button type="button" onClick={handleTrackingShow}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-200 transform hover:scale-105 flex items-center gap-1">
                      <i className="bi bi-plus-lg" /> Add Event
                    </button>
                  </div>
                  {selectedOrder.tracking?.length > 0 ? (
                    <div className="relative pl-5 space-y-3 max-h-48 overflow-y-auto pr-1">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-700" />
                      {[...selectedOrder.tracking].reverse().map((event, i) => {
                        const loc = event.locationId ? locations.find((l) => l.id === event.locationId) : null;
                        return (
                          <div key={i} className="relative flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="absolute -left-[13px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-900" />
                              <p className="text-white text-xs font-semibold">{event.title}</p>
                              {loc && <p className="text-blue-400 text-xs"><i className="bi bi-geo-alt mr-1" />{loc.name}, {loc.city}</p>}
                              <p className="text-gray-600 text-xs">{formatDate(event.timestamp)}</p>
                            </div>
                            <button type="button" onClick={() => deleteTrackingEvent(i)}
                              className="flex-shrink-0 text-red-500 hover:text-red-400 transition-colors p-0.5 mt-0.5">
                              <i className="bi bi-trash text-base" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-xs italic">No tracking events yet.</p>
                  )}
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleEditClose} disabled={isEditing}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Cancel
                  </button>
                  <button type="submit" disabled={isEditing}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                    {isEditing ? <><Spinner /> Updating...</> : "Update Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── ADD TRACKING MODAL ─────────── */}
      {showTrackingModal && selectedOrder && (
        <div className={modalOverlay} onClick={handleTrackingClose}>
          <div className="bg-gray-900 rounded-lg w-full mx-4 max-w-md animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">ADD TRACKING EVENT</h2>
              <button onClick={handleTrackingClose} disabled={isTracking}
                className="hover:opacity-70 text-2xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={submitTracking}>
                <div className="mb-4 relative">
                  <select id="tracking_status" value={newTracking.status}
                    onChange={(e) => setNewTracking({ ...newTracking, status: e.target.value })}
                    className={selectCls}>
                    {TRACKING_STATUSES.map((s) => (
                      <option key={s} value={s}>{TRACKING_STATUS_LABELS[s].title}</option>
                    ))}
                  </select>
                  <label htmlFor="tracking_status" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Tracking Status</label>
                </div>

                <div className="mb-4 bg-gray-800 border border-gray-700 rounded px-4 py-3">
                  <p className="text-gray-400 text-xs mb-1">Description</p>
                  <p className="text-gray-200 text-sm">{TRACKING_STATUS_LABELS[newTracking.status]?.description}</p>
                </div>

                <div className="mb-4 relative">
                  <select id="tracking_location" value={newTracking.locationId}
                    onChange={(e) => setNewTracking({ ...newTracking, locationId: e.target.value })}
                    className={selectCls}>
                    <option value="">No location (optional)</option>
                    {locations.filter((l) => l.active).map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} — {loc.city}, {loc.country}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="tracking_location" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Location</label>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleTrackingClose} disabled={isTracking}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Back
                  </button>
                  <button type="submit" disabled={isTracking}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                    {isTracking ? <><Spinner /> Adding...</> : "Add Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── DELETE MODAL ─────────── */}
      {showDeleteModal && selectedOrder && (
        <div className={modalOverlay} onClick={handleDeleteClose}>
          <div className={`${modalBox} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">DELETE ORDER?</h2>
              <button onClick={handleDeleteClose} disabled={isDeleting}
                className="hover:opacity-70 text-2xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-3 animate-bounce" />
              <p className="mb-2 px-2 text-white">
                Are you sure you want to delete order <span className="font-bold">#{selectedOrder.id}</span>?
              </p>
              <p className="text-gray-400 text-sm">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex justify-center gap-3">
              <button onClick={handleDeleteClose} disabled={isDeleting}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                Cancel
              </button>
              <button onClick={deleteOrder} disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                {isDeleting ? <><Spinner /> Deleting...</> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Orders;