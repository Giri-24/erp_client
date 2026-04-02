import React, { useEffect, useState, useMemo } from "react";
import { message } from "antd";
import { getClassWiseSummary, getAcademicYears } from "../fees.service";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const n = Number(v || 0);
  return n === 0 ? "0" : "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 });
};

const fmtRaw = (v) => Number(v || 0).toLocaleString("en-IN");

const STANDARD_LABELS = {
  LKG: "LKG", UKG: "UKG",
  STD_1: "Std I", STD_2: "Std II", STD_3: "Std III", STD_4: "Std IV", STD_5: "Std V",
  STD_6: "Std VI", STD_7: "Std VII", STD_8: "Std VIII", STD_9: "Std IX", STD_10: "Std X",
  STD_11: "Std XI", STD_12: "Std XII",
};

// ── component ─────────────────────────────────────────────────────────────
const ClassFeeSummaryPage = () => {
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAcademicYears().then((years) => {
      setAcademicYearOptions(years || []);
      if ((years || []).length > 0 && !years.includes(academicYear)) setAcademicYear(years[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!academicYear) return;
    setLoading(true);
    getClassWiseSummary(academicYear)
      .then(setData)
      .catch(() => message.error("Failed to load class summary"))
      .finally(() => setLoading(false));
  }, [academicYear]);

  const rows = data?.rows || [];
  const gt = data?.grandTotal || {};

  const collectionPct = gt.totalFee > 0
    ? Math.round(((gt.totalPaid + gt.totalDiscount) / gt.totalFee) * 100)
    : 0;

  const exportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a3");
    doc.setFontSize(14);
    doc.text(`Class-wise Fee Summary — ${academicYear}`, 14, 15);
    const head = [["Standard", "Students", "Tuition", "Transport", "Book", "Hostel", "Other", "Custom", "Total", "Discount", "Paid + Disc", "Outstanding"]];
    const body = rows.map((r) => [
      STANDARD_LABELS[r.standard] || r.standard,
      r.studentCount,
      fmtRaw(r.tuitionFee), fmtRaw(r.transportFee), fmtRaw(r.bookFee),
      fmtRaw(r.hostelFee), fmtRaw(r.otherFee), fmtRaw(r.customItemsTotal),
      fmtRaw(r.totalFee), fmtRaw(r.totalDiscount),
      fmtRaw(r.totalPaid + r.totalDiscount), fmtRaw(r.netOutstanding),
    ]);
    body.push([
      "TOTAL", gt.studentCount || 0,
      fmtRaw(gt.tuitionFee), fmtRaw(gt.transportFee), fmtRaw(gt.bookFee),
      fmtRaw(gt.hostelFee), fmtRaw(gt.otherFee), fmtRaw(gt.customItemsTotal),
      fmtRaw(gt.totalFee), fmtRaw(gt.totalDiscount),
      fmtRaw((gt.totalPaid || 0) + (gt.totalDiscount || 0)), fmtRaw(gt.netOutstanding),
    ]);
    doc.autoTable({ head, body, startY: 22, styles: { fontSize: 8 }, headStyles: { fillColor: [0, 21, 42] } });
    doc.save(`class-fee-summary-${academicYear}.pdf`);
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
            <span className="text-primary font-bold">Class Summary</span>
          </nav>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Class-wise Fee Summary
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Aggregated fee breakdown by standard — tuition, transport, books, custom items with collection and outstanding.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
              className="appearance-none bg-white border-none rounded-xl px-5 py-2.5 pr-10 text-sm font-bold text-primary shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
              {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
          </div>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span> Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { icon: "school", label: "Total Students", value: gt.studentCount || 0, bg: "bg-primary-fixed", ic: "text-on-primary-fixed", isCurrency: false },
          { icon: "account_balance", label: "Total Fee", value: gt.totalFee || 0, bg: "bg-secondary-container", ic: "text-secondary", isCurrency: true },
          { icon: "sell", label: "Discount", value: gt.totalDiscount || 0, bg: "bg-[#44ddc1]/20", ic: "text-[#001813]", isCurrency: true },
          { icon: "check_circle", label: "Collected", value: (gt.totalPaid || 0) + (gt.totalDiscount || 0), bg: "bg-primary-container/30", ic: "text-primary", isCurrency: true },
          { icon: "warning", label: "Outstanding", value: gt.netOutstanding || 0, bg: "bg-error-container/50", ic: "text-error", isCurrency: true },
        ].map(({ icon, label, value, bg, ic, isCurrency }) => (
          <div key={label} className="bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] flex items-center gap-3 relative overflow-hidden">
            <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined ${ic} text-xl`}>{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
              <p className="text-lg font-black text-primary">{isCurrency ? fmt(value) : value.toLocaleString("en-IN")}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Collection bar */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-on-surface-variant">Collection Progress</span>
          <span className="text-sm font-black text-primary">{collectionPct}%</span>
        </div>
        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${collectionPct}%`,
            background: collectionPct >= 80 ? 'linear-gradient(to right, #44ddc1, #00a28c)' : collectionPct >= 50 ? 'linear-gradient(to right, #f59e0b, #d97706)' : 'linear-gradient(to right, #ef4444, #dc2626)',
          }} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-spin block mb-2">refresh</span>
            Loading summary...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Standard</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Students</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Tuition</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Transport</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Book</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Hostel</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Other</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Custom</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-primary uppercase tracking-widest text-right">Total</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-[#44ddc1] uppercase tracking-widest text-right">Discount</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Paid + Disc</th>
                  <th className="py-3.5 px-5 text-[10px] font-bold text-error uppercase tracking-widest text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">analytics</span>
                      <p className="text-sm font-medium">No fee data for this academic year</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map((r, idx) => {
                      const paidDisc = r.totalPaid + r.totalDiscount;
                      const pct = r.totalFee > 0 ? Math.round((paidDisc / r.totalFee) * 100) : 0;
                      return (
                        <tr key={r.standard} className={`hover:bg-surface-container-low/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/20"}`}>
                          <td className="py-4 px-5">
                            <span className="font-bold text-sm text-primary">{STANDARD_LABELS[r.standard] || r.standard}</span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="bg-primary-container/20 px-3 py-1 rounded-full text-xs font-bold text-primary">{r.studentCount}</span>
                          </td>
                          <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.tuitionFee)}</td>
                          <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.transportFee)}</td>
                          <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.bookFee)}</td>
                          <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.hostelFee)}</td>
                          <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.otherFee)}</td>
                          <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.customItemsTotal)}</td>
                          <td className="py-4 px-5 text-right text-sm font-extrabold text-primary">{fmt(r.totalFee)}</td>
                          <td className="py-4 px-5 text-right text-sm font-bold text-[#001813]">{fmt(r.totalDiscount)}</td>
                          <td className="py-4 px-5 text-right">
                            <div>
                              <span className="text-sm font-bold">{fmt(paidDisc)}</span>
                              <div className="w-full h-1.5 bg-surface-container-high rounded-full mt-1">
                                <div className="h-full rounded-full" style={{
                                  width: `${pct}%`,
                                  background: pct >= 80 ? '#44ddc1' : pct >= 50 ? '#f59e0b' : '#ef4444',
                                }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <span className={`text-sm font-bold ${r.netOutstanding > 0 ? "text-error" : "text-[#001813]"}`}>
                              {fmt(r.netOutstanding)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Grand total row */}
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td className="py-4 px-5 font-extrabold text-primary text-sm">TOTAL</td>
                      <td className="py-4 px-5 text-center font-extrabold text-primary">{gt.studentCount || 0}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.tuitionFee)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.transportFee)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.bookFee)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.hostelFee)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.otherFee)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.customItemsTotal)}</td>
                      <td className="py-4 px-5 text-right font-black text-primary text-sm">{fmt(gt.totalFee)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-[#001813] text-sm">{fmt(gt.totalDiscount)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt((gt.totalPaid || 0) + (gt.totalDiscount || 0))}</td>
                      <td className="py-4 px-5 text-right font-black text-error text-sm">{fmt(gt.netOutstanding)}</td>
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

export default ClassFeeSummaryPage;
