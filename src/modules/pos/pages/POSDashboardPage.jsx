import React, { useEffect, useState } from "react";
import { message, Modal } from "antd";
import { getPosDashboard, getAllStores, getStockOverview } from "../pos.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });


const POSDashboardPage = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState(null);
  const [stores, setStores] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { hasPermission } = usePermissionHelpers();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, storeList, stock] = await Promise.all([
        getPosDashboard(fromDate || undefined, toDate || undefined),
        getAllStores(),
        getStockOverview(),
      ]);
      setDashboard(dash);
      setStores(storeList || []);
      setLowStock((stock || []).filter((s) => s.quantity <= (s.item?.reorderLevel || 5)));
    } catch (err) {
      message.error("Failed to load POS dashboard");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
      </div>
    );
  }

  const stats = [
    { label: "Total Sales", value: fmt(dashboard?.totalSales || 0), icon: "point_of_sale", color: "text-primary", bg: "bg-primary-container/30" },
    { label: "Total Purchases", value: fmt(dashboard?.totalPurchases || 0), icon: "shopping_cart", color: "text-secondary", bg: "bg-secondary-container/30" },
    { label: "Profit / Loss", value: fmt(dashboard?.profitLoss || 0), icon: "trending_up", color: (dashboard?.profitLoss || 0) >= 0 ? "text-[#44ddc1]" : "text-error", bg: (dashboard?.profitLoss || 0) >= 0 ? "bg-[#44ddc1]/10" : "bg-error-container/30" },
    { label: "Active Stores", value: stores.filter((s) => s.isActive !== false).length, icon: "storefront", color: "text-tertiary", bg: "bg-tertiary-container/30" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Store</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Dashboard</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
          POS Dashboard
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant font-bold">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant font-bold">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
        </div>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); }}
            className="text-error text-xs font-bold hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">close</span>Clear
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.04)] relative overflow-hidden">
            <div className={`absolute top-4 right-4 w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
            </div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-headline font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button onClick={() => onNavigate?.("pos-sales")} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group">
          <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">point_of_sale</span>
          <h4 className="font-headline font-bold text-lg text-on-surface mt-3">New Sale</h4>
          <p className="text-xs text-on-surface-variant mt-1">Process a sale or cash transaction</p>
        </button>
        <button onClick={() => onNavigate?.("pos-purchases")} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group">
          <span className="material-symbols-outlined text-3xl text-secondary group-hover:scale-110 transition-transform">local_shipping</span>
          <h4 className="font-headline font-bold text-lg text-on-surface mt-3">New Purchase</h4>
          <p className="text-xs text-on-surface-variant mt-1">Record a stock purchase from supplier</p>
        </button>
        <button onClick={() => onNavigate?.("pos-stock")} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group">
          <span className="material-symbols-outlined text-3xl text-tertiary group-hover:scale-110 transition-transform">inventory_2</span>
          <h4 className="font-headline font-bold text-lg text-on-surface mt-3">Stock Overview</h4>
          <p className="text-xs text-on-surface-variant mt-1">View current stock across all stores</p>
        </button>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-error-container/20 rounded-2xl p-6">
          <h4 className="font-headline font-bold text-lg text-error mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Low Stock Alerts ({lowStock.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.slice(0, 6).map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-error-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-lg">inventory</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{s.item?.name || "Unknown"}</p>
                  <p className="text-xs text-on-surface-variant">{s.store?.name || "Store"}</p>
                </div>
                <span className="text-lg font-extrabold text-error">{s.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {dashboard?.recentSales?.length > 0 && (
        <div className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
          <h4 className="font-headline font-bold text-xl text-primary mb-5">Recent Sales</h4>
          <div className="space-y-3">
            {dashboard.recentSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0">
                <div>
                  <p className="font-bold text-sm text-on-surface">{sale.invoiceNo || "—"}</p>
                  <p className="text-xs text-on-surface-variant">{sale.customerName || "Walk-in"} · {sale.paymentMode}</p>
                </div>
                <span className="font-extrabold text-primary">{fmt(sale.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default POSDashboardPage;
