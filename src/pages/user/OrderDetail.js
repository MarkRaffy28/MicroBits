import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getOrderById, updateOrder, ORDER_STATUS_LABELS, TRACKING_STATUS_LABELS, CANCELLABLE_STATUSES } from "../../firebase/services/orders";
import { getAllProducts }  from "../../firebase/services/products";
import { getAllLocations } from "../../firebase/services/locations";

// =========================
// Module-level constants
// =========================

const STATUS_COLORS = {
  to_pay:        "bg-yellow-600",
  to_ship:       "bg-blue-600",
  to_receive:    "bg-purple-600",
  completed:     "bg-green-600",
  cancelled:     "bg-red-600",
  return_refund: "bg-orange-600",
};

const STATUS_ICONS = {
  to_pay:        "bi-credit-card",
  to_ship:       "bi-box-seam",
  to_receive:    "bi-truck",
  completed:     "bi-check-circle-fill",
  cancelled:     "bi-x-circle-fill",
  return_refund: "bi-arrow-counterclockwise",
};

const PROGRESS_STEPS = [
  { key: "to_pay",     label: "To Pay",     icon: "bi-credit-card" },
  { key: "to_ship",    label: "To Ship",    icon: "bi-box-seam" },
  { key: "to_receive", label: "To Receive", icon: "bi-truck" },
  { key: "completed",  label: "Completed",  icon: "bi-check-circle-fill" },
];

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${STATUS_COLORS[status] ?? "bg-gray-600"}`}>
    <i className={`bi ${STATUS_ICONS[status] ?? "bi-circle"} text-xs`} />
    {ORDER_STATUS_LABELS[status] ?? status}
  </span>
);

const formatDate = (d) => d
  ? new Date(d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
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

function OrderDetail() {
  const { addToast }    = useToast();
  const { currentUser } = useAuth();
  const { id }          = useParams();
  const location        = useLocation();
  const navigate        = useNavigate();

  const [order,    setOrder]    = useState(null);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling,    setIsCancelling]    = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [fetchedOrder, allProducts, allLocations] = await Promise.all([
          getOrderById(id),
          getAllProducts(),
          getAllLocations(),
        ]);

        // Protect: only the owner can view
        if (fetchedOrder.userId !== currentUser?.id) {
          navigate("/user/orders/all");
          return;
        }

        setOrder(fetchedOrder);
        setProducts(allProducts);
        setLocations(allLocations);
      } catch {
        navigate("/user/orders/all");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getProduct  = (pid) => products.find((p) => p.id === pid);
  const getLocation = (lid) => lid ? locations.find((l) => l.id === lid) : null;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const updated = await updateOrder(order.id, { status: "cancelled" });
      setOrder(updated);
      setShowCancelModal(false);
      addToast("Order cancelled successfully.", "success");
    } catch {
      addToast("Failed to cancel order.", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
        <Spinner />
        Loading order…
      </div>
    );
  }

  if (!order) return null;

  const subtotal     = (order.items ?? []).reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const isCancelled  = order.status === "cancelled";
  const isReturnRef  = order.status === "return_refund";
  const activeIndex  = PROGRESS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ─── Back + Title ─── */}
        <div className="flex items-center gap-3">
          <button onClick={() => location.key === 'default' ? navigate("/user/orders/all") : navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Order Details</h1>
            <p className="text-gray-500 text-xs font-mono">#{order.id}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* ─── Progress / Status ─── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Order Progress</h2>

          {(isCancelled || isReturnRef) ? (
            <div className={`flex items-center gap-3 ${isCancelled ? "text-red-400" : "text-orange-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                isCancelled ? "bg-red-600/20 border-red-600" : "bg-orange-600/20 border-orange-600"
              }`}>
                <i className={`bi ${STATUS_ICONS[order.status]} text-lg`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{ORDER_STATUS_LABELS[order.status]}</p>
                <p className="text-gray-500 text-xs">
                  {isCancelled ? "This order has been cancelled." : "A return or refund has been requested."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              {PROGRESS_STEPS.map((step, i) => {
                const done    = i <= activeIndex;
                const current = i === activeIndex;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        done
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-700 border-gray-600 text-gray-500"
                      } ${current ? "ring-2 ring-blue-400/40" : ""}`}>
                        <i className={`bi ${step.icon} text-sm`} />
                      </div>
                      <span className={`text-xs font-medium ${done ? "text-blue-400" : "text-gray-600"}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < PROGRESS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-5 rounded transition-all ${i < activeIndex ? "bg-blue-600" : "bg-gray-700"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Order meta ─── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Order Date",     value: formatDate(order.createdAt) },
            { label: "Payment Method", value: order.paymentMethod },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 rounded-xl border border-gray-700/50 p-4">
              <p className="text-gray-500 text-xs mb-0.5">{label}</p>
              <p className="text-white text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* ─── Order items ─── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <i className="bi bi-bag text-blue-400" />
              Items ({order.items?.length ?? 0})
            </h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {(order.items ?? []).map((item, i) => {
              const p         = getProduct(item.productId);
              const lineTotal = Number(item.price) * item.quantity;
              return (
                <div key={i}
                  onClick={() => p && navigate(`/user/product/${item.productId}`, { state: { product: p } })}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                >
                  {p?.image ? (
                    <img src={p.image} alt={p?.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-700" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="bi bi-box text-gray-500 text-xl" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate group-hover:text-blue-400 hover:text-blue-400 transition-colors">{p?.name ?? `Product #${item.productId}`}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{p?.category ?? ""}</p>
                    <p className="text-gray-400 text-xs mt-1">{item.quantity} × ${Number(item.price).toFixed(2)}</p>
                  </div>
                  <p className="text-white font-bold text-sm flex-shrink-0">${lineTotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-700/50 px-5 py-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Payment</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-gray-700/50">
              <span>Total</span>
              <span className="text-green-400">${order.totalAmount?.toFixed(2) ?? "0.00"}</span>
            </div>
          </div>
        </div>

        {/* ─── Tracking history ─── */}
        {(order.tracking?.length ?? 0) > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <i className="bi bi-pin-map text-blue-400" />
              Tracking History
            </h2>
            <div className="relative pl-5 space-y-5">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-700" />
              {[...order.tracking].reverse().map((event, i) => {
                const loc     = getLocation(event.locationId);
                const isFirst = i === 0;
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full border-2 border-gray-900 ${isFirst ? "bg-blue-500" : "bg-gray-600"}`} />
                    <p className={`text-sm font-semibold ${isFirst ? "text-white" : "text-gray-300"}`}>
                      {event.title ?? TRACKING_STATUS_LABELS[event.status]?.title ?? event.status}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {event.description ?? TRACKING_STATUS_LABELS[event.status]?.description}
                    </p>
                    {loc && (
                      <p className="text-blue-400 text-xs mt-0.5">
                        <i className="bi bi-geo-alt mr-1" />{loc.name}, {loc.city}
                      </p>
                    )}
                    <p className="text-gray-600 text-xs mt-0.5">{formatDate(event.timestamp)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Cancel button ─── */}
        {CANCELLABLE_STATUSES?.includes(order.status) && (
          <div className="flex justify-end">
            <button onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 rounded-xl transition-colors flex items-center gap-2">
              <i className="bi bi-x-circle" />
              Cancel This Order
            </button>
          </div>
        )}
      </div>

      {/* ─── Cancel Confirm Modal ─── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => !isCancelling && setShowCancelModal(false)}>
          <div className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700/50 animate-slideUp"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-white">Cancel Order?</h2>
              <button onClick={() => setShowCancelModal(false)} disabled={isCancelling}
                className="text-gray-400 hover:text-white text-xl leading-none disabled:opacity-30">&times;</button>
            </div>
            <div className="p-5 text-center space-y-3">
              <i className="bi bi-exclamation-triangle text-5xl text-red-400 animate-bounce block" />
              <p className="text-white">Cancel <span className="font-bold text-red-400">Order #{order.id}</span>?</p>
              <p className="text-gray-500 text-sm">This action cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-3 px-5 pb-5">
              <button onClick={() => setShowCancelModal(false)} disabled={isCancelling}
                className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Keep Order
              </button>
              <button onClick={handleCancel} disabled={isCancelling}
                className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isCancelling
                  ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Cancelling...</>
                  : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OrderDetail;