import React from "react";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const ITEM_CATEGORIES = ["STATIONERY", "UNIFORM", "BOOKS", "SANITARY", "FURNITURE", "ID_CARD", "ACCESSORIES", "OTHER"];

const ItemsStoreView = ({
  mode,
  tab,
  setTab,
  showTabRow = true,
  items,
  filteredItems,
  stores,
  filteredStores,
  search,
  onSearchChange,
  searchStore,
  onSearchStoreChange,
  storeId,
  selectedStoreId,
  onSelectStore,
  suppliers,
  supplierId,
  onSupplierChange,
  filterCategory,
  onFilterCategoryChange,
  filterFree,
  onFilterFreeChange,
  priceRange,
  onPriceRangeChange,
  onExportItems,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUploadItemImage,
  onAddStore,
  onEditStore,
  onAddPurchaseItem,
  canManage,
}) => {
  const isItemsView = mode === "purchase" ? tab !== "stores" : tab === "items";

  return (
    <div className="space-y-5">
      {showTabRow && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "items", label: "Items Catalog", icon: "inventory_2" },
            { key: "stores", label: "Stores / Outlets", icon: "storefront" },
          ].map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
              <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      )}

      {isItemsView && (
        <>
          {mode === "purchase" && tab === "new" ? (
            <>
              <div className="flex gap-3 mb-4 flex-wrap">
                <select value={storeId} onChange={(e) => onSelectStore?.(e.target.value)}
                  className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={supplierId} onChange={(e) => onSupplierChange?.(e.target.value)}
                  className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
                  <option value="">No Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
                  <input value={search} onChange={(e) => onSearchChange?.(e.target.value)} placeholder="Search items..."
                    className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[350px] overflow-y-auto pr-1">
                {filteredItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => onAddPurchaseItem?.(item)}
                    className="p-2.5 rounded-xl bg-surface-container-low hover:bg-primary-container/30 border border-outline-variant/10 transition-all text-left">
                    <p className="font-bold text-xs text-on-surface truncate">{item.name}</p>
                    <p className="text-[10px] text-on-surface-variant">{fmt(item.costPrice)}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
                  <input value={search} onChange={(e) => onSearchChange?.(e.target.value)} placeholder="Search items..."
                    className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <select value={filterCategory} onChange={(e) => onFilterCategoryChange?.(e.target.value)}
                  className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
                  <option value="">All Categories</option>
                  {[
                    "STATIONERY","UNIFORM","BOOKS","SANITARY","FURNITURE","ID_CARD","ACCESSORIES","OTHER",
                  ].map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <select value={filterFree} onChange={(e) => onFilterFreeChange?.(e.target.value)}
                  className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
                  <option value="">All Items</option>
                  <option value="yes">Free Eligible</option>
                  <option value="no">Not Free Eligible</option>
                </select>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} placeholder="Min ₹" value={priceRange.min} onChange={(e) => onPriceRangeChange?.({ ...priceRange, min: e.target.value })}
                    className="w-24 bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
                  <span className="text-on-surface-variant text-xs">–</span>
                  <input type="number" min={0} placeholder="Max ₹" value={priceRange.max} onChange={(e) => onPriceRangeChange?.({ ...priceRange, max: e.target.value })}
                    className="w-24 bg-surface-container-high rounded-xl py-2.5 px-3 text-sm border-none outline-none" />
                </div>
                {onExportItems && (
                  <button onClick={onExportItems} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
                    <span className="material-symbols-outlined text-lg">download</span>Export CSV
                  </button>
                )}
                {canManage && onAddItem && (
                  <button onClick={onAddItem} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
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
                            <img src={`${"/erp/api"}/${item.image}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
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
                              <button onClick={() => onEditItem?.(item)} className="w-8 h-8 rounded-lg bg-primary-container/30 flex items-center justify-center hover:bg-primary-container/60 transition-colors">
                                <span className="material-symbols-outlined text-primary text-sm">edit</span>
                              </button>
                              <label className="w-8 h-8 rounded-lg bg-secondary-container/30 flex items-center justify-center hover:bg-secondary-container/60 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-secondary text-sm">image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => onUploadItemImage?.(item.id, e)} />
                              </label>
                              <button onClick={() => onDeleteItem?.(item)} className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center hover:bg-error-container/60 transition-colors">
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
            </>
          )}
        </>
      )}

      {tab === "stores" && (
        <div className="space-y-5">
          {mode === "management" && canManage && onAddStore && (
            <button onClick={onAddStore} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>Add Store
            </button>
          )}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={searchStore} onChange={(e) => onSearchStoreChange?.(e.target.value)} placeholder="Search outlets..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {mode === "purchase" && tab === "new" && (
              <div className="text-sm text-on-surface-variant">
                <span className="font-bold text-on-surface">Selected Outlet:</span>
                <span className="block mt-1 text-primary">{stores.find((s) => s.id === selectedStoreId)?.name || "None"}</span>
              </div>
            )}
          </div>
          {mode === "purchase" && tab === "new" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
              {filteredStores.length === 0 ? (
                <div className="col-span-full text-center py-12 text-on-surface-variant text-sm">
                  <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">storefront</span>
                  No outlets found
                </div>
              ) : filteredStores.map((store) => (
                <button key={store.id} type="button" onClick={() => onSelectStore?.(store.id)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all ${store.id === selectedStoreId ? "border-primary bg-primary/10 shadow-sm" : "border-outline-variant/10 bg-surface-container-low hover:border-primary"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${store.isMaster ? "bg-primary-container/30" : "bg-secondary-container/30"}`}>
                      <span className={`material-symbols-outlined text-2xl ${store.isMaster ? "text-primary" : "text-secondary"}`}>
                        {store.isMaster ? "warehouse" : "storefront"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{store.name}</p>
                      <p className="text-xs text-on-surface-variant">{store.isMaster ? "Master Warehouse" : "Retail Outlet"}</p>
                    </div>
                  </div>
                  {store.description && <p className="text-sm text-on-surface-variant mb-3">{store.description}</p>}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${store.isActive !== false ? "bg-[#44ddc1]/20 text-[#001813]" : "bg-error-container/30 text-error"}`}>
                      {store.isActive !== false ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-on-surface-variant">Click to select</span>
                  </div>
                  {mode === "management" && canManage && onEditStore && (
                    <button onClick={(e) => { e.stopPropagation(); onEditStore?.(store); }} className="mt-3 text-primary hover:underline text-sm font-bold">Edit</button>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredStores.length === 0 ? (
                <div className="col-span-full text-center py-12 text-on-surface-variant text-sm">
                  <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">storefront</span>
                  No outlets found
                </div>
              ) : filteredStores.map((store) => (
                <div key={store.id} className="w-full text-left rounded-2xl p-4 border border-outline-variant/10 bg-surface-container-low">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${store.isMaster ? "bg-primary-container/30" : "bg-secondary-container/30"}`}>
                      <span className={`material-symbols-outlined text-2xl ${store.isMaster ? "text-primary" : "text-secondary"}`}>
                        {store.isMaster ? "warehouse" : "storefront"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{store.name}</p>
                      <p className="text-xs text-on-surface-variant">{store.isMaster ? "Master Warehouse" : "Retail Outlet"}</p>
                    </div>
                  </div>
                  {store.description && <p className="text-sm text-on-surface-variant mb-3">{store.description}</p>}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${store.isActive !== false ? "bg-[#44ddc1]/20 text-[#001813]" : "bg-error-container/30 text-error"}`}>
                      {store.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {canManage && onEditStore && (
                    <button onClick={() => onEditStore?.(store)} className="mt-3 text-primary hover:underline text-sm font-bold">Edit</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemsStoreView;
