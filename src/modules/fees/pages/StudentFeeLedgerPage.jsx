import React, { useEffect, useState, useMemo } from "react";
import { message } from "antd";
import { getMultiYearLedger } from "../fees.service";
import jsPDF from "jspdf";
import "jspdf-autotable";



// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const n = Number(v || 0);
  return n === 0 ? "-" : "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 });
};

const fmtRaw = (v) => Number(v || 0).toLocaleString("en-IN");

const STANDARD_LABELS = {
  LKG: "LKG", UKG: "UKG",
  STD_1: "I", STD_2: "II", STD_3: "III", STD_4: "IV", STD_5: "V",
  STD_6: "VI", STD_7: "VII", STD_8: "VIII", STD_9: "IX", STD_10: "X",
  STD_11: "XI", STD_12: "XII",
};

// ── component ─────────────────────────────────────────────────────────────
const StudentFeeLedgerPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState("");

  


  const [sectionFilter, setSectionFilter] = useState("");
const [genderFilter, setGenderFilter] = useState("");
const [areaFilter, setAreaFilter] = useState("");
const [admissionFilter, setAdmissionFilter] = useState("");



  useEffect(() => {
    setLoading(true);
    getMultiYearLedger()
      .then(setData)
      .catch(() => message.error("Failed to load ledger"))
      .finally(() => setLoading(false));
  }, []);

  const years = data?.academicYears || [];

  const filtered = useMemo(() => {
    if (!data?.students) return [];
    const q = search.trim().toLowerCase();
    return data.students.filter((s) => {
      if (standardFilter && s.student?.standard !== standardFilter) return false;
      if (q && !(s.student?.name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, standardFilter]);

  const standardOptions = useMemo(() => {
    if (!data?.students) return [];
    return Array.from(new Set(data.students.map((s) => s.student?.standard).filter(Boolean))).sort();
  }, [data]);

  // grand totals
  const grandTotals = useMemo(() => {
    const totals = { yearTotals: {}, total: 0, discount: 0, balance: 0 };
    for (const s of filtered) {
      for (const y of years) {
        const yd = s.yearData[y];
        if (yd) {
          totals.yearTotals[y] = (totals.yearTotals[y] || 0) + (yd.paid || yd.totalFee || 0);
        }
      }
      totals.total += s.grandTotal;
      totals.discount += s.grandDiscount;
      totals.balance += s.grandBalance;
    }
    return totals;
  }, [filtered, years]);

  const exportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a3");
    doc.setFontSize(14);
    doc.text("Student Fee Ledger — All Academic Years", 14, 15);
    const head = [["#", "Student Name", "Std", ...years, "Total", "Discount", "Balance"]];
    const body = filtered.map((s, i) => [
      i + 1,
      s.student?.name || "—",
      STANDARD_LABELS[s.student?.standard] || s.student?.standard || "—",
      ...years.map((y) => {
        const yd = s.yearData[y];
        return yd ? fmtRaw(yd.paid || yd.totalFee) : "-";
      }),
      fmtRaw(s.grandTotal),
      fmtRaw(s.grandDiscount),
      fmtRaw(s.grandBalance),
    ]);
    doc.autoTable({ head, body, startY: 22, styles: { fontSize: 7 }, headStyles: { fillColor: [0, 21, 42] } });
    doc.save("student-fee-ledger.pdf");
  };

  const exportCSV = () => {
    const headers = ["#", "Student Name", "Standard", ...years, "Total", "Discount", "Balance"];
    const rows = filtered.map((s, i) => [
      i + 1,
      s.student?.name || "—",
      s.student?.standard || "—",
      ...years.map((y) => s.yearData[y]?.paid || s.yearData[y]?.totalFee || 0),
      s.grandTotal,
      s.grandDiscount,
      s.grandBalance,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "student-fee-ledger.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
            <span>Finance</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>Fees</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-bold">Student Ledger</span>
          </nav>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Multi-Year Fee Ledger
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Complete year-wise fee history across all academic sessions — Total, Discount &amp; Balance per student.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 bg-surface-container-high px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-base">download</span> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span> PDF
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: "groups", label: "Students", value: filtered.length, bg: "bg-primary-fixed", ic: "text-on-primary-fixed" },
          { icon: "calendar_month", label: "Academic Years", value: years.length, bg: "bg-secondary-container", ic: "text-secondary" },
          { icon: "account_balance", label: "Total Fees", value: fmt(grandTotals.total), bg: "bg-[#44ddc1]/20", ic: "text-[#001813]" },
          { icon: "warning", label: "Outstanding", value: fmt(grandTotals.balance), bg: "bg-error-container/50", ic: "text-error" },
        ].map(({ icon, label, value, bg, ic }) => (
          <div key={label} className="bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] flex items-center gap-4">
            <div className={`h-11 w-11 rounded-full ${bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined ${ic}`}>{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
              <p className="text-xl font-black text-primary">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      
      {/* Filters - Single Row */}
<div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">

  {/* Search */}
  <div className="relative flex-grow">
    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-base">
      search
    </span>
    <input
      type="text"
      placeholder="Search student name..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none"
    />
  </div>

  {/* Standard */}
  <select
    value={standardFilter}
    onChange={(e) => setStandardFilter(e.target.value)}
    className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
  >
    <option value="">All Standards</option>
    {standardOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  {/* Section */}
  <select
    value={sectionFilter}
    onChange={(e) => setSectionFilter(e.target.value)}
    className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
  >
    <option value="">All Sections</option>
    <option value="A">A</option>
    <option value="B">B</option>
  </select>

</div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-spin block mb-2">refresh</span>
            Loading ledger...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="py-3 px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest sticky left-0 bg-surface-container-low z-10">#</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest sticky left-8 bg-surface-container-low z-10 min-w-[180px]">Student Name</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Std</th>
<th className="py-3 px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center min-w-[80px]">
  Section
</th>                  {years.map((y) => (
                    <th key={y} className="py-3 px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right min-w-[100px]">{y}</th>
                  ))}
                  <th className="py-3 px-4 text-[10px] font-bold text-primary uppercase tracking-widest text-right">Total</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#44ddc1] uppercase tracking-widest text-right">Discount</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-error uppercase tracking-widest text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={years.length + 6} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">receipt_long</span>
                      <p className="text-sm font-medium">No ledger data found</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((s, idx) => (
                      <tr
  key={s.student?.id || idx}
  className={`hover:bg-surface-container-low/30 transition-colors ${
    idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/20"
  }`}
>
  {/* Index */}
  <td className="py-3.5 px-4 text-xs text-on-surface-variant font-medium sticky left-0 bg-inherit z-10">
    {idx + 1}
  </td>

  {/* Student Name */}
  <td className="py-3.5 px-4 sticky left-8 bg-inherit z-10">
    <span className="font-bold text-sm text-primary">
      {s.student?.name || "—"}
    </span>
  </td>

  {/* Standard */}
  <td className="py-3.5 px-4">
    <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-bold">
      {STANDARD_LABELS[s.student?.standard] ||
        s.student?.standard ||
        "—"}
    </span>
  </td>
  {/* ✅ Section (NEW COLUMN) */}
  <td className="py-3.5 px-4 min-w-[80px] text-center">
  <span className="inline-block bg-surface-container-high px-3 py-1 rounded-full text-[10px] font-bold">
    {s.student?.section || "—"}
  </span>
</td>

  {/* Year-wise Fees */}
  {years.map((y) => {
    const yd = s.yearData[y];
    return (
      <td
        key={y}
className="py-3.5 px-4 text-right text-sm font-medium min-w-[100px]"      >
        {yd ? (
          fmt(yd.paid || yd.totalFee)
        ) : (
          <span className="text-on-surface-variant/30">-</span>
        )}
      </td>
    );
  })}

  {/* Total */}
<td className="py-3.5 px-4 text-right text-sm font-bold text-primary min-w-[100px]">
  {fmt(s.grandTotal)}
</td>
  

  {/* Discount */}
 <td className="py-3.5 px-4 text-right text-sm font-bold text-[#001813] min-w-[100px]">
  {s.grandDiscount > 0 ? fmt(s.grandDiscount) : "-"}
</td>

{/* Balance */}
<td className="py-3.5 px-4 text-right text-sm font-bold min-w-[100px]">
  <span
    className={s.grandBalance > 0 ? "text-error" : "text-[#001813]"}
  >
    {s.grandBalance > 0 ? fmt(s.grandBalance) : "-"}
  </span>
</td>
</tr>
                    ))}
                    {/* Grand total row */}
                    <tr className="bg-primary/5 font-black border-t-2 border-primary/20">

  {/* # */}
  <td className="py-4 px-4 sticky left-0 bg-primary/5 z-10" />

  {/* Name */}
  <td className="py-4 px-4 sticky left-8 bg-primary/5 z-10 text-primary font-extrabold text-sm min-w-[180px]">
  
    GRAND TOTAL
  </td>

  {/* Std */}
  <td className="py-4 px-4" />

  {/* ✅ Section (IMPORTANT SHIFT FIX) */}
  <td className="py-4 px-4 min-w-[80px]" />

  {/* Year columns */}
  {years.map((y) => (
    <td
      key={y}
      className="py-4 px-4 text-right text-sm font-extrabold text-primary min-w-[100px]"
    >
      {grandTotals.yearTotals[y] ? fmt(grandTotals.yearTotals[y]) : "-"}
    </td>
  ))}

  {/* Total */}
  <td className="py-4 px-4 text-right text-sm font-extrabold text-primary min-w-[100px]">
    {fmt(grandTotals.total)}
  </td>

  {/* Discount */}
  <td className="py-4 px-4 text-right text-sm font-extrabold text-[#001813] min-w-[100px]">
    {fmt(grandTotals.discount)}
  </td>

  {/* Balance */}
  <td className="py-4 px-4 text-right text-sm font-extrabold text-error min-w-[100px]">
    {fmt(grandTotals.balance)}
  </td>

</tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFeeLedgerPage;
