import React, { useEffect, useState } from "react";
import { message } from "antd";
import { getSalaryAbstract } from "../hr.service";
import jsPDF from "jspdf";
import "jspdf-autotable";

const fmt = (v) => {
  const n = Math.round(Number(v || 0));
  return n === 0 ? "0" : "₹" + n.toLocaleString("en-IN");
};
const fmtRaw = (v) => Math.round(Number(v || 0)).toLocaleString("en-IN");

const CATEGORY_LABELS = {
  TEACHING_REGULAR: "TEACHING STAFF - REGULAR",
  TEACHING_TRAINEE: "TEACHING STAFF - TRAINEES",
  NON_TEACHING_REGULAR: "NON - TEACHING STAFF - REGULAR",
  NON_TEACHING_TRAINEE: "NON TEACHING STAFF - TRAINEES",
};

const SalaryAbstractPage = () => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!month) return;
    setLoading(true);
    getSalaryAbstract(month)
      .then(setData)
      .catch(() => message.error("Failed to load salary abstract"))
      .finally(() => setLoading(false));
  }, [month]);

  const rows = data?.rows || [];
  const gt = data?.grandTotal || {};

  const monthLabel = (() => {
    if (!month) return "";
    const [y, m] = month.split("-");
    const names = ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    return `${names[parseInt(m)]} ' ${y}`;
  })();

  const exportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFontSize(16);
    doc.text("P.S.F. MATRIC HR SEC SCHOOL", 148, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(`SALARY ABSTRACT FOR THE MONTH OF ${monthLabel}`, 148, 23, { align: "center" });

    const head = [["", "GROSS", "EXTRA", "TOTAL GROSS", "BASIC", "PF", "ESI", "FIXED ADVANCE", "SALARY ADVANCE", "OTHER ADVANCE", "TAKE HOME"]];
    const body = rows.map((r) => [
      CATEGORY_LABELS[r.category] || r.category,
      fmtRaw(r.grossSalary), fmtRaw(r.extraAllowance), fmtRaw(r.totalGross),
      r.basicSalary > 0 ? fmtRaw(r.basicSalary) : "-",
      r.pfDeduction > 0 ? fmtRaw(r.pfDeduction) : "-",
      r.esiDeduction > 0 ? fmtRaw(r.esiDeduction) : "-",
      r.fixedAdvance > 0 ? fmtRaw(r.fixedAdvance) : "0",
      r.salaryAdvance > 0 ? fmtRaw(r.salaryAdvance) : "0",
      r.otherAdvance > 0 ? fmtRaw(r.otherAdvance) : "0",
      fmtRaw(r.netSalary),
    ]);
    body.push([
      "TOTAL",
      fmtRaw(gt.grossSalary), fmtRaw(gt.extraAllowance), fmtRaw(gt.totalGross),
      fmtRaw(gt.basicSalary), fmtRaw(gt.pfDeduction), fmtRaw(gt.esiDeduction),
      fmtRaw(gt.fixedAdvance), fmtRaw(gt.salaryAdvance), fmtRaw(gt.otherAdvance),
      fmtRaw(gt.netSalary),
    ]);
    doc.autoTable({ head, body, startY: 30, styles: { fontSize: 8 }, headStyles: { fillColor: [0, 21, 42] } });
    doc.save(`salary-abstract-${month}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
            <span>HR</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>Payroll</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-bold">Salary Abstract</span>
          </nav>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Salary Abstract
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Category-wise monthly salary summary — Gross, PF, ESI, Advances, Take Home.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="bg-white border-none rounded-xl px-5 py-2.5 text-sm font-bold text-primary shadow-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <button onClick={exportPDF} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span> Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: "groups", label: "Total Staff", value: gt.staffCount || 0, isCurrency: false, bg: "bg-primary-fixed", ic: "text-on-primary-fixed" },
          { icon: "account_balance", label: "Total Gross", value: gt.totalGross || 0, isCurrency: true, bg: "bg-secondary-container", ic: "text-secondary" },
          { icon: "remove_circle", label: "Total Deductions", value: gt.totalDeductions || 0, isCurrency: true, bg: "bg-error-container/50", ic: "text-error" },
          { icon: "payments", label: "Take Home", value: gt.netSalary || 0, isCurrency: true, bg: "bg-[#44ddc1]/20", ic: "text-[#001813]" },
        ].map(({ icon, label, value, isCurrency, bg, ic }) => (
          <div key={label} className="bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined ${ic} text-xl`}>{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
              <p className="text-lg font-black text-primary">{isCurrency ? fmt(value) : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider">
            Salary Abstract for the Month of {monthLabel}
          </h3>
        </div>
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-spin block mb-2">refresh</span>Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {["", "Gross", "Extra", "Total Gross", "Basic", "PF", "ESI", "Fixed Advance", "Salary Advance", "Other Advance", "Take Home"].map((h) => (
                    <th key={h} className={`py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ${h ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">summarize</span>
                      <p className="text-sm font-medium">No payroll data for this month. Generate payroll first.</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map((r, idx) => (
                      <tr key={r.category} className={`hover:bg-surface-container-low/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-surface-container-low/20"}`}>
                        <td className="py-4 px-5 font-bold text-sm text-primary whitespace-nowrap">{CATEGORY_LABELS[r.category] || r.category}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{fmt(r.grossSalary)}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.extraAllowance > 0 ? fmt(r.extraAllowance) : "-"}</td>
                        <td className="py-4 px-5 text-right text-sm font-bold">{fmt(r.totalGross)}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.basicSalary > 0 ? fmt(r.basicSalary) : "-"}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.pfDeduction > 0 ? fmt(r.pfDeduction) : "-"}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.esiDeduction > 0 ? fmt(r.esiDeduction) : "-"}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.fixedAdvance > 0 ? fmt(r.fixedAdvance) : "0"}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.salaryAdvance > 0 ? fmt(r.salaryAdvance) : "0"}</td>
                        <td className="py-4 px-5 text-right text-sm font-medium">{r.otherAdvance > 0 ? fmt(r.otherAdvance) : "0"}</td>
                        <td className="py-4 px-5 text-right text-sm font-extrabold text-primary">{fmt(r.netSalary)}</td>
                      </tr>
                    ))}
                    {/* Grand total */}
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td className="py-4 px-5 font-extrabold text-primary text-sm">TOTAL</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.grossSalary)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{gt.extraAllowance > 0 ? fmt(gt.extraAllowance) : "-"}</td>
                      <td className="py-4 px-5 text-right font-black text-primary text-sm">{fmt(gt.totalGross)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.basicSalary)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.pfDeduction)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.esiDeduction)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.fixedAdvance)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.salaryAdvance)}</td>
                      <td className="py-4 px-5 text-right font-extrabold text-primary text-sm">{fmt(gt.otherAdvance)}</td>
                      <td className="py-4 px-5 text-right font-black text-primary text-sm">{fmt(gt.netSalary)}</td>
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

export default SalaryAbstractPage;
