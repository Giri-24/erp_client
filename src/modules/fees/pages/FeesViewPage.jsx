import React, { useEffect, useState, useMemo } from "react";
import { message, Modal } from "antd";
import { getAllStudentFees, getPaymentsByStudentFee, getAcademicYears, getStudentKitIssues } from "../fees.service";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

const feeStatus = (fee) => {
  if (!fee) return "pending";
  const pending = Number(fee.pending || 0);
  const paid = Number(fee.totalPaid || 0);
  const net = Number(fee.netFee || 0);
  if (pending <= 0 && paid >= net && net > 0) return "paid";
  if (paid > 0 && pending > 0) return "partial";
  return "pending";
};

const StatusBadge = ({ fee }) => {
  const s = feeStatus(fee);
  if (s === "paid")
    return <span className="px-3 py-1 rounded-full bg-[#44ddc1]/10 text-on-tertiary-container text-[10px] font-bold uppercase tracking-wide border border-[#44ddc1]/20">Paid</span>;
  if (s === "partial")
    return <span className="px-3 py-1 rounded-full bg-secondary-fixed-dim/20 text-on-secondary-container text-[10px] font-bold uppercase tracking-wide border border-secondary-container">Partial</span>;
  return <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wide border border-error/10">Pending</span>;
};

const PaymentStatusBadge = ({ status }) => {
  const s = (status || "SUCCESS").toUpperCase();
  if (s === "REFUNDED") return <span className="bg-error-container/30 text-error px-2 py-0.5 rounded-full text-[10px] font-bold">REFUNDED</span>;
  if (s === "CANCELLED") return <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold">CANCELLED</span>;
  return <span className="bg-[#44ddc1]/20 text-on-tertiary-container px-2 py-0.5 rounded-full text-[10px] font-bold">SUCCESS</span>;
};

// ── component ─────────────────────────────────────────────────────────────
const FeesViewPage = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [fatherNameFilter, setFatherNameFilter] = useState("");
  const [siblingFilter, setSiblingFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [kitData, setKitData] = useState(null);

  // ── data ─────────────────────────────────────────────────────────────────
  const fetchAcademicYears = async () => {
    try {
      const years = await getAcademicYears();
      setAcademicYearOptions(years || []);
      if ((years || []).length > 0 && !years.includes(academicYear)) setAcademicYear(years[0]);
    } catch { /* silent */ }
  };

  const fetchFees = async () => {
    setLoading(true);
    try {
      const data = await getAllStudentFees(academicYear);
      setFees(data || []);
    } catch { message.error("Failed to load fees"); }
    setLoading(false);
  };

  useEffect(() => { fetchAcademicYears(); }, []);
  useEffect(() => { if (academicYear) fetchFees(); }, [academicYear]);

  const openDetail = async (record) => {
    setSelectedFee(record);
    setDetailModal(true);
    setLoadingPayments(true);
    setKitData(null);
    try {
      const [list, kit] = await Promise.all([
        getPaymentsByStudentFee(record.id),
        getStudentKitIssues(record.id).catch(() => null),
      ]);
      setPayments(list || []);
      setKitData(kit);
    } catch { setPayments([]); }
    setLoadingPayments(false);
  };

  // ── filter ─────────────────────────────────────────────────────────────
  const standardOptions = useMemo(() =>
    Array.from(new Set(fees.map((f) => f.student?.standard).filter(Boolean))).sort(),
    [fees]
  );

  const sectionOptions = useMemo(() =>
    Array.from(new Set(fees.map((f) => f.student?.section).filter(Boolean))).sort(),
    [fees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fees.filter((f) => {
      if (standardFilter && f.student?.standard !== standardFilter) return false;
      if (sectionFilter && f.student?.section !== sectionFilter) return false;
      if (fatherNameFilter && !(f.student?.family?.fatherName || "").toLowerCase().includes(fatherNameFilter.toLowerCase())) return false;
      if (siblingFilter === "has" && !f.student?.siblingGroupId) return false;
      if (siblingFilter === "none" && f.student?.siblingGroupId) return false;
      if (areaFilter) {
        const addr = f.student?.address;
        const areaStr = [addr?.line1, addr?.line2, addr?.line3, addr?.pin].filter(Boolean).join(" ").toLowerCase();
        if (!areaStr.includes(areaFilter.toLowerCase())) return false;
      }
      if (q && !(f.student?.name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [fees, search, standardFilter, sectionFilter, fatherNameFilter, siblingFilter, areaFilter]);

  // ── summary stats ─────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    totalFee: fees.reduce((s, f) => s + Number(f.totalFee || 0), 0),
    totalPaid: fees.reduce((s, f) => s + Number(f.totalPaid || 0), 0),
    totalPending: fees.reduce((s, f) => s + Number(f.pending || 0), 0),
  }), [fees]);

  const collectionPct = summary.totalFee > 0
    ? Math.round((summary.totalPaid / summary.totalFee) * 100)
    : 0;

  const overdueCount = fees.filter((f) => Number(f.pending || 0) > 0).length;

  // ── pagination ────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── exports ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Student", "Standard", "Total Fee", "Discount", "Net Fee", "Paid", "Pending"];
    const rows = filtered.map((f) => [
      f.student?.name || "-", f.student?.standard || "-",
      f.totalFee, f.discount, f.netFee, f.totalPaid, f.pending,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fees_${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Student Fees — ${academicYear}`, 14, 18);
    doc.autoTable({
      startY: 26,
      head: [["Student", "Standard", "Total", "Discount", "Net", "Paid", "Pending"]],
      body: filtered.map((f) => [
        f.student?.name || "-", f.student?.standard || "-",
        fmt(f.totalFee), fmt(f.discount), fmt(f.netFee), fmt(f.totalPaid), fmt(f.pending),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 21, 42] },
    });
    doc.save(`fees_${academicYear}.pdf`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── header ── */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-bold text-on-primary-container mb-2 uppercase tracking-wide">
              <span>Fees Management</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary">All Student Fees</span>
            </nav>
            <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tight">Financial Overview</h2>
            <p className="text-on-surface-variant font-medium mt-1 text-sm">Real-time tracking of institutional revenue and outstanding dues.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-primary font-bold rounded-xl text-sm hover:bg-surface-container-highest transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">upload</span>
              Export CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-primary font-bold rounded-xl text-sm hover:bg-surface-container-highest transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              Export PDF
            </button>
          </div>
        </div>

        {/* Bento stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              label: "Total Assigned Fees",
              value: fmt(summary.totalFee),
              sub: `${fees.length} students`,
              border: "border-primary",
              icon: "account_balance_wallet",
            },
            {
              label: "Total Collected",
              value: fmt(summary.totalPaid),
              sub: `${collectionPct}% completion`,
              border: "border-[#44ddc1]",
              icon: "payments",
            },
            {
              label: "Total Pending",
              value: fmt(summary.totalPending),
              sub: "Action Required",
              border: "border-error",
              valueColor: "text-error",
              subColor: "text-error",
              icon: "pending_actions",
            },
          ].map(({ label, value, sub, border, icon, valueColor = "text-primary", subColor = "text-on-primary-container" }) => (
            <div key={label} className={`bg-white p-6 rounded-[1.25rem] shadow-[0_20px_40px_rgba(1,29,53,0.06)] border-l-4 ${border} relative overflow-hidden group`}>
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-1 block">{label}</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-headline font-extrabold ${valueColor}`}>{loading ? "—" : value}</span>
                  <span className={`text-xs font-bold ${subColor}`}>{sub}</span>
                </div>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-surface-container-low group-hover:scale-110 transition-transform duration-500 pointer-events-none">{icon}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── filter + table ── */}
      <section className="bg-surface-container-low rounded-[2rem] p-1">
        <div className="bg-white rounded-[1.85rem] shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden">

          {/* Filter bar */}
          <div className="p-5 border-b border-surface-container flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Academic year */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Academic Year</label>
                <div className="relative">
                  <select
                    value={academicYear}
                    onChange={(e) => { setAcademicYear(e.target.value); setPage(1); }}
                    className="appearance-none bg-surface-container-low border-none rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-primary focus:ring-2 focus:ring-primary outline-none min-w-[160px]"
                  >
                    {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                </div>
              </div>

              {/* Standard */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Standard / Grade</label>
                <div className="relative">
                  <select
                    value={standardFilter}
                    onChange={(e) => { setStandardFilter(e.target.value); setPage(1); }}
                    className="appearance-none bg-surface-container-low border-none rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-primary focus:ring-2 focus:ring-primary outline-none min-w-[140px]"
                  >
                    <option value="">All Grades</option>
                    {standardOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-base">filter_list</span>
                </div>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Section</label>
                <div className="relative">
                  <select
                    value={sectionFilter}
                    onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
                    className="appearance-none bg-surface-container-low border-none rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-primary focus:ring-2 focus:ring-primary outline-none min-w-[120px]"
                  >
                    <option value="">All Sections</option>
                    {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-base">filter_list</span>
                </div>
              </div>

              {/* Father Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Father Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">person</span>
                  <input
                    type="text"
                    value={fatherNameFilter}
                    onChange={(e) => { setFatherNameFilter(e.target.value); setPage(1); }}
                    placeholder="Father name..."
                    className="bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-primary focus:ring-2 focus:ring-primary outline-none min-w-[160px]"
                  />
                </div>
              </div>

              {/* Sibling */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Sibling</label>
                <div className="relative">
                  <select
                    value={siblingFilter}
                    onChange={(e) => { setSiblingFilter(e.target.value); setPage(1); }}
                    className="appearance-none bg-surface-container-low border-none rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-primary focus:ring-2 focus:ring-primary outline-none min-w-[130px]"
                  >
                    <option value="">All</option>
                    <option value="has">Has Sibling</option>
                    <option value="none">No Sibling</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                </div>
              </div>

              {/* Area / Pin */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Area / Pin</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">location_on</span>
                  <input
                    type="text"
                    value={areaFilter}
                    onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}
                    placeholder="Area, locality, pin..."
                    className="bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-primary focus:ring-2 focus:ring-primary outline-none min-w-[160px]"
                  />
                </div>
              </div>

              {/* Search */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-on-surface-variant px-1 uppercase tracking-tight">Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search student name..."
                    className="bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-primary focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
                  />
                </div>
              </div>
            </div>

            {/* Insight chip */}
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10">
              <span className="material-symbols-outlined text-[#44ddc1] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="text-xs font-bold text-on-surface-variant">{overdueCount} fee{overdueCount !== 1 ? "s" : ""} with pending dues</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {["Student Name", "Adm. Status", "Standard", "Section", "Father Name", "Sibling", "Total Fee", "Discount", "Net Fee", "Paid", "Status", ""].map((h, i) => (
                    <th key={h || i} className={`px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider ${i === 11 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl animate-spin opacity-30">refresh</span>
                        <p className="text-sm">Loading fee data...</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">payments</span>
                      <p className="text-sm font-medium">No records found</p>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((f) => {
                    const name = f.student?.name || "—";
                    const std = f.student?.standard || "—";
                    const hasDiscount = Number(f.discount || 0) > 0;

                    return (
                      <tr key={f.id} className="hover:bg-surface-container-low transition-colors group">
                        {/* Student */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-black text-xs">
                                {name.slice(0, 2).toUpperCase()}
                              </div>
                              {Number(f.pending || 0) <= 0 && Number(f.totalPaid || 0) > 0 && (
                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#44ddc1] rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">{name}</p>
                              <p className="text-[10px] text-on-surface-variant">{f.student?.admission?.admissionNo || ""}</p>
                            </div>
                          </div>
                        </td>

                        {/* Admission Status */}
                        <td className="px-6 py-5">
                          {(() => {
                            const hasTC = (f.student?.docRequests || []).some(d => d.status === "ISSUED");
                            if (hasTC) return <span className="px-2.5 py-1 rounded-full bg-error-container text-error text-[10px] font-bold">TC</span>;
                            if (f.student?.admission?.isApproved) return <span className="px-2.5 py-1 rounded-full bg-[#44ddc1]/20 text-[#001813] text-[10px] font-bold">Active</span>;
                            return <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold">Pending</span>;
                          })()}
                        </td>

                        {/* Standard */}
                        <td className="px-6 py-5 font-bold text-sm text-on-surface">{std}</td>

                        {/* Section */}
                        <td className="px-6 py-5 text-sm font-medium text-on-surface">{f.student?.section || "—"}</td>

                        {/* Father Name */}
                        <td className="px-6 py-5 text-sm font-medium text-on-surface">{f.student?.family?.fatherName || "—"}</td>

                        {/* Sibling */}
                        <td className="px-6 py-5 text-sm">
                          {f.student?.siblingGroupId
                            ? <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Yes</span>
                            : <span className="text-on-surface-variant">—</span>}
                        </td>

                        {/* Total */}
                        <td className="px-6 py-5 text-sm font-medium">{fmt(f.totalFee)}</td>

                        {/* Discount */}
                        <td className="px-6 py-5 text-sm font-bold">
                          {hasDiscount
                            ? <span className="text-[#44ddc1]">−{fmt(f.discount)}</span>
                            : <span className="text-on-surface-variant">—</span>}
                        </td>

                        {/* Net */}
                        <td className="px-6 py-5 text-sm font-bold text-primary">{fmt(f.netFee)}</td>

                        {/* Paid */}
                        <td className="px-6 py-5 text-sm font-bold text-primary">{fmt(f.totalPaid)}</td>

                        {/* Status */}
                        <td className="px-6 py-5"><StatusBadge fee={f} /></td>

                        {/* Action */}
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => openDetail(f)}
                            title="View details"
                            className="w-8 h-8 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant flex items-center justify-center ml-auto"
                          >
                            <span className="material-symbols-outlined text-xl">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs font-medium text-on-surface-variant">
              Showing{" "}
              <span className="text-primary font-bold">
                {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="text-primary font-bold">{filtered.length}</span> students
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-on-surface-variant hover:bg-surface transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + Math.max(1, page - 2);
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      p === page ? "bg-primary text-white" : "bg-white shadow-sm text-on-surface-variant hover:bg-surface"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-on-surface-variant hover:bg-surface transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom insight section ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart (visual) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline font-bold text-primary">Fee Status Breakdown</h3>
            <span className="material-symbols-outlined text-on-surface-variant">bar_chart</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "Fully Paid", count: fees.filter((f) => feeStatus(f) === "paid").length, color: "bg-[#44ddc1]" },
              { label: "Partially Paid", count: fees.filter((f) => feeStatus(f) === "partial").length, color: "bg-secondary-fixed-dim" },
              { label: "Pending", count: fees.filter((f) => feeStatus(f) === "pending").length, color: "bg-error" },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="text-primary">{count}</span>
                </div>
                <div className="h-2.5 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: fees.length > 0 ? `${(count / fees.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-on-surface-variant mt-4 font-medium">
              Based on {fees.length} total student fee records for {academicYear}
            </p>
          </div>
        </div>

        {/* Dark AI insight card */}
        <div     style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}} className="bg-gradient-to-br from-primary to-primary-container text-white p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(1,29,53,0.15)] relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#44ddc1]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#44ddc1] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed">Financial Insights</span>
              </div>
              <h3 className="font-headline text-2xl text-white font-bold leading-tight mb-4">
                {collectionPct}% of total fees collected for the {academicYear} academic year.
              </h3>
              <p className="text-primary-fixed text-sm font-medium opacity-80 max-w-sm">
                {overdueCount} student{overdueCount !== 1 ? "s" : ""} have outstanding dues. Use Collect Payment to process pending amounts.
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-headline font-bold text-sm active:scale-95 transition-transform w-fit"
            >
              Download Full Report
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          {/* Decorative icon */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[10rem]">analytics</span>
          </div>
        </div>
      </section>

      {/* ── Detail Modal ── */}
      <Modal
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={680}
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            <span className="font-headline font-bold">Fee Details — {selectedFee?.student?.name || ""}</span>
          </div>
        }
      >
        {selectedFee && (
          <div className="space-y-5">
            {/* Fee breakdown grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tuition Fee", val: selectedFee.tuitionFee },
                { label: "Transport Fee", val: selectedFee.transportFee },
                { label: "Book Fee", val: selectedFee.bookFee },
                { label: "Hostel Fee", val: selectedFee.hostelFee },
                { label: "Other Fee", val: selectedFee.otherFee },
                { label: "Total Fee", val: selectedFee.totalFee, bold: true },
                { label: "Discount", val: selectedFee.discount, green: true },
                { label: "Net Fee", val: selectedFee.netFee, bold: true },
                { label: "Total Paid", val: selectedFee.totalPaid, success: true },
                { label: "Pending", val: selectedFee.pending, error: Number(selectedFee.pending || 0) > 0 },
              ].map(({ label, val, bold, green, success, error }) => (
                <div key={label} className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl">
                  <span className="text-xs text-on-surface-variant font-medium">{label}</span>
                  <span className={`text-sm font-bold ${bold ? "text-primary" : green ? "text-[#44ddc1]" : success ? "text-on-tertiary-container" : error ? "text-error" : "text-on-surface"}`}>
                    {fmt(val)}
                  </span>
                </div>
              ))}
            </div>

            {/* Custom items */}
            {selectedFee.customItems?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Custom Items</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFee.customItems.map((ci) => (
                    <span key={ci.id} className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-xs font-bold">
                      {ci.name}: {fmt(ci.amount)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Kit / Book Balance */}
            {kitData && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Kit / Book Balance</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: "Book Fee", val: kitData.bookFee },
                    { label: "Kit Issued", val: kitData.kitAmount, warn: true },
                    { label: "Book Balance", val: kitData.bookBalance, highlight: true },
                  ].map(({ label, val, warn, highlight }) => (
                    <div key={label} className="text-center p-3 bg-surface-container-low rounded-xl">
                      <p className="text-[10px] text-on-surface-variant font-medium">{label}</p>
                      <p className={`text-sm font-extrabold mt-0.5 ${highlight ? "text-[#005145]" : warn ? "text-error" : "text-primary"}`}>{fmt(val)}</p>
                    </div>
                  ))}
                </div>
                {(kitData.kitIssues || []).length > 0 && (
                  <div className="space-y-1.5">
                    {kitData.kitIssues.map((ki) => (
                      <div key={ki.id} className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-sm">inventory_2</span>
                          <span className="text-xs font-bold text-primary">{ki.storeItem?.name || "Item"}</span>
                          <span className="text-[10px] text-on-surface-variant">×{ki.quantity || 1}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">{fmt(ki.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Discounts */}
            {selectedFee.discounts?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Discounts Applied</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFee.discounts.map((d) => (
                    <span key={d.id} className="px-3 py-1 bg-[#44ddc1]/10 text-on-tertiary-container rounded-full text-xs font-bold">
                      {d.type}: {d.value}{d.reason ? ` (${d.reason})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Term breakdown */}
            {selectedFee.terms?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Term-wise Breakdown</p>
                <div className="space-y-2">
                  {selectedFee.terms.map((t) => (
                    <div key={t.id} className="p-3 bg-surface-container-low rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-primary">{t.termName}</p>
                          {t.dueDate && <p className="text-[10px] text-on-surface-variant">Due: {new Date(t.dueDate).toLocaleDateString()}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm">{fmt(t.amount)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "PAID" ? "bg-[#44ddc1]/20 text-on-tertiary-container"
                              : t.status === "PARTIAL" ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                              : "bg-error-container text-error"
                          }`}>{t.status}</span>
                        </div>
                      </div>
                      {/* Component-wise split */}
                      {(t.tuitionAmount > 0 || t.transportAmount > 0 || t.bookAmount > 0 || t.hostelAmount > 0 || t.otherAmount > 0) && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {t.tuitionAmount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">Tuition: {fmt(t.tuitionAmount)}</span>}
                          {t.transportAmount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">Transport: {fmt(t.transportAmount)}</span>}
                          {t.bookAmount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">Book: {fmt(t.bookAmount)}</span>}
                          {t.hostelAmount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">Hostel: {fmt(t.hostelAmount)}</span>}
                          {t.otherAmount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">Other: {fmt(t.otherAmount)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment history */}
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Payment History</p>
              {loadingPayments ? (
                <div className="text-center py-4 text-on-surface-variant text-sm">Loading...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-4 text-on-surface-variant text-sm italic">No payments recorded.</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {payments.map((p, i) => (
                    <div key={p.id || i} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-primary">{fmt(p.amount)}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "—"} · {p.paymentMode || "—"}
                          {p.receiptNo ? ` · ${p.receiptNo}` : ""}
                        </p>
                      </div>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeesViewPage;
