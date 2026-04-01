import React, { useEffect, useState } from "react";
import { message, Modal } from "antd";
import {
  getAllStoreItems, createStoreItem, updateStoreItem, deleteStoreItem,
  uploadItemImage, getAllStores, createStore, updateStore,
} from "../pos.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const CATEGORIES = ["STATIONERY","UNIFORM","BOOKS","SANITARY","FURNITURE","ID_CARD","ACCESSORIES","OTHER"];

const StoreItemsPage = () => {
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("items"); // items | stores
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [filterFree, setFilterFree] = useState(""); // "" | "yes" | "no"
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // Item form
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: "", sku: "", category: "STATIONERY", description: "", unit: "pcs", sellingPrice: 0, costPrice: 0, reorderLevel: 5, isFreeEligible: false, freeLimit: 0 });

  // Store form
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState({ name: "", description: "", isMaster: false });

  const canManage = hasPermission(PERMISSIONS.POS_MANAGE);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemList, storeList] = await Promise.all([getAllStoreItems(), getAllStores()]);
      setItems(itemList || []);
      setStores(storeList || []);
    } catch { message.error("Failed to load data"); }
    setLoading(false);
  };

  // ─── ITEMS ─────────────────────────────────────
  const openItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ name: item.name, sku: item.sku || "", category: item.category || "STATIONERY", description: item.description || "", unit: item.unit || "pcs", sellingPrice: item.sellingPrice || 0, costPrice: item.costPrice || 0, reorderLevel: item.reorderLevel || 5, isFreeEligible: item.isFreeEligible || false, freeLimit: item.freeLimit || 0 });
    } else {
      setEditingItem(null);
      setItemForm({ name: "", sku: "", category: "STATIONERY", description: "", unit: "pcs", sellingPrice: 0, costPrice: 0, reorderLevel: 5, isFreeEligible: false, freeLimit: 0 });
    }
    setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) { message.error("Item name is required"); return; }
    try {
      if (editingItem) {
        await updateStoreItem(editingItem.id, itemForm);
        message.success("Item updated");
      } else {
        await createStoreItem(itemForm);
        message.success("Item created");
      }
      setShowItemModal(false);
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to save item"); }
  };

  const handleDeleteItem = (item) => {
    Modal.confirm({
      title: "Delete Item?",
      content: `Are you sure you want to delete "${item.name}"?`,
      okText: "Delete", okButtonProps: { danger: true },
      onOk: async () => {
        try { await deleteStoreItem(item.id); message.success("Item deleted"); loadData(); }
        catch (err) { message.error(err?.response?.data?.message || "Failed to delete"); }
      },
    });
  };

  const handleImageUpload = async (itemId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadItemImage(itemId, file); message.success("Image uploaded"); loadData(); }
    catch { message.error("Upload failed"); }
  };

  // ─── STORES ────────────────────────────────────
  const openStoreModal = (store = null) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({ name: store.name, description: store.description || "", isMaster: store.isMaster || false });
    } else {
      setEditingStore(null);
      setStoreForm({ name: "", description: "", isMaster: false });
    }
    setShowStoreModal(true);
  };

  const saveStore = async () => {
    if (!storeForm.name.trim()) { message.error("Store name is required"); return; }
    try {
      if (editingStore) {
        await updateStore(editingStore.id, storeForm);
        message.success("Store updated");
      } else {
        await createStore(storeForm);
        message.success("Store created");
      }
      setShowStoreModal(false);
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to save store"); }
  };

  // ─── FILTER ────────────────────────────────────
  const filteredItems = items.filter((i) => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !(i.sku || "").toLowerCase().includes(search.toLowerCase()) && !(i.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterFree === "yes" && !i.isFreeEligible) return false;
    if (filterFree === "no" && i.isFreeEligible) return false;
    if (priceRange.min !== "" && (i.sellingPrice || 0) < Number(priceRange.min)) return false;
    if (priceRange.max !== "" && (i.sellingPrice || 0) > Number(priceRange.max)) return false;
    return true;
  });

  const exportItems = () => {
    exportToCSV(filteredItems, [
      { key: "name", label: "Item Name" },
      { key: "sku", label: "SKU" },
      { key: (r) => (r.category || "").replace(/_/g, " "), label: "Category" },
      { key: "sellingPrice", label: "Selling Price" },
      { key: "costPrice", label: "Cost Price" },
      { key: "unit", label: "Unit" },
      { key: "reorderLevel", label: "Reorder Level" },
      { key: (r) => r.isFreeEligible ? "Yes" : "No", label: "Free Eligible" },
      { key: "freeLimit", label: "Free Limit" },
      { key: "description", label: "Description" },
    ], "store_items");
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
          <span className="text-primary font-bold">Items & Stores</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
          Store Items & Outlets
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: "items", label: "Items Catalog", icon: "inventory_2" }, { key: "stores", label: "Stores / Outlets", icon: "storefront" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === "items" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
            <select value={filterFree} onChange={(e) => setFilterFree(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Items</option>
              <option value="yes">Free Eligible</option>
              <option value="no">Not Free Eligible</option>
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min={0} placeholder="Min ₹" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="w-24 bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
              <span className="text-on-surface-variant text-xs">–</span>
              <input type="number" min={0} placeholder="Max ₹" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                className="w-24 bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
            </div>
            <button onClick={exportItems} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
            {canManage && (
              <button onClick={() => openItemModal()} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
                <span className="material-symbols-outlined text-lg">add</span>Add Item
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
            <div className="grid grid-cols-7 px-6 py-3 bg-surface-container-high">
              {["Item Name", "SKU", "Category", "Sell Price", "Cost Price", "Reorder Lv", "Actions"].map((h) => (
                <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {filteredItems.length === 0 ? (
              <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">inventory_2</span>No items found
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {filteredItems.map((item, idx) => (
                  <div key={item.id} className={`grid grid-cols-7 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img src={`${import.meta.env.VITE_API_URL || ""}/${item.image}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-lg">inventory_2</span>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-on-surface">{item.name}</p>
                        {item.isFreeEligible && <span className="text-[10px] bg-[#44ddc1]/20 text-[#001813] px-2 py-0.5 rounded-full font-bold">Free: {item.freeLimit}/teacher</span>}
                      </div>
                    </div>
                    <span className="text-sm text-on-surface-variant font-mono">{item.sku || "—"}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-bold w-fit">{(item.category || "").replace(/_/g, " ")}</span>
                    <span className="font-bold text-sm text-primary">{fmt(item.sellingPrice)}</span>
                    <span className="text-sm text-on-surface-variant">{fmt(item.costPrice)}</span>
                    <span className="text-sm text-on-surface-variant">{item.reorderLevel}</span>
                    <div className="flex gap-2">
                      {canManage && (
                        <>
                          <button onClick={() => openItemModal(item)} className="w-8 h-8 rounded-lg bg-primary-container/30 flex items-center justify-center hover:bg-primary-container/60 transition-colors">
                            <span className="material-symbols-outlined text-primary text-sm">edit</span>
                          </button>
                          <label className="w-8 h-8 rounded-lg bg-secondary-container/30 flex items-center justify-center hover:bg-secondary-container/60 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-secondary text-sm">image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(item.id, e)} />
                          </label>
                          <button onClick={() => handleDeleteItem(item)} className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center hover:bg-error-container/60 transition-colors">
                            <span className="material-symbols-outlined text-error text-sm">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STORES TAB ── */}
      {tab === "stores" && (
        <div className="space-y-5">
          {canManage && (
            <button onClick={() => openStoreModal()} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>Add Store
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map((store) => (
              <div key={store.id} className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.04)] relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${store.isMaster ? "bg-primary-container/40" : "bg-secondary-container/30"}`}>
                    <span className={`material-symbols-outlined text-2xl ${store.isMaster ? "text-primary" : "text-secondary"}`}>
                      {store.isMaster ? "warehouse" : "storefront"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-on-surface">{store.name}</h4>
                    <p className="text-xs text-on-surface-variant">{store.isMaster ? "Master Warehouse" : "Retail Outlet"}</p>
                  </div>
                </div>
                {store.description && <p className="text-sm text-on-surface-variant mb-3">{store.description}</p>}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${store.isActive !== false ? "bg-[#44ddc1]/20 text-[#001813]" : "bg-error-container/30 text-error"}`}>
                    {store.isActive !== false ? "Active" : "Inactive"}
                  </span>
                  {canManage && (
                    <button onClick={() => openStoreModal(store)} className="ml-auto text-primary hover:underline text-sm font-bold">Edit</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ITEM MODAL ── */}
      <Modal open={showItemModal} title={editingItem ? "Edit Item" : "New Item"} onCancel={() => setShowItemModal(false)} onOk={saveItem} okText="Save" width={600}>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Name *</label>
            <input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">SKU</label>
            <input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Category</label>
            <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Selling Price</label>
            <input type="number" min={0} value={itemForm.sellingPrice} onChange={(e) => setItemForm({ ...itemForm, sellingPrice: Number(e.target.value) })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Cost Price</label>
            <input type="number" min={0} value={itemForm.costPrice} onChange={(e) => setItemForm({ ...itemForm, costPrice: Number(e.target.value) })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Unit</label>
            <input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Reorder Level</label>
            <input type="number" min={0} value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Description</label>
            <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={2}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 resize-none" />
          </div>
          <div className="col-span-2 flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={itemForm.isFreeEligible} onChange={(e) => setItemForm({ ...itemForm, isFreeEligible: e.target.checked })} className="rounded" />
              <span className="text-sm font-bold text-on-surface">Free for Teachers</span>
            </label>
            {itemForm.isFreeEligible && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant">Limit per teacher:</span>
                <input type="number" min={0} value={itemForm.freeLimit} onChange={(e) => setItemForm({ ...itemForm, freeLimit: Number(e.target.value) })}
                  className="w-20 bg-surface-container-high rounded-lg py-1.5 px-3 text-sm border-none outline-none" />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── STORE MODAL ── */}
      <Modal open={showStoreModal} title={editingStore ? "Edit Store" : "New Store"} onCancel={() => setShowStoreModal(false)} onOk={saveStore} okText="Save" width={480}>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Store Name *</label>
            <input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase">Description</label>
            <textarea value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} rows={2}
              className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={storeForm.isMaster} onChange={(e) => setStoreForm({ ...storeForm, isMaster: e.target.checked })} className="rounded" disabled={!!editingStore} />
            <span className="text-sm font-bold text-on-surface">Master Warehouse</span>
          </label>
          {editingStore && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={storeForm.isActive !== false} onChange={(e) => setStoreForm({ ...storeForm, isActive: e.target.checked })} className="rounded" />
              <span className="text-sm font-bold text-on-surface">Active</span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StoreItemsPage;
