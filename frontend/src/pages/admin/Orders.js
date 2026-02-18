import axios from "axios";
import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import AnimatedTableRows from "../../react_bits/AnimatedTableRows";
import Toast from "../../components/Toast";
import "../../styles/StyleSheet.css";

const API_URL = "http://localhost:5000/api/orders";

function Orders() {
  const { status } = useParams();
  const activeStatus = status || "all";
  const { setPageTitle, setHeaderAction } = useOutletContext();

  useEffect(() => {
    setPageTitle("Orders");
    setHeaderAction(null);
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, []);

  /* ─── Toast ─── */
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ─── Modal state ─── */
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [selectedOrder,    setSelectedOrder]    = useState(null);

  const handleDetailsClose = () => setShowDetailsModal(false);
  const handleDetailsShow  = (order) => { setSelectedOrder(order); setShowDetailsModal(true); };

  const handleEditClose = () => {
    setShowEditModal(false);
    setEditingOrder({ items: [], paymentMethod: "", status: "" });
  };
  const handleEditShow = (order) => {
    setSelectedOrder(order);
    setEditingOrder({
      items:         order.items.map((i) => ({ ...i })), // deep copy
      paymentMethod: order.paymentMethod,
      status:        order.status,
    });
    setShowEditModal(true);
  };

  const handleDeleteClose = () => setShowDeleteModal(false);
  const handleDeleteShow  = (order) => { setSelectedOrder(order); setShowDeleteModal(true); };

  /* ─── Data ─── */
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  console.log(products);
  const [users,    setUsers]    = useState([]);

  const [editingOrder, setEditingOrder] = useState({ items: [], paymentMethod: "", status: "" });

  useEffect(() => { fetchOrders(); fetchProducts(); fetchUsers(); }, [activeStatus]);

  const fetchOrders = async () => {
    const res = await axios.get(API_URL);
    setOrders(activeStatus === "all" ? res.data : res.data.filter((o) => o.status === activeStatus));
  };
  const fetchProducts = async () => { const res = await axios.get("http://localhost:5000/api/products"); setProducts(res.data); };
  const fetchUsers    = async () => { const res = await axios.get("http://localhost:5000/api/users");    setUsers(res.data);    };

  /* ─── Helpers ─── */
  const getProduct      = (id) => products.find((p) => p.id === id);
  const getProductName  = (id) => getProduct(id)?.name     ?? "Unknown Product";
  const getProductStock = (id) => getProduct(id)?.stock    ?? 1;
  const getProductPrice = (id) => getProduct(id)?.price    ?? 0;
  const getUser         = (id) => users.find((u) => u.id === id);
  const getFullName     = (userId) => {
    const u = getUser(userId);
    if (!u) return "Unknown User";
    const parts = [u.firstName, u.middleName, u.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : u.username;
  };

  /* ─── Edit: item helpers ─── */
  const updateItemQuantity = (index, quantity) => {
    const items = [...editingOrder.items];
    items[index] = { ...items[index], quantity: Number(quantity) };
    setEditingOrder({ ...editingOrder, items });
  };
  const removeItem = (index) => {
    setEditingOrder({ ...editingOrder, items: editingOrder.items.filter((_, i) => i !== index) });
  };

  /* ─── Compute preview total ─── */
  const previewTotal = editingOrder.items.reduce((sum, item) => {
    return sum + getProductPrice(item.productId) * Number(item.quantity);
  }, 0);

  /* ─── Submit full order edit via PUT /:id ─── */
  const editOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_URL}/${selectedOrder.id}`, {
        items:         editingOrder.items,
        paymentMethod: editingOrder.paymentMethod,
        status:        editingOrder.status,
      });
      setOrders(orders.map((o) => (o.id === selectedOrder.id ? res.data : o)));
      await fetchOrders();
      handleEditClose();
      addToast(`Order #${selectedOrder.id} updated successfully.`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update order.", "error");
    }
  };

  /* ─── Delete ─── */
  const deleteOrder = async () => {
    try {
      await axios.delete(`${API_URL}/${selectedOrder.id}`);
      setOrders(orders.filter((o) => o.id !== selectedOrder.id));
      handleDeleteClose();
      addToast(`Order #${selectedOrder.id} deleted.`, "success");
    } catch {
      addToast("Failed to delete order.", "error");
    }
  };

  /* ─── Formatting ─── */
  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };
  const getStatusColor = (s) => ({
    pending:   "bg-yellow-600",
    completed: "bg-green-600",
    cancelled: "bg-red-600",
  }[s] ?? "bg-gray-600");

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp";
  const selectCls    = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";

  /* ─── Table rows ─── */
  const orderRows = orders.map((order) => (
    <>
      <td className="text-center px-4 py-3">{order.id}</td>
      <td className="text-center px-4 py-3">{getFullName(order.userId)}</td>
      <td className="text-center px-4 py-3">{order.items.length}</td>
      <td className="text-center px-4 py-3">${order.totalAmount.toFixed(2)}</td>
      <td className="text-center px-4 py-3">
        <span className={`inline-block px-3 py-1 rounded text-sm ${getStatusColor(order.status)} text-white`}>
          {order.status}
        </span>
      </td>
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
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Table */}
      <div className="container mx-auto p-4">
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
      </div>

      {/* ─────────── VIEW MODAL ─────────── */}
      {showDetailsModal && selectedOrder && (() => {
        const user = getUser(selectedOrder.userId);
        return (
          <div className={modalOverlay} onClick={handleDetailsClose}>
            <div className={`${modalBox} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold w-full text-center">ORDER DETAILS</h2>
                <button onClick={handleDetailsClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-6 space-y-6">
                {/* Order Info */}
                <div>
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Order Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-gray-400 text-xs">Order ID</p><p className="text-white font-semibold">#{selectedOrder.id}</p></div>
                    <div>
                      <p className="text-gray-400 text-xs">Status</p>
                      <span className={`inline-block px-3 py-1 rounded text-sm ${getStatusColor(selectedOrder.status)} text-white`}>{selectedOrder.status}</span>
                    </div>
                    <div><p className="text-gray-400 text-xs">Payment Method</p><p className="text-white font-semibold">{selectedOrder.paymentMethod}</p></div>
                    <div><p className="text-gray-400 text-xs">Total Amount</p><p className="text-white font-semibold text-lg">${selectedOrder.totalAmount.toFixed(2)}</p></div>
                    <div className="col-span-2"><p className="text-gray-400 text-xs">Order Date</p><p className="text-white font-semibold">{formatDate(selectedOrder.createdAt)}</p></div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Customer Info</h3>
                  {user ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-gray-400 text-xs">Username</p><p className="text-white font-semibold">{user.username}</p></div>
                      <div><p className="text-gray-400 text-xs">Full Name</p><p className="text-white font-semibold">{getFullName(selectedOrder.userId)}</p></div>
                      <div><p className="text-gray-400 text-xs">Email</p><p className="text-white font-semibold">{user.email || <span className="text-gray-500 italic">N/A</span>}</p></div>
                      <div><p className="text-gray-400 text-xs">Phone</p><p className="text-white font-semibold">{user.phoneNumber || <span className="text-gray-500 italic">N/A</span>}</p></div>
                      <div className="col-span-2"><p className="text-gray-400 text-xs">Address</p><p className="text-white font-semibold">{user.address || <span className="text-gray-500 italic">N/A</span>}</p></div>
                      <div><p className="text-gray-400 text-xs">Member Since</p><p className="text-white font-semibold">{user.createdAt ? formatDate(user.createdAt) : <span className="text-gray-500 italic">N/A</span>}</p></div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">User not found.</p>
                  )}
                </div>

                {/* Items */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{getProductName(item.productId)}</p>
                          <p className="text-gray-400 text-xs">Product ID: {item.productId} · Unit price: ${Number(item.price ?? getProductPrice(item.productId)).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">Qty: {item.quantity}</p>
                          <p className="text-gray-400 text-xs">${(Number(item.price ?? getProductPrice(item.productId)) * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-all duration-200 transform hover:scale-105" onClick={handleDetailsClose}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────── EDIT MODAL ─────────── */}
      {showEditModal && selectedOrder && (
        <div className={modalOverlay} onClick={handleEditClose}>
          <div className={`${modalBox} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">EDIT ORDER</h2>
              <button onClick={handleEditClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={editOrder}>
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="text-gray-400 text-xs">Order ID</p><p className="text-white font-semibold">#{selectedOrder.id}</p></div>
                  <div><p className="text-gray-400 text-xs">Full Name</p><p className="text-white font-semibold">{getFullName(selectedOrder.userId)}</p></div>
                </div>

                {/* Status */}
                <div className="mb-3 relative">
                  <select id="edit_status" value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                    required className={selectCls}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <label htmlFor="edit_status" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Status</label>
                </div>

                {/* Payment Method */}
                <div className="mb-4 relative">
                  <select id="edit_payment" value={editingOrder.paymentMethod}
                    onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                    required className={selectCls}>
                    <option value="">Select payment method</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="GCash">GCash</option>
                    <option value="PayPal">PayPal</option>
                  </select>
                  <label htmlFor="edit_payment" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Payment Method</label>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Order Items</h3>
                  {editingOrder.items.length === 0 && (
                    <p className="text-gray-500 italic text-sm text-center py-4">No items remaining.</p>
                  )}
                  <div className="space-y-3">
                    {editingOrder.items.map((item, index) => {
                      const stock    = getProductStock(item.productId);
                      const lineTotal = getProductPrice(item.productId) * item.quantity;
                      return (
                        <div key={index} className="bg-gray-800 p-4 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex-1">
                              <p className="text-white font-semibold">{getProductName(item.productId)}</p>
                              <p className="text-gray-400 text-xs">
                                Product ID: {item.productId} · Unit: ${getProductPrice(item.productId).toFixed(2)} · Available: {stock}
                              </p>
                            </div>
                            <button type="button" onClick={() => removeItem(index)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-all duration-200 ml-3">
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-gray-400 text-sm whitespace-nowrap">Quantity:</label>
                            <input
                              type="number"
                              min="1"
                              max={stock}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, e.target.value)}
                              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            />
                            <span className="text-gray-500 text-xs">/ {stock} max</span>
                            <span className="ml-auto text-white text-sm font-semibold">${lineTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Running total */}
                  {editingOrder.items.length > 0 && (
                    <div className="flex justify-end mt-3 border-t border-gray-700 pt-3">
                      <span className="text-gray-400 text-sm mr-2">New Total:</span>
                      <span className="text-white font-bold">${previewTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleEditClose}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Update Order
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
              <button onClick={handleDeleteClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-3 animate-bounce" />
              <p className="mb-2 px-2 text-white">
                Are you sure you want to delete order <span className="font-bold">#{selectedOrder.id}</span>?
              </p>
              <p className="mb-0 px-2 text-gray-400 text-sm">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex justify-center gap-3">
              <button onClick={handleDeleteClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105">
                Close
              </button>
              <button onClick={deleteOrder}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Orders;