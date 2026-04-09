import React, { useEffect, useState } from "react";
import { message } from "antd";
import {
  getAllStores, getAllStoreItems, createStockTransfer, getAllStockTransfers, getStockOverview,
} from "../pos.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const StockTransferPage = ({ initialTab }) => {
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [stockOverview, setStockOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab || "transfer"); // transfer | history | stock

  // Transfer form
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [trRemarks, setTrRemarks] = useState("");
  const [trItems, setTrItems] = useState([]); // [{itemId, name, quantity}]
  const [submitting, setSubmitting] = useState(false);

  // Stock filter
  const [stockStoreFilter, setStockStoreFilter] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  // History filters
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [histFromStore, setHistFromStore] = useState("");
  const [histToStore, setHistToStore] = useState("");
  const [histSearch, setHistSearch] = useState("");

  const canManage = hasPermission(PERMISSIONS.POS_MANAGE);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeList, itemList, transferList, stockData] = await Promise.all([
        getAllStores(), getAllStoreItems(), getAllStockTransfers(), getStockOverview(),
      ]);
      setStores(storeList || []);
      setItems(itemList || []);
      setTransfers(transferList || []);
      setStockOverview(stockData || []);
      if (storeList?.length >= 2) {
        if (!fromStoreId) setFromStoreId(storeList[0].id);
        if (!toStoreId) setToStoreId(storeList[1]?.id || storeList[0].id);
      }
    } catch { message.error("Failed to load data"); }
    setLoading(false);
  };

  const addTrItem = (item) => {
    if (trItems.find((t) => t.itemId === item.id)) return;
    setTrItems([...trItems, { itemId: item.id, name: item.name, quantity: 1 }]);
  };

  const updateTrQty = (itemId, qty) => {
    if (qty <= 0) { setTrItems(trItems.filter((t) => t.itemId !== itemId)); return; }
    setTrItems(trItems.map((t) => t.itemId === itemId ? { ...t, quantity: qty } : t));
  };

  const removeTrItem = (itemId) => setTrItems(trItems.filter((t) => t.itemId !== itemId));

  const handleSubmit = async () => {
    if (!fromStoreId || !toStoreId) { message.error("Select both stores"); return; }
    if (fromStoreId === toStoreId) { message.error("From and To stores must be different"); return; }
    if (trItems.length === 0) { message.error("Add items to transfer"); return; }
    setSubmitting(true);
    try {
      await createStockTransfer({
        fromStoreId,
        toStoreId,
        remarks: trRemarks || undefined,
        items: trItems.map((t) => ({ itemId: t.itemId, quantity: t.quantity })),
      });
      message.success("Stock transferred!");
      setTrItems([]);
      setTrRemarks("");
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Transfer failed"); }
    setSubmitting(false);
  };

  const filteredStock = stockOverview.filter((s) => {
    if (stockStoreFilter && s.storeId !== stockStoreFilter) return false;
    if (stockSearch && !(s.item?.name || "").toLowerCase().includes(stockSearch.toLowerCase())) return false;
    return true;
  });

  const filteredTransfers = transfers.filter((tr) => {
    if (histSearch && !(tr.remarks || "").toLowerCase().includes(histSearch.toLowerCase()) && !(tr.fromStore?.name || "").toLowerCase().includes(histSearch.toLowerCase()) && !(tr.toStore?.name || "").toLowerCase().includes(histSearch.toLowerCase())) return false;
    if (histFromStore && tr.fromStoreId !== histFromStore) return false;
    if (histToStore && tr.toStoreId !== histToStore) return false;
    if (histDateFrom) {
      const d = new Date(tr.createdAt).toISOString().slice(0, 10);
      if (d < histDateFrom) return false;
    }
    if (histDateTo) {
      const d = new Date(tr.createdAt).toISOString().slice(0, 10);
      if (d > histDateTo) return false;
    }
    return true;
  });

  const exportTransfers = () => {
    exportToCSV(filteredTransfers, [
      { key: (r) => new Date(r.createdAt).toLocaleDateString("en-IN"), label: "Date" },
      { key: (r) => r.fromStore?.name || "", label: "From Store" },
      { key: (r) => r.toStore?.name || "", label: "To Store" },
      { key: (r) => r.transferItems?.length || 0, label: "Items Count" },
      { key: "remarks", label: "Remarks" },
    ], "stock_transfers");
  };

  const exportStock = () => {
    exportToCSV(filteredStock, [
      { key: (r) => r.item?.name || "", label: "Item" },
      { key: (r) => r.store?.name || "", label: "Store" },
      { key: "quantity", label: "Quantity" },
      { key: (r) => r.item?.reorderLevel || "", label: "Reorder Level" },
      { key: (r) => r.quantity <= (r.item?.reorderLevel || 0) ? "Low Stock" : "OK", label: "Status" },
    ], "stock_overview");
  };

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span></div>);
  }

  return (
    <div className="space-y-8">
      <div>
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Store</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Stock</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Stock Transfer & Overview</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "transfer", label: "New Transfer", icon: "swap_horiz" },
          { key: "history", label: "Transfer History", icon: "history" },
          { key: "stock", label: "Stock Overview", icon: "inventory" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── NEW TRANSFER ── */}
      {tab === "transfer" && canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
            <h3 className="font-bold text-lg text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">swap_horiz</span>Transfer Details
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">From Store</label>
                <select value={fromStoreId} onChange={(e) => setFromStoreId(e.target.value)}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">To Store</label>
                <select value={toStoreId} onChange={(e) => setToStoreId(e.target.value)}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Remarks</label>
              <input value={trRemarks} onChange={(e) => setTrRemarks(e.target.value)}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
            </div>

            <h4 className="font-bold text-sm text-on-surface mt-5 mb-2">Selected Items</h4>
            {trItems.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4 bg-surface-container-low rounded-xl">Click items to add →</p>
            ) : (
              <div className="space-y-2">
                {trItems.map((t) => (
                  <div key={t.itemId} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low">
                    <p className="flex-1 font-bold text-sm text-on-surface truncate">{t.name}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateTrQty(t.itemId, t.quantity - 1)} className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center"><span className="material-symbols-outlined text-sm">remove</span></button>
                      <input type="number" min={1} value={t.quantity} onChange={(e) => updateTrQty(t.itemId, Number(e.target.value))}
                        className="w-14 text-center text-sm font-bold bg-transparent outline-none" />
                      <button onClick={() => updateTrQty(t.itemId, t.quantity + 1)} className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center"><span className="material-symbols-outlined text-sm">add</span></button>
                    </div>
                    <button onClick={() => removeTrItem(t.itemId)} className="text-error/50 hover:text-error"><span className="material-symbols-outlined text-sm">close</span></button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleSubmit} disabled={submitting || trItems.length === 0}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all mt-5">
              <span className="material-symbols-outlined">swap_horiz</span>
              {submitting ? "Transferring..." : "Transfer Stock"}
            </button>
          </div>

          {/* Items to pick */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
            <h3 className="font-bold text-lg text-on-surface mb-3">Available Items</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
              {items.map((item) => (
                <button key={item.id} onClick={() => addTrItem(item)}
                  className={`p-2.5 rounded-xl border border-outline-variant/10 transition-all text-left ${trItems.find((t) => t.itemId === item.id) ? "bg-primary-container/40 border-primary/30" : "bg-surface-container-low hover:bg-primary-container/20"}`}>
                  <p className="font-bold text-xs text-on-surface truncate">{item.name}</p>
                  <p className="text-[10px] text-on-surface-variant">{(item.category || "").replace(/_/g, " ")}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSFER HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={histSearch} onChange={(e) => setHistSearch(e.target.value)} placeholder="Search transfers..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={histFromStore} onChange={(e) => setHistFromStore(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">From: All</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={histToStore} onChange={(e) => setHistToStore(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">To: All</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">From</span>
              <input type="date" value={histDateFrom} onChange={(e) => setHistDateFrom(e.target.value)}
                className="bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">To</span>
              <input type="date" value={histDateTo} onChange={(e) => setHistDateTo(e.target.value)}
                className="bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
            </div>
            <button onClick={exportTransfers} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
          <div className="grid grid-cols-5 px-6 py-3 bg-surface-container-high">
            {["Date", "From", "To", "Items", "Remarks"].map((h) => (
              <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
            ))}
          </div>
          {filteredTransfers.length === 0 ? (
            <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">swap_horiz</span>No transfers found
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {filteredTransfers.map((tr, idx) => (
                <div key={tr.id} className={`grid grid-cols-5 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                  <span className="text-sm text-on-surface-variant">{new Date(tr.createdAt).toLocaleDateString("en-IN")}</span>
                  <span className="text-sm font-bold text-on-surface">{tr.fromStore?.name || "—"}</span>
                  <span className="text-sm font-bold text-on-surface">{tr.toStore?.name || "—"}</span>
                  <span className="text-sm text-on-surface-variant">
                    {tr.items && tr.items.length > 0 ? (
                      <span className="block">
                        {tr.items.map((ti, i) => (
                          <span key={ti.itemId || i} className="inline-block mr-2 mb-1 bg-surface-container-highest rounded px-2 py-0.5 text-xs font-medium text-on-surface-variant border border-outline-variant/10">
                            {ti.item?.name || ti.name || ti.itemId} × {ti.quantity}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </span>
                  <span className="text-sm text-on-surface-variant truncate">{tr.remarks || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── STOCK OVERVIEW ── */}
      {tab === "stock" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <select value={stockStoreFilter} onChange={(e) => setStockStoreFilter(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Stores</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Search items..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button onClick={exportStock} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
            <div className="grid grid-cols-5 px-6 py-3 bg-surface-container-high">
              {["Item", "Store", "Quantity", "Reorder Level", "Status"].map((h) => (
                <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {filteredStock.length === 0 ? (
              <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">inventory</span>No stock data
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {filteredStock.map((s, idx) => {
                  const isLow = s.quantity <= (s.item?.reorderLevel || 0);
                  return (
                    <div key={`${s.storeId}-${s.itemId}`} className={`grid grid-cols-5 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                      <span className="font-bold text-sm text-on-surface">{s.item?.name || "—"}</span>
                      <span className="text-sm text-on-surface-variant">{s.store?.name || "—"}</span>
                      <span className={`font-bold text-sm ${isLow ? "text-error" : "text-on-surface"}`}>{s.quantity}</span>
                      <span className="text-sm text-on-surface-variant">{s.item?.reorderLevel || "—"}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold w-fit ${isLow ? "bg-error-container/30 text-error" : "bg-[#44ddc1]/20 text-[#001813]"}`}>
                        {isLow ? "Low Stock" : "OK"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransferPage;
