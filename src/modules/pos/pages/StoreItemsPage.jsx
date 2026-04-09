import React, { useEffect, useState } from "react";
import { message, Modal } from "antd";
import {
  getAllStoreItems, createStoreItem, updateStoreItem, deleteStoreItem,
  uploadItemImage, getAllStores, createStore, updateStore,
} from "../pos.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";
import ItemsStoreView from "../components/ItemsStoreView";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const CATEGORIES = ["STATIONERY","UNIFORM","BOOKS","SANITARY","FURNITURE","ID_CARD","ACCESSORIES","OTHER"];

const StoreItemsPage = ({ initialTab }) => {
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab || "items"); // items | stores
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [filterFree, setFilterFree] = useState(""); // "" | "yes" | "no"
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

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
      <ItemsStoreView
        mode="management"
        tab={tab}
        setTab={setTab}
        items={items}
        filteredItems={filteredItems}
        stores={stores}
        filteredStores={stores}
        search={search}
        onSearchChange={setSearch}
        filterCategory={filterCategory}
        onFilterCategoryChange={setFilterCategory}
        filterFree={filterFree}
        onFilterFreeChange={setFilterFree}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        onExportItems={exportItems}
        onAddItem={() => openItemModal()}
        onEditItem={openItemModal}
        onDeleteItem={handleDeleteItem}
        onUploadItemImage={handleImageUpload}
        onAddStore={() => openStoreModal()}
        onEditStore={openStoreModal}
        canManage={canManage}
      />

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
