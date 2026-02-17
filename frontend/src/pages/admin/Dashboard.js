import axios from "axios";
import React, { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";

const BASE = "http://localhost:5000/api";

/* ─── Mini sparkline bar chart ─── */
const BarChart = ({ data, color = "bg-blue-500" }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className={`w-full rounded-sm ${color} transition-all duration-500 opacity-80 group-hover:opacity-100`}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 1 }}
          />
          {/* Tooltip */}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {d.label}: {d.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Stat card ─── */
const StatCard = ({ icon, label, value, sub, color, onClick, chart, chartColor }) => (
  <div
    onClick={onClick}
    className={`bg-gray-800 rounded-xl p-5 border border-gray-700/50 flex flex-col gap-3 ${onClick ? "cursor-pointer hover:border-blue-500/50 transition-colors duration-200" : ""}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace("text-", "bg-").replace("400", "600").replace("300", "500")}/20`}>
        <i className={`bi ${icon} text-xl ${color}`} />
      </div>
    </div>
    {chart && <BarChart data={chart} color={chartColor} />}
  </div>
);

/* ─── Status pill ─── */
const StatusPill = ({ status }) => {
  const map = { pending: "bg-yellow-600", completed: "bg-green-600", cancelled: "bg-red-600" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${map[status] ?? "bg-gray-600"}`}>
      {status}
    </span>
  );
};

/* ─── Section header ─── */
const SectionHeader = ({ icon, title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
      <i className={`bi ${icon} text-blue-400`} />
      {title}
    </h2>
    {action}
  </div>
);

function Dashboard() {
  const { setPageTitle, setHeaderAction } = useOutletContext();
  const navigate = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setPageTitle("Dashboard");
    setHeaderAction(null);
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [oRes, pRes, uRes] = await Promise.all([
          axios.get(`${BASE}/orders`),
          axios.get(`${BASE}/products`),
          axios.get(`${BASE}/users`),
        ]);
        setOrders(oRes.data);
        setProducts(pRes.data);
        setUsers(uRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ─── Derived stats ─── */
  const totalRevenue   = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.totalAmount, 0);
  const pendingOrders  = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const lowStock       = products.filter((p) => p.stock <= 5);
  const recentOrders   = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const getUser = (id) => users.find((u) => u.id === id);
  const getFullName = (id) => {
    const u = getUser(id);
    if (!u) return "Unknown";
    const parts = [u.firstName, u.middleName, u.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : u.username;
  };

  /* ─── Build last-7-days order chart data ─── */
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = d.toISOString().slice(0, 10);
    const value = orders.filter((o) => o.createdAt?.slice(0, 10) === dateStr).length;
    return { label, value };
  });

  /* ─── Revenue by product category ─── */
  const categoryRevenue = {};
  orders.filter((o) => o.status === "completed").forEach((o) => {
    o.items.forEach((item) => {
      const p = products.find((p) => p.id === item.productId);
      const cat = p?.category ?? "Other";
      categoryRevenue[cat] = (categoryRevenue[cat] ?? 0) + item.price * item.quantity;
    });
  });
  const categoryChart = Object.entries(categoryRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));

  /* ─── Stock distribution chart ─── */
  const stockChart = [...products]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 7)
    .map((p) => ({ label: p.name, value: p.stock }));

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "N/A";
  const orderStatusRatio = orders.length
    ? [
        { label: "Pending",   value: pendingOrders,   color: "bg-yellow-500", pct: Math.round((pendingOrders  / orders.length) * 100) },
        { label: "Completed", value: completedOrders, color: "bg-green-500",  pct: Math.round((completedOrders / orders.length) * 100) },
        { label: "Cancelled", value: cancelledOrders, color: "bg-red-500",    pct: Math.round((cancelledOrders / orders.length) * 100) },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="bi-receipt"
          label="Total Orders"
          value={orders.length}
          sub={`${pendingOrders} pending`}
          color="text-blue-400"
          chart={last7}
          chartColor="bg-blue-500"
          onClick={() => navigate("/admin/orders/all")}
        />
        <StatCard
          icon="bi-currency-dollar"
          label="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          sub={`${completedOrders} completed orders`}
          color="text-green-400"
          chart={categoryChart.length ? categoryChart : undefined}
          chartColor="bg-green-500"
        />
        <StatCard
          icon="bi-box-seam"
          label="Products"
          value={products.length}
          sub={`${lowStock.length} low stock`}
          color="text-orange-400"
          chart={stockChart}
          chartColor="bg-orange-500"
          onClick={() => navigate("/admin/products")}
        />
        <StatCard
          icon="bi-people"
          label="Users"
          value={users.length}
          sub={`${users.filter((u) => u.role === "admin").length} admins`}
          color="text-purple-400"
          onClick={() => navigate("/admin/users/all")}
        />
      </div>

      {/* ─── Order status + Recent orders ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Order status breakdown */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50">
          <SectionHeader icon="bi-pie-chart" title="Order Status" />
          <div className="space-y-3">
            {orderStatusRatio.length === 0 && (
              <p className="text-gray-500 text-sm italic">No orders yet.</p>
            )}
            {orderStatusRatio.map(({ label, value, color, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{label}</span>
                  <span>{value} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 pt-4 border-t border-gray-700 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Pending",   value: pendingOrders,   color: "text-yellow-400" },
              { label: "Done",      value: completedOrders, color: "text-green-400" },
              { label: "Cancelled", value: cancelledOrders, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-5 border border-gray-700/50">
          <SectionHeader
            icon="bi-clock-history"
            title="Recent Orders"
            action={
              <button
                onClick={() => navigate("/admin/orders/all")}
                className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                View all →
              </button>
            }
          />
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                    <th className="text-left pb-2 pr-3">ID</th>
                    <th className="text-left pb-2 pr-3">Customer</th>
                    <th className="text-left pb-2 pr-3">Total</th>
                    <th className="text-left pb-2 pr-3">Status</th>
                    <th className="text-left pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-2 pr-3 text-gray-400">#{o.id}</td>
                      <td className="py-2 pr-3 text-white font-medium">{getFullName(o.userId)}</td>
                      <td className="py-2 pr-3 text-green-400 font-semibold">${o.totalAmount.toFixed(2)}</td>
                      <td className="py-2 pr-3"><StatusPill status={o.status} /></td>
                      <td className="py-2 text-gray-400 text-xs">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Low stock + Top products ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Low stock alert */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50">
          <SectionHeader
            icon="bi-exclamation-triangle"
            title="Low Stock Alert"
            action={
              <button
                onClick={() => navigate("/admin/products")}
                className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                Manage →
              </button>
            }
          />
          {lowStock.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <i className="bi bi-check-circle-fill" />
              All products are sufficiently stocked.
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-700/40 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    {p.image ? (
                      <img src={`http://localhost:5000${p.image}`} alt={p.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                        <i className="bi bi-box text-gray-400 text-xs" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-gray-500 text-xs">{p.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${p.stock === 0 ? "text-red-400" : "text-orange-400"}`}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products by revenue */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50">
          <SectionHeader icon="bi-trophy" title="Top Products by Revenue" />
          {categoryChart.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No completed orders yet.</p>
          ) : (() => {
            // Build per-product revenue from completed orders
            const prodRevenue = {};
            orders.filter((o) => o.status === "completed").forEach((o) => {
              o.items.forEach((item) => {
                prodRevenue[item.productId] = (prodRevenue[item.productId] ?? 0) + item.price * item.quantity;
              });
            });
            const topProds = Object.entries(prodRevenue)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([id, rev]) => {
                const p = products.find((p) => p.id === Number(id));
                return { name: p?.name ?? `Product #${id}`, revenue: rev, category: p?.category ?? "" };
              });
            const maxRev = Math.max(...topProds.map((p) => p.revenue));
            return (
              <div className="space-y-3">
                {topProds.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium truncate max-w-[60%]">{p.name}</span>
                      <span className="text-green-400 font-semibold">${p.revenue.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
                        style={{ width: `${(p.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ─── User summary ─── */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50">
        <SectionHeader
          icon="bi-people"
          title="User Overview"
          action={
            <button
              onClick={() => navigate("/admin/users/all")}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              Manage →
            </button>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Users",   value: users.length,                                          icon: "bi-people-fill",    color: "text-blue-400" },
            { label: "Admins",        value: users.filter((u) => u.role === "admin").length,         icon: "bi-shield-fill",    color: "text-purple-400" },
            { label: "Regular Users", value: users.filter((u) => u.role === "user").length,          icon: "bi-person-fill",    color: "text-cyan-400" },
            { label: "Active Carts",  value: users.filter((u) => u.cart?.length > 0).length,        icon: "bi-cart-fill",      color: "text-orange-400" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-gray-700/40 rounded-lg p-4 text-center">
              <i className={`bi ${icon} text-2xl ${color} mb-1 block`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-gray-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Dashboard;