import React, { useEffect, useState } from "react";
import { message, Select } from "antd";
import {
  getAllFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getAcademicYears,
} from "../fees.service";
import { getAllStoreItems } from "../../pos/pos.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";
import { InputNumber } from "antd";


// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

const STANDARDS = [
  "LKG", "UKG",
  "STD_1", "STD_2", "STD_3", "STD_4", "STD_5",
  "STD_6", "STD_7", "STD_8", "STD_9", "STD_10",
  "STD_11", "STD_12",
];

const STANDARD_LABELS = {
  LKG: "LKG", UKG: "UKG",
  STD_1: "1st standard", STD_2: "2nd standard", STD_3: "3rd standard",
  STD_4: "4th standard", STD_5: "5th standard", STD_6: "6th standard",
  STD_7: "7th standard", STD_8: "8th standard", STD_9: "9th standard",
  STD_10: "10th standard", STD_11: "11th standard", STD_12: "12th standard",
};

const STANDARD_GROUPS = {
  LKG: "Pre-Primary", UKG: "Pre-Primary",
  STD_1: "Primary", STD_2: "Primary", STD_3: "Primary",
  STD_4: "Primary", STD_5: "Primary",
  STD_6: "Middle", STD_7: "Middle", STD_8: "Middle",
  STD_9: "Secondary", STD_10: "Secondary",
  STD_11: "Senior Secondary", STD_12: "Senior Secondary",
};

const GROUP_COLORS = {
  "Pre-Primary": { badge: "bg-[#44ddc1]/20 text-[#001813]", border: "border-l-[#44ddc1]" },
  Primary:       { badge: "bg-secondary-container text-secondary", border: "border-l-secondary" },
  Middle:        { badge: "bg-primary-fixed text-primary", border: "border-l-primary" },
  Secondary:     { badge: "bg-primary-container/30 text-primary", border: "border-l-primary" },
  "Senior Secondary": { badge: "bg-error-container text-error", border: "border-l-error" },
};

const emptyForm = {
  standard: "", academicYear: "", tuitionFee: 0, transportFee: 0,
  bookFee: 0, hostelFee: 0, otherFee: 0, numberOfTerms: 1, customItems: [], terms: [],
  kitItems: [],
  specialClassFee: 0,
  specialClassMonths: 0,
  specialClassTransportFee: 0,
  specialClassTransportMonths: 0,
};

// ── component ─────────────────────────────────────────────────────────────

const FeeStructurePage = () => {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storeItems, setStoreItems] = useState([]);

  // form state
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // detail view
  const [viewStructure, setViewStructure] = useState(null);
  const [showTip, setShowTip] = useState(true);

  // delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);

  // Ref for form scroll
  const formRef = React.useRef(null);

  const { hasPermission } = usePermissionHelpers();
  const canCreate = hasPermission(PERMISSIONS.FEES_STRUCTURE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.FEES_STRUCTURE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.FEES_STRUCTURE_DELETE);

  // ── data ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllFeeStructures();
      setStructures(data || []);
    } catch {
      message.error("Failed to load fee structures");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    getAcademicYears().then((years) => {
      setAcademicYears(years || []);
      if (years && years.length > 0 && !form.academicYear) {
        setField("academicYear", years[0]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getAllStoreItems().then((items) => setStoreItems(items || [])).catch(() => {});
  }, []);

  // ── form helpers ─────────────────────────────────────────────────────────
  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const openEdit = (record) => {
    setEditingId(record.id);
    setForm({
      standard: record.standard,
      academicYear: record.academicYear,
      tuitionFee: record.tuitionFee || 0,
      transportFee: record.transportFee || 0,
      bookFee: record.bookFee || 0,
      hostelFee: record.hostelFee || 0,
      otherFee: record.otherFee || 0,
      numberOfTerms: record.numberOfTerms || 1,
      specialClassFee: record.specialClassFee || 0,
      specialClassMonths: record.specialClassMonths || 0,
      specialClassTransportFee: record.specialClassTransportFee || 0,
      specialClassTransportMonths: record.specialClassTransportMonths || 0,
      customItems: (record.customItems || []).map((c) => ({ name: c.name, amount: c.amount })),
      terms: (record.terms || []).map((t) => ({
        termNumber: t.termNumber,
        termName: t.termName,
        amount: t.amount,
        dueDate: t.dueDate ? t.dueDate.split("T")[0] : "",
      })),
      kitItems: (record.kitItems || []).map((k) => ({ storeItemId: k.storeItemId, quantity: k.quantity || 1, amount: k.amount || 0 })),
    });
    setViewStructure(null);
    // Scroll to form
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const grossTotal = (f) =>
    (f.tuitionFee || 0) + (f.transportFee || 0) + (f.bookFee || 0) +
    (f.hostelFee || 0) + (f.otherFee || 0) +
    ((f.specialClassFee || 0) * (f.specialClassMonths || 0)) +
    ((f.specialClassTransportFee || 0) * (f.specialClassTransportMonths || 0)) +
    (f.customItems || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.standard) { message.error("Please select a standard"); return; }
    if (!form.academicYear) { message.error("Please enter an academic year"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateFeeStructure(editingId, form);
        message.success("Fee structure updated!");
      } else {
        await createFeeStructure(form);
        message.success("Fee structure published!");
      }
      resetForm();
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save fee structure");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteFeeStructure(id);
      message.success("Deleted successfully");
      setDeleteConfirm(null);
      setViewStructure(null);
      fetchData();
    } catch {
      message.error("Failed to delete");
    }
  };

  // ── custom items helpers ─────────────────────────────────────────────────
  const addCustomItem = () =>
    setForm((prev) => ({ ...prev, customItems: [...prev.customItems, { name: "", amount: 0 }] }));

  const updateCustomItem = (idx, key, val) =>
    setForm((prev) => {
      const next = [...prev.customItems];
      next[idx] = { ...next[idx], [key]: val };
      return { ...prev, customItems: next };
    });

  const removeCustomItem = (idx) =>
    setForm((prev) => ({ ...prev, customItems: prev.customItems.filter((_, i) => i !== idx) }));

  // ── kit items helpers ────────────────────────────────────────────────────
  const addKitItem = () =>
    setForm((prev) => ({ ...prev, kitItems: [...prev.kitItems, { storeItemId: "", quantity: 1, amount: 0 }] }));

  const updateKitItem = (idx, key, val) =>
    setForm((prev) => {
      const next = [...prev.kitItems];
      next[idx] = { ...next[idx], [key]: val };
      return { ...prev, kitItems: next };
    });

  const removeKitItem = (idx) =>
    setForm((prev) => ({ ...prev, kitItems: prev.kitItems.filter((_, i) => i !== idx) }));

  // ── render ───────────────────────────────────────────────────────────────
  const recentTwo = [...structures].reverse().slice(0, 4);

  return (
    <div className="space-y-8">
      {/* ── page header ── */}
      <div>
        <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-2 font-medium">
          <span>Fee Management</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Structure Settings</span>
        </div>
        <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight mb-1">
          Fee Structure
        </h2>
        <p className="text-on-surface-variant max-w-2xl text-sm">
          Manage academic year financial structures across all grades. Define core fees, custom levies, and automated scholarship rules from a single interface.
        </p>
      </div>

      {/* ── main grid ── */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* ── LEFT / CENTER (8 cols) ── */}
        <div className="col-span-12 xl:col-span-8 space-y-8">
   <div ref={formRef} className="bg-surface-container-low rounded-2xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined">{editingId ? "edit" : "add"}</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-2xl text-primary">
                    {editingId ? "Edit Fee Structure" : "Create New Fee Structure"}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    {editingId
                      ? "Update the fee structure details below"
                      : "Configure a new standard or specialized course fee plan"}
                  </p>
                </div>
              </div>

              <div className="space-y-7">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider ml-1">
                      Standard *
                    </label>
                    <div className="relative">
                      <select
                        value={form.standard}
                        onChange={(e) => setField("standard", e.target.value)}
                        className="w-full bg-white border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/30 text-sm font-medium outline-none appearance-none"
                      >
                        <option value="">Select Grade</option>
                        {STANDARDS.map((s) => (
                          <option key={s} value={s}>{STANDARD_LABELS[s] || s} ({s})</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">expand_more</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold bg-white text-primary uppercase tracking-wider ml-1">
                      Session / Academic Year *
                    </label>
                    <div className="relative bg-white">
                      <Select
                        showSearch
                        placeholder="Select or enter year (e.g. 2026-2027)"
                        value={form.academicYear || undefined}
                        onChange={(val) => setField("academicYear", val)}
                        onSearch={(val) => setField("academicYear", val)}
                        className="w-full bg-white academic-year-select"
                        bordered={false}
                        options={academicYears.map(year => ({ label: year, value: year }))}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                      <style>{`
                        .academic-year-select .ant-select-selector {
                          background-color: #ffffff !important;
                          border: none !important;
                          border-radius: 0.75rem !important;
                          padding-left: 16px !important;
                          padding-right: 16px !important;
                          height: 48px !important;
                          display: flex !important;
                          align-items: center !important;
                          font-size: 14px !important;
                          font-weight: 500 !important;
                          color: #011d35 !important;
                          box-shadow: none !important;
                        }
                        .academic-year-select.ant-select-focused .ant-select-selector {
                          box-shadow: 0 0 0 2px rgba(1,29,53,0.15) !important;
                        }
                        .academic-year-select .ant-select-selection-placeholder {
                          color: #94a3b8 !important;
                          line-height: normal !important;
                          display: flex !important;
                          align-items: center !important;
                        }
                        .academic-year-select .ant-select-selection-item {
                          color: #011d35 !important;
                          font-weight: 500 !important;
                          line-height: normal !important;
                          display: flex !important;
                          align-items: center !important;
                        }
                        .academic-year-select .ant-select-arrow {
                          color: #64748b !important;
                        }
                        .academic-year-select {
                          width: 100% !important;
                        }
                      `}</style>
                      <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base" style={{zIndex:1}}>expand_more</span>
                    </div>
                  </div>
                </div>


                <div className="space-y-3">
                  <h4 className="font-headline font-bold text-primary flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">receipt_long</span>
                    Core Fee Components
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: "tuitionFee", label: "Tuition Fee", primary: true },
                      { key: "transportFee", label: "Transport" },
                      { key: "hostelFee", label: "Hostel" },
                      { key: "bookFee", label: "Store" },
                    ].map(({ key, label, primary }) => (
                      <div
                        key={key}
                        className={`bg-white p-4 rounded-xl ${primary ? "border-l-4 border-primary" : ""}`}
                      >
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1.5">{label}</p>
                        <div className="relative">
                          <span className="absolute left-0 top-0.5 text-on-surface-variant text-sm font-bold">₹</span>
                          <InputNumber
  min={0}
  disabled={(!canUpdate && editingId) || (!canCreate && !editingId)}
  value={form[key] || 0}
  onChange={(value) => setField(key, value || 0)}
  placeholder="0"
  className="w-full !border-none !bg-transparent text-lg font-bold text-primary focus:!shadow-none"
/>
                        </div>
                      </div>
                    ))}
                  </div>
  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-xl col-span-2">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 font-headline">Special Class</p>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <span className="absolute left-0 top-0.5 text-on-surface-variant text-sm font-bold">₹</span>
                          <InputNumber
                            min={0}
                            disabled={(!canUpdate && editingId) || (!canCreate && !editingId)}
                            value={form.specialClassFee || 0}
                            onChange={(v) => setField("specialClassFee", v || 0)}
                            placeholder="Rate"
                            className="w-full !border-none !bg-transparent text-lg font-bold text-primary focus:!shadow-none"
                          />
                        </div>
                        <span className="text-on-surface-variant font-bold">×</span>
                        <div className="relative w-28">
                          <InputNumber
                            min={0}
                            value={form.specialClassMonths || 0}
                            onChange={(v) => setField("specialClassMonths", v || 0)}
                            placeholder="Months"
                            className="w-full !border-none !bg-transparent text-lg font-bold text-primary focus:!shadow-none"
                          />
                          <span className="text-[10px] text-on-surface-variant absolute -top-4 right-0 uppercase font-bold">Months</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 font-headline tracking-tighter">No. of Terms</p>
                      <InputNumber
                        min={1} max={4}
                        disabled={(!canUpdate && editingId) || (!canCreate && !editingId)}
                        value={form.numberOfTerms}
                        onChange={(v) => setField("numberOfTerms", v || 1)}
                        className="w-full !border-none !bg-transparent text-lg font-bold text-primary focus:!shadow-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 font-headline">Special Class Transport</p>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <span className="absolute left-0 top-0.5 text-on-surface-variant text-sm font-bold">₹</span>
                          <InputNumber
                            min={0}
                            disabled={(!canUpdate && editingId) || (!canCreate && !editingId)}
                            value={form.specialClassTransportFee || 0}
                            onChange={(v) => setField("specialClassTransportFee", v || 0)}
                            placeholder="Rate"
                            className="w-full !border-none !bg-transparent text-lg font-bold text-primary focus:!shadow-none"
                          />
                        </div>
                        <span className="text-on-surface-variant font-bold">×</span>
                        <div className="relative w-28">
                          <InputNumber
                            min={0}
                            value={form.specialClassTransportMonths || 0}
                            onChange={(v) => setField("specialClassTransportMonths", v || 0)}
                            placeholder="Months"
                            className="w-full !border-none !bg-transparent text-lg font-bold text-primary focus:!shadow-none"
                          />
                          <span className="text-[10px] text-on-surface-variant absolute -top-4 right-0 uppercase font-bold">Months</span>
                        </div>
                      </div>
                    </div>
                  </div>

  
                  {form.numberOfTerms > 1 && (
                    <div className="col-span-2 bg-white/50 border border-dashed border-outline-variant rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Custom Term Split</p>
                        <button type="button" onClick={() => {
                          const n = form.numberOfTerms;
                          const total = grossTotal(form);
                          const perTerm = Math.floor(total / n);
                          const remainder = total - perTerm * n;
                          setField("terms", Array.from({ length: n }, (_, i) => ({
                            termNumber: i + 1,
                            termName: form.terms?.[i]?.termName || `Term ${i + 1}`,
                            amount: form.terms?.[i]?.amount || (i === 0 ? perTerm + remainder : perTerm),
                            dueDate: form.terms?.[i]?.dueDate || "",
                          })));
                        }} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                          <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                          Auto-split equally
                        </button>
                      </div>
                      {(form.terms || []).length === 0 ? (
                        <button type="button" onClick={() => {
                          setField("terms", Array.from({ length: form.numberOfTerms }, (_, i) => ({
                            termNumber: i + 1, termName: `Term ${i + 1}`, amount: 0, dueDate: "",
                          })));
                        }} className="w-full flex items-center justify-center gap-2 border border-dashed border-outline-variant rounded-lg py-2.5 text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-all">
                          <span className="material-symbols-outlined text-sm">add</span>
                          Set Custom Term Amounts
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {form.terms.map((t, i) => (
                            <div key={i} className="grid grid-cols-3 gap-2 items-center">
                              <input type="text" value={t.termName}
                                onChange={(e) => {
                                  const next = [...form.terms]; next[i] = { ...next[i], termName: e.target.value };
                                  setField("terms", next);
                                }}
                                placeholder={`Term ${i + 1}`}
                                className="bg-white border-none rounded-lg p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                              <div className="relative">
                                <span className="absolute left-2 top-2.5 text-on-surface-variant text-sm">₹</span>
                                <input type="number" min={0} value={t.amount || ""}
                                  onChange={(e) => {
                                    const next = [...form.terms]; next[i] = { ...next[i], amount: Number(e.target.value) || 0 };
                                    setField("terms", next);
                                  }}
                                  className="w-full bg-white border-none rounded-lg p-2.5 pl-6 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                              </div>
                              <input type="date" value={t.dueDate}
                                onChange={(e) => {
                                  const next = [...form.terms]; next[i] = { ...next[i], dueDate: e.target.value };
                                  setField("terms", next);
                                }}
                                className="bg-white border-none rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>


                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-headline font-bold text-primary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-sm">science</span>
                      Custom Fee Items
                    </h4>
                    <button
                      type="button"
                      onClick={addCustomItem}
                      className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      Add Item
                    </button>
                  </div>

                  {form.customItems.length === 0 ? (
                    <button
                      type="button"
                      onClick={addCustomItem}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-xl py-3 text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add Lab Fee, Sports Fee, etc.
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {form.customItems.map((ci, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 items-center bg-white/60 border border-dashed border-outline-variant px-3 py-2.5 rounded-xl"
                        >
                          <input
                            type="text"
                            placeholder="Item Name (e.g. Sports Fee)"
                            value={ci.name}
                            onChange={(e) => updateCustomItem(idx, "name", e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 outline-none"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-0 top-0.5 text-on-surface-variant text-sm">₹</span>
                            <input
                              type="number" min={0}
                              placeholder="Amount"
                              value={ci.amount || ""}
                              onChange={(e) => updateCustomItem(idx, "amount", Number(e.target.value) || 0)}
                              className="w-full bg-transparent border-none text-sm font-bold text-right pl-4 focus:ring-0 outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomItem(idx)}
                            className="text-error/40 hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Kit Items (POS) ── */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-headline font-bold text-primary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-sm">inventory_2</span>
                      Kit / Book Items (POS)
                    </h4>
                    <button
                      type="button"
                      onClick={addKitItem}
                      className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      Add Kit Item
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant -mt-1">
                    Map POS items (shoes, belt, etc.) to the Books / Kit fee. Total kit value is deducted from book fee balance.
                  </p>

                  {form.kitItems.length === 0 ? (
                    <button
                      type="button"
                      onClick={addKitItem}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-xl py-3 text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add Items like Shoes, Belt, Uniform, etc.
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {form.kitItems.map((ki, idx) => {
                        const item = storeItems.find((s) => s.id === ki.storeItemId);
                        return (
                          <div
                            key={idx}
                            className="flex gap-3 items-center bg-white/60 border border-dashed border-outline-variant px-3 py-2.5 rounded-xl"
                          >
                            <div className="flex-1">
                              <Select
                                showSearch
                                value={ki.storeItemId || undefined}
                                placeholder="Select POS Item"
                                onChange={(val) => {
                                  const selected = storeItems.find((s) => s.id === val);
                                  updateKitItem(idx, "storeItemId", val || "");
                                  if (selected) updateKitItem(idx, "amount", selected.sellingPrice || 0);
                                }}
                                filterOption={(input, option) =>
                                  String(option?.label || "").toLowerCase().includes(String(input || "").toLowerCase())
                                }
                                options={storeItems.map((si) => ({
                                  value: si.id,
                                  label: `${si.name} — ${fmt(si.sellingPrice || 0)}`,
                                }))}
                                className="w-full"
                              />
                            </div>
                            <div className="relative w-16">
                              <input
                                type="number" min={1}
                                placeholder="Qty"
                                value={ki.quantity}
                                onChange={(e) => updateKitItem(idx, "quantity", Number(e.target.value) || 1)}
                                className="w-full bg-transparent border-none text-sm font-bold text-center focus:ring-0 outline-none"
                              />
                            </div>
                            <div className="relative w-24">
                              <span className="absolute left-0 top-0.5 text-on-surface-variant text-sm">₹</span>
                              <input
                                type="number" min={0}
                                placeholder="Amount"
                                value={ki.amount || ""}
                                onChange={(e) => updateKitItem(idx, "amount", Number(e.target.value) || 0)}
                                className="w-full bg-transparent border-none text-sm font-bold text-right pl-4 focus:ring-0 outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeKitItem(idx)}
                              className="text-error/40 hover:text-error transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center bg-primary-fixed/30 rounded-xl px-4 py-2">
                        <span className="text-xs font-bold text-on-surface-variant">Kit Total</span>
                        <span className="text-sm font-extrabold text-primary">
                          {fmt(form.kitItems.reduce((s, k) => s + (Number(k.amount) || 0) * (Number(k.quantity) || 1), 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl px-5 py-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-on-surface-variant">Calculated Annual Total</span>
                  <span className="text-xl font-extrabold text-primary">{fmt(grossTotal(form))}</span>
                </div>


                <div className="flex justify-end gap-3 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-7 py-2.5 rounded-full text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving || (!canCreate && !canUpdate)}
                    onClick={handleSubmit}
                    className="px-10 py-2.5 bg-primary text-white rounded-full font-bold text-sm shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <><span className="material-symbols-outlined text-base animate-spin">refresh</span> Saving...</>
                    ) : (
                      <><span className="material-symbols-outlined text-base">check_circle</span>
                        {editingId ? "Update Structure" : "Publish Structure"}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {/* decorative bg */}
            <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          </div>
          {/* Bento cards: existing structures */}
          {/* {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[0, 1].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 h-52 animate-pulse bg-surface-container-high" />
              ))}
            </div>
          ) : structures.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recentTwo.map((s) => {
                const grp = STANDARD_GROUPS[s.standard] || "Other";
                const colors = GROUP_COLORS[grp] || GROUP_COLORS.Primary;
                const total = grossTotal(s);
                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.05)] relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border-l-4 ${colors.border}`}
                  >
    
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-125 pointer-events-none" />

                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}>
                          {grp}
                        </span>
                        <h3 className="font-headline font-bold text-xl text-primary mt-1.5">
                          {STANDARD_LABELS[s.standard] || s.standard}{" "}
                          <span className="text-sm font-normal text-on-surface-variant">({s.standard})</span>
                        </h3>
                        <p className="text-[10px] text-on-surface-variant">{s.academicYear}</p>
                      </div>
                      <div className="flex gap-1">
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(s)}
                            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(s.id)}
                            className="w-8 h-8 rounded-full hover:bg-error-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-5">
                      {[
                        { label: "Tuition Fee", val: s.tuitionFee },
                        { label: "Transport", val: s.transportFee },
                        { label: "Books", val: s.bookFee },
                        s.hostelFee > 0 && { label: "Hostel", val: s.hostelFee },
                        s.otherFee > 0 && { label: "Other", val: s.otherFee },
                      ].filter(Boolean).map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">{label}</span>
                          <span className="font-bold text-primary">{fmt(val)}</span>
                        </div>
                      ))}
                      {(s.customItems || []).map((ci) => (
                        <div key={ci.id || ci.name} className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">{ci.name}</span>
                          <span className="font-bold text-primary">{fmt(ci.amount)}</span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-surface-container-high flex justify-between">
                        <span className="font-bold text-primary">Annual Total</span>
                        <span className="font-extrabold text-primary text-lg">{fmt(total)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewStructure(s)}
                      className="w-full py-2 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors text-xs font-bold text-primary"
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="bg-white rounded-2xl p-8 text-center text-on-surface-variant shadow-sm">
                <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">receipt_long</span>
                <p className="font-semibold">No fee structures yet</p>
                <p className="text-xs mt-1 opacity-70">Create your first structure below</p>
              </div>
            )
          )} */}

          {/* ── CREATE / EDIT form ── */}
       
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {viewStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewStructure(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                  (GROUP_COLORS[STANDARD_GROUPS[viewStructure.standard]] || GROUP_COLORS.Primary).badge
                }`}>
                  {STANDARD_GROUPS[viewStructure.standard] || "Other"}
                </span>
                <h3 className="font-headline font-bold text-2xl text-primary">
                  {STANDARD_LABELS[viewStructure.standard] || viewStructure.standard}
                </h3>
                <p className="text-sm text-on-surface-variant">{viewStructure.academicYear}</p>
              </div>
              <button onClick={() => setViewStructure(null)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2.5 mb-6">
              {[
                { label: "Tuition Fee", val: viewStructure.tuitionFee },
                { label: "Transport Fee", val: viewStructure.transportFee },
                { label: "Store", val: viewStructure.bookFee },
                { label: "Hostel Fee", val: viewStructure.hostelFee },
                { label: "Special Class", val: (viewStructure.specialClassFee || 0) * (viewStructure.specialClassMonths || 0) },
                { label: "Special Class Transport", val: (viewStructure.specialClassTransportFee || 0) * (viewStructure.specialClassTransportMonths || 0) },
              ].filter((row) => row.val > 0).map(({ label, val }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-bold text-primary">{fmt(val)}</span>
                </div>
              ))}
              {(viewStructure.customItems || []).map((ci, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{ci.name}</span>
                  <span className="font-bold text-primary">{fmt(ci.amount)}</span>
                </div>
              ))}
              {(viewStructure.kitItems || []).length > 0 && (
                <>
                  <div className="pt-2 border-t border-surface-container-high">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Store Items (from POS)</p>
                  </div>
                  {viewStructure.kitItems.map((ki, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{ki.storeItem?.name || "Item"} ×{ki.quantity || 1}</span>
                      <span className="font-bold text-primary">{fmt((ki.amount || 0) * (ki.quantity || 1))}</span>
                    </div>
                  ))}
                </>
              )}
              <div className="pt-3 border-t border-surface-container-high flex justify-between">
                <span className="font-bold text-primary">Annual Total</span>
                <span className="font-extrabold text-primary text-lg">{fmt(grossTotal(viewStructure))}</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {viewStructure.numberOfTerms > 1 ? `${viewStructure.numberOfTerms} Terms` : "Single Term"}
              </p>
            </div>

            <div className="flex gap-3">
              {canUpdate && (
                <button
                  onClick={() => { openEdit(viewStructure); setViewStructure(null); }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-base">edit</span> Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setDeleteConfirm(viewStructure.id)}
                  className="w-12 h-10 rounded-xl bg-error-container flex items-center justify-center text-error hover:bg-error hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm z-10 text-center">
            <div className="w-14 h-14 bg-error-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-error text-2xl">delete_forever</span>
            </div>
            <h4 className="font-headline font-bold text-xl text-primary mb-2">Delete Structure?</h4>
            <p className="text-sm text-on-surface-variant mb-6">
              This will permanently remove this fee structure. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-error text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pro tip (dismissable) ── */}
      {showTip && (
        <div className="fixed bottom-8 right-8 bg-white shadow-[0_20px_40px_rgba(1,29,53,0.1)] rounded-2xl px-5 py-4 flex items-center gap-4 border border-outline-variant/10 max-w-xs z-40">
          <div className="w-10 h-10 bg-[#44ddc1]/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#001813] text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary">Pro Tip</p>
            <p className="text-[11px] text-on-surface-variant leading-tight">
              Edit any structure card directly — changes apply to future fee assignments only.
            </p>
          </div>
          <button onClick={() => setShowTip(false)} className="text-on-surface-variant hover:text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FeeStructurePage;
