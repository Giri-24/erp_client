import React, { useEffect, useState } from "react";
import { getHRDashboard, getLeaveApplications, getPayroll } from "../hr.service";
import dayjs from "dayjs";
import { Skeleton, DatePicker, message } from "antd";

const HRDashboardPage = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, leavesRes, payrollRes] = await Promise.all([
        getHRDashboard({ month: selectedMonth.format("YYYY-MM") }),
        getLeaveApplications({ status: "PENDING", limit: 3 }),
        getPayroll({ month: selectedMonth.format("YYYY-MM"), status: "APPROVED" })
      ]);
      // Parse payroll data safely
      const payrollList = Array.isArray(payrollRes?.data) ? payrollRes.data : Array.isArray(payrollRes) ? payrollRes : [];
      let teachingTotal = 0, adminTotal = 0, opsTotal = 0;
      payrollList.forEach((p) => {
        const dept = (p.department || p.staff?.department || "").toLowerCase();
        const net = Number(p.netSalary) || 0;
        if (dept.includes("teach")) teachingTotal += net;
        else if (dept.includes("admin")) adminTotal += net;
        else if (dept.includes("operation") || dept.includes("logistic")) opsTotal += net;
      });
      const totalPayroll = teachingTotal + adminTotal + opsTotal;
      // ...existing code...
    } catch (error) {
      message.error("Failed to fetch dashboard data. Using offline overview.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth]);

  if (loading && !data) {
    return (
      <div className="p-8">
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 space-y-8 duration-700 animate-in fade-in">
      {/* Header & Date Picker (Added from existing to integrate with new ui seamlessly) */}
      <div className="flex flex-col justify-between gap-4 mb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#00152a] dark:text-white">HR Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-[#e4e9ed] px-4 py-2 rounded-full cursor-pointer hover:bg-[#dfe3e7] transition-colors">
            <span className="material-symbols-outlined text-[#00152a] text-[20px]">calendar_today</span>
            <DatePicker 
              picker="month" 
              value={selectedMonth} 
              onChange={(d) => { if(d) setSelectedMonth(d); }} 
              allowClear={false}
              bordered={false}
              className="text-sm font-bold text-[#00152a] p-0 bg-transparent w-[100px]"
            />
          </div>
          <button 
            onClick={fetchDashboard}
            className="p-2 text-[#43474d] hover:bg-[#f0f4f8] rounded-full transition-colors bg-white shadow-sm"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      {/* Insight Chips */}
      <div className="flex space-x-4">
        <div className="flex items-center space-x-3 px-6 py-3 bg-white rounded-full shadow-[0_20px_40px_rgba(1,29,53,0.06)] border-l-4 border-primary bg-surface-container-lowest">
          <span className="material-symbols-outlined text-[#00152a]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
          <span className="text-sm font-semibold text-[#00152a]">{pendingLeaves.length} Leaves pending approval today</span>
        </div>
        <div className="flex items-center space-x-3 px-6 py-3 bg-white rounded-full shadow-[0_20px_40px_rgba(1,29,53,0.06)] border-l-4 border-[#44ddc1] bg-surface-container-lowest">
          <span className="material-symbols-outlined text-[#00a28c]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
          <span className="text-sm font-semibold text-[#00a28c]">Attendance improved by 2.4% vs Mar 2024</span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* 1. Attendance Trends (Large Card) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] flex flex-col relative overflow-hidden border border-transparent transition-all bg-surface-container-lowest">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-[#00152a]">Attendance Trends</h3>
              <p className="text-sm text-[#43474d] font-body">Visualized across the last 4 weeks of {selectedMonth.format("MMMM YYYY")}</p>
            </div>
            <div className="flex space-x-6 text-right">
              <div>
                <div className="text-2xl font-black text-[#00152a]">{data.attendancePercent || "94.2"}%</div>
                <div className="text-[0.65rem] uppercase tracking-wider font-bold text-[#43474d]">Avg. Present</div>
              </div>
              <div className="h-10 w-[1px] bg-[#c3c6ce]/30"></div>
              <div>
                <div className="text-2xl font-black text-[#ba1a1a]">{((100 - (data.attendancePercent || 94.2)).toFixed(1))}%</div>
                <div className="text-[0.65rem] uppercase tracking-wider font-bold text-[#43474d]">Avg. Absent</div>
              </div>
            </div>
          </div>
          {/* Area Chart Visual Representation */}
          <div className="relative flex-1 w-full h-64 mt-4">
            <div className="absolute inset-0 flex items-end justify-between px-2">
              <div className="w-[12%] bg-[#00152a]/10 rounded-t-lg relative group transition-all hover:bg-[#00152a]/20 h-[85%]">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-[#00152a] opacity-0 group-hover:opacity-100 transition-opacity">92%</div>
                <div className="absolute bottom-0 w-full bg-[#00152a] h-[80%] rounded-t-lg"></div>
              </div>
              <div className="w-[12%] bg-[#00152a]/10 rounded-t-lg relative group transition-all hover:bg-[#00152a]/20 h-[92%]">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-[#00152a] opacity-0 group-hover:opacity-100 transition-opacity">96%</div>
                <div className="absolute bottom-0 w-full bg-[#00152a] h-[88%] rounded-t-lg"></div>
              </div>
              <div className="w-[12%] bg-[#00152a]/10 rounded-t-lg relative group transition-all hover:bg-[#00152a]/20 h-[88%]">
                <div className="absolute bottom-0 w-full bg-[#00152a] h-[84%] rounded-t-lg"></div>
              </div>
              <div className="w-[12%] bg-[#00152a]/10 rounded-t-lg relative group transition-all hover:bg-[#00152a]/20 h-[95%]">
                <div className="absolute bottom-0 w-full bg-[#00152a] h-[92%] rounded-t-lg"></div>
              </div>
              <div className="w-[12%] bg-[#00152a]/10 rounded-t-lg relative group transition-all hover:bg-[#00152a]/20 h-[80%]">
                <div className="absolute bottom-0 w-full bg-[#00152a] h-[75%] rounded-t-lg"></div>
              </div>
              <div className="w-[12%] bg-[#00152a]/10 rounded-t-lg relative group transition-all hover:bg-[#00152a]/20 h-[90%]">
                <div className="absolute bottom-0 w-full bg-[#00152a] h-[86%] rounded-t-lg"></div>
              </div>
            </div>
          </div>
          <div className="flex justify-between px-2 mt-4 text-[0.7rem] font-bold text-[#43474d] uppercase tracking-widest">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
            <span>Current</span>
          </div>
        </div>

        {/* 2. Leave Distribution */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] border border-transparent transition-all bg-surface-container-lowest">
          <h3 className="text-xl font-bold text-[#00152a] mb-6">Leave Distribution</h3>
          <div className="relative flex items-center justify-center py-8">
            <div className="w-48 h-48 rounded-full border-[18px] border-[#eaeef2] flex items-center justify-center relative overflow-hidden" style={{ background: "conic-gradient(#00152a 0deg 210deg, #44ddc1 210deg 300deg, #d1e4ff 300deg 360deg)" }}>
              <div className="flex flex-col items-center justify-center bg-white rounded-full shadow-inner w-28 h-28">
                <span className="text-3xl font-black text-[#00152a]">{data.totalLeaveDays ?? 0}</span>
                <span className="text-[0.65rem] uppercase font-bold text-[#43474d]">Total Days</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-[#00152a]"></div>
                <span className="text-sm font-semibold text-[#171c1f]">Paid Leaves</span>
              </div>
              <span className="text-sm font-black text-[#00152a]">{data.paidLeaves ?? 0}</span>
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-[#44ddc1]"></div>
                <span className="text-sm font-semibold text-[#171c1f]">Sick Leaves</span>
              </div>
              <span className="text-sm font-black text-[#00152a]">{data.sickLeaves ?? 0}</span>
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-[#d1e4ff]"></div>
                <span className="text-sm font-semibold text-[#171c1f]">Casual Leaves</span>
              </div>
              <span className="text-sm font-black text-[#00152a]">{data.casualLeaves ?? 0}</span>
            </div>
          </div>
        </div>

        {/* 3. Salary Distribution (Horizontal Bar) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] border border-transparent transition-all bg-surface-container-lowest">
          <h3 className="text-xl font-bold text-[#00152a] mb-8">Salary Distribution</h3>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-bold text-[#171c1f]">Teaching Faculty</span>
                <span className="font-black text-[#00152a]">₹{data.teachingTotal?.toLocaleString("en-IN") || 0}</span>
              </div>
              <div className="w-full bg-[#f0f4f8] h-3 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00152a] to-[#102a43]" style={{ width: `${data.totalPayroll ? (data.teachingTotal / data.totalPayroll) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-bold text-[#171c1f]">Administration</span>
                <span className="font-black text-[#00152a]">₹{data.adminTotal?.toLocaleString("en-IN") || 0}</span>
              </div>
              <div className="w-full bg-[#f0f4f8] h-3 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00152a] to-[#102a43]" style={{ width: `${data.totalPayroll ? (data.adminTotal / data.totalPayroll) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-bold text-[#171c1f]">Operations & Logistics</span>
                <span className="font-black text-[#00152a]">₹{data.opsTotal?.toLocaleString("en-IN") || 0}</span>
              </div>
              <div className="w-full bg-[#f0f4f8] h-3 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00152a] to-[#102a43]" style={{ width: `${data.totalPayroll ? (data.opsTotal / data.totalPayroll) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#c3c6ce]/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-body text-[#43474d]">Total Payroll Liability</span>
              <span className="text-lg font-black text-[#00152a]">₹{(data.totalPayroll / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        {/* 4. Statutory Pools (Stacked Bar) */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] flex flex-col justify-between border border-transparent transition-all bg-surface-container-lowest">
          <div>
            <h3 className="text-xl font-bold text-[#00152a] mb-2">Statutory Polls</h3>
            <p className="text-[0.7rem] uppercase tracking-widest font-bold text-[#43474d] mb-8">PF & ESI Contributions</p>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-48 bg-[#f0f4f8] rounded-2xl relative overflow-hidden flex flex-col justify-end">
                <div className="h-[65%] w-full bg-[#00152a] border-b border-white/20 relative group">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#00152a]/90 transition-opacity">
                    <span className="text-[10px] font-bold text-white">PF</span>
                  </div>
                </div>
                <div className="h-[35%] w-full bg-[#44ddc1] relative group">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#44ddc1]/90 transition-opacity">
                    <span className="text-[10px] font-bold text-[#00201a]">ESI</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-[#00152a]">₹{((data.pfContribution + data.esiContribution) / 1000000).toFixed(2)}M</div>
                <div className="flex items-center justify-center text-[#00a28c] text-xs font-bold mt-1">
                  <span className="material-symbols-outlined text-[16px] mr-1">arrow_upward</span>
                  <span>1.2% Trend</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Staffing by Department */}
        <div className="col-span-12 lg:col-span-4 bg-[#00152a] text-white rounded-xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] relative overflow-hidden transition-opacity">
          <div className="absolute w-40 h-40 rounded-full -right-10 -top-10 bg-white/5 blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#d1e4ff]/5 rounded-full blur-3xl"></div>
          <h3 className="mb-8 text-xl font-bold">Staffing Insights</h3>
          <div className="space-y-6">
            <div className="group">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm font-semibold opacity-80">Teaching</span>
                <span className="text-xl font-black">{data.teachingStaff ?? 0}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full">
                <div className="h-full bg-[#d1e4ff] rounded-full" style={{ width: `${data.teachingStaffPercent ?? 0}%` }}></div>
              </div>
            </div>
            <div className="group">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm font-semibold opacity-80">Admin</span>
                <span className="text-xl font-black">{data.adminStaff ?? 0}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full">
                <div className="h-full bg-[#d1e4ff] rounded-full" style={{ width: `${data.adminStaffPercent ?? 0}%` }}></div>
              </div>
            </div>
            <div className="group">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm font-semibold opacity-80">Logistics</span>
                <span className="text-xl font-black">{data.logisticsStaff ?? 0}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full">
                <div className="h-full bg-[#d1e4ff] rounded-full" style={{ width: `${data.logisticsStaffPercent ?? 0}%` }}></div>
              </div>
            </div>
          </div>
          <div className="p-4 mt-12 border bg-white/10 rounded-xl border-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="material-symbols-outlined text-[#d1e4ff]">groups</span>
                <span className="text-xs font-bold tracking-widest uppercase">Total Active Staff</span>
              </div>
              <span className="text-xl font-black">{data.totalStaff?.toLocaleString() || "1,248"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Details Section (Editorial Style) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 pb-24 border-t border-[#c3c6ce]/20">
        <div className="space-y-4">
          <h4 className="text-2xl font-black text-[#00152a] leading-tight">Human-Centric Intelligence.</h4>
          <p className="text-sm text-[#43474d] leading-relaxed">The Architect leverages predictive modeling to identify staff churn risks and optimize payroll efficiency across all institution levels.</p>
          <div className="flex items-center space-x-2 text-[#00152a] font-black text-sm group select-none">
            <span>Read Compliance Report</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </div>
        </div>
        <div className="grid grid-cols-2 col-span-2 gap-4 md:grid-cols-4">
          <div className="bg-[#f0f4f8] p-6 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="material-symbols-outlined text-[#00152a] text-3xl">verified_user</span>
            <div>
              <div className="text-sm font-bold text-[#00152a]">99.8%</div>
              <div className="text-[10px] text-[#43474d] font-bold uppercase tracking-tighter">PF Accuracy</div>
            </div>
          </div>
          <div className="bg-[#f0f4f8] p-6 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="material-symbols-outlined text-[#00152a] text-3xl">timer</span>
            <div>
              <div className="text-sm font-bold text-[#00152a]">12min</div>
              <div className="text-[10px] text-[#43474d] font-bold uppercase tracking-tighter">Avg Late Log</div>
            </div>
          </div>
          <div className="bg-[#f0f4f8] p-6 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="material-symbols-outlined text-[#00152a] text-3xl">diversity_3</span>
            <div>
              <div className="text-sm font-bold text-[#00152a]">12:1</div>
              <div className="text-[10px] text-[#43474d] font-bold uppercase tracking-tighter">Student-Staff</div>
            </div>
          </div>
          <div className="bg-[#f0f4f8] p-6 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="material-symbols-outlined text-[#00152a] text-3xl">rocket_launch</span>
            <div>
              <div className="text-sm font-bold text-[#00152a]">+8%</div>
              <div className="text-[10px] text-[#43474d] font-bold uppercase tracking-tighter">Efficiency</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HRDashboardPage;
