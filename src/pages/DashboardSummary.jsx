import React, { useEffect, useState } from "react";
import { message, Spin, Select } from "antd";
import {
  getAdmissionDashboardSummary,
  exportAdmissionsCsv,
} from "../modules/admission/admission.service";
import { getAcademicYears } from "../modules/fees/fees.service";
import instance from "../utils/axios";

const formatSignedPercent = (value) => {
  const numeric = Number(value || 0);
  const rounded = Math.abs(numeric).toFixed(2).replace(/\.00$/, "");
  return `${numeric >= 0 ? "+" : "-"}${rounded}%`;
};

const formatMilestoneTitle = (milestone) => {
  if (!milestone) return "No milestone pending";
  return milestone.label || `${milestone.threshold}% milestone`;
};

const getApplicantAcademicYear = (applicant) =>
  applicant?.academicYear || applicant?.admission?.academicYear || "";

const getApplicantDate = (applicant) =>
  applicant?.createdAt || applicant?.admission?.admissionDate || applicant?.updatedAt || "";

const formatApplicantDate = (value) => {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRecentApplicants = (rows = [], academicYear = "") =>
  rows
    .filter((applicant) => !academicYear || getApplicantAcademicYear(applicant) === academicYear)
    .sort((left, right) => new Date(getApplicantDate(right)).getTime() - new Date(getApplicantDate(left)).getTime())
    .slice(0, 5);

const DashboardSummary = ({ onNavigate }) => {
  const [summary, setSummary] = useState(null);
  const [recentApplicants, setRecentApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, admissionsResponse] = await Promise.all([
        getAdmissionDashboardSummary(academicYear),
        instance.get("/admissions"),
      ]);
      setSummary(summaryData);
      setRecentApplicants(getRecentApplicants(admissionsResponse?.data || [], academicYear));
    } catch (err) {
      console.error(err);
      message.error("Failed to load dashboard data");
    }
    setLoading(false);
  };

  const loadInitialData = async () => {
    try {
      const years = await getAcademicYears();
      setAvailableYears(years || []);

      const initialYear = years?.length > 0 ? years[0] : "2026-2027";
      setAcademicYear(initialYear);
    } catch {
      message.error("Failed to load academic years");
      setAcademicYear("2026-2027");
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (academicYear) loadData();
  }, [academicYear]);

  const onExportCsv = async () => {
    try {
      const res = await exportAdmissionsCsv(academicYear);
      const blob = new Blob([res.csv || ""], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || `admissions-${academicYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("CSV export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!summary) return <div className="text-on-surface-variant">No dashboard data available.</div>;

  const { total, pending } = summary;
  const yearComparison = summary.yearComparison || {};
  const admissionProgress = summary.admissionProgress || {};
  const milestoneItems = (summary.upcomingMilestones?.length ? summary.upcomingMilestones : summary.milestones || []).slice(0, 3);
  const nextMilestone = milestoneItems[0] || null;
  const comparisonText = yearComparison.previousAcademicYear
    ? `vs ${yearComparison.previousAcademicYear}`
    : "vs previous year";
  const progressText = admissionProgress.totalTarget
    ? `${admissionProgress.currentCount || 0}/${admissionProgress.totalTarget} target`
    : `${admissionProgress.currentCount || 0} admissions`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-end gap-6">
          <div>
            <h2 className="text-3xl font-extrabold font-headline text-primary tracking-tight">Admissions Dashboard</h2>
            <p className="text-on-surface-variant mt-1">Reviewing Fall {academicYear} academic cycle applications</p>
          </div>
          <div className="mb-1">
             <Select
                value={academicYear}
                onChange={setAcademicYear}
                className="w-40 academic-year-select"
                variant="borderless"
                style={{ background: 'var(--surface-container-high)', borderRadius: '12px', padding: '2px 8px', fontWeight: 700 }}
                options={availableYears.map((y) => ({
                  label: `${y} Session`,
                  value: y,
                }))}
             />
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onExportCsv}
            className="px-6 py-2.5 bg-surface-container-high text-primary font-bold rounded-xl flex items-center gap-2 scale-[0.98] active:scale-95 transition-transform hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            Export List
          </button>
          <button 
         style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}}
           className="px-6 py-2.5 bg from-primary to-primary-container text-white font-bold rounded-xl flex items-center gap-2 scale-[0.98] active:scale-95 transition-transform shadow-lg shadow-primary/10 hover:opacity-90"
           onClick={() => onNavigate("admission")}
            // className="px-6 py-2.5 bg-linear-to-br from-primary to-primary-container text-black font-bold rounded-xl flex items-center gap-2 scale-[0.98] active:scale-95 transition-transform shadow-lg shadow-primary/10 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            New Application
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="max-w-[360px]">
        {/* Total Applicants */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Applicants</p>
              <h3 className="text-4xl font-extrabold font-headline text-primary">{total.toLocaleString()}</h3>
            </div>
            <span className="p-3 bg-primary-fixed rounded-full text-primary material-symbols-outlined">group</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`font-bold flex items-center text-xs ${yearComparison.trend === "down" ? "text-error" : "text-tertiary-fixed-dim"}`}>
              <span className="material-symbols-outlined text-sm">{yearComparison.trend === "down" ? "trending_down" : "trending_up"}</span>
              {formatSignedPercent(yearComparison.percentageChange)}
            </span>
            <span className="text-on-surface-variant text-[10px]">{comparisonText}</span>
          </div>
        </div>
      </div>

      {/* Insight Chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-ambient-sm border border-outline-variant/10 text-xs font-medium">
          <span className="material-symbols-outlined text-sm text-tertiary-fixed-dim">auto_awesome</span>
          <span>{progressText} tracked for this cycle</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-ambient-sm border border-outline-variant/10 text-xs font-medium text-error">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{pending} applications still pending review</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-ambient-sm border border-outline-variant/10 text-xs font-medium">
          <span className="material-symbols-outlined text-sm text-primary">schedule</span>
          <span>{nextMilestone ? `${formatMilestoneTitle(nextMilestone)} needs ${nextMilestone.remainingCount} more admissions` : `Progress at ${admissionProgress.progressPercent || 0}%`}</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-low flex items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold font-headline text-primary">Recent Applicants</h4>
            <p className="text-xs text-on-surface-variant mt-1">Latest admissions for the selected academic year.</p>
          </div>
          <button
            onClick={() => onNavigate("admission-view")}
            className="px-4 py-2 rounded-xl bg-surface-container-high text-primary text-sm font-bold hover:bg-surface-variant transition-colors"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-surface-container-low">
          {recentApplicants.length === 0 ? (
            <div className="px-6 py-8 text-sm text-on-surface-variant text-center">
              No recent applicants found for {academicYear}.
            </div>
          ) : (
            recentApplicants.map((applicant) => {
              const applicantName = [applicant.firstName, applicant.lastName].filter(Boolean).join(" ") || applicant.name || "Unnamed Applicant";
              const admissionNo = applicant.admission?.admissionNo || applicant.id || "No ID";
              const standard = applicant.standard || applicant.admission?.standard || "Not assigned";
              const status = applicant.status || (applicant.admission?.isApproved ? "APPROVED" : "PENDING");

              return (
                <div key={applicant.id || admissionNo} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{applicantName}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {admissionNo} · {standard}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                      status === "APPROVED"
                        ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}>
                      {status}
                    </span>
                    <span className="text-xs text-on-surface-variant whitespace-nowrap">
                      {formatApplicantDate(getApplicantDate(applicant))}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Dashboard Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-ambient relative overflow-hidden">
          <h4 className="text-lg font-bold font-headline mb-6">Upcoming Milestones</h4>
          <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:via-tertiary-fixed-dim before:to-surface-container-high">
            {milestoneItems.length > 0 ? milestoneItems.map((milestone, index) => {
              const colorClass = index === 0 ? "bg-primary text-primary" : index === 1 ? "bg-tertiary-fixed-dim text-tertiary-fixed-dim" : "bg-surface-container-high text-on-surface-variant";
              return (
                <div key={`${milestone.threshold}-${index}`} className={`relative ${milestone.achieved ? "opacity-60" : ""}`}>
                  <div className={`absolute -left-[28px] top-1 w-5 h-5 rounded-full ring-4 ring-white ${colorClass.split(" ")[0]}`}></div>
                  <p className={`text-xs font-bold ${colorClass.split(" ")[1]}`}>{milestone.threshold}% TARGET</p>
                  <p className="font-bold text-sm">{formatMilestoneTitle(milestone)}</p>
                  <p className="text-xs text-on-surface-variant">
                    {milestone.currentCount} reached out of {milestone.targetCount}. {milestone.remainingCount > 0 ? `${milestone.remainingCount} more admissions needed.` : "Milestone achieved."}
                  </p>
                </div>
              );
            }) : (
              <div className="relative">
                <div className="absolute -left-[28px] top-1 w-5 h-5 bg-surface-container-high rounded-full ring-4 ring-white"></div>
                <p className="text-xs font-bold text-on-surface-variant">ALL CLEAR</p>
                <p className="font-bold text-sm">No upcoming milestones pending</p>
                <p className="text-xs text-on-surface-variant">Current admission cycle has no pending milestone threshold.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={onExportCsv}
            className="bg-white hover:bg-secondary-fixed p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center transition-all group border border-outline-variant/10 shadow-sm"
          >
            <span className="p-4 bg-secondary-fixed group-hover:bg-white rounded-full text-on-secondary-fixed-variant transition-colors material-symbols-outlined">description</span>
            <span className="font-bold text-sm font-headline">Generate Reports</span>
          </button>
          <button 
            onClick={() => onNavigate("admin-settings")}
            className="bg-white hover:bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center transition-all group border border-outline-variant/10 shadow-sm"
          >
            <span className="p-4 bg-surface-container-high group-hover:bg-white rounded-full text-on-surface-variant transition-colors material-symbols-outlined">settings_account_box</span>
            <span className="font-bold text-sm font-headline">Manage Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;
