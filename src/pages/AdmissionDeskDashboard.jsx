import React, { useEffect, useState } from "react";
import { message, Spin, Tag } from "antd";
import dayjs from "dayjs";
import {
  getAdmissionDashboardSummary,
  getPendingAdmissions,
  getNextAdmissionNo,
} from "../modules/admission/admission.service";
import { getAcademicYears } from "../modules/fees/fees.service";

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

const AdmissionDeskDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState([]);
  const [nextAdmNo, setNextAdmNo] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (academicYear) loadData();
  }, [academicYear]);

  const loadInitial = async () => {
    try {
      const years = await getAcademicYears();
      setAvailableYears(years || []);
      setAcademicYear(years?.[0] || "2026-2027");
    } catch {
      setAcademicYear("2026-2027");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, pendingData, admNo] = await Promise.allSettled([
        getAdmissionDashboardSummary(academicYear),
        getPendingAdmissions(),
        getNextAdmissionNo(),
      ]);
      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (pendingData.status === "fulfilled") setPending((pendingData.value || []).slice(0, 10));
      if (admNo.status === "fulfilled") setNextAdmNo(admNo.value?.nextAdmissionNo || "");
    } catch {
      message.error("Failed to load dashboard data");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <Spin size="large" />
      </div>
    );
  }

  const total = summary?.total || 0;
  const approved = summary?.approved || 0;
  const pendingCount = summary?.pending || 0;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;

  const statusColor = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") return "green";
    if (s === "PENDING") return "gold";
    if (s === "REJECTED") return "red";
    return "default";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-primary tracking-tight">
            Admission Front Desk
          </h2>
          <p className="text-on-surface-variant mt-1">
            {dayjs().format("dddd, MMMM D, YYYY")} — {academicYear} Session
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-4 py-2 bg-surface-container-high rounded-xl text-sm font-bold text-primary border-none focus:ring-2 focus:ring-primary"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => onNavigate("admission")}
            style={{ background: "linear-gradient(to right, #00152a, #102a43)" }}
            className="px-6 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/10 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            New Application
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Applications</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{fmt(total)}</h3>
            </div>
            <span className="p-2.5 bg-primary-fixed rounded-full text-primary material-symbols-outlined text-xl">person_add</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{academicYear} session</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2e7d32]/5 rounded-full blur-2xl group-hover:bg-[#2e7d32]/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Approved</p>
              <h3 className="text-3xl font-extrabold font-headline text-[#2e7d32]">{fmt(approved)}</h3>
            </div>
            <span className="p-2.5 bg-[#e8f5e9] rounded-full text-[#2e7d32] material-symbols-outlined text-xl">check_circle</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{approvalRate}% approval rate</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Pending Review</p>
              <h3 className="text-3xl font-extrabold font-headline text-amber-600">{fmt(pendingCount)}</h3>
            </div>
            <span className="p-2.5 bg-amber-50 rounded-full text-amber-600 material-symbols-outlined text-xl">pending_actions</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">Awaiting principal approval</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-tertiary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Next Admission No</p>
              <h3 className="text-xl font-extrabold font-headline text-primary mt-1">{nextAdmNo || "—"}</h3>
            </div>
            <span className="p-2.5 bg-tertiary-fixed rounded-full text-on-tertiary-fixed-variant material-symbols-outlined text-xl">tag</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">Auto-generated sequence</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { key: "admission", icon: "add_circle", label: "New Application", color: "bg-primary/10 text-primary" },
          { key: "admission-view", icon: "list_alt", label: "All Admissions", color: "bg-secondary-fixed text-on-secondary-fixed-variant" },
          { key: "approval", icon: "rule", label: "Approvals Queue", color: "bg-amber-50 text-amber-700" },
          { key: "bulk-upload", icon: "upload", label: "Bulk Upload", color: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
          { key: "students", icon: "group", label: "View Students", color: "bg-primary-fixed text-primary" },
        ].map((action) => (
          <button
            key={action.key}
            onClick={() => onNavigate(action.key)}
            className="flex flex-col items-center gap-2 p-5 rounded-xl bg-surface-container-lowest shadow-ambient-sm hover:shadow-ambient transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className={`material-symbols-outlined text-2xl p-3 rounded-full ${action.color}`}>{action.icon}</span>
            <span className="text-xs font-bold text-on-surface-variant">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Pending Admissions Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
          <h4 className="text-base font-bold font-headline text-primary">Pending Applications</h4>
          <button
            onClick={() => onNavigate("approval")}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">No pending applications</div>
        ) : (
          <div className="divide-y divide-surface-container-low">
            {pending.map((app, idx) => (
              <div key={app.id || idx} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">
                  {(app.name || app.studentName || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{app.name || app.studentName}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {app.admission?.admissionNo || app.admissionNo || "—"} · {app.standard || app.admission?.standard || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <Tag color={statusColor(app.status || app.admission?.status)}>
                    {(app.status || app.admission?.status || "PENDING").toUpperCase()}
                  </Tag>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {app.createdAt ? dayjs(app.createdAt).format("DD MMM YYYY") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionDeskDashboard;
