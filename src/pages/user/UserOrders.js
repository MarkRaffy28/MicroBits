import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getOrdersByUser, updateOrder, ORDER_STATUS_LABELS, CANCELLABLE_STATUSES, } from "../../firebase/services/orders";
import { getAllProducts  } from "../../firebase/services/products";

// =========================
// Module-level constants
// =========================

const TABS = [
  { key: "all",          label: "All",            icon: "bi-list-ul" },
  { key: "to_pay",       label: "To Pay",         icon: "bi-credit-card" },
  { key: "to_ship",      label: "To Ship",        icon: "bi-box-seam" },
  { key: "to_receive",   label: "To Receive",     icon: "bi-truck" },
  { key: "completed",    label: "Completed",      icon: "bi-check-circle" },
  { key: "cancelled",    label: "Cancelled",      icon: "bi-x-circle" },
  { key: "return_refund", label: "Return/Refund", icon: "bi-arrow-counterclockwise" },
];

const STATUS_COLORS = {
  to_pay:        "bg-yellow-600",
  to_ship:       "bg-blue-600",
  to_receive:    "bg-purple-600",
  completed:     "bg-green-600",
  cancelled:     "bg-red-600",
  return_refund: "bg-orange-600",
};

const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${STATUS_COLORS[status] ?? "bg-gray-600"}`}>
    {ORDER_STATUS_LABELS[status] ?? status}
  </span>
);

const formatDate = (d) => d
  ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  : "N/A";

const Spinner = () => (
  <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// =========================
// Main Component
// =========================

function UserOrders() {
  const { addToast }    = useToast();
  const { currentUser } = useAuth();
  const { status }      = useParams();
  const activeTab       = status || "all";
  const navigate        = useNavigate();

  /* ─── Data ─── */
  const [orders,    setOrders]    = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  /* ─── Cancel modal ─── */
  const [cancelOrder,  setCancelOrder]  = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const [userOrders, allProducts] = await Promise.all([
          getOrdersByUser(currentUser.id),
          getAllProducts(),
        ]);
        setOrders(userOrders);
        setProducts(allProducts);
      } catch {
        addToast("Failed to load orders.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  /* ─── Filtered + sorted ─── */
  const filtered = activeTab === "all"
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const countOf = (key) => key === "all"
    ? orders.length
    : orders.filter((o) => o.status === key).length;

  /* ─── Helpers ─── */
  const getProduct = (id) => products.find((p) => p.id === id);

  /* ─── Cancel order ─── */
  const confirmCancel = async () => {
    if (!cancelOrder) return;
    setIsCancelling(true);
    try {
      const updated = await updateOrder(cancelOrder.id, { status: "cancelled" });
      setOrders((prev) => prev.map((o) => (o.id === cancelOrder.id ? updated : o)));
      setCancelOrder(null);
      addToast("Order cancelled successfully.", "success");
    } catch {
      addToast("Failed to cancel order.", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const modalOverlay = "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-xl w-full mx-auto max-h-[90vh] overflow-y-auto animate-slideUp border border-gray-700/50";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
        <Spinner />
        Loading orders…
      </div>
    );
  }

  return (
    <>
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
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1 border border-gray-700/50 overflow-x-auto">
          {TABS.map(({ key, label, icon }) => {
            const count  = countOf(key);
            const active = activeTab === key;
            return (
              <button key={key}
                onClick={() => navigate(`/user/orders/${key}`)}
                className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}>
                <i className={`bi ${icon} hidden sm:inline`} />
                <span className="truncate">{label}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold hidden sm:inline ${
                    active ? "bg-white/20 text-white" : "bg-gray-700 text-gray-400"
                  }`}>
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
            <p className="text-gray-400 font-medium">
              No {activeTab !== "all" ? ORDER_STATUS_LABELS[activeTab]?.toLowerCase() : ""} orders found
            </p>
            <p className="text-gray-600 text-sm mt-1">Orders you place will appear here.</p>
          </div>
        )}

        {/* ─── Order cards ─── */}
        <div className="space-y-3">
          {sorted.map((order) => (
            <div key={order.id}
              onClick={() => navigate(`/user/order/detail/${order.id}`)}
              className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/70 transition-colors cursor-pointer">

              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs font-mono truncate max-w-[120px]" title={order.id}>
                    #{order.id}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-gray-500 text-xs">{formatDate(order.createdAt)}</span>
              </div>

              {/* Items preview */}
              <div className="px-4 py-3">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {(order.items ?? []).slice(0, 3).map((item, i) => {
                    const p = getProduct(item.productId);
                    return (
                      <div key={i} className="flex items-center gap-2 bg-gray-700/40 rounded-lg px-2.5 py-1.5 text-xs">
                        {p?.image ? (
                          <img src={p.image} alt={p.name} className="w-6 h-6 rounded object-cover" />
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
                  {(order.items?.length ?? 0) > 3 && (
                    <div className="flex items-center bg-gray-700/40 rounded-lg px-2.5 py-1.5 text-xs text-gray-500">
                      +{order.items.length - 3} more
                    </div>
                  )}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-green-400 font-bold">${order.totalAmount?.toFixed(2) ?? "0.00"}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">{order.paymentMethod}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {CANCELLABLE_STATUSES.includes(order.status) && (
                      <button onClick={() => setCancelOrder(order)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition-colors">
                        <i className="bi bi-x-circle mr-1" />Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────── CANCEL CONFIRM MODAL ─────────── */}
      {cancelOrder && (
        <div className={modalOverlay} onClick={() => !isCancelling && setCancelOrder(null)}>
          <div className={`${modalBox} max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-white">Cancel Order?</h2>
              <button onClick={() => setCancelOrder(null)} disabled={isCancelling}
                className="text-gray-400 hover:text-white text-xl leading-none transition-colors disabled:opacity-30">
                &times;
              </button>
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
              <button onClick={() => setCancelOrder(null)} disabled={isCancelling}
                className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Keep Order
              </button>
              <button onClick={confirmCancel} disabled={isCancelling}
                className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isCancelling
                  ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>Cancelling...</>
                  : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UserOrders;