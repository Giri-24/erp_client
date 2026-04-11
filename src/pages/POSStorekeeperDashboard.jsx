import React, { useEffect, useState } from "react";
import { message, Spin, Tag } from "antd";
import dayjs from "dayjs";
import {
  getPosDashboard,
  getAllStores,
  getAllPurchases,
  getAllSales,
  getStockOverview,
} from "../modules/pos/pos.service";

const fmt = (v) => "₹" + Math.round(Number(v || 0)).toLocaleString("en-IN");
const fmtNum = (v) => Number(v || 0).toLocaleString("en-IN");

const POSStorekeeperDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [stores, setStores] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const today = dayjs().format("YYYY-MM-DD");
    const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");

    try {
      const results = await Promise.allSettled([
        getPosDashboard(monthStart, today),
        getAllStores(),
        getAllSales(null, monthStart, today),
        getAllPurchases(),
        getStockOverview(),
      ]);

      if (results[0].status === "fulfilled") setDashboard(results[0].value);
      if (results[1].status === "fulfilled") setStores(results[1].value || []);
      if (results[2].status === "fulfilled") setRecentSales((results[2].value || []).slice(0, 8));
      if (results[3].status === "fulfilled") setRecentPurchases((results[3].value || []).slice(0, 8));
      if (results[4].status === "fulfilled") {
        const stock = results[4].value || [];
        setLowStock(
          (Array.isArray(stock) ? stock : stock.items || [])
            .filter((i) => Number(i.quantity || i.stock || 0) <= Number(i.reorderLevel || i.minStock || 5))
            .slice(0, 10)
        );
      }
    } catch {
      message.error("Failed to load store dashboard");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <Spin size="large" />
      </div>
    );
  }

  const totalSales = dashboard?.totalSales || dashboard?.sales || 0;
  const totalPurchases = dashboard?.totalPurchases || dashboard?.purchases || 0;
  const profit = totalSales - totalPurchases;
  const activeStores = stores.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-primary tracking-tight">
            Store Dashboard
          </h2>
          <p className="text-on-surface-variant mt-1">
            {dayjs().format("dddd, MMMM D, YYYY")} — This month's overview
          </p>
        </div>
        <button
          onClick={() => onNavigate("pos-sales")}
          style={{ background: "linear-gradient(to right, #00152a, #102a43)" }}
          className="px-6 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/10 hover:opacity-90"
        >
          <span className="material-symbols-outlined text-lg">point_of_sale</span>
          New Sale
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2e7d32]/5 rounded-full blur-2xl group-hover:bg-[#2e7d32]/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Sales</p>
              <h3 className="text-3xl font-extrabold font-headline text-[#2e7d32]">{fmt(totalSales)}</h3>
            </div>
            <span className="p-2.5 bg-[#e8f5e9] rounded-full text-[#2e7d32] material-symbols-outlined text-xl">trending_up</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">This month</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-error/5 rounded-full blur-2xl group-hover:bg-error/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Purchases</p>
              <h3 className="text-3xl font-extrabold font-headline text-error">{fmt(totalPurchases)}</h3>
            </div>
            <span className="p-2.5 bg-error/10 rounded-full text-error material-symbols-outlined text-xl">shopping_cart</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">This month</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Profit / Loss</p>
              <h3 className={`text-3xl font-extrabold font-headline ${profit >= 0 ? "text-[#2e7d32]" : "text-error"}`}>{fmt(profit)}</h3>
            </div>
            <span className={`p-2.5 rounded-full material-symbols-outlined text-xl ${profit >= 0 ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-error/10 text-error"}`}>
              {profit >= 0 ? "arrow_upward" : "arrow_downward"}
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">Net this month</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-tertiary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Stores</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{activeStores}</h3>
            </div>
            <span className="p-2.5 bg-tertiary-fixed rounded-full text-on-tertiary-fixed-variant material-symbols-outlined text-xl">storefront</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{lowStock.length} items low stock</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { key: "pos-sales", icon: "point_of_sale", label: "POS / Sales", color: "bg-primary/10 text-primary" },
          { key: "pos-purchases", icon: "add_shopping_cart", label: "Purchases", color: "bg-secondary-fixed text-on-secondary-fixed-variant" },
          { key: "pos-items", icon: "inventory_2", label: "Items & Stock", color: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
          { key: "pos-transfers", icon: "swap_horiz", label: "Stock Transfer", color: "bg-amber-50 text-amber-700" },
          { key: "pos-teacher-allowance", icon: "redeem", label: "Staff Allowance", color: "bg-primary-fixed text-primary" },
          { key: "pos-transactions", icon: "receipt_long", label: "Income/Expense", color: "bg-surface-container-high text-on-surface-variant" },
        ].map((action) => (
          <button
            key={action.key}
            onClick={() => onNavigate(action.key)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-lowest shadow-ambient-sm hover:shadow-ambient transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className={`material-symbols-outlined text-2xl p-3 rounded-full ${action.color}`}>{action.icon}</span>
            <span className="text-[11px] font-bold text-on-surface-variant text-center">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Low Stock Alert + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
          <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
            <h4 className="text-base font-bold font-headline text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
              Low Stock Alert
            </h4>
            <button
              onClick={() => onNavigate("pos-items")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Manage Stock <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          {lowStock.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">All items well stocked</div>
          ) : (
            <div className="divide-y divide-surface-container-low">
              {lowStock.map((item, idx) => (
                <div key={item.id || idx} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                  <span className="material-symbols-outlined text-amber-600">inventory_2</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{item.name || item.itemName}</p>
                    <p className="text-[10px] text-on-surface-variant">{item.category || item.storeName || "—"}</p>
                  </div>
                  <Tag color="red">{fmtNum(item.quantity || item.stock || 0)} left</Tag>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
          <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
            <h4 className="text-base font-bold font-headline text-primary">Recent Sales</h4>
            <button
              onClick={() => onNavigate("pos-sales")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">No sales this month</div>
          ) : (
            <div className="divide-y divide-surface-container-low">
              {recentSales.map((sale, idx) => (
                <div key={sale.id || idx} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                  <span className="material-symbols-outlined text-primary">receipt</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">
                      {sale.invoiceNo || sale.receiptNo || `Sale #${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      {sale.createdAt ? dayjs(sale.createdAt).format("DD MMM, hh:mm A") : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#2e7d32]">{fmt(sale.total || sale.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default POSStorekeeperDashboard;
