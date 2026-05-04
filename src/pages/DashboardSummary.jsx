import React, { useEffect, useState } from "react";
import { message, Spin, Avatar, Select } from "antd";
import {
  getAdmissionDashboardSummary,
  exportAdmissionsCsv,
  getPendingAdmissions,
} from "../modules/admission/admission.service";
import { getAcademicYears } from "../modules/fees/fees.service";

const formatSignedPercent = (value) => {
  const numeric = Number(value || 0);
  const rounded = Math.abs(numeric).toFixed(2).replace(/\.00$/, "");
  return `${numeric >= 0 ? "+" : "-"}${rounded}%`;
};

const formatMilestoneTitle = (milestone) => {
  if (!milestone) return "No milestone pending";
  return milestone.label || `${milestone.threshold}% milestone`;
};

const DashboardSummary = ({ onNavigate }) => {
  const [summary, setSummary] = useState(null);
  const [pendingApplicants, setPendingApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [totalApplicantsCount, setTotalApplicantsCount] = useState(0);

  const normalizeYear = (value) => String(value || "").trim();

  const toApplicantAcademicYear = (applicant) =>
    normalizeYear(applicant?.academicYear || applicant?.admission?.academicYear);

  const getRecentApplicantsForYear = (rows, selectedAcademicYear) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!selectedAcademicYear) return list;

    const selected = normalizeYear(selectedAcademicYear);
    const withAcademicYear = list.filter((applicant) => toApplicantAcademicYear(applicant));

    // If rows don't carry academicYear data, keep the existing recent-applicants behavior.
    if (!withAcademicYear.length) return list;

    return withAcademicYear.filter((applicant) => toApplicantAcademicYear(applicant) === selected);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, pendingData] = await Promise.all([
        getAdmissionDashboardSummary(academicYear),
        getPendingAdmissions(),
      ]);
      const recentApplicants = getRecentApplicantsForYear(pendingData, academicYear);
      setSummary(summaryData);
      setPendingApplicants(recentApplicants.slice(0, 5)); // Show top 5 recent
      setTotalApplicantsCount(recentApplicants.length);
    } catch (err) {
      console.error(err);
      message.error("Failed to load dashboard data");
      setPendingApplicants([]);
      setTotalApplicantsCount(0);
    }
    setLoading(false);
  };

  const loadInitialData = async () => {
    try {
      const years = await getAcademicYears();
      setAvailableYears(years || []);

      const initialYear = years?.length > 0 ? years[0] : "";
      setAcademicYear(initialYear);
    } catch {
      message.error("Failed to load academic years");
      setAcademicYear("");
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

  const { total, approved } = summary;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;
  const yearComparison = summary.yearComparison || {};
  const admissionProgress = summary.admissionProgress || {};
  const milestoneItems = (summary.upcomingMilestones?.length ? summary.upcomingMilestones : summary.milestones || []).slice(0, 3);
  const comparisonText = yearComparison.previousAcademicYear
    ? `vs ${yearComparison.previousAcademicYear}`
    : "vs previous year";

  return (
    <div className="space-y-8 duration-500 animate-in fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-end gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight font-headline text-primary">Admissions Dashboard</h2>
            <p className="mt-1 text-on-surface-variant">Reviewing Fall {academicYear} academic cycle applications</p>
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
            <span className="text-lg material-symbols-outlined">file_download</span>
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
            <span className="text-lg material-symbols-outlined">add_circle</span>
            New Application
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Total Applicants */}
        <div className="relative p-6 overflow-hidden bg-surface-container-lowest rounded-xl shadow-ambient-sm group">
          <div className="absolute w-24 h-24 transition-colors rounded-full -right-4 -top-4 bg-primary/5 blur-2xl group-hover:bg-primary/10"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-bold tracking-widest uppercase text-on-surface-variant">Total Applicants</p>
              <h3 className="text-4xl font-extrabold font-headline text-primary">{totalApplicantsCount.toLocaleString()}</h3>
            </div>
            <span className="p-3 rounded-full bg-primary-fixed text-primary material-symbols-outlined">group</span>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className={`font-bold flex items-center text-xs ${yearComparison.trend === "down" ? "text-error" : "text-tertiary-fixed-dim"}`}>
              <span className="text-sm material-symbols-outlined">{yearComparison.trend === "down" ? "trending_down" : "trending_up"}</span>
              {formatSignedPercent(yearComparison.percentageChange)}
            </span>
            <span className="text-on-surface-variant text-[10px]">{comparisonText}</span>
          </div>
        </div>

      </div>

      {/* Recent Applicants Table */}
      <div className="overflow-hidden bg-surface-container-lowest rounded-xl shadow-ambient">
        <div className="flex items-center justify-between p-6 border-b border-surface-container-low">
          <h4 className="text-xl font-bold font-headline text-primary">Recent Applicants</h4>
          <div className="flex items-center gap-2">
            <button className="p-2 transition-colors rounded-lg hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
            </button>
            <button className="p-2 transition-colors rounded-lg hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Applicant Profile</th>
                <th className="px-6 py-4">ID / Reference</th>
                <th className="px-6 py-4">Course Applied</th>
                <th className="px-6 py-4">Applied Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {pendingApplicants.map((applicant, idx) => {
                const fullName =
                  applicant.name ||
                  applicant.studentName ||
                  [applicant.firstName, applicant.lastName].filter(Boolean).join(" ") ||
                  "Unnamed Applicant";
                const initials =
                  fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "NA";
                const profileEmail = applicant.email || applicant.users?.email || "";

                return (
                <tr key={applicant.studentId || applicant.id || idx} className="transition-colors hover:bg-surface/60 group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={applicant.photo || applicant.documents?.[0]?.photoPath} 
                        size={36} 
                        className="font-bold bg-primary-fixed text-primary"
                      >
                        {initials}
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-primary">{fullName}</p>
                        <p className="text-[10px] text-on-surface-variant">{profileEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-medium">{applicant.admission?.admissionNo}</span>
                  </td>
                  <td className="px-6 py-5 text-sm">
                    {applicant.standard}
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant">
                    {new Date(applicant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-tighter ${
                      applicant.status === 'APPROVED' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {applicant.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => onNavigate("approval")}
                      className="p-2 transition-all rounded-lg text-primary hover:bg-primary-fixed"
                    >
                      <span className="text-lg material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              )})}
              {pendingApplicants.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 italic text-center text-on-surface-variant">No recent applicants found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Dashboard Modules */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Timeline */}
        <div className="relative p-8 overflow-hidden bg-surface-container-lowest rounded-xl shadow-ambient">
          <h4 className="mb-6 text-lg font-bold font-headline">Upcoming Milestones</h4>
          <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:via-tertiary-fixed-dim before:to-surface-container-high">
            {milestoneItems.length > 0 ? milestoneItems.map((milestone, index) => {
              const colorClass = index === 0 ? "bg-primary text-primary" : index === 1 ? "bg-tertiary-fixed-dim text-tertiary-fixed-dim" : "bg-surface-container-high text-on-surface-variant";
              return (
                <div key={`${milestone.threshold}-${index}`} className={`relative ${milestone.achieved ? "opacity-60" : ""}`}>
                  <div className={`absolute -left-[28px] top-1 w-5 h-5 rounded-full ring-4 ring-white ${colorClass.split(" ")[0]}`}></div>
                  <p className={`text-xs font-bold ${colorClass.split(" ")[1]}`}>{milestone.threshold}% TARGET</p>
                  <p className="text-sm font-bold">{formatMilestoneTitle(milestone)}</p>
                  <p className="text-xs text-on-surface-variant">
                    {milestone.currentCount} reached out of {milestone.targetCount}. {milestone.remainingCount > 0 ? `${milestone.remainingCount} more admissions needed.` : "Milestone achieved."}
                  </p>
                </div>
              );
            }) : (
              <div className="relative">
                <div className="absolute -left-[28px] top-1 w-5 h-5 bg-surface-container-high rounded-full ring-4 ring-white"></div>
                <p className="text-xs font-bold text-on-surface-variant">ALL CLEAR</p>
                <p className="text-sm font-bold">No upcoming milestones pending</p>
                <p className="text-xs text-on-surface-variant">Current admission cycle has no pending milestone threshold.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onNavigate("bulk-upload")}
            className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all bg-white border shadow-sm hover:bg-primary-fixed rounded-xl group border-outline-variant/10"
          >
            <span className="p-4 transition-colors rounded-full bg-primary-fixed group-hover:bg-white text-primary material-symbols-outlined">mail</span>
            <span className="text-sm font-bold font-headline">Bulk Upload</span>
          </button>
          <button 
            onClick={() => onNavigate("approval")}
            className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all bg-white border shadow-sm hover:bg-tertiary-fixed rounded-xl group border-outline-variant/10"
          >
            <span className="p-4 transition-colors rounded-full bg-tertiary-fixed group-hover:bg-white text-on-tertiary-fixed-variant material-symbols-outlined">edit_calendar</span>
            <span className="text-sm font-bold font-headline">Review Apps</span>
          </button>
          <button 
            onClick={onExportCsv}
            className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all bg-white border shadow-sm hover:bg-secondary-fixed rounded-xl group border-outline-variant/10"
          >
            <span className="p-4 transition-colors rounded-full bg-secondary-fixed group-hover:bg-white text-on-secondary-fixed-variant material-symbols-outlined">description</span>
            <span className="text-sm font-bold font-headline">Generate Reports</span>
          </button>
          <button 
            onClick={() => onNavigate("admin-settings")}
            className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all bg-white border shadow-sm hover:bg-surface-container-high rounded-xl group border-outline-variant/10"
          >
            <span className="p-4 transition-colors rounded-full bg-surface-container-high group-hover:bg-white text-on-surface-variant material-symbols-outlined">settings_account_box</span>
            <span className="text-sm font-bold font-headline">Manage Access</span>
          </button>
          <button 
            onClick={() => onNavigate("transport-report")}
            className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all bg-white border shadow-sm hover:bg-primary-fixed rounded-xl group border-outline-variant/10"
          >
            <span className="p-4 transition-colors rounded-full bg-primary-fixed group-hover:bg-white text-primary material-symbols-outlined">directions_bus</span>
            <span className="text-sm font-bold font-headline">Bus Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;
