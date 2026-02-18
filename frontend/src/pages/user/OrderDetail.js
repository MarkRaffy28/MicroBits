import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Toast from "../../components/Toast";

const BASE = "http://localhost:5000/api";

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
  const map = {
    pending:   "bg-yellow-600",
    completed: "bg-green-600",
    cancelled: "bg-red-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${map[status] ?? "bg-gray-600"}`}>
      <i className={`bi ${status === "completed" ? "bi-check-circle-fill" : status === "pending" ? "bi-hourglass-split" : "bi-x-circle-fill"} text-xs`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

function OrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const stored   = JSON.parse(localStorage.getItem("user") || "{}");
  const userId   = stored.id;

  const [order,    setOrder]    = useState(null);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* ─── Toast ─── */
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const tid = Date.now();
    setToasts((prev) => [...prev, { id: tid, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== tid)), 3500);
  };
  const removeToast = (tid) => setToasts((prev) => prev.filter((t) => t.id !== tid));

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, pRes] = await Promise.all([
          axios.get(`${BASE}/orders/${id}`),
          axios.get(`${BASE}/products`),
        ]);
        // Protect: only owner can view
        if (oRes.data.userId !== userId) {
          navigate("/user/orders/all");
          return;
        }
        setOrder(oRes.data);
        setProducts(pRes.data);
      } catch {
        navigate("/user/orders/all");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, userId, navigate]);

  const getProduct = (pid) => products.find((p) => p.id === pid);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "N/A";

  const handleCancel = async () => {
    try {
      const res = await axios.put(`${BASE}/orders/${order.id}`, { status: "cancelled" });
      setOrder(res.data);
      setShowCancelModal(false);
      addToast(`Order #${order.id} cancelled.`, "success");
    } catch {
      addToast("Failed to cancel order.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading order…
      </div>
    );
  }

  if (!order) return null;

  const subtotal = order.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ─── Back + Title ─── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/user/orders/all")}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Order #{order.id}</h1>
            <p className="text-gray-500 text-xs">{formatDate(order.createdAt)}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* ─── Status timeline ─── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Order Progress</h2>
          <div className="flex items-center gap-0">
            {(() => {
              const steps = [
                { key: "placed",    label: "Placed",    icon: "bi-receipt" },
                { key: "pending",   label: "Pending",   icon: "bi-hourglass-split" },
                { key: "completed", label: "Completed", icon: "bi-check-circle-fill" },
              ];

              const isCancelled = order.status === "cancelled";

              const activeIndex = isCancelled ? -1
                : order.status === "completed" ? 2
                : order.status === "pending"   ? 1
                : 0;

              if (isCancelled) {
                return (
                  <div className="flex items-center gap-3 text-red-400">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 border-2 border-red-600 flex items-center justify-center">
                      <i className="bi bi-x-circle-fill text-red-400" />
                    </div>
                    <div>
                      <p className="text-red-400 font-semibold text-sm">Order Cancelled</p>
                      <p className="text-gray-500 text-xs">This order has been cancelled.</p>
                    </div>
                  </div>
                );
              }

              return steps.map((step, i) => (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                      ${i <= activeIndex
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-500"}`}>
                      <i className={`bi ${step.icon} text-sm`} />
                    </div>
                    <span className={`text-xs font-medium ${i <= activeIndex ? "text-blue-400" : "text-gray-600"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-5 rounded transition-all ${i < activeIndex ? "bg-blue-600" : "bg-gray-700"}`} />
                  )}
                </React.Fragment>
              ));
            })()}
          </div>
        </div>

        {/* ─── Order items ─── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <i className="bi bi-bag text-blue-400" />
              Items ({order.items.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {order.items.map((item, i) => {
              const p         = getProduct(item.productId);
              const lineTotal = Number(item.price) * item.quantity;
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  {p?.image ? (
                    <img src={`http://localhost:5000${p.image}`} alt={p?.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-700" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-700">
                      <i className="bi bi-box text-gray-500 text-xl" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p?.name ?? `Product #${item.productId}`}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{p?.category ?? ""}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {item.quantity} × ${Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-white font-bold text-sm flex-shrink-0">${lineTotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="border-t border-gray-700/50 px-5 py-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Payment</span>
              <span className="capitalize">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-gray-700/50">
              <span>Total</span>
              <span className="text-green-400">${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ─── Cancel button (pending only) ─── */}
        {order.status === "pending" && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 rounded-xl transition-colors flex items-center gap-2"
            >
              <i className="bi bi-x-circle" />
              Cancel This Order
            </button>
          </div>
        )}
      </div>

      {/* ─── Cancel Confirm Modal ─── */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700/50 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-white">Cancel Order?</h2>
              <button onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 text-center space-y-3">
              <i className="bi bi-exclamation-triangle text-5xl text-red-400 animate-bounce block" />
              <p className="text-white">
                Cancel <span className="font-bold text-red-400">Order #{order.id}</span>?
              </p>
              <p className="text-gray-500 text-sm">This action cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-3 px-5 pb-5">
              <button onClick={() => setShowCancelModal(false)}
                className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                Keep Order
              </button>
              <button onClick={handleCancel}
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

export default OrderDetail;