import React, { useEffect, useState, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { getAllOrders, ORDER_STATUS_LABELS } from "../../firebase/services/orders";
import { getAllProducts } from "../../firebase/services/products";
import { getAllUsers }    from "../../firebase/services/users";
import "../../styles/StyleSheet.css";

// =========================
// Helpers
// =========================

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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

const STATUS_BAR_COLORS = {
  to_pay:        "bg-yellow-500",
  to_ship:       "bg-blue-500",
  to_receive:    "bg-purple-500",
  completed:     "bg-green-500",
  cancelled:     "bg-red-500",
  return_refund: "bg-orange-500",
};

const formatCurrency = (v) => `$${Number(v ?? 0).toFixed(2)}`;
const formatDate     = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const RANGES = [
  { label: "7D",  days: 7   },
  { label: "30D", days: 30  },
  { label: "90D", days: 90  },
  { label: "All", days: null },
];

// =========================
// Sub-components
// =========================

const StatCard = ({ icon, label, value, sub, color = "text-blue-400", trend }) => (
  <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700/60`}>
        <i className={`bi ${icon} text-lg ${color}`} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
          <i className={`bi ${trend >= 0 ? "bi-arrow-up-right" : "bi-arrow-down-right"}`} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-gray-400 text-sm mt-0.5">{label}</p>
    {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
  </div>
);

// Mini sparkline bar chart
const BarChart = ({ data, color = "bg-blue-500", height = "h-20" }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={`flex items-end gap-0.5 ${height} w-full`}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
          <div
            className={`w-full rounded-t ${color} opacity-80 group-hover:opacity-100 transition-all`}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "2px" : "0" }}
          />
          <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-gray-900 border border-gray-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
            {d.label}: {formatCurrency(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
};

// =========================
// Main Component
// =========================

function Sales() {
  const { addToast }   = useToast();
  const { setPageTitle, setHeaderAction } = useOutletContext();
  const navigate       = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [range,    setRange]    = useState(30); // days, null = all

  useEffect(() => {
    setPageTitle("Sales");
    setHeaderAction(
      <div className="flex items-center gap-2 w-full">
        {RANGES.map(({ label, days }) => (
          <button key={label}
            onClick={() => setRange(days)}
            className={`px-3 py-1 text-xs rounded-lg border transition-all h-8 ${
              range === days
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
            }`}>
            {label}
          </button>
        ))}
        <span className="text-gray-200 text-xs ml-1 whitespace-nowrap">
          {range ? `Last ${range}d` : "All time"} · {orders.filter(inRange).length} orders
        </span>
      </div>
    );
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, [range, orders]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [allOrders, allProducts, allUsers] = await Promise.all([
          getAllOrders({ force: true }),
          getAllProducts(),
          getAllUsers(),
        ]);
        setOrders(allOrders);
        setProducts(allProducts);
        setUsers(allUsers);
      } catch {
        addToast("Failed to load sales data.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // ── Filter by range ──
  const now       = new Date();
  const cutoff    = range ? new Date(now - range * 86400000) : null;
  const inRange   = (o) => !cutoff || new Date(o.createdAt) >= cutoff;

  const rangeOrders     = orders.filter(inRange);
  const completed       = rangeOrders.filter((o) => o.status === "completed");
  const totalRevenue    = completed.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const totalOrders     = rangeOrders.length;
  const avgOrderValue   = completed.length ? totalRevenue / completed.length : 0;
  const cancelRate      = totalOrders ? Math.round((rangeOrders.filter((o) => o.status === "cancelled").length / totalOrders) * 100) : 0;

  // ── Previous period trend ──
  const prevCutoff  = range ? new Date(now - range * 2 * 86400000) : null;
  const prevOrders  = prevCutoff
    ? orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= prevCutoff && d < cutoff;
      })
    : [];
  const prevRevenue = prevOrders.filter((o) => o.status === "completed").reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const revTrend    = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  // ── Daily revenue chart (last N days or last 30 if All) ──
  const chartDays = range ?? 30;
  const dailyData = Array.from({ length: chartDays }, (_, i) => {
    const d    = new Date(now);
    d.setDate(d.getDate() - (chartDays - 1 - i));
    const key  = d.toDateString();
    const val  = completed
      .filter((o) => new Date(o.createdAt).toDateString() === key)
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: val,
    };
  });

  // ── Status breakdown ──
  const statusBreakdown = Object.entries(
    rangeOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // ── Top products by revenue ──
  const productRevenue = {};
  completed.forEach((o) => {
    (o.items ?? []).forEach((item) => {
      productRevenue[item.productId] = (productRevenue[item.productId] ?? 0) + Number(item.price) * item.quantity;
    });
  });
  const topProducts = Object.entries(productRevenue)
    .map(([id, rev]) => ({ product: products.find((p) => p.id === id), rev }))
    .filter((x) => x.product)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  // ── Top customers ──
  const customerRevenue = {};
  completed.forEach((o) => {
    customerRevenue[o.userId] = (customerRevenue[o.userId] ?? 0) + (o.totalAmount ?? 0);
  });
  const topCustomers = Object.entries(customerRevenue)
    .map(([id, rev]) => ({ user: users.find((u) => u.id === id), rev }))
    .filter((x) => x.user)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  // ── Recent orders ──
  const recentOrders = [...rangeOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <Spinner /><span>Loading sales data…</span>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-5">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="bi-currency-dollar" label="Revenue"       value={formatCurrency(totalRevenue)}  color="text-green-400"  trend={revTrend} sub={`${completed.length} completed`} />
        <StatCard icon="bi-receipt"         label="Total Orders"  value={totalOrders}                   color="text-blue-400"   />
        <StatCard icon="bi-graph-up"        label="Avg. Order"    value={formatCurrency(avgOrderValue)} color="text-purple-400" />
        <StatCard icon="bi-x-circle"        label="Cancel Rate"   value={`${cancelRate}%`}              color="text-red-400"    />
      </div>

      {/* ── Revenue chart ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Revenue Over Time</h2>
          <span className="text-xs text-gray-500">{range ? `${range}d` : "All"} · completed orders only</span>
        </div>
        {dailyData.every((d) => d.value === 0) ? (
          <p className="text-gray-600 text-sm italic text-center py-8">No revenue in this period.</p>
        ) : (
          <>
            <BarChart data={dailyData} color="bg-blue-500" height="h-28" />
            <div className="flex justify-between text-xs text-gray-600 mt-1 px-0.5">
              <span>{dailyData[0]?.label}</span>
              <span>{dailyData[Math.floor(dailyData.length / 2)]?.label}</span>
              <span>{dailyData[dailyData.length - 1]?.label}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Status breakdown + Top products ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Status breakdown */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Orders by Status</h2>
          {statusBreakdown.length === 0 ? (
            <p className="text-gray-600 text-sm italic">No orders.</p>
          ) : (
            <div className="space-y-3">
              {statusBreakdown.map(([status, count]) => {
                const pct = Math.round((count / totalOrders) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{ORDER_STATUS_LABELS[status] ?? status}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_BAR_COLORS[status] ?? "bg-gray-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-600 text-sm italic">No sales data.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map(({ product, rev }, i) => {
                const maxRev = topProducts[0].rev;
                return (
                  <div key={product.id}
                    onClick={() => navigate("/admin/products")}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/30 rounded-lg px-2 py-1 -mx-2 transition-colors"
                  >
                    <span className="text-gray-600 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                    {product.image
                      ? <img src={product.image} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      : <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0"><i className="bi bi-box text-gray-500 text-xs" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-xs truncate">{product.name}</p>
                      <div className="h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(rev / maxRev) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-green-400 text-xs font-semibold flex-shrink-0">{formatCurrency(rev)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Top customers ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Top Customers</h2>
        {topCustomers.length === 0 ? (
          <p className="text-gray-600 text-sm italic">No customer data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">#</th>
                  <th className="text-left pb-2 pr-4">Customer</th>
                  <th className="text-left pb-2 pr-4">Username</th>
                  <th className="text-right pb-2">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {topCustomers.map(({ user, rev }, i) => (
                  <tr key={user.id}
                    onClick={() => navigate("/admin/users/all")}
                    className="hover:bg-gray-700/20 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 pr-4 text-gray-600 text-xs">{i + 1}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        {user.profilePicture
                          ? <img src={user.profilePicture} alt={user.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"><i className="bi bi-person text-gray-400 text-xs" /></div>
                        }
                        <span className="text-gray-200 text-xs">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">@{user.username}</td>
                    <td className="py-2.5 text-right text-green-400 font-semibold text-xs">{formatCurrency(rev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent orders ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
          <button onClick={() => navigate("/admin/orders/all")}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all →
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-600 text-sm italic">No orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">Order ID</th>
                  <th className="text-left pb-2 pr-4">Date</th>
                  <th className="text-left pb-2 pr-4">Items</th>
                  <th className="text-left pb-2 pr-4">Status</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {recentOrders.map((o) => (
                  <tr key={o.id}
                    onClick={() => navigate(`/admin/orders/all`)}
                    className="hover:bg-gray-700/20 transition-colors cursor-pointer">
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">
                      <span className="inline-block max-w-[80px] truncate align-bottom" title={o.id} dir="rtl">
                        {o.id}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="py-2.5 pr-4 text-gray-300 text-xs">{o.items?.length ?? 0}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap ${STATUS_COLORS[o.status] ?? "bg-gray-600"}`}>
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-green-400 font-semibold text-xs">
                      {formatCurrency(o.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default Sales;