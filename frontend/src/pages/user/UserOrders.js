import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const BASE = "http://localhost:5000/api";

/* ─── Toast ─── */
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2">
    {toasts.map((t) => (
      <div key={t.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium min-w-[260px] animate-slideUp
          ${t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-blue-600"}`}>
        <i className={`bi text-base ${t.type === "success" ? "bi-check-circle-fill" : t.type === "error" ? "bi-x-circle-fill" : "bi-info-circle-fill"}`} />
        <span className="flex-1">{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100 transition-opacity">
          <i className="bi bi-x" />
        </button>
      </div>
    ))}
  </div>
);

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
  const map = {
    pending:   "bg-yellow-600 text-white",
    completed: "bg-green-600 text-white",
    cancelled: "bg-red-600 text-white",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-600 text-white"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

/* ─── Tabs ─── */
const TABS = [
  { key: "all",       label: "All",       icon: "bi-list-ul" },
  { key: "pending",   label: "Pending",   icon: "bi-hourglass-split" },
  { key: "completed", label: "Completed", icon: "bi-check-circle" },
  { key: "cancelled", label: "Cancelled", icon: "bi-x-circle" },
];

function UserOrders() {
  const { status } = useParams();
  const activeTab  = status || "all";
  const navigate   = useNavigate();

  const stored  = JSON.parse(localStorage.getItem("user") || "{}");
  const userId  = stored.id;

  /* ─── Toast ─── */
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ─── Data ─── */
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  /* ─── Modals ─── */
  const [viewOrder,    setViewOrder]    = useState(null);
  const [cancelOrder,  setCancelOrder]  = useState(null); // order to confirm cancel

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, pRes] = await Promise.all([
          axios.get(`${BASE}/orders/user/${userId}`),
          axios.get(`${BASE}/products`),
        ]);
        setOrders(oRes.data);
        setProducts(pRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  /* ─── Filtered orders ─── */
  const filtered = activeTab === "all"
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  /* ─── Tab counts ─── */
  const countOf = (key) => key === "all" ? orders.length : orders.filter((o) => o.status === key).length;

  /* ─── Helpers ─── */
  const getProduct = (id) => products.find((p) => p.id === id);
  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "N/A";

  /* ─── Cancel order ─── */
  const confirmCancel = async () => {
    if (!cancelOrder) return;
    try {
      const res = await axios.put(`${BASE}/orders/${cancelOrder.id}`, { status: "cancelled" });
      setOrders((prev) => prev.map((o) => (o.id === cancelOrder.id ? res.data : o)));
      if (viewOrder?.id === cancelOrder.id) setViewOrder(res.data);
      setCancelOrder(null);
      addToast(`Order #${cancelOrder.id} has been cancelled.`, "success");
    } catch {
      addToast("Failed to cancel order.", "error");
    }
  };

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-xl w-full mx-auto max-h-[90vh] overflow-y-auto animate-slideUp border border-gray-700/50";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading orders…
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="max-w-3xl mx-auto p-4 space-y-4">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-receipt text-blue-400" />
            My Orders
          </h1>
          <span className="text-gray-500 text-sm">{orders.length} total</span>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1 border border-gray-700/50">
          {TABS.map(({ key, label, icon }) => {
            const count   = countOf(key);
            const active  = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => navigate(`/user/orders/${key}`)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200
                  ${active
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"}`}
              >
                <i className={`bi ${icon} hidden sm:inline`} />
                <span className="truncate">{label}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold hidden sm:inline
                    ${active ? "bg-white/20 text-white" : "bg-gray-700 text-gray-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Empty state ─── */}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <i className="bi bi-bag-x text-5xl text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No {activeTab !== "all" ? activeTab : ""} orders found</p>
            <p className="text-gray-600 text-sm mt-1">Orders you place will appear here.</p>
          </div>
        )}

        {/* ─── Order cards ─── */}
        <div className="space-y-3">
          {sorted.map((order) => (
            <div
              key={order.id}
              className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/70 transition-colors"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm font-mono">#{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-gray-500 text-xs">{formatDate(order.createdAt)}</span>
              </div>

              {/* Items preview */}
              <div className="px-4 py-3">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {order.items.slice(0, 3).map((item, i) => {
                    const p = getProduct(item.productId);
                    return (
                      <div key={i} className="flex items-center gap-2 bg-gray-700/40 rounded-lg px-2.5 py-1.5 text-xs">
                        {p?.image ? (
                          <img src={`http://localhost:5000${p.image}`} alt={p.name}
                            className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                            <i className="bi bi-box text-gray-400 text-xs" />
                          </div>
                        )}
                        <span className="text-gray-300">{p?.name ?? `Product #${item.productId}`}</span>
                        <span className="text-gray-500">×{item.quantity}</span>
                      </div>
                    );
                  })}
                  {order.items.length > 3 && (
                    <div className="flex items-center bg-gray-700/40 rounded-lg px-2.5 py-1.5 text-xs text-gray-500">
                      +{order.items.length - 3} more
                    </div>
                  )}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 font-bold">${order.totalAmount.toFixed(2)}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs capitalize">{order.paymentMethod}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="flex gap-2">
                    {/* Cancel button — only for pending */}
                    {order.status === "pending" && (
                      <button
                        onClick={() => setCancelOrder(order)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition-colors"
                      >
                        <i className="bi bi-x-circle mr-1" />Cancel
                      </button>
                    )}
                    {/* View details */}
                    <button
                      onClick={() => setViewOrder(order)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/30 transition-colors"
                    >
                      <i className="bi bi-eye mr-1" />View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────── VIEW MODAL ─────────── */}
      {viewOrder && (
        <div className={modalOverlay} onClick={() => setViewOrder(null)}>
          <div className={`${modalBox} max-w-lg`} onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Order #{viewOrder.id}</h2>
                <StatusBadge status={viewOrder.status} />
              </div>
              <button onClick={() => setViewOrder(null)}
                className="text-gray-400 hover:text-white text-xl leading-none transition-colors">&times;</button>
            </div>

            <div className="p-5 space-y-5">

              {/* Order meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Order Date",      value: formatDate(viewOrder.createdAt) },
                  { label: "Payment Method",  value: viewOrder.paymentMethod },
                  { label: "Total Amount",    value: <span className="text-green-400 font-bold">${viewOrder.totalAmount.toFixed(2)}</span> },
                  { label: "Items",           value: `${viewOrder.items.length} item${viewOrder.items.length !== 1 ? "s" : ""}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800/60 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                    <p className="text-white text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Items</h3>
                <div className="space-y-2">
                  {viewOrder.items.map((item, i) => {
                    const p        = getProduct(item.productId);
                    const lineTotal = Number(item.price) * item.quantity;
                    return (
                      <div key={i} className="flex items-center gap-3 bg-gray-700/30 rounded-lg p-3">
                        {/* Product image */}
                        {p?.image ? (
                          <img src={`http://localhost:5000${p.image}`} alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="bi bi-box text-gray-500" />
                          </div>
                        )}
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{p?.name ?? `Product #${item.productId}`}</p>
                          <p className="text-gray-500 text-xs">{p?.category ?? ""}</p>
                        </div>
                        {/* Qty + price */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-white text-sm font-semibold">${lineTotal.toFixed(2)}</p>
                          <p className="text-gray-500 text-xs">{item.quantity} × ${Number(item.price).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total row */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-green-400 font-bold text-lg">${viewOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                {viewOrder.status === "pending" && (
                  <button
                    onClick={() => { setViewOrder(null); setCancelOrder(viewOrder); }}
                    className="px-4 py-2 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 rounded-lg transition-colors"
                  >
                    <i className="bi bi-x-circle mr-1.5" />Cancel Order
                  </button>
                )}
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── CANCEL CONFIRM MODAL ─────────── */}
      {cancelOrder && (
        <div className={modalOverlay} onClick={() => setCancelOrder(null)}>
          <div className={`${modalBox} max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-white">Cancel Order?</h2>
              <button onClick={() => setCancelOrder(null)}
                className="text-gray-400 hover:text-white text-xl leading-none transition-colors">&times;</button>
            </div>
            <div className="p-5 text-center space-y-3">
              <i className="bi bi-exclamation-triangle text-5xl text-red-400 animate-bounce block" />
              <p className="text-white">
                Are you sure you want to cancel{" "}
                <span className="font-bold text-red-400">Order #{cancelOrder.id}</span>?
              </p>
              <p className="text-gray-500 text-sm">This action cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-3 px-5 pb-5">
              <button onClick={() => setCancelOrder(null)}
                className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                Keep Order
              </button>
              <button onClick={confirmCancel}
                className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UserOrders;