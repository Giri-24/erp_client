import React, { useEffect, useState } from "react";
import { message } from "antd";
import {
  createAdvanceRequest,
  getAdvanceRequests,
  approveAdvance,
  rejectAdvance,
  disburseAdvance,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const fmt = (v) => "₹" + Math.round(Number(v || 0)).toLocaleString("en-IN");

const STATUS_COLORS = {
  REQUESTED: { bg: "bg-[#fff8e1]", text: "text-[#f57f17]" },
  APPROVED: { bg: "bg-primary-container/30", text: "text-primary" },
  REJECTED: { bg: "bg-error-container", text: "text-error" },
  DISBURSED: { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]" },
  REPAYING: { bg: "bg-secondary-container", text: "text-secondary" },
  CLOSED: { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
};

const TYPE_LABELS = {
  FIXED_ADVANCE: "Fixed Advance",
  SALARY_ADVANCE: "Salary Advance",
  OTHER_ADVANCE: "Other Advance",
};

const CATEGORY_LABELS = {
  TEACHING_REGULAR: "Teaching",
  TEACHING_TRAINEE: "Teaching (Trainee)",
  NON_TEACHING_REGULAR: "Non-Teaching",
  NON_TEACHING_TRAINEE: "Non-Teaching (Trainee)",
};

const AdvanceRequestPage = () => {
  const [advances, setAdvances] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Form state
  const [formStaffId, setFormStaffId] = useState("");
  const [formType, setFormType] = useState("SALARY_ADVANCE");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formMonthlyDeduction, setFormMonthlyDeduction] = useState("");

  const userEmail = JSON.parse(localStorage.getItem("user") || "{}").email || "";

  const canManage = hasPermission(PERMISSIONS.HR_PAYROLL_MANAGE);
  const canApprove = hasPermission(PERMISSIONS.HR_PAYROLL_APPROVE);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [advData, staffData] = await Promise.all([getAdvanceRequests({}), getAllStaff()]);
      setAdvances(advData || []);
      setStaffList((staffData || []).filter((s) => s.isActive));
    } catch {
      message.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formStaffId || !formAmount) return message.warning("Staff and amount are required");
    try {
      await createAdvanceRequest({
        staffId: formStaffId,
        type: formType,
        amount: Number(formAmount),
        reason: formReason || undefined,
        monthlyDeduction: formMonthlyDeduction ? Number(formMonthlyDeduction) : undefined,
      });
      message.success("Advance request created");
      setShowForm(false);
      setFormStaffId("");
      setFormAmount("");
      setFormReason("");
      setFormMonthlyDeduction("");
      loadData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create request");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveAdvance(id, userEmail);
      message.success("Approved");
      loadData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await rejectAdvance(rejectId, userEmail, rejectReason);
      message.success("Rejected");
      setRejectId(null);
      setRejectReason("");
      loadData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  const handleDisburse = async (id) => {
    try {
      await disburseAdvance(id);
      message.success("Disbursed");
      loadData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to disburse");
    }
  };

  const filtered = filterStatus === "ALL" ? advances : advances.filter((a) => a.status === filterStatus);

  // Stats
  const totalPending = advances.filter((a) => a.status === "REQUESTED").length;
  const totalActive = advances.filter((a) => ["DISBURSED", "REPAYING"].includes(a.status)).length;
  const totalOutstanding = advances.filter((a) => ["DISBURSED", "REPAYING"].includes(a.status)).reduce((s, a) => s + a.balanceRemaining, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
            <span>HR</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-bold">Advance / Loan</span>
          </nav>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Advance & Loan Requests
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Ticket-based advance request workflow — request, approve, disburse, auto-deduct from payroll.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Request
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "pending_actions", label: "Pending Requests", value: totalPending, bg: "bg-[#fff8e1]", ic: "text-[#f57f17]" },
          { icon: "account_balance_wallet", label: "Active Advances", value: totalActive, bg: "bg-primary-container/30", ic: "text-primary" },
          { icon: "trending_down", label: "Outstanding Balance", value: fmt(totalOutstanding), bg: "bg-error-container/50", ic: "text-error" },
        ].map(({ icon, label, value, bg, ic }) => (
          <div key={label} className="bg-white p-5 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined ${ic} text-xl`}>{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
              <p className="text-lg font-black text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-primary">Create Advance Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-on-surface-variant">Staff</label>
              <select value={formStaffId} onChange={(e) => setFormStaffId(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm">
                <option value="">Select staff...</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.employeeId})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-on-surface-variant">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm">
                <option value="SALARY_ADVANCE">Salary Advance</option>
                <option value="FIXED_ADVANCE">Fixed Advance</option>
                <option value="OTHER_ADVANCE">Other Advance</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-on-surface-variant">Amount (₹)</label>
              <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-on-surface-variant">Monthly Deduction (₹)</label>
              <input type="number" value={formMonthlyDeduction} onChange={(e) => setFormMonthlyDeduction(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm" placeholder="Full amount if blank" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1 text-on-surface-variant">Reason</label>
              <input value={formReason} onChange={(e) => setFormReason(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm" placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90">
              Submit Request
            </button>
            <button onClick={() => setShowForm(false)} className="bg-surface-container-high text-on-surface-variant px-6 py-2.5 rounded-xl text-sm font-bold">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "REQUESTED", "APPROVED", "DISBURSED", "REPAYING", "CLOSED", "REJECTED"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === s ? "bg-primary text-white shadow-md" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"}`}>
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            {s !== "ALL" && <span className="ml-1.5 opacity-70">({advances.filter((a) => a.status === s).length})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.05)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-spin block mb-2">refresh</span>
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {["Ticket No", "Staff", "Category", "Type", "Amount", "Monthly Ded.", "Repaid", "Balance", "Status", "Actions"].map((h) => (
                    <th key={h} className="py-3.5 px-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">request_quote</span>
                      <p className="text-sm font-medium">No advance requests</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const sc = STATUS_COLORS[a.status] || STATUS_COLORS.REQUESTED;
                    return (
                      <tr key={a.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="py-4 px-5 text-sm font-bold text-primary">{a.ticketNo}</td>
                        <td className="py-4 px-5">
                          <p className="text-sm font-bold">{a.staff?.name || "—"}</p>
                          <p className="text-[10px] text-on-surface-variant">{a.staff?.employeeId}</p>
                        </td>
                        <td className="py-4 px-5 text-xs font-medium">{CATEGORY_LABELS[a.staff?.category] || "—"}</td>
                        <td className="py-4 px-5">
                          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-xs font-bold">{TYPE_LABELS[a.type] || a.type}</span>
                        </td>
                        <td className="py-4 px-5 text-sm font-bold">{fmt(a.amount)}</td>
                        <td className="py-4 px-5 text-sm font-medium">{fmt(a.monthlyDeduction)}/mo</td>
                        <td className="py-4 px-5 text-sm font-medium text-[#2e7d32]">{fmt(a.totalRepaid)}</td>
                        <td className="py-4 px-5 text-sm font-bold text-error">{fmt(a.balanceRemaining)}</td>
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex gap-1.5">
                            {canApprove && a.status === "REQUESTED" && (
                              <>
                                <button onClick={() => handleApprove(a.id)} className="p-1.5 rounded-lg bg-[#e8f5e9] text-[#2e7d32] hover:opacity-80" title="Approve">
                                  <span className="material-symbols-outlined text-base">check</span>
                                </button>
                                <button onClick={() => setRejectId(a.id)} className="p-1.5 rounded-lg bg-error-container text-error hover:opacity-80" title="Reject">
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </>
                            )}
                            {canManage && a.status === "APPROVED" && (
                              <button onClick={() => handleDisburse(a.id)} className="p-1.5 rounded-lg bg-primary-container/30 text-primary hover:opacity-80" title="Disburse">
                                <span className="material-symbols-outlined text-base">payments</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setRejectId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary">Reject Advance Request</h3>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-on-surface-variant">Reason</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm" placeholder="Reason for rejection..." />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} className="bg-error text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90">
                Reject
              </button>
              <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="bg-surface-container-high text-on-surface-variant px-6 py-2.5 rounded-xl text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceRequestPage;
