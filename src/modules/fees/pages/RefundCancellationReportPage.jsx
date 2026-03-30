import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import dayjs from "dayjs";
import { getAcademicYears, getPaymentStatusReport } from "../fees.service";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

const modeIcon = (mode) => {
  const m = (mode || "").toUpperCase();
  if (m === "UPI" || m === "PHONEPE" || m.includes("PHONE")) return { icon: "smartphone", color: "text-purple-600" };
  if (m === "BANK") return { icon: "account_balance", color: "text-blue-600" };
  return { icon: "payments", color: "text-on-surface-variant" };
};

const StatusBadge = ({ status }) => {
  const s = (status || "SUCCESS").toUpperCase();
  if (s === "REFUNDED")
    return <span className="bg-error-container/30 text-error px-3 py-1 rounded-full text-[10px] font-bold uppercase">REFUNDED</span>;
  if (s === "CANCELLED")
    return <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase">CANCELLED</span>;
  return <span className="bg-[#44ddc1]/20 text-on-tertiary-fixed-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase">SUCCESS</span>;
};

// ── component ─────────────────────────────────────────────────────────────
const RefundCancellationReportPage = () => {
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showTip, setShowTip] = useState(true);

  // ── data ─────────────────────────────────────────────────────────────────
  const fetchAcademicYears = async () => {
    try {
      const years = await getAcademicYears();
      setAcademicYearOptions(years || []);
      if ((years || []).length > 0 && !years.includes(academicYear))
        setAcademicYear(years[0]);
    } catch { /* silent */ }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getPaymentStatusReport(academicYear);
      setRows(data || []);
    } catch {
      message.error("Failed to load refund/cancellation report");
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAcademicYears(); }, []);
  useEffect(() => { if (academicYear) fetchReport(); }, [academicYear]);

  // ── filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const status = row.status || "SUCCESS";
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (dateFrom) {
        const d = dayjs(row.paymentDate);
        if (!d.isValid() || d.isBefore(dayjs(dateFrom).startOf("day"))) return false;
      }
      if (dateTo) {
        const d = dayjs(row.paymentDate);
        if (!d.isValid() || d.isAfter(dayjs(dateTo).endOf("day"))) return false;
      }
      if (!q) return true;
      const name = row.studentFee?.student?.name || "";
      const std = row.studentFee?.student?.standard || "";
      const receipt = row.receiptNo || "";
      const reason = row.statusReason || row.refundReason || row.cancelReason || row.remarks || "";
      return [name, std, receipt, reason].join(" ").toLowerCase().includes(q);
    });
  }, [rows, statusFilter, dateFrom, dateTo, search]);

  // ── summary ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const cancelled = filteredRows.filter((r) => (r.status || "SUCCESS") === "CANCELLED");
    const refunded = filteredRows.filter((r) => (r.status || "SUCCESS") === "REFUNDED");
    return {
      totalRows: filteredRows.length,
      cancelledCount: cancelled.length,
      refundedCount: refunded.length,
      refundedAmount: refunded.reduce((s, r) => s + Number(r.refundAmount || r.amount || 0), 0),
    };
  }, [filteredRows]);

  // ── pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  // ── export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Date", "Student", "Standard", "Receipt No", "Amount", "Refund Amount", "Mode", "Status", "Reason", "Remarks"];
    const lines = filteredRows.map((row) => {
      const reason = row.statusReason || row.refundReason || row.cancelReason || "";
      return [
        row.paymentDate ? dayjs(row.paymentDate).format("YYYY-MM-DD") : "-",
        row.studentFee?.student?.name || "-",
        row.studentFee?.student?.standard || "-",
        row.receiptNo || "-",
        Number(row.amount || 0),
        Number(row.refundAmount || 0),
        row.paymentMode || "-",
        row.status || "SUCCESS",
        reason,
        row.remarks || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund-cancellation-report-${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 relative">

      {/* ── breadcrumb + heading ── */}
      <div>
        <nav className="flex text-xs text-on-surface-variant mb-2 font-medium tracking-wide gap-1.5">
          <span>Financials</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Refund & Cancellation Management</span>
        </nav>
        <h1 className="font-headline font-extrabold text-3xl text-primary tracking-tight">
          Refund & Cancellation Management
        </h1>
      </div>

      {/* ── summary bento cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Records */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-surface-container-low rounded-full opacity-50 pointer-events-none" />
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Total Records</p>
          <h3 className="text-4xl font-headline font-extrabold text-primary">
            {loading ? "—" : summary.totalRows}
          </h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] text-[#44ddc1] bg-[#002f27]/10 px-2 py-1 rounded-full w-fit">
            <span className="material-symbols-outlined text-[12px]">trending_up</span>
            <span>Live Database</span>
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Cancelled Count</p>
          <h3 className="text-4xl font-headline font-extrabold text-primary">
            {loading ? "—" : summary.cancelledCount}
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-4">Across current academic year</p>
        </div>

        {/* Refunded count */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Refunded Count</p>
          <h3 className="text-4xl font-headline font-extrabold text-primary">
            {loading ? "—" : summary.refundedCount}
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-4">Approved & processed</p>
        </div>

        {/* Refunded amount (dark) */}
        <div     style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}} className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.15)] text-white">
          <p className="text-primary-fixed text-[10px] font-bold uppercase tracking-widest mb-1">Refunded Amount</p>
          <h3 className="text-4xl  font-headline text-[#44ddc1] font-extrabold">
            {loading ? "—" : fmt(summary.refundedAmount)}
          </h3>
          <div className="mt-4 flex items-center gap-1 text-[10px] bg-white/10 px-2 py-1 rounded-full w-fit">
            <span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>
            <span>Processed Successfully</span>
          </div>
        </div>
      </div>

      {/* ── filters bar ── */}
      <div className="bg-surface-container-low p-5 rounded-2xl flex flex-wrap items-end gap-5 border-l-4 border-primary">
        {/* Academic year */}
        <div className="flex-1 min-w-[180px] space-y-1.5">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Academic Year
          </label>
          <div className="relative">
            <select
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); setPage(1); }}
              className="w-full bg-white border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary py-2.5 px-3 outline-none appearance-none"
            >
              {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex-1 min-w-[160px] space-y-1.5">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Status
          </label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full bg-white border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary py-2.5 px-3 outline-none appearance-none"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="REFUNDED">Refunded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
          </div>
        </div>

        {/* Date range */}
        <div className="flex-[1.5] min-w-[280px] space-y-1.5">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Date Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full bg-white border-none rounded-xl text-xs focus:ring-2 focus:ring-primary py-2.5 px-3 outline-none"
            />
            <span className="text-on-surface-variant text-xs flex-shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full bg-white border-none rounded-xl text-xs focus:ring-2 focus:ring-primary py-2.5 px-3 outline-none"
            />
          </div>
        </div>

        {/* Quick search */}
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Quick Search
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Student name, receipt, reason..."
              className="w-full bg-white border-none rounded-xl text-sm pl-10 pr-4 focus:ring-2 focus:ring-primary py-2.5 outline-none"
            />
          </div>
        </div>

        {/* Export */}
        <button
          onClick={exportCSV}
          className="bg-primary text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity font-bold text-sm h-[42px] flex-shrink-0"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Export CSV
        </button>
      </div>

      {/* ── data table ── */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                {[
                  { label: "Date" },
                  { label: "Student" },
                  { label: "Standard", center: true },
                  { label: "Receipt" },
                  { label: "Amount", right: true },
                  { label: "Refund", right: true },
                  { label: "Mode" },
                  { label: "Status" },
                  { label: "Reason" },
                  { label: "Remarks" },
                ].map(({ label, center, right }) => (
                  <th
                    key={label}
                    className={`px-6 py-4 ${center ? "text-center" : right ? "text-right" : ""}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl animate-spin opacity-30">refresh</span>
                      <p className="text-sm">Loading records...</p>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">receipt_long</span>
                    <p className="text-sm font-medium">No records found</p>
                    <p className="text-xs mt-1 opacity-60">Try adjusting the filters above</p>
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => {
                  const status = row.status || "SUCCESS";
                  const name = row.studentFee?.student?.name || "—";
                  const std = row.studentFee?.student?.standard || "—";
                  const reason = row.statusReason || row.refundReason || row.cancelReason || "—";
                  const mode = modeIcon(row.paymentMode);
                  const isRefunded = status === "REFUNDED";

                  return (
                    <tr
                      key={row.id || idx}
                      className={`border-t border-surface-container-low hover:bg-surface-container-low transition-colors duration-150 ${isRefunded ? "bg-surface-container-low/30" : ""}`}
                    >
                      {/* Date */}
                      <td className="px-6 py-5 whitespace-nowrap text-on-surface font-medium">
                        {row.paymentDate ? dayjs(row.paymentDate).format("DD-MM-YYYY") : "—"}
                      </td>

                      {/* Student */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs flex-shrink-0 ${isRefunded ? "opacity-60" : ""}`}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-primary">{name}</span>
                        </div>
                      </td>

                      {/* Standard */}
                      <td className="px-6 py-5 text-center">
                        <span className="bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-bold">{std}</span>
                      </td>

                      {/* Receipt */}
                      <td className="px-6 py-5 font-mono text-xs text-secondary">{row.receiptNo || "—"}</td>

                      {/* Amount */}
                      <td className="px-6 py-5 text-right font-bold">{fmt(row.amount)}</td>

                      {/* Refund */}
                      <td className="px-6 py-5 text-right font-bold text-error">
                        {row.refundAmount ? fmt(row.refundAmount) : "—"}
                      </td>

                      {/* Mode */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1">
                          <span className={`material-symbols-outlined text-sm ${mode.color}`}>{mode.icon}</span>
                          <span className="text-[11px] font-bold">{(row.paymentMode || "—").toUpperCase()}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5"><StatusBadge status={status} /></td>

                      {/* Reason */}
                      <td className="px-6 py-5 text-on-surface-variant text-xs max-w-[120px]">
                        <span title={reason} className="block truncate">{reason}</span>
                      </td>

                      {/* Remarks */}
                      <td className="px-6 py-5 text-xs text-on-surface-variant max-w-[140px]">
                        <span title={row.remarks || ""} className="block truncate">{row.remarks || "—"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── pagination footer ── */}
        <div className="p-5 border-t border-surface-container-low flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-on-surface-variant">
              Showing{" "}
              <span className="font-bold text-primary">
                {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1} – {Math.min(page * pageSize, filteredRows.length)}
              </span>{" "}
              of {filteredRows.length} entries
            </span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-surface-container-high border-none rounded-lg text-xs py-1.5 px-3 font-bold outline-none appearance-none"
              >
                <option value={20}>20/page</option>
                <option value={50}>50/page</option>
                <option value={100}>100/page</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container disabled:opacity-30 text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + Math.max(1, page - 2);
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    p === page ? "bg-primary text-white" : "hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container disabled:opacity-30 text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── contextual floating tip ── */}
      {showTip && summary.refundedCount > 0 && (
        <div className="fixed bottom-8 right-8 bg-white shadow-[0_20px_40px_rgba(1,29,53,0.1)] rounded-full px-5 py-3 flex items-center gap-3 border-l-4 border-[#44ddc1] z-40 max-w-sm">
          <span
            className="material-symbols-outlined text-[#44ddc1] flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            insights
          </span>
          <p className="text-xs font-semibold text-primary">
            {summary.refundedCount} refund{summary.refundedCount > 1 ? "s" : ""} processed — total {fmt(summary.refundedAmount)} returned.
          </p>
          <button onClick={() => setShowTip(false)} className="text-on-surface-variant hover:text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RefundCancellationReportPage;
