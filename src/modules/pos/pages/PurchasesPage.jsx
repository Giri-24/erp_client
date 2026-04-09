import React, { useEffect, useState } from "react";
import { message, Modal } from "antd";
import {
  getAllStoreItems, getAllStores, 
  createPurchase, getAllPurchases,
  getAllSuppliers, createSupplier, updateSupplier, deleteSupplier,
  uploadPurchaseReceipt,
} from "../pos.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";
import ItemsStoreView from "../components/ItemsStoreView";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const PurchasesPage = ({ onNavigate }) => {
  const { hasPermission } = usePermissionHelpers();
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("items"); // new | items | stores | suppliers

  // New purchase form
  const [storeId, setStoreId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [prRemarks, setPrRemarks] = useState("");
  const [prItems, setPrItems] = useState([]); // [{itemId, name, quantity, unitPrice}]
  const [searchItem, setSearchItem] = useState("");
  const [searchStore, setSearchStore] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterFree, setFilterFree] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [submitting, setSubmitting] = useState(false);

  // Supplier modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "", gstNo: "" });

  // Purchase detail
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // History filters
  const [histSearch, setHistSearch] = useState("");
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [histStore, setHistStore] = useState("");
  const [histSupplier, setHistSupplier] = useState("");

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState("");

  const canManage = hasPermission(PERMISSIONS.POS_PURCHASE);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeList, itemList, purchaseList, supplierList] = await Promise.all([getAllStores(), getAllStoreItems(), getAllPurchases(), getAllSuppliers()]);
      setStores(storeList || []);
      setItems(itemList || []);
      setPurchases(purchaseList || []);
      setSuppliers(supplierList || []);
      if (storeList?.length && !storeId) setStoreId(storeList[0].id);
    } catch { message.error("Failed to load data"); }
    setLoading(false);
  };

  // ─── PURCHASE ITEMS ─────────────────────────────
  const addPrItem = (item) => {
    const existing = prItems.find((p) => p.itemId === item.id);
    if (existing) {
      setPrItems(prItems.map((p) => p.itemId === item.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setPrItems([...prItems, { itemId: item.id, name: item.name, quantity: 1, unitPrice: item.costPrice || 0 }]);
    }
  };

  const updatePrItem = (itemId, field, value) => {
    setPrItems(prItems.map((p) => p.itemId === itemId ? { ...p, [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value } : p));
  };

  const removePrItem = (itemId) => setPrItems(prItems.filter((p) => p.itemId !== itemId));

  const prTotal = prItems.reduce((s, p) => s + p.quantity * p.unitPrice, 0);

  const handleSubmitPurchase = async () => {
    if (!storeId) { message.error("Select a store"); return; }
    if (prItems.length === 0) { message.error("Add items"); return; }
    setSubmitting(true);
    try {
      await createPurchase({
        storeId,
        supplierId: supplierId || undefined,
        invoiceNo: invoiceNo || undefined,
        invoiceDate: invoiceDate || undefined,
        remarks: prRemarks || undefined,
        items: prItems.map((p) => ({ itemId: p.itemId, quantity: p.quantity, unitPrice: p.unitPrice })),
      });
      message.success("Purchase recorded!");
      setPrItems([]);
      setInvoiceNo("");
      setPrRemarks("");
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to create purchase"); }
    setSubmitting(false);
  };

  // ─── SUPPLIERS ──────────────────────────────────
  const openSupplierModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({ name: supplier.name, phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "", gstNo: supplier.gstNo || "" });
    } else {
      setEditingSupplier(null);
      setSupplierForm({ name: "", phone: "", email: "", address: "", gstNo: "" });
    }
    setShowSupplierModal(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) { message.error("Supplier name is required"); return; }
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierForm);
        message.success("Supplier updated");
      } else {
        await createSupplier(supplierForm);
        message.success("Supplier created");
      }
      setShowSupplierModal(false);
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to save supplier"); }
  };

  const handleDeleteSupplier = (supplier) => {
    Modal.confirm({
      title: "Delete Supplier?",
      content: `Delete "${supplier.name}"?`,
      okText: "Delete", okButtonProps: { danger: true },
      onOk: async () => {
        try { await deleteSupplier(supplier.id); message.success("Deleted"); loadData(); }
        catch { message.error("Delete failed"); }
      },
    });
  };

  const handleReceiptUpload = async (purchaseId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadPurchaseReceipt(purchaseId, file); message.success("Receipt uploaded"); loadData(); }
    catch { message.error("Upload failed"); }
  };

  const filteredItems = items.filter((i) => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (filterFree === "yes" && !i.isFreeEligible) return false;
    if (filterFree === "no" && i.isFreeEligible) return false;
    if (priceRange.min !== "" && (i.sellingPrice || 0) < Number(priceRange.min)) return false;
    if (priceRange.max !== "" && (i.sellingPrice || 0) > Number(priceRange.max)) return false;
    if (!searchItem) return true;
    return i.name.toLowerCase().includes(searchItem.toLowerCase()) || (i.sku || "").toLowerCase().includes(searchItem.toLowerCase());
  });

  const filteredStores = stores.filter((s) => {
    if (!searchStore) return true;
    const q = searchStore.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
  });

  const filteredPurchases = purchases.filter((p) => {
    if (histSearch) {
      const q = histSearch.toLowerCase();
      if (!(p.invoiceNo || "").toLowerCase().includes(q) && !(p.supplier?.name || "").toLowerCase().includes(q)) return false;
    }
    if (histStore && p.storeId !== histStore) return false;
    if (histSupplier && p.supplierId !== histSupplier) return false;
    if (histDateFrom) {
      const d = (p.invoiceDate ? new Date(p.invoiceDate) : new Date(p.createdAt)).toISOString().slice(0, 10);
      if (d < histDateFrom) return false;
    }
    if (histDateTo) {
      const d = (p.invoiceDate ? new Date(p.invoiceDate) : new Date(p.createdAt)).toISOString().slice(0, 10);
      if (d > histDateTo) return false;
    }
    return true;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearch) return true;
    const q = supplierSearch.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.phone || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q) || (s.gstNo || "").toLowerCase().includes(q);
  });

  const exportPurchases = () => {
    exportToCSV(filteredPurchases, [
      { key: "invoiceNo", label: "Invoice #" },
      { key: (r) => r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "", label: "Invoice Date" },
      { key: (r) => r.supplier?.name || "", label: "Supplier" },
      { key: (r) => r.store?.name || "", label: "Store" },
      { key: (r) => r.items?.length || 0, label: "Items" },
      { key: "totalAmount", label: "Total" },
      { key: "remarks", label: "Remarks" },
    ], "purchase_history");
  };

  const exportSuppliers = () => {
    exportToCSV(filteredSuppliers, [
      { key: "name", label: "Supplier Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "gstNo", label: "GST No" },
      { key: "address", label: "Address" },
    ], "suppliers");
  };

  const exportItems = () => {
    exportToCSV(filteredItems, [
      { key: "name", label: "Item Name" },
      { key: "sku", label: "SKU" },
      { key: (r) => (r.category || "").replace(/_/g, " "), label: "Category" },
      { key: "sellingPrice", label: "Sell Price" },
      { key: "costPrice", label: "Cost Price" },
      { key: "reorderLevel", label: "Reorder Level" },
      { key: (r) => r.isFreeEligible ? "Yes" : "No", label: "Free Eligible" },
    ], "purchase_items");
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
          <span className="text-primary font-bold">Purchases</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Purchases & Suppliers</h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "new", label: "New Purchase", icon: "add_shopping_cart" },
          { key: "items", label: "Items Catalog", icon: "inventory_2" },
          { key: "stores", label: "Stores / Outlets", icon: "storefront" },
          { key: "suppliers", label: "Suppliers", icon: "local_shipping" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {(tab === "new" || tab === "items" || tab === "stores") && canManage && (
        <div className={`grid gap-5 ${tab === "new" ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
          <div className={tab === "new" ? "lg:col-span-2" : ""}>
            <ItemsStoreView
              mode="purchase"
              showTabRow={false}
              tab={tab}
              setTab={setTab}
              items={items}
              filteredItems={filteredItems}
              stores={stores}
              filteredStores={filteredStores}
              search={tab === "stores" ? searchStore : searchItem}
              onSearchChange={(value) => {
                if (tab === "stores") setSearchStore(value);
                else setSearchItem(value);
              }}
              searchStore={searchStore}
              onSearchStoreChange={setSearchStore}
              storeId={storeId}
              selectedStoreId={storeId}
              onSelectStore={setStoreId}
              suppliers={suppliers}
              supplierId={supplierId}
              onSupplierChange={setSupplierId}
              filterCategory={filterCategory}
              onFilterCategoryChange={setFilterCategory}
              filterFree={filterFree}
              onFilterFreeChange={setFilterFree}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              onExportItems={exportItems}
              onAddPurchaseItem={addPrItem}
              canManage={canManage}
            />
          </div>

          {tab === "new" && (
            <>
            {/* Cart */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
                <h3 className="font-bold text-lg text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">receipt</span>Purchase Items ({prItems.length})
                </h3>
                {prItems.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">No items added</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {prItems.map((p) => (
                      <div key={p.itemId} className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-on-surface truncate">{p.name}</p>
                        </div>
                        <input type="number" min={1} value={p.quantity} onChange={(e) => updatePrItem(p.itemId, "quantity", e.target.value)}
                          className="w-14 text-center text-sm font-bold bg-surface-container-high rounded-lg py-1 outline-none" />
                        <span className="text-[10px] text-on-surface-variant">×</span>
                        <input type="number" min={0} value={p.unitPrice} onChange={(e) => updatePrItem(p.itemId, "unitPrice", e.target.value)}
                          className="w-20 text-right text-sm bg-surface-container-high rounded-lg py-1 px-2 outline-none" />
                        <button onClick={() => removePrItem(p.itemId)} className="text-error/50 hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-outline-variant/10 mt-4 pt-4 flex justify-between font-extrabold text-lg">
                  <span>Total</span><span className="text-primary">{fmt(prTotal)}</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Invoice No</label>
                    <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Leave empty for auto-generated"
                      className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Invoice Date</label>
                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Remarks</label>
                  <input value={prRemarks} onChange={(e) => setPrRemarks(e.target.value)}
                    className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
                </div>
                <button onClick={handleSubmitPurchase} disabled={submitting || prItems.length === 0}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all">
                  <span className="material-symbols-outlined">save</span>
                  {submitting ? "Saving..." : `Record Purchase — ${fmt(prTotal)}`}
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* ── PURCHASE HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={histSearch} onChange={(e) => setHistSearch(e.target.value)} placeholder="Search invoice / supplier..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={histStore} onChange={(e) => setHistStore(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Stores</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={histSupplier} onChange={(e) => setHistSupplier(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <button onClick={exportPurchases} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
          <div className="grid grid-cols-6 px-6 py-3 bg-surface-container-high">
            {["Invoice #", "Date", "Supplier", "Store", "Total", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
            ))}
          </div>
          {filteredPurchases.length === 0 ? (
            <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">receipt_long</span>No purchases found
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {filteredPurchases.map((pr, idx) => (
                <div key={pr.id} className={`grid grid-cols-6 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                  <span className="font-mono text-sm font-bold text-on-surface">{pr.invoiceNo || "—"}</span>
                  <span className="text-sm text-on-surface-variant">{pr.invoiceDate ? new Date(pr.invoiceDate).toLocaleDateString("en-IN") : "—"}</span>
                  <span className="text-sm text-on-surface-variant">{pr.supplier?.name || "—"}</span>
                  <span className="text-sm text-on-surface-variant">{pr.store?.name || "—"}</span>
                  <span className="font-bold text-sm text-primary">{fmt(pr.totalAmount)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPurchase(pr)} className="text-primary text-xs font-bold hover:underline">View</button>
                    {pr.receiptImage && (
                      <a href={`${import.meta.env.VITE_API_URL || "/erp/api"}/${pr.receiptImage}`} target="_blank" rel="noopener noreferrer" className="text-[#44ddc1] text-xs font-bold hover:underline">Receipt</a>
                    )}
                    {canManage && (
                      <label className="text-secondary text-xs font-bold hover:underline cursor-pointer">
                        {pr.receiptImage ? "Re-upload" : "Upload"}
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleReceiptUpload(pr.id, e)} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── SUPPLIERS ── */}
      {tab === "suppliers" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            {canManage && (
              <button onClick={() => openSupplierModal()} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
                <span className="material-symbols-outlined text-lg">add</span>Add Supplier
              </button>
            )}
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Search suppliers..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button onClick={exportSuppliers} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSuppliers.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">local_shipping</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-lg text-on-surface truncate">{s.name}</h4>
                    {s.phone && <p className="text-xs text-on-surface-variant">{s.phone}</p>}
                  </div>
                </div>
                {s.email && <p className="text-sm text-on-surface-variant mb-1">{s.email}</p>}
                {s.gstNo && <p className="text-xs text-on-surface-variant mb-1">GST: {s.gstNo}</p>}
                {s.address && <p className="text-xs text-on-surface-variant mb-2">{s.address}</p>}
                {canManage && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => openSupplierModal(s)} className="text-primary hover:underline text-sm font-bold">Edit</button>
                    <button onClick={() => handleDeleteSupplier(s)} className="text-error hover:underline text-sm font-bold">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PURCHASE DETAIL MODAL ── */}
      <Modal open={!!selectedPurchase} title={`Purchase ${selectedPurchase?.invoiceNo || ""}`} onCancel={() => setSelectedPurchase(null)} footer={null} width={550}>
        {selectedPurchase && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-on-surface-variant">Supplier:</span><p className="font-bold">{selectedPurchase.supplier?.name || "—"}</p></div>
              <div><span className="text-on-surface-variant">Store:</span><p className="font-bold">{selectedPurchase.store?.name || "—"}</p></div>
              <div><span className="text-on-surface-variant">Invoice Date:</span><p className="font-bold">{selectedPurchase.invoiceDate ? new Date(selectedPurchase.invoiceDate).toLocaleDateString("en-IN") : "—"}</p></div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4">
              <div className="grid grid-cols-4 mb-2">
                {["Item", "Qty", "Cost", "Total"].map((h) => (
                  <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase">{h}</span>
                ))}
              </div>
              {(selectedPurchase.items || []).map((pi, i) => (
                <div key={i} className="grid grid-cols-4 py-1.5 border-t border-outline-variant/10">
                  <span className="text-sm font-bold text-on-surface">{pi.item?.name || pi.itemId}</span>
                  <span className="text-sm text-on-surface-variant">{pi.quantity}</span>
                  <span className="text-sm text-on-surface-variant">{fmt(pi.unitPrice)}</span>
                  <span className="text-sm font-bold text-primary">{fmt(pi.quantity * pi.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-extrabold text-xl">
              <span>Total</span><span className="text-primary">{fmt(selectedPurchase.totalAmount)}</span>
            </div>
            {selectedPurchase.receiptImage && (
              <div className="mt-4 pt-4 border-t border-outline-variant/10">
                <a href={`${import.meta.env.VITE_API_URL || "/erp/api"}/${selectedPurchase.receiptImage}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
                  <span className="material-symbols-outlined text-lg">visibility</span>View Receipt
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── SUPPLIER MODAL ── */}
      <Modal open={showSupplierModal} title={editingSupplier ? "Edit Supplier" : "New Supplier"} onCancel={() => setShowSupplierModal(false)} onOk={saveSupplier} okText="Save" width={500}>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Supplier Name *</label>
            <input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Phone</label>
              <input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Email</label>
              <input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">GST No</label>
            <input value={supplierForm.gstNo} onChange={(e) => setSupplierForm({ ...supplierForm, gstNo: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Address</label>
            <textarea value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} rows={2}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PurchasesPage;
