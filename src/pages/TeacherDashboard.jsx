import React, { useEffect, useState } from "react";
import { message, Spin, Tag, Empty } from "antd";
import dayjs from "dayjs";
import { getCurrentUser } from "../utils/permissions";
import { getLeaveApplications, getPermissions, getAttendance, getAllLeaveBalances } from "../modules/hr/hr.service";
import { getDocRequests } from "../modules/doc-request/doc-request.service";

const TeacherDashboard = ({ onNavigate }) => {
  const currentUser = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [recentPermissions, setRecentPermissions] = useState([]);
  const [docRequests, setDocRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let staffId = currentUser?.staffId;

      // Auto-discover staffId if not set (from leave applications which auto-filter to current user)
      if (!staffId) {
        try {
          const leaveRes = await getLeaveApplications({ limit: 1 });
          const leaves = Array.isArray(leaveRes) ? leaveRes : leaveRes?.data || [];
          if (leaves[0]?.staffId) staffId = leaves[0].staffId;
        } catch {}
      }
      if (!staffId) {
        try {
          const permRes = await getPermissions({ limit: 1 });
          const perms = Array.isArray(permRes) ? permRes : permRes?.data || [];
          if (perms[0]?.staffId) staffId = perms[0].staffId;
        } catch {}
      }

      // Final fallback to user id
      staffId = staffId || currentUser?.id;
      const currentMonth = dayjs().format("YYYY-MM");

      const results = await Promise.allSettled([
        getAttendance({ staffId, month: currentMonth }),
        getAllLeaveBalances({ staffId, year: dayjs().year() }),
        getLeaveApplications({ staffId, limit: 5 }),
        getPermissions({ staffId, limit: 5 }),
        getDocRequests({ limit: 5 }),
      ]);

      if (results[0].status === "fulfilled") {
        const allRecords = results[0].value?.records || results[0].value || [];
        // Filter to only this teacher's records (endpoint may return all staff)
        setAttendance(staffId ? allRecords.filter(a => a.staffId === staffId) : allRecords);
      }
      if (results[1].status === "fulfilled") setLeaveBalance(results[1].value?.balances || results[1].value || []);
      if (results[2].status === "fulfilled") setRecentLeaves(results[2].value?.data || results[2].value || []);
      if (results[3].status === "fulfilled") setRecentPermissions(results[3].value?.data || results[3].value || []);
      if (results[4].status === "fulfilled") setDocRequests(results[4].value?.data || results[4].value || []);
    } catch (err) {
      console.error("Teacher dashboard load error:", err);
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

  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => ["PRESENT", "present"].includes(a.status)).length;
  const absentDays = attendance.filter((a) => ["ABSENT", "absent"].includes(a.status)).length;
  const lateDays = attendance.filter((a) => ["LATE", "late"].includes(a.status)).length;
  const pendingLeaves = Array.isArray(recentLeaves) ? recentLeaves.filter((l) => (l.status || "").toLowerCase() === "pending").length : 0;

  const statusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return "green";
    if (s === "pending") return "gold";
    if (s === "rejected") return "red";
    if (s === "cancelled") return "default";
    if (s === "issued") return "green";
    if (s === "in_review") return "orange";
    if (s === "requested") return "blue";
    return "default";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-primary tracking-tight">
            Welcome, {currentUser?.name || "Teacher"}
          </h2>
          <p className="text-on-surface-variant mt-1">
            {dayjs().format("dddd, MMMM D, YYYY")} — Teacher Portal
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Present This Month</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{presentDays}</h3>
            </div>
            <span className="p-2.5 bg-primary-fixed rounded-full text-primary material-symbols-outlined text-xl">check_circle</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{totalDays} working days tracked</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-error/5 rounded-full blur-2xl group-hover:bg-error/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Absent / Late</p>
              <h3 className="text-3xl font-extrabold font-headline text-error">{absentDays + lateDays}</h3>
            </div>
            <span className="p-2.5 bg-error/10 rounded-full text-error material-symbols-outlined text-xl">event_busy</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{absentDays} absent, {lateDays} late</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Pending Leaves</p>
              <h3 className="text-3xl font-extrabold font-headline text-amber-600">{pendingLeaves}</h3>
            </div>
            <span className="p-2.5 bg-amber-50 rounded-full text-amber-600 material-symbols-outlined text-xl">pending_actions</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">Awaiting approval</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-tertiary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Doc Requests</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">
                {Array.isArray(docRequests) ? docRequests.length : 0}
              </h3>
            </div>
            <span className="p-2.5 bg-tertiary-fixed rounded-full text-on-tertiary-fixed-variant material-symbols-outlined text-xl">description</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">Recent requests</p>
        </div>
      </div>

      {/* Leave Balance */}
      {Array.isArray(leaveBalance) && leaveBalance.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold font-headline text-primary">Leave Balance</h4>
            <button
              onClick={() => onNavigate("hr-leaves")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Apply Leave <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {leaveBalance.map((lb, idx) => (
              <div key={idx} className="bg-surface-container-low rounded-lg p-4 text-center">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {lb.leaveType?.name || lb.leaveTypeName || lb.type || "Leave"}
                </p>
                <p className="text-2xl font-extrabold text-primary font-headline">
                  {lb.remaining ?? lb.balance ?? 0}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  of {lb.total ?? lb.entitled ?? 0} days
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { key: "hr-leaves", icon: "event_busy", label: "Apply Leave", color: "bg-primary/10 text-primary" },
          { key: "hr-permission", icon: "timer", label: "Request Permission", color: "bg-secondary-fixed text-on-secondary-fixed-variant" },
          { key: "hr-attendance", icon: "schedule", label: "My Attendance", color: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
          { key: "hr-advance", icon: "request_quote", label: "Advance / Loan", color: "bg-amber-50 text-amber-700" },
          { key: "doc-requests", icon: "description", label: "Request Document", color: "bg-primary-fixed text-primary" },
          { key: "hr-payroll", icon: "payments", label: "My Payslip", color: "bg-surface-container-high text-on-surface-variant" },
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

      {/* Recent Leaves + Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leaves */}
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
          <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
            <h4 className="text-base font-bold font-headline text-primary">Recent Leaves</h4>
            <button
              onClick={() => onNavigate("hr-leaves")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          {!Array.isArray(recentLeaves) || recentLeaves.length === 0 ? (
            <div className="p-6"><Empty description="No leaves applied" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
          ) : (
            <div className="divide-y divide-surface-container-low">
              {recentLeaves.slice(0, 5).map((leave, idx) => (
                <div key={leave.id || idx} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                  <span className="material-symbols-outlined text-primary">event_busy</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">
                      {leave.leaveType?.name || leave.type || "Leave"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      {leave.fromDate ? dayjs(leave.fromDate).format("DD MMM") : ""} – {leave.toDate ? dayjs(leave.toDate).format("DD MMM YYYY") : ""}
                      {leave.days ? ` · ${leave.days} day(s)` : ""}
                    </p>
                  </div>
                  <Tag color={statusColor(leave.status)}>{(leave.status || "PENDING").toUpperCase()}</Tag>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Permissions */}
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
          <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
            <h4 className="text-base font-bold font-headline text-primary">Recent Permissions</h4>
            <button
              onClick={() => onNavigate("hr-permission")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          {!Array.isArray(recentPermissions) || recentPermissions.length === 0 ? (
            <div className="p-6"><Empty description="No permissions requested" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
          ) : (
            <div className="divide-y divide-surface-container-low">
              {recentPermissions.slice(0, 5).map((perm, idx) => (
                <div key={perm.id || idx} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                  <span className="material-symbols-outlined text-tertiary">timer</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{perm.reason || "Permission"}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {perm.date ? dayjs(perm.date).format("DD MMM YYYY") : ""}
                      {perm.fromTime && perm.toTime ? ` · ${perm.fromTime}–${perm.toTime}` : ""}
                    </p>
                  </div>
                  <Tag color={statusColor(perm.status)}>{(perm.status || "PENDING").toUpperCase()}</Tag>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
