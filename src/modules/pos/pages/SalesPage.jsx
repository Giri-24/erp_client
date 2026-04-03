import React, { useEffect, useState, useCallback } from "react";
import { message, Modal } from "antd";
import {
  getAllStoreItems, getAllStores, createSale, getAllSales,
} from "../pos.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const CUSTOMER_TYPES = ["WALK_IN", "STUDENT", "STAFF"];
const PAYMENT_MODES = ["CASH", "UPI", "CARD"];

const SalesPage = () => {
  const { hasPermission } = usePermissionHelpers();
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("new"); // new | history

  // New sale form
  const [storeId, setStoreId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerType, setCustomerType] = useState("WALK_IN");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [discount, setDiscount] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [cart, setCart] = useState([]); // [{itemId, name, quantity, unitPrice, maxStock}]
  const [searchItem, setSearchItem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sale detail modal
  const [selectedSale, setSelectedSale] = useState(null);

  // History filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyStore, setHistoryStore] = useState("");
  const [historyCustomerType, setHistoryCustomerType] = useState("");
  const [historyPaymentMode, setHistoryPaymentMode] = useState("");

  const canSell = hasPermission(PERMISSIONS.POS_SELL);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeList, itemList, salesList] = await Promise.all([getAllStores(), getAllStoreItems(), getAllSales()]);
      setStores(storeList || []);
      setItems(itemList || []);
      setSales(salesList || []);
      if (storeList?.length && !storeId) setStoreId(storeList[0].id);
    } catch { message.error("Failed to load data"); }
    setLoading(false);
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c.itemId === item.id);
    if (existing) {
      setCart(cart.map((c) => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { itemId: item.id, name: item.name, quantity: 1, unitPrice: item.sellingPrice || 0 }]);
    }
  };

  const updateCartQty = (itemId, qty) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.itemId !== itemId));
    } else {
      setCart(cart.map((c) => c.itemId === itemId ? { ...c, quantity: qty } : c));
    }
  };

  const updateCartPrice = (itemId, price) => {
    setCart(cart.map((c) => c.itemId === itemId ? { ...c, unitPrice: price } : c));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((c) => c.itemId !== itemId));
  };

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);
  const total = subtotal - (discount || 0);

  const handleSubmit = async () => {
    if (!storeId) { message.error("Select a store"); return; }
    if (cart.length === 0) { message.error("Add items to cart"); return; }
    setSubmitting(true);
    try {
      await createSale({
        storeId,
        customerName: customerName || undefined,
        customerType,
        paymentMode,
        discount: discount || 0,
        remarks: remarks || undefined,
        items: cart.map((c) => ({ itemId: c.itemId, quantity: c.quantity, unitPrice: c.unitPrice })),
      });
      message.success("Sale recorded!");
      setCart([]);
      setCustomerName("");
      setDiscount(0);
      setRemarks("");
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to create sale"); }
    setSubmitting(false);
  };

  const filteredItems = items.filter((i) => {
    if (!searchItem) return true;
    return i.name.toLowerCase().includes(searchItem.toLowerCase()) || (i.sku || "").toLowerCase().includes(searchItem.toLowerCase());
  });

  const filteredSales = sales.filter((s) => {
    if (historySearch) {
      const q = historySearch.toLowerCase();
      const match = (s.invoiceNo || "").toLowerCase().includes(q) || (s.customerName || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    if (historyStore && s.storeId !== historyStore) return false;
    if (historyCustomerType && s.customerType !== historyCustomerType) return false;
    if (historyPaymentMode && s.paymentMode !== historyPaymentMode) return false;
    if (historyDateFrom) {
      const d = new Date(s.createdAt).toISOString().slice(0, 10);
      if (d < historyDateFrom) return false;
    }
    if (historyDateTo) {
      const d = new Date(s.createdAt).toISOString().slice(0, 10);
      if (d > historyDateTo) return false;
    }
    return true;
  });

  const exportSales = () => {
    exportToCSV(filteredSales, [
      { key: "invoiceNo", label: "Invoice #" },
      { key: (r) => new Date(r.createdAt).toLocaleDateString("en-IN"), label: "Date" },
      { key: (r) => r.customerName || "Walk-in", label: "Customer" },
      { key: (r) => (r.customerType || "").replace(/_/g, " "), label: "Customer Type" },
      { key: (r) => r.store?.name || "", label: "Store" },
      { key: (r) => r.saleItems?.length || 0, label: "Items" },
      { key: "discount", label: "Discount" },
      { key: "totalAmount", label: "Total" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "remarks", label: "Remarks" },
    ], "sales_history");
  };

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span></div>);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Store</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Sales</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Point of Sale</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: "new", label: "New Sale", icon: "point_of_sale" }, { key: "history", label: "Sales History", icon: "receipt_long" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── NEW SALE ── */}
      {tab === "new" && canSell && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left - item picker */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
              <div className="flex gap-3 mb-4">
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
                  className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
                  <input value={searchItem} onChange={(e) => setSearchItem(e.target.value)} placeholder="Search items..."
                    className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {filteredItems.map((item) => (
                  <button key={item.id} onClick={() => addToCart(item)}
                    className="p-3 rounded-xl bg-surface-container-low hover:bg-primary-container/30 border border-outline-variant/10 transition-all text-left">
                    <div className="flex items-center gap-2 mb-1">
                      {item.image ? (
                        <img src={`${import.meta.env.VITE_API_URL || ""}/${item.image}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary-container/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-sm">inventory_2</span>
                        </div>
                      )}
                      <p className="font-bold text-xs text-on-surface truncate">{item.name}</p>
                    </div>
                    <p className="font-bold text-primary text-sm">{fmt(item.sellingPrice)}</p>
                    <p className="text-[10px] text-on-surface-variant">{(item.category || "").replace(/_/g, " ")}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right - cart & checkout */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
              <h3 className="font-bold text-lg text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_cart</span>Cart ({cart.length})
              </h3>
              {cart.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-6">No items in cart</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.itemId} className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-on-surface truncate">{c.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{fmt(c.unitPrice)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCartQty(c.itemId, c.quantity - 1)} className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-error-container/30 transition-colors">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input type="number" value={c.quantity} onChange={(e) => updateCartQty(c.itemId, Number(e.target.value))} min={1}
                          className="w-10 text-center text-sm font-bold bg-transparent outline-none" />
                        <button onClick={() => updateCartQty(c.itemId, c.quantity + 1)} className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary-container/30 transition-colors">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <p className="font-bold text-sm text-primary w-16 text-right">{fmt(c.quantity * c.unitPrice)}</p>
                      <button onClick={() => removeFromCart(c.itemId)} className="text-error/50 hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-outline-variant/10 mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Subtotal</span><span className="font-bold">{fmt(subtotal)}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Discount</span>
                  <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-24 bg-surface-container-high rounded-lg py-1.5 px-3 text-sm text-right border-none outline-none" />
                </div>
                <div className="flex justify-between text-lg"><span className="font-bold text-on-surface">Total</span><span className="font-extrabold text-primary">{fmt(total)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)] space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Customer Name</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" placeholder="Walk-in customer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Type</label>
                  <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                    {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Payment</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                    {PAYMENT_MODES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Remarks</label>
                <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
              </div>
              <button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all mt-2">
                <span className="material-symbols-outlined">point_of_sale</span>
                {submitting ? "Processing..." : `Complete Sale — ${fmt(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SALES HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search invoice / customer..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={historyStore} onChange={(e) => setHistoryStore(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Stores</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={historyCustomerType} onChange={(e) => setHistoryCustomerType(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Customers</option>
              {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <select value={historyPaymentMode} onChange={(e) => setHistoryPaymentMode(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Payments</option>
              {PAYMENT_MODES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">From</span>
              <input type="date" value={historyDateFrom} onChange={(e) => setHistoryDateFrom(e.target.value)}
                className="bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">To</span>
              <input type="date" value={historyDateTo} onChange={(e) => setHistoryDateTo(e.target.value)}
                className="bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
            </div>
            <button onClick={exportSales} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
          <div className="grid grid-cols-7 px-6 py-3 bg-surface-container-high">
            {["Invoice #", "Date", "Customer", "Items", "Total", "Payment", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
            ))}
          </div>
          {filteredSales.length === 0 ? (
            <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">receipt_long</span>No sales found
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {filteredSales.map((sale, idx) => (
                <div key={sale.id} className={`grid grid-cols-7 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                  <span className="font-mono text-sm font-bold text-on-surface">{sale.invoiceNo || "—"}</span>
                  <span className="text-sm text-on-surface-variant">{new Date(sale.createdAt).toLocaleDateString("en-IN")}</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{sale.customerName || "Walk-in"}</p>
                    <p className="text-[10px] text-on-surface-variant">{(sale.customerType || "").replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-sm text-on-surface-variant">{sale.saleItems?.length || 0} items</span>
                  <span className="font-bold text-sm text-primary">{fmt(sale.totalAmount)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold w-fit ${sale.paymentMode === "CASH" ? "bg-[#44ddc1]/20 text-[#001813]" : sale.paymentMode === "UPI" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                    {sale.paymentMode}
                  </span>
                  <button onClick={() => setSelectedSale(sale)} className="text-primary text-xs font-bold hover:underline">View</button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── SALE DETAIL MODAL ── */}
      <Modal open={!!selectedSale} title={`Sale #${selectedSale?.invoiceNo || ""}`} onCancel={() => setSelectedSale(null)} footer={null} width={550}>
        {selectedSale && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-on-surface-variant">Customer:</span><p className="font-bold">{selectedSale.customerName || "Walk-in"}</p></div>
              <div><span className="text-on-surface-variant">Type:</span><p className="font-bold">{(selectedSale.customerType || "").replace(/_/g, " ")}</p></div>
              <div><span className="text-on-surface-variant">Payment:</span><p className="font-bold">{selectedSale.paymentMode}</p></div>
              <div><span className="text-on-surface-variant">Date:</span><p className="font-bold">{new Date(selectedSale.createdAt).toLocaleDateString("en-IN")}</p></div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4">
              <div className="grid grid-cols-4 mb-2">
                {["Item", "Qty", "Price", "Total"].map((h) => (
                  <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase">{h}</span>
                ))}
              </div>
              {(selectedSale.saleItems || []).map((si, i) => (
                <div key={i} className="grid grid-cols-4 py-1.5 border-t border-outline-variant/10">
                  <span className="text-sm font-bold text-on-surface">{si.item?.name || si.itemId}</span>
                  <span className="text-sm text-on-surface-variant">{si.quantity}</span>
                  <span className="text-sm text-on-surface-variant">{fmt(si.unitPrice)}</span>
                  <span className="text-sm font-bold text-primary">{fmt(si.quantity * si.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Discount</span><span className="text-error">{fmt(selectedSale.discount)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-xl">
              <span>Total</span><span className="text-primary">{fmt(selectedSale.totalAmount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesPage;
