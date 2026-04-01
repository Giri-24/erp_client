import React, { useEffect, useState } from "react";
import { message } from "antd";
import { createPosTransaction, getAllPosTransactions } from "../pos.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";
import { exportToCSV } from "../exportCsv";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const TYPES = ["INCOME", "EXPENSE"];
const CATEGORIES = ["SALE", "PURCHASE", "MAINTENANCE", "OTHER"];

const IncomeExpensePage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("list"); // list | add

  // Form
  const [form, setForm] = useState({ type: "INCOME", category: "OTHER", description: "", amount: 0, date: new Date().toISOString().slice(0, 10), referenceId: "", remarks: "" });
  const [submitting, setSubmitting] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const canManage = hasPermission(PERMISSIONS.POS_MANAGE);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllPosTransactions({ type: filterType || undefined, from: filterFrom || undefined, to: filterTo || undefined });
      setTransactions(data || []);
    } catch { message.error("Failed to load transactions"); }
    setLoading(false);
  };

  useEffect(() => { if (tab === "list") loadData(); }, [filterType, filterFrom, filterTo]);

  const displayedTransactions = transactions.filter((t) => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!(t.description || "").toLowerCase().includes(q) && !(t.referenceId || "").toLowerCase().includes(q) && !(t.remarks || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const exportTransactions = () => {
    exportToCSV(displayedTransactions, [
      { key: (r) => r.date ? new Date(r.date).toLocaleDateString("en-IN") : "", label: "Date" },
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount" },
      { key: "referenceId", label: "Reference ID" },
      { key: "remarks", label: "Remarks" },
    ], "income_expenses");
  };

  const handleSubmit = async () => {
    if (!form.description.trim()) { message.error("Description is required"); return; }
    if (!form.amount || form.amount <= 0) { message.error("Amount must be positive"); return; }
    setSubmitting(true);
    try {
      await createPosTransaction({ ...form, amount: Number(form.amount) });
      message.success("Transaction recorded!");
      setForm({ type: "INCOME", category: "OTHER", description: "", amount: 0, date: new Date().toISOString().slice(0, 10), referenceId: "", remarks: "" });
      setTab("list");
      loadData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to save"); }
    setSubmitting(false);
  };

  const totalIncome = displayedTransactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = displayedTransactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + (t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  if (loading && tab === "list") {
    return (<div className="flex items-center justify-center py-20"><span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span></div>);
  }

  return (
    <div className="space-y-8">
      <div>
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Store</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Transactions</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Income & Expenses</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "Total Income", value: totalIncome, icon: "trending_up", color: "text-[#44ddc1]", bg: "bg-[#44ddc1]/10" },
          { label: "Total Expense", value: totalExpense, icon: "trending_down", color: "text-error", bg: "bg-error-container/30" },
          { label: "Net Balance", value: netBalance, icon: "account_balance", color: netBalance >= 0 ? "text-primary" : "text-error", bg: "bg-primary-container/30" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(1,29,53,0.04)] flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-2xl ${card.color}`}>{card.icon}</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-bold uppercase">{card.label}</p>
              <p className={`font-extrabold text-2xl ${card.color}`}>{fmt(card.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "list", label: "Transactions", icon: "receipt_long" },
          { key: "add", label: "Add Transaction", icon: "add_circle" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === t.key ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── LIST ── */}
      {tab === "list" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none appearance-none">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
              <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Search description / reference..."
                className="w-full bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm border-none outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">From</span>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">To</span>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                className="bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none" />
            </div>
            <button onClick={exportTransactions} className="bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-lg">download</span>Export CSV
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.04)] overflow-hidden">
            <div className="grid grid-cols-6 px-6 py-3 bg-surface-container-high">
              {["Date", "Type", "Category", "Description", "Amount", "Remarks"].map((h) => (
                <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {displayedTransactions.length === 0 ? (
              <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">receipt_long</span>No transactions found
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {displayedTransactions.map((t, idx) => (
                  <div key={t.id} className={`grid grid-cols-6 px-6 py-4 items-center ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/30"}`}>
                    <span className="text-sm text-on-surface-variant">{t.date ? new Date(t.date).toLocaleDateString("en-IN") : "—"}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold w-fit ${t.type === "INCOME" ? "bg-[#44ddc1]/20 text-[#001813]" : "bg-error-container/30 text-error"}`}>
                      {t.type}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-bold w-fit">{t.category}</span>
                    <span className="text-sm text-on-surface font-bold truncate">{t.description}</span>
                    <span className={`font-bold text-sm ${t.type === "INCOME" ? "text-[#44ddc1]" : "text-error"}`}>
                      {t.type === "INCOME" ? "+" : "−"}{fmt(t.amount)}
                    </span>
                    <span className="text-xs text-on-surface-variant truncate">{t.remarks || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD ── */}
      {tab === "add" && canManage && (
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.04)] space-y-4">
            <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_circle</span>New Transaction
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Type *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 appearance-none">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Description *</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" placeholder="What is this transaction for?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Amount *</label>
                <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Reference ID</label>
              <input value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1" placeholder="Invoice / receipt number" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase">Remarks</label>
              <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                className="w-full bg-surface-container-high rounded-xl py-2.5 px-4 text-sm border-none outline-none mt-1 resize-none" />
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all">
              <span className="material-symbols-outlined">save</span>
              {submitting ? "Saving..." : "Record Transaction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeExpensePage;
