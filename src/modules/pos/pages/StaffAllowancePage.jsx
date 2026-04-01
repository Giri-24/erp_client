import React, { useEffect, useState } from "react";
import { message, Modal } from "antd";
import {
  getAllStoreItems, giveTeacherFreeItem, returnTeacherFreeItem, getTeacherFreeItems, getTeacherFreeItemSummary,
} from "../pos.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";

const StaffAllowancePage = () => {
  const [items, setItems] = useState([]);
  const [freeItems, setFreeItems] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("give"); // give | records | summary

  // Give form
  const [giveForm, setGiveForm] = useState({ staffId: "", itemId: "", academicYear: new Date().getFullYear().toString(), quantity: 1 });
  const [submitting, setSubmitting] = useState(false);

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItem, setReturnItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);

  // Records filters
  const [recSearch, setRecSearch] = useState("");
  const [recItemFilter, setRecItemFilter] = useState("");
  const [recYearFilter, setRecYearFilter] = useState("");
  const [recStatusFilter, setRecStatusFilter] = useState(""); // "" | "outstanding" | "returned"

  // Summary filter
  const [summaryStaffId, setSummaryStaffId] = useState("");
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear().toString());

  const canManage = hasPermission(PERMISSIONS.POS_MANAGE);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemList, freeList] = await Promise.all([getAllStoreItems(), getTeacherFreeItems()]);
      setItems(itemList || []);
      setFreeItems(freeList || []);
    } catch { message.error("Failed to load data"); }
    setLoading(false);
  };

  const freeEligibleItems = items.filter((i) => i.isFreeEligible);

  const handleGive = async () => {
    if (!giveForm.staffId.trim()) { message.error("Enter staff ID"); return; }
    if (!giveForm.itemId) { message.error("Select an item"); return; }
    setSubmitting(true);
    try {
      await giveTeacherFreeItem(giveForm);
      message.success("Item given to staff!");
      setGiveForm({ ...giveForm, staffId: "", itemId: "", quantity: 1 });
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to give item"); }
    setSubmitting(false);
  };

  const openReturnModal = (fi) => {
    setReturnItem(fi);
    setReturnQty(1);
    setShowReturnModal(true);
  };

  const handleReturn = async () => {
    if (!returnItem) return;
    try {
      await returnTeacherFreeItem({ teacherFreeItemId: returnItem.id, quantity: returnQty, returnedDate: new Date().toISOString().slice(0, 10) });
      message.success("Item returned");
      setShowReturnModal(false);
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Return failed"); }
  };

  const loadSummary = async () => {
    if (!summaryStaffId.trim()) { message.error("Enter staff ID"); return; }
    try {
      const data = await getTeacherFreeItemSummary(summaryStaffId, summaryYear);
      setSummary(data || []);
    } catch { message.error("Failed to load summary"); }
  };

  const filteredRecords = freeItems.filter((fi) => {
    if (recSearch) {
      const q = recSearch.toLowerCase();
      if (!(fi.staff?.name || fi.staffId || "").toLowerCase().includes(q) && !(fi.item?.name || "").toLowerCase().includes(q)) return false;
    }
    if (recItemFilter && fi.itemId !== recItemFilter) return false;
    if (recYearFilter && fi.academicYear !== recYearFilter) return false;
    if (recStatusFilter === "outstanding" && (fi.quantity || 0) - (fi.returnedQuantity || 0) <= 0) return false;
    if (recStatusFilter === "returned" && (fi.quantity || 0) - (fi.returnedQuantity || 0) > 0) return false;
    return true;
  });

  const uniqueYears = [...new Set(freeItems.map((fi) => fi.academicYear).filter(Boolean))].sort().reverse();

  const exportRecords = () => {
    exportToCSV(filteredRecords, [
      { key: (r) => r.staff?.name || r.staffId, label: "Staff" },
      { key: (r) => r.item?.name || r.itemId, label: "Item" },
      { key: "quantity", label: "Qty Given" },
      { key: (r) => r.returnedQuantity || 0, label: "Qty Returned" },
      { key: (r) => (r.quantity || 0) - (r.returnedQuantity || 0), label: "Outstanding" },
      { key: "academicYear", label: "Year" },
      { key: (r) => new Date(r.createdAt).toLocaleDateString("en-IN"), label: "Date" },
    ], "staff_allowance_records");
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
          <span className="text-primary font-bold">Staff Allowance</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Teacher Free Items</h2>
      </div>

      <div className="flex gap-2">
        {[
          { key: "give", label: "Give Item", icon: "redeem" },
          { key: "records", label: "Records", icon: "list_alt" },
          { key: "summary", label: "Staff Summary", icon: "summarize" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── GIVE ── */}
      {tab === "give" && canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.04)] space-y-4">
            <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">redeem</span>Give Free Item
            </h3>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Staff ID *</label>
              <input value={giveForm.staffId} onChange={(e) => setGiveForm({ ...giveForm, staffId: e.target.value })}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" placeholder="Enter staff ID" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Item *</label>
              <select value={giveForm.itemId} onChange={(e) => setGiveForm({ ...giveForm, itemId: e.target.value })}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                <option value="">Select item...</option>
                {freeEligibleItems.map((i) => <option key={i.id} value={i.id}>{i.name} (limit: {i.freeLimit})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Quantity</label>
                <input type="number" min={1} value={giveForm.quantity} onChange={(e) => setGiveForm({ ...giveForm, quantity: Number(e.target.value) })}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Academic Year</label>
                <input value={giveForm.academicYear} onChange={(e) => setGiveForm({ ...giveForm, academicYear: e.target.value })}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
              </div>
            </div>
            <button onClick={handleGive} disabled={submitting}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all">
              <span className="material-symbols-outlined">redeem</span>
              {submitting ? "Processing..." : "Give Item"}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
            <h3 className="font-bold text-lg text-on-surface mb-4">Eligible Items</h3>
            <div className="space-y-3">
              {freeEligibleItems.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">No items marked as free-eligible</p>
              ) : freeEligibleItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">redeem</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-on-surface">{item.name}</p>
                    <p className="text-[10px] text-on-surface-variant">{(item.category || "").replace(/_/g, " ")}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#44ddc1]/20 text-[#001813] text-xs font-bold">
                    Limit: {item.freeLimit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDS ── */}
      {tab === "records" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={recSearch} onChange={(e) => setRecSearch(e.target.value)} placeholder="Search staff / item..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={recItemFilter} onChange={(e) => setRecItemFilter(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Items</option>
              {freeEligibleItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <select value={recYearFilter} onChange={(e) => setRecYearFilter(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Years</option>
              {uniqueYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={recStatusFilter} onChange={(e) => setRecStatusFilter(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Status</option>
              <option value="outstanding">Outstanding</option>
              <option value="returned">Fully Returned</option>
            </select>
            <button onClick={exportRecords} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
          <div className="grid grid-cols-7 px-6 py-3 bg-surface-container-high">
            {["Staff", "Item", "Qty Given", "Qty Returned", "Year", "Date", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
            ))}
          </div>
          {filteredRecords.length === 0 ? (
            <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">redeem</span>No records found
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {filteredRecords.map((fi, idx) => {
                const returned = fi.returnedQuantity || 0;
                const remaining = (fi.quantity || 0) - returned;
                return (
                  <div key={fi.id} className={`grid grid-cols-7 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                    <span className="text-sm font-bold text-on-surface">{fi.staff?.name || fi.staffId}</span>
                    <span className="text-sm text-on-surface-variant">{fi.item?.name || fi.itemId}</span>
                    <span className="text-sm font-bold text-on-surface">{fi.quantity}</span>
                    <span className={`text-sm font-bold ${returned > 0 ? "text-[#44ddc1]" : "text-on-surface-variant"}`}>{returned}</span>
                    <span className="text-sm text-on-surface-variant">{fi.academicYear}</span>
                    <span className="text-sm text-on-surface-variant">{new Date(fi.createdAt).toLocaleDateString("en-IN")}</span>
                    <div>
                      {canManage && remaining > 0 && (
                        <button onClick={() => openReturnModal(fi)} className="text-primary text-xs font-bold hover:underline">Return</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {tab === "summary" && (
        <div className="space-y-5">
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Staff ID</label>
              <input value={summaryStaffId} onChange={(e) => setSummaryStaffId(e.target.value)}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" placeholder="Enter staff ID" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Year</label>
              <input value={summaryYear} onChange={(e) => setSummaryYear(e.target.value)}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
            </div>
            <button onClick={loadSummary} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-lg">search</span>Get Summary
            </button>
          </div>
          {summary.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.map((s, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">redeem</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{s.item?.name || s.itemName || "—"}</h4>
                      <p className="text-[10px] text-on-surface-variant">Limit: {s.freeLimit || "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surface-container-low rounded-xl p-2">
                      <p className="font-extrabold text-lg text-primary">{s.totalGiven || 0}</p>
                      <p className="text-[10px] text-on-surface-variant">Given</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-2">
                      <p className="font-extrabold text-lg text-[#44ddc1]">{s.totalReturned || 0}</p>
                      <p className="text-[10px] text-on-surface-variant">Returned</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-2">
                      <p className="font-extrabold text-lg text-error">{s.remaining || 0}</p>
                      <p className="text-[10px] text-on-surface-variant">Remaining</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RETURN MODAL ── */}
      <Modal open={showReturnModal} title="Return Item" onCancel={() => setShowReturnModal(false)} onOk={handleReturn} okText="Return" width={400}>
        {returnItem && (
          <div className="space-y-3 mt-4">
            <p className="text-sm"><span className="text-on-surface-variant">Item:</span> <span className="font-bold">{returnItem.item?.name || "—"}</span></p>
            <p className="text-sm"><span className="text-on-surface-variant">Staff:</span> <span className="font-bold">{returnItem.staff?.name || returnItem.staffId}</span></p>
            <p className="text-sm"><span className="text-on-surface-variant">Outstanding:</span> <span className="font-bold">{(returnItem.quantity || 0) - (returnItem.returnedQuantity || 0)}</span></p>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Return Quantity</label>
              <input type="number" min={1} max={(returnItem.quantity || 0) - (returnItem.returnedQuantity || 0)} value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffAllowancePage;
