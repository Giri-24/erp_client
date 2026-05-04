import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { DatePicker, Input, Modal, Skeleton, message } from "antd";
import {
  approveLeave,
  getAttendance,
  getHRDashboard,
  getLeaveApplications,
  getPayroll,
  getStaffList,
  getStatutoryReportRaw,
  rejectLeave,
} from "../hr.service";

const currency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const monthKey = (d) => dayjs(d).format("YYYY-MM");
const monthLabel = (d) => dayjs(d).format("MMM YY");

const EMPTY = {
  totalStaff: 0,
  attendancePercent: 0,
  pendingLeaves: 0,
  pendingPermissions: 0,
  presentToday: 0,
  absentToday: 0,
  onLeaveToday: 0,
};

const isTeaching = (text = "") => {
  const t = String(text).toLowerCase();
  return t.includes("teach") || t.includes("faculty") || t.includes("prof") || t.includes("hod");
};

const isOps = (text = "") => {
  const t = String(text).toLowerCase();
  return t.includes("ops") || t.includes("operation") || t.includes("support") || t.includes("maintenance") || t.includes("security");
};

const leaveBucket = (leave) => {
  const code = String(leave?.leaveType?.code || leave?.leaveType?.name || "").toLowerCase();
  if (code.includes("sick") || code === "sl") return "Sick Leaves";
  if (code.includes("casual") || code === "cl") return "Casual Leaves";
  return "Paid Leaves";
};

const getWeekNo = (date) => {
  const day = dayjs(date).date();
  return Math.min(4, Math.floor((day - 1) / 7));
};

const buildAttendanceAreaPath = (trend) => {
  const points = trend.map((w, idx) => {
    const x = trend.length > 1 ? (idx / (trend.length - 1)) * 100 : 0;
    const y = 95 - (Math.max(0, Math.min(100, w.presentPct || 0)) * 0.7);
    return { x, y };
  });
  if (!points.length) return "M0,95 L100,95 L100,100 L0,100 Z";
  const start = `M${points[0].x},${points[0].y}`;
  const lines = points.slice(1).map((p) => ` L${p.x},${p.y}`).join("");
  return `${start}${lines} L100,100 L0,100 Z`;
};

const getLeaveStart = (leave) => leave?.fromDate || leave?.startDate || leave?.date || leave?.appliedDate || null;
const getLeaveEnd = (leave) => leave?.toDate || leave?.endDate || leave?.date || leave?.fromDate || leave?.startDate || null;

const toCategoryLabel = (category) => {
  const c = String(category || "").toUpperCase();
  if (c.includes("TEACHING") && c.includes("TRAINEE")) return "Academic Faculty (Trainee)";
  if (c.includes("TEACHING")) return "Academic Faculty (Regular)";
  if (c.includes("NON_TEACHING") && c.includes("TRAINEE")) return "Operations (Trainee)";
  if (c.includes("NON_TEACHING")) return "Operations (Regular)";
  return "Uncategorized";
};

const formatCreatedCategory = (category) => {
  const raw = String(category || "").trim();
  if (!raw) return "Uncategorized";
  return raw
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
};

const HRDashboardPage = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [dashboard, setDashboard] = useState(EMPTY);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [payrollRows, setPayrollRows] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [statutorySeries, setStatutorySeries] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const m = monthKey(selectedMonth);

    try {
      const baseCalls = await Promise.all([
        getHRDashboard({ month: m }),
        getAttendance({ month: m }),
        getLeaveApplications({ status: "PENDING", month: m }),
        getLeaveApplications({ status: "APPROVED", month: m }),
        getPayroll({ month: m }),
        getStaffList(),
      ]);

      const [dashRes, attendanceRes, pendingLeavesRes, approvedLeavesRes, payrollRes, staffRes] = baseCalls;

      const months = Array.from({ length: 6 }, (_, i) => selectedMonth.subtract(5 - i, "month"));
      const statutoryRaw = await Promise.all(months.map((d) => getStatutoryReportRaw(monthKey(d))));
      const trend = statutoryRaw.map((rows, i) => {
        const total = (Array.isArray(rows) ? rows : []).reduce(
          (sum, r) => sum + Number(r.pfDeduction || 0) + Number(r.employerPfContribution || 0) + Number(r.esiDeduction || 0) + Number(r.employerEsiContribution || 0),
          0,
        );
        return { label: monthLabel(months[i]), total };
      });

      setDashboard({ ...EMPTY, ...(dashRes || {}) });
      setAttendanceRows(Array.isArray(attendanceRes) ? attendanceRes : []);
      setPendingLeaves(Array.isArray(pendingLeavesRes) ? pendingLeavesRes : []);
      setApprovedLeaves(Array.isArray(approvedLeavesRes) ? approvedLeavesRes : []);
      setPayrollRows(Array.isArray(payrollRes) ? payrollRes : payrollRes?.data || []);
      setStaffRows(Array.isArray(staffRes) ? staffRes : []);
      setStatutorySeries(trend);
    } catch (err) {
      console.error(err);
      message.error("Failed to load HR dashboard data");
      setDashboard(EMPTY);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const attendanceTrend = useMemo(() => {
    const weeks = [
      { present: 0, late: 0, absent: 0 },
      { present: 0, late: 0, absent: 0 },
      { present: 0, late: 0, absent: 0 },
      { present: 0, late: 0, absent: 0 },
    ];

    attendanceRows.forEach((r) => {
      const i = getWeekNo(r.date);
      const status = String(r.status || "").toUpperCase();
      if (status === "PRESENT") weeks[i].present += 1;
      else if (status === "LATE") weeks[i].late += 1;
      else if (status === "ABSENT") weeks[i].absent += 1;
    });

    return weeks.map((w, i) => {
      const total = w.present + w.late + w.absent;
      return {
        label: `Week ${String(i + 1).padStart(2, "0")}`,
        presentPct: total ? Math.round((w.present / total) * 100) : 0,
        latePct: total ? Math.round((w.late / total) * 100) : 0,
        absentPct: total ? Math.round((w.absent / total) * 100) : 0,
      };
    });
  }, [attendanceRows]);

  const leaveMix = useMemo(() => {
    const buckets = { "Paid Leaves": 0, "Sick Leaves": 0, "Casual Leaves": 0 };
    approvedLeaves.forEach((l) => {
      buckets[leaveBucket(l)] += Number(l.days || 0);
    });
    const total = buckets["Paid Leaves"] + buckets["Sick Leaves"] + buckets["Casual Leaves"];
    return { ...buckets, total };
  }, [approvedLeaves]);

  const todayApprovedLeaveCount = useMemo(() => {
    const today = dayjs().startOf("day");
    return approvedLeaves.reduce((sum, leave) => {
      const startRaw = getLeaveStart(leave);
      const endRaw = getLeaveEnd(leave);
      if (!startRaw) return sum;

      const start = dayjs(startRaw).startOf("day");
      const end = dayjs(endRaw || startRaw).endOf("day");
      if (!start.isValid() || !end.isValid()) return sum;
      const inRange = (today.isAfter(start) || today.isSame(start, "day")) && (today.isBefore(end) || today.isSame(end, "day"));
      return inRange ? sum + 1 : sum;
    }, 0);
  }, [approvedLeaves]);

  const presentTodayFromAttendance = useMemo(() => {
    const today = dayjs();
    return attendanceRows.reduce((count, row) => {
      const status = String(row?.status || "").toUpperCase();
      const isToday = dayjs(row?.date).isSame(today, "day");
      return status === "PRESENT" && isToday ? count + 1 : count;
    }, 0);
  }, [attendanceRows]);

  const payrollDist = useMemo(() => {
    const counters = {
      "Academic Faculty (Regular)": { amount: 0, count: 0 },
      "Academic Faculty (Trainee)": { amount: 0, count: 0 },
      "Operations (Regular)": { amount: 0, count: 0 },
      "Operations (Trainee)": { amount: 0, count: 0 },
    };

    const staffCategoryById = new Map(staffRows.map((s) => [s.id, String(s.category || "").toUpperCase()]));

    payrollRows.forEach((p) => {
      const amount = Number(p.netSalary || 0);
      const c = String(p.staff?.category || staffCategoryById.get(p.staffId) || "").toUpperCase();
      if (c.includes("TEACHING") && c.includes("TRAINEE")) {
        counters["Academic Faculty (Trainee)"].amount += amount;
        counters["Academic Faculty (Trainee)"].count += 1;
      } else if (c.includes("TEACHING")) {
        counters["Academic Faculty (Regular)"].amount += amount;
        counters["Academic Faculty (Regular)"].count += 1;
      } else if (c.includes("NON_TEACHING") && c.includes("TRAINEE")) {
        counters["Operations (Trainee)"].amount += amount;
        counters["Operations (Trainee)"].count += 1;
      } else {
        counters["Operations (Regular)"].amount += amount;
        counters["Operations (Regular)"].count += 1;
      }
    });

    const rows = Object.entries(counters).map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,
    }));
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    return { rows, total };
  }, [payrollRows, staffRows]);

  const staffByDepartment = useMemo(() => {
    const map = new Map();
    staffRows.forEach((s) => {
      const dept = s.department || "Unknown";
      const category = toCategoryLabel(s.category);
      const key = `${dept} • ${category}`;
      map.set(key, (map.get(key) || 0) + 1);
    });

    let arr = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((x) => x.name.toLowerCase().includes(q));
    }
    arr.sort((a, b) => (sortDesc ? b.count - a.count : a.count - b.count));
    return arr;
  }, [staffRows, search, sortDesc]);

  const staffCategoryCounts = useMemo(() => {
    const counters = new Map();

    staffRows.forEach((s) => {
      const key = String(s.category || "UNCATEGORIZED").toUpperCase();
      counters.set(key, (counters.get(key) || 0) + 1);
    });

    const total = Array.from(counters.values()).reduce((sum, n) => sum + n, 0);
    const denominator = total || 1;
    return {
      total,
      rows: Array.from(counters.entries())
        .map(([key, value]) => ({
          key,
          label: formatCreatedCategory(key),
          value,
          pct: Math.round((value / denominator) * 100),
        }))
        .sort((a, b) => b.value - a.value),
    };
  }, [staffRows]);

  const handleApproveLeave = (id) => {
    Modal.confirm({
      title: "Approve leave",
      content: "Confirm this leave approval?",
      onOk: async () => {
        setActionLoading(id);
        try {
          await approveLeave(id, {});
          message.success("Leave approved");
          fetchAll();
        } catch {
          message.error("Failed to approve leave");
        }
        setActionLoading(null);
      },
    });
  };

  const handleRejectLeave = (id) => {
    let reason = "";
    Modal.confirm({
      title: "Reject leave",
      content: <Input.TextArea id="hr-reject-leave-reason" name="hrRejectLeaveReason" rows={3} placeholder="Reason (optional)" onChange={(e) => { reason = e.target.value; }} />,
      okButtonProps: { danger: true },
      onOk: async () => {
        setActionLoading(id);
        try {
          await rejectLeave(id, { rejectionNote: reason });
          message.success("Leave rejected");
          fetchAll();
        } catch {
          message.error("Failed to reject leave");
        }
        setActionLoading(null);
      },
    });
  };

  const exportReport = () => {
    const payload = {
      month: monthKey(selectedMonth),
      dashboard,
      attendanceTrend,
      leaveMix,
      payrollDist,
      staffByDepartment,
      staffCategoryCounts,
      statutorySeries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hr-dashboard-${monthKey(selectedMonth)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !dashboard) {
    return <div className="p-8"><Skeleton active paragraph={{ rows: 14 }} /></div>;
  }

  const monthlyPayroll = payrollDist.total;
  const monthlyPayrollInr = `INR ${Number(monthlyPayroll || 0).toLocaleString("en-IN")}`;
  const attendancePeak = attendanceTrend.reduce((best, cur, idx) => {
    if (!best || cur.presentPct > best.presentPct) return { ...cur, idx };
    return best;
  }, null);
  const leaveTotal = leaveMix.total || 1;
  const paidPct = Math.round(((leaveMix["Paid Leaves"] || 0) / leaveTotal) * 100);
  const sickPct = Math.round(((leaveMix["Sick Leaves"] || 0) / leaveTotal) * 100);
  const casualPct = Math.max(0, 100 - paidPct - sickPct);
  const paidArc = Math.round((paidPct / 100) * 440);
  const sickArc = Math.round((sickPct / 100) * 440);
  const casualArc = Math.round((casualPct / 100) * 440);
  const selectedMonthLabel = selectedMonth.format("MMM YYYY");
  const now = dayjs();
  const monthEnd = selectedMonth.endOf("month");
  const daysUntilMonthEnd = selectedMonth.isSame(now, "month") ? Math.max(0, monthEnd.diff(now, "day")) : null;
  const leavePriorityLabel = todayApprovedLeaveCount >= 10 ? "High priority" : todayApprovedLeaveCount > 0 ? "Monitor" : "Low";
  const attendanceAreaPath = buildAttendanceAreaPath(attendanceTrend);
  const presentTodayPct = dashboard.totalStaff ? Math.min(100, Math.round((presentTodayFromAttendance / dashboard.totalStaff) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#f6fafe] text-[#171c1f]">
      <main className="min-h-screen p-4 pt-4 lg:p-8 lg:pt-6">
        <div className="mb-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-[#00152a]">Institutional Overview</h2>
              <p className="text-[#43474d]">Real-time tracking of academic and operational health.</p>
            </div>
            <div className="flex items-center gap-2">
              <DatePicker picker="month" allowClear={false} value={selectedMonth} onChange={(d) => d && setSelectedMonth(d)} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]"><div className="absolute right-4 top-4 opacity-10"><span className="material-symbols-outlined text-6xl">groups</span></div><p className="mb-2 text-sm font-semibold text-[#43474d]">Total Staff</p><div className="flex items-end justify-between"><h3 className="text-4xl font-black text-[#00152a]">{dashboard.totalStaff || 0}</h3><span className="rounded-full bg-[#44ddc1]/20 px-2 py-1 text-xs font-bold text-[#00a28c]">{dashboard.pendingPermissions || 0} permissions</span></div></div>
            <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]"><div className="absolute right-4 top-4 opacity-10"><span className="material-symbols-outlined text-6xl">how_to_reg</span></div><p className="mb-2 text-sm font-semibold text-[#43474d]">Present Today</p><div className="flex items-end justify-between"><h3 className="text-4xl font-black text-[#00152a]">{presentTodayFromAttendance}</h3><div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e4e9ed]"><div className="h-full bg-[#00152a]" style={{ width: `${presentTodayPct}%` }} /></div></div></div>
            <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]"><div className="absolute right-4 top-4 opacity-10"><span className="material-symbols-outlined text-6xl">pending_actions</span></div><p className="mb-2 text-sm font-semibold text-[#43474d]">Today's Leave</p><div className="flex items-end justify-between"><h3 className="text-4xl font-black text-[#00152a]">{todayApprovedLeaveCount}</h3><span className="rounded-full bg-[#ffdad6] px-2 py-1 text-xs font-bold text-[#ba1a1a]">{leavePriorityLabel}</span></div></div>
            <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]"><div className="absolute right-4 top-4 opacity-10"><span className="material-symbols-outlined text-6xl">payments</span></div><p className="mb-2 text-sm font-semibold text-[#43474d]">Monthly Payroll</p><div className="flex items-end justify-between"><h3 className="text-3xl font-black text-[#00152a]">{monthlyPayrollInr}</h3><span className="text-[10px] font-bold uppercase text-[#43474d]">{daysUntilMonthEnd === null ? selectedMonthLabel : `${daysUntilMonthEnd} days left`}</span></div></div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 pb-12">
          <div className="col-span-12 rounded-xl bg-white p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] xl:col-span-8">
            <div className="mb-8 flex items-center justify-between"><div><h3 className="text-xl font-extrabold text-[#00152a]">Attendance Trends</h3><p className="text-sm text-[#43474d]">Last 4 weeks workforce availability</p></div><div className="flex gap-4 text-xs"><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-[#00152a]" /><span>Present</span></div><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-[#44617d]" /><span>Late</span></div><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-[#ba1a1a]" /><span>Absent</span></div></div></div>
            <div className="relative h-64 px-4">
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d={attendanceAreaPath} fill="url(#attGrad)" fillOpacity="0.2"></path>
                <defs><linearGradient id="attGrad" x1="0%" x2="0%" y1="0%" y2="100%"><stop offset="0%" style={{ stopColor: '#00152a', stopOpacity: 1 }}></stop><stop offset="100%" style={{ stopColor: '#00152a', stopOpacity: 0 }}></stop></linearGradient></defs>
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-3 opacity-10"><div className="w-full border-t border-[#00152a]" /><div className="w-full border-t border-[#00152a]" /><div className="w-full border-t border-[#00152a]" /></div>
              {attendancePeak && (
                <div className="absolute left-1/2 top-10 -translate-x-1/2 rounded-lg bg-[#00152a] p-3 text-xs text-white shadow-xl">
                  <div className="font-bold">Week {String((attendancePeak.idx || 0) + 1).padStart(2, '0')} (Peak)</div>
                  <div>Present: {attendancePeak.presentPct}%</div>
                  <div>Late: {attendancePeak.latePct}%</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-between px-4 text-[10px] font-bold uppercase tracking-widest text-[#43474d]">
              {attendanceTrend.map((w) => <span key={w.label}>{w.label.replace("Week ", "Week ")}</span>)}
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] xl:col-span-4">
            <h3 className="text-xl font-extrabold text-[#00152a]">Leave Mix</h3>
            <p className="mb-8 text-sm text-[#43474d]">Category breakdown</p>
            <div className="relative flex items-center justify-center">
              <svg className="h-48 w-48 -rotate-90">
                <circle cx="96" cy="96" fill="none" r="70" stroke="#f0f4f8" strokeWidth="15"></circle>
                <circle cx="96" cy="96" fill="none" r="70" stroke="#00152a" strokeDasharray={`${paidArc} 440`} strokeWidth="15"></circle>
                <circle cx="96" cy="96" fill="none" r="70" stroke="#44617d" strokeDasharray={`${sickArc} 440`} strokeDashoffset={`-${paidArc}`} strokeWidth="15"></circle>
                <circle cx="96" cy="96" fill="none" r="70" stroke="#44ddc1" strokeDasharray={`${casualArc} 440`} strokeDashoffset={`-${paidArc + sickArc}`} strokeWidth="15"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black text-[#00152a]">{leaveMix.total || 0}</span><span className="text-[10px] font-bold uppercase text-[#43474d]">Total Days</span></div>
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#00152a]" /><span className="text-sm">Paid Leaves</span></div><span className="text-sm font-bold">{paidPct}%</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#44617d]" /><span className="text-sm">Sick Leaves</span></div><span className="text-sm font-bold">{sickPct}%</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#44ddc1]" /><span className="text-sm">Casual Leaves</span></div><span className="text-sm font-bold">{casualPct}%</span></div>
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] xl:col-span-5">
            <h3 className="text-xl font-extrabold text-[#00152a]">Salary Allocations</h3>
            <p className="mb-6 text-sm text-[#43474d]">Departmental monthly budget</p>
            {payrollDist.rows.map((row) => {
              const color = row.label.includes("Trainee") ? "#44ddc1" : "#00152a";
              const pct = payrollDist.total ? Math.round((Number(row.amount) / payrollDist.total) * 100) : 0;
              return (
                <div key={row.label} className="mb-5">
                  <div className="mb-2 flex justify-between text-xs font-bold uppercase"><span>{row.label}</span><span>{currency(row.amount)}</span></div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#43474d]">{row.count} Staff</div>
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-[#f0f4f8]"><div className="h-full" style={{ width: `${pct}%`, background: color }} /></div>
                </div>
              );
            })}
          </div>

          <div className="relative col-span-12 rounded-xl bg-white p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] xl:col-span-7">
            <div className="mb-6 flex items-start justify-between"><div><h3 className="text-xl font-extrabold text-[#00152a]">Statutory Contributions</h3><p className="text-sm text-[#43474d]">PF & ESI Liability Trends</p></div><div className="text-right"><div className="text-xs font-bold uppercase text-[#43474d]">Total Liability</div><div className="text-2xl font-black text-[#00152a]">{currency(statutorySeries.reduce((s, x) => s + x.total, 0))}</div></div></div>
            <div className="grid grid-cols-6 items-end gap-4">
              {statutorySeries.map((m) => {
                const max = Math.max(...statutorySeries.map((x) => x.total), 1);
                const h = Math.max(24, Math.round((m.total / max) * 120));
                const top = Math.max(8, Math.round(h * 0.3));
                const bottom = Math.max(12, h - top);
                return (
                  <div key={m.label} className="text-center">
                    <div className="mx-auto w-10 overflow-hidden rounded-lg bg-[#f0f4f8]"><div className="bg-[#44617d]" style={{ height: top }} /><div className="bg-[#00152a]" style={{ height: bottom }} /></div>
                    <div className="mt-2 text-[10px] font-bold text-[#43474d]">{m.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex gap-6 border-t border-[#e4e9ed] pt-5 text-xs font-bold text-[#43474d]"><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded bg-[#00152a]" />Provident Fund (PF)</div><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded bg-[#44617d]" />Employee State Insurance (ESI)</div></div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
            <div className="mb-8"><div><h3 className="text-xl font-extrabold text-[#00152a]">Staff Headcount by Department</h3><p className="text-sm text-[#43474d]">Human resource distribution by department and category</p></div></div>
            <div className="grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
              {staffByDepartment.map((d) => {
                const max = Math.max(...staffByDepartment.map((x) => x.count), 1);
                const width = Math.round((d.count / max) * 100);
                return (
                  <div key={d.name} className="space-y-2"><div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#43474d]"><span>{d.name}</span><span>{d.count} Staff</span></div><div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f0f4f8]"><div className="h-full rounded-full bg-[#00152a]" style={{ width: `${width}%` }} /></div></div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 rounded-xl bg-white p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
            <div className="mb-8"><h3 className="text-xl font-extrabold text-[#00152a]">Total Staff Classification</h3><p className="text-sm text-[#43474d]">Categorized breakdown of current registered staff</p></div>
            <div className="grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
              {staffCategoryCounts.rows.map((item) => (
                <div key={item.key} className="space-y-2"><div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#43474d]"><span>{item.label}</span><span>{item.value}</span></div><div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f0f4f8]"><div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.key.includes("TRAINEE") ? "#44ddc1" : "#00152a" }} /></div></div>
              ))}
            </div>
            <div className="mt-8 border-t border-[#e4e9ed] pt-6">
              <div className="flex items-center justify-between text-[#00152a]"><span className="text-base font-semibold">Total Volume</span><span className="text-4xl font-black">{staffCategoryCounts.total} Active</span></div>
            </div>
          </div>

        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50 rounded-full border border-[#c3c6ce]/20 bg-white px-4 py-2 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#44ddc1]">auto_awesome</span><span className="text-xs font-bold text-[#00152a]">{pendingLeaves.length} Leaves pending for your approval.</span><button onClick={() => onNavigate && onNavigate("hr-leaves")} className="rounded-full bg-[#00152a] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">Review</button></div>
      </div>
    </div>
  );
};

export default HRDashboardPage;
