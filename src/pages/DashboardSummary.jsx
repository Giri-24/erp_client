import React, { useEffect, useState } from "react";
import { Form, message, Spin, Avatar, Select } from "antd";
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

const DashboardSummary = ({ onNavigate, hideBulkUpload = false, hideReviewApps = false }) => {
  const [summary, setSummary] = useState(null);
  const [pendingApplicants, setPendingApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [seatForm] = Form.useForm();
  const [siblingForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, pendingData] = await Promise.all([
        getAdmissionDashboardSummary(academicYear),
        getPendingAdmissions()
      ]);
      setSummary(summaryData);
      setPendingApplicants(pendingData.slice(0, 5)); // Show top 5 recent
      seatForm.setFieldsValue(summaryData.standardSeats || {});
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

  const { total, approved, pending } = summary;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Approved */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Approved</p>
              <h3 className="text-4xl font-extrabold font-headline text-primary">{approved.toLocaleString()}</h3>
            </div>
            <span className="p-3 bg-tertiary-fixed rounded-full text-on-tertiary-fixed-variant material-symbols-outlined">verified</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-on-surface-variant text-xs font-semibold">{approvalRate}% Approval Rate</span>
            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-tertiary-fixed-dim rounded-full" style={{ width: `${approvalRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-secondary-fixed-dim/10 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Pending Review</p>
              <h3 className="text-4xl font-extrabold font-headline text-primary">{pending.toLocaleString()}</h3>
            </div>
            <span className="p-3 bg-secondary-fixed rounded-full text-on-secondary-fixed-variant material-symbols-outlined">pending_actions</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center text-[8px] font-bold text-primary">+{nextMilestone?.remainingCount || pending}</div>
            </div>
            <span className="text-on-surface-variant text-[10px]">
              {nextMilestone ? `${nextMilestone.remainingCount} more for ${nextMilestone.threshold}% milestone` : "Require immediate action"}
            </span>
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

      {/* Recent Applicants Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
        <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
          <h4 className="text-xl font-bold font-headline text-primary">Recent Applicants</h4>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
            </button>
            <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
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
              {pendingApplicants.map((applicant) => (
                <tr key={applicant.studentId} className="hover:bg-surface/60 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={applicant.photo} 
                        size={36} 
                        className="bg-primary-fixed text-primary font-bold"
                      >
                        {applicant.firstName?.charAt(0)}
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-primary">{applicant.firstName} {applicant.lastName}</p>
                        <p className="text-[10px] text-on-surface-variant">{applicant.email || "No email"}</p>
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
                      className="text-primary hover:bg-primary-fixed p-2 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
              {pendingApplicants.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-on-surface-variant italic">No recent applicants found</td>
                </tr>
              )}
            </tbody>
          </table>
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
        <div className="grid grid-cols-2 gap-4">
          {!hideBulkUpload && (
            <button 
              onClick={() => onNavigate("bulk-upload")}
              className="bg-white hover:bg-primary-fixed p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center transition-all group border border-outline-variant/10 shadow-sm"
            >
              <span className="p-4 bg-primary-fixed group-hover:bg-white rounded-full text-primary transition-colors material-symbols-outlined">mail</span>
              <span className="font-bold text-sm font-headline">Bulk Upload</span>
            </button>
          )}
          {!hideReviewApps && (
            <button 
              onClick={() => onNavigate("approval")}
              className="bg-white hover:bg-tertiary-fixed p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center transition-all group border border-outline-variant/10 shadow-sm"
            >
              <span className="p-4 bg-tertiary-fixed group-hover:bg-white rounded-full text-on-tertiary-fixed-variant transition-colors material-symbols-outlined">edit_calendar</span>
              <span className="font-bold text-sm font-headline">Review Apps</span>
            </button>
          )}
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
