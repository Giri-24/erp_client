import React, { useEffect, useState, useCallback } from "react";
import { Form, message, Select } from "antd";
import {
  assignFeeToStudent,
  getFeeStructureByStandard,
  checkDiscountEligibility,
  getAcademicYears,
  getAllStudentFees,
} from "../fees.service";
import { getTransportFee } from "../../transport/transport.service";
import instance from "../../../utils/axios";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? "bg-primary" : "bg-surface-container-highest"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white border border-gray-200 shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

// ── component ─────────────────────────────────────────────────────────────────
const AssignFeePage = () => {
  const [form] = Form.useForm();

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [structurePreview, setStructurePreview] = useState(null);
  const [transportFeePreview, setTransportFeePreview] = useState(null);
  const [discountEligibility, setDiscountEligibility] = useState(null);

  // fee fields (editable)
  const [fees, setFees] = useState({
    tuitionFee: 0,
    transportFee: 0,
    bookFee: 0,
    hostelFee: 0,
    otherFee: 0,
  });

  // custom items
  const [customItems, setCustomItems] = useState([]);

  // discount toggles
  const [discountToggles, setDiscountToggles] = useState({
    autoTeacherDiscount: false,
    autoSiblingDiscount: false,
    autoRteDiscount: false,
  });

  // manual discounts
  const [manualDiscounts, setManualDiscounts] = useState([]);

  const [loading, setLoading] = useState(false);
  const canAssignFee = hasPermission(PERMISSIONS.FEES_ASSIGN);

  // ── load initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    instance.get("/admissions").then((res) => {
      const active = res.data.filter((s) => s.users?.isActive !== false);
      setStudents(active);
    });
    getAcademicYears()
      .then((data) => {
        const years = Array.isArray(data) ? data : [];
        setAcademicYears(years);
        if (years.length) setSelectedYear(years[0]);
      })
      .catch(() => {});
    getAllStudentFees()
      .then((data) => setRecentAssignments((data || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  // ── derived totals ────────────────────────────────────────────────────────
  const grossFee =
    (fees.tuitionFee || 0) +
    (fees.transportFee || 0) +
    (fees.bookFee || 0) +
    (fees.hostelFee || 0) +
    (fees.otherFee || 0) +
    customItems.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const autoDiscountAmount = (() => {
    if (!discountEligibility) return 0;
    let total = 0;
    if (discountToggles.autoTeacherDiscount && discountEligibility.teacherDiscount?.eligible)
      total += grossFee * ((discountEligibility.teacherDiscount.percentage || 0) / 100);
    if (discountToggles.autoSiblingDiscount && discountEligibility.siblingDiscount?.eligible)
      total += grossFee * ((discountEligibility.siblingDiscount.percentage || 0) / 100);
    if (discountToggles.autoRteDiscount && discountEligibility.rteDiscount?.eligible)
      total += grossFee * ((discountEligibility.rteDiscount.percentage || 0) / 100);
    return total;
  })();

  const manualDiscountAmount = manualDiscounts.reduce((s, d) => {
    if (d.type === "FLAT") return s + (Number(d.value) || 0);
    if (d.type === "PERCENTAGE") return s + grossFee * ((Number(d.value) || 0) / 100);
    return s;
  }, 0);

  const totalDiscount = autoDiscountAmount + manualDiscountAmount;
  const netFee = Math.max(grossFee - totalDiscount, 0);

  // ── student change ────────────────────────────────────────────────────────
  const onStudentChange = async (studentId) => {
    const student = students.find((s) => s.id === studentId);
    setSelectedStudent(student);

    try {
      const fee = await getTransportFee(studentId);
      setTransportFeePreview(fee);
      if (fee?.totalFee > 0) setFees((prev) => ({ ...prev, transportFee: fee.totalFee }));
    } catch {
      setTransportFeePreview(null);
    }

    try {
      const el = await checkDiscountEligibility(studentId);
      setDiscountEligibility(el);
      setDiscountToggles({
        autoTeacherDiscount: el.teacherDiscount?.eligible || false,
        autoSiblingDiscount: el.siblingDiscount?.eligible || false,
        autoRteDiscount: el.rteDiscount?.eligible || false,
      });
    } catch {
      setDiscountEligibility(null);
    }

    if (student && selectedYear) loadStructure(student.standard, selectedYear);
  };

  const onYearChange = (year) => {
    setSelectedYear(year);
    if (selectedStudent && year) loadStructure(selectedStudent.standard, year);
  };

  const loadStructure = async (standard, academicYear) => {
    try {
      const structure = await getFeeStructureByStandard(standard, academicYear);
      if (structure) {
        setStructurePreview(structure);
        setFees((prev) => ({
          tuitionFee: structure.tuitionFee || 0,
          transportFee: prev.transportFee || structure.transportFee || 0,
          bookFee: structure.bookFee || 0,
          hostelFee: structure.hostelFee || 0,
          otherFee: structure.otherFee || 0,
        }));
        setCustomItems(
          structure.customItems?.map((ci) => ({ name: ci.name, amount: ci.amount })) || []
        );
      } else {
        setStructurePreview(null);
      }
    } catch {
      setStructurePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!canAssignFee) { message.error("You are not authorized to assign fees"); return; }
    if (!selectedStudent) { message.error("Please select a student"); return; }
    if (!selectedYear) { message.error("Please select an academic year"); return; }

    setLoading(true);
    try {
      await assignFeeToStudent({
        studentId: selectedStudent.id,
        academicYear: selectedYear,
        ...fees,
        customItems,
        autoTeacherDiscount: discountToggles.autoTeacherDiscount,
        autoSiblingDiscount: discountToggles.autoSiblingDiscount,
        autoRteDiscount: discountToggles.autoRteDiscount,
        discounts: manualDiscounts.filter((d) => d.type && d.value),
      });
      message.success("Fee assigned successfully!");
      // reset
      setSelectedStudent(null);
      setSelectedYear(academicYears[0] || "");
      setStructurePreview(null);
      setDiscountEligibility(null);
      setTransportFeePreview(null);
      setFees({ tuitionFee: 0, transportFee: 0, bookFee: 0, hostelFee: 0, otherFee: 0 });
      setCustomItems([]);
      setManualDiscounts([]);
      setDiscountToggles({ autoTeacherDiscount: false, autoSiblingDiscount: false, autoRteDiscount: false });
      // refresh list
      getAllStudentFees().then((data) => setRecentAssignments((data || []).slice(0, 5))).catch(() => {});
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to assign fee");
    }
    setLoading(false);
  };

  // ── fee input helper ──────────────────────────────────────────────────────
  const FeeInput = ({ label, field }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-3.5 text-on-surface-variant font-bold text-sm">₹</span>
        <input
          type="number"
          min={0}
          value={fees[field]}
          onChange={(e) => setFees((prev) => ({ ...prev, [field]: Number(e.target.value) || 0 }))}
          className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-8 pr-4 text-on-surface focus:bg-surface-container-highest focus:ring-2 focus:ring-primary/30 transition-all font-bold outline-none"
        />
      </div>
    </div>
  );

  // ── discount row helper ───────────────────────────────────────────────────
  const DiscountRow = ({ label, sub, field, eligible, pct, reason }) => (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-bold text-sm text-on-surface">
          {label}
          {eligible && pct ? (
            <span className="ml-2 text-[10px] bg-[#44ddc1]/20 text-[#001813] px-2 py-0.5 rounded-full font-bold">
              {pct}% off
            </span>
          ) : null}
        </div>
        <div className="text-xs text-on-surface-variant">{eligible ? reason || sub : sub}</div>
      </div>
      <ToggleSwitch
        checked={discountToggles[field]}
        onChange={(v) => setDiscountToggles((prev) => ({ ...prev, [field]: v }))}
        disabled={!eligible}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
          <span className="hover:text-primary cursor-pointer transition-colors">Finance</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Fees</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Assign</span>
        </nav>
        <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
          Assign Student Fees
        </h2>
      </div>

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── left: form (spans 2 cols) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Student + Year selection */}
          <div className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.04)] relative overflow-hidden">
            {/* decorative icon */}
            <span className="material-symbols-outlined absolute top-6 right-6 text-8xl text-primary/5 pointer-events-none select-none">
              school
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
              <div className="space-y-2">
                <label className="block font-headline font-bold text-sm text-on-surface-variant/80">
                  Student
                </label>
                <div className="relative">
                  <select
                    value={selectedStudent?.id || ""}
                    onChange={(e) => e.target.value && onStudentChange(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none transition-all outline-none font-body"
                  >
                    <option value="">Select student...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.standard}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block font-headline font-bold text-sm text-on-surface-variant/80">
                  Academic Year
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none transition-all outline-none font-body"
                  >
                    <option value="">Select year...</option>
                    {academicYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant">
                    event
                  </span>
                </div>
              </div>
            </div>

            {/* Structure loaded banner */}
            {structurePreview && (
              <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-2.5">
                <span className="material-symbols-outlined text-base text-primary">
                  auto_awesome
                </span>
                Fee structure auto-loaded for&nbsp;
                <span className="font-bold text-primary">{structurePreview.standard}</span>
                &nbsp;—&nbsp;
                {structurePreview.numberOfTerms > 1
                  ? `${structurePreview.numberOfTerms} terms`
                  : "1 term"}
                {transportFeePreview?.totalFee > 0 && (
                  <span className="ml-2">
                    · Transport: <span className="font-bold text-primary">{fmt(transportFeePreview.totalFee)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fee breakdown */}
          <div className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">analytics</span>
                Fee Breakdown
              </h4>
              <button
                type="button"
                onClick={() => setCustomItems([...customItems, { name: "", amount: 0 }])}
                className="text-sm font-bold text-on-surface-variant flex items-center gap-1 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add Custom Fee
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <FeeInput label="Tuition Fee" field="tuitionFee" />
              <FeeInput label="Transport Fee" field="transportFee" />
              <FeeInput label="Book Fee" field="bookFee" />
              <FeeInput label="Hostel Fee" field="hostelFee" />
              <div className="md:col-span-2">
                <FeeInput label="Other Fee / Lab Charges" field="otherFee" />
              </div>
            </div>

            {/* Custom items */}
            {customItems.length > 0 && (
              <div className="mt-5 space-y-3 pt-5 border-t border-outline-variant/20">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Custom Fee Items
                </p>
                {customItems.map((ci, idx) => (
                  <div key={idx} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Fee name (e.g. Lab Fee)"
                      value={ci.name}
                      onChange={(e) => {
                        const next = [...customItems];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setCustomItems(next);
                      }}
                      className="flex-1 bg-surface-container-high border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none font-body text-sm"
                    />
                    <div className="relative w-40">
                      <span className="absolute left-3 top-3.5 text-on-surface-variant font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={ci.amount}
                        onChange={(e) => {
                          const next = [...customItems];
                          next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 };
                          setCustomItems(next);
                        }}
                        className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-7 pr-4 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomItems(customItems.filter((_, i) => i !== idx))}
                      className="w-10 h-10 mt-1 flex items-center justify-center rounded-xl hover:bg-error-container text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── right: discounts + summary ── */}
        <div className="space-y-5">

          {/* Discount card */}
          <div className="bg-surface-container rounded-2xl p-7">
            <h4 className="font-headline font-bold text-lg text-primary mb-5">
              Auto Discounts
            </h4>
            <div className="space-y-5">
              <DiscountRow
                label="Teacher Discount"
                sub="Eligible staff dependents"
                field="autoTeacherDiscount"
                eligible={discountEligibility?.teacherDiscount?.eligible}
                pct={discountEligibility?.teacherDiscount?.percentage}
                reason={discountEligibility?.teacherDiscount?.reason}
              />
              <DiscountRow
                label="Sibling Discount"
                sub="Applied via linked profiles"
                field="autoSiblingDiscount"
                eligible={discountEligibility?.siblingDiscount?.eligible}
                pct={discountEligibility?.siblingDiscount?.percentage}
                reason={discountEligibility?.siblingDiscount?.reason}
              />
              <DiscountRow
                label="RTE / Community"
                sub="Government mandate relief"
                field="autoRteDiscount"
                eligible={discountEligibility?.rteDiscount?.eligible}
                pct={discountEligibility?.rteDiscount?.percentage}
                reason={discountEligibility?.rteDiscount?.reason}
              />
            </div>

            {/* Manual discount section */}
            <div className="mt-6 pt-6 border-t border-outline-variant/20 space-y-3">
              {manualDiscounts.map((d, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    value={d.type}
                    onChange={(e) => {
                      const next = [...manualDiscounts];
                      next[idx] = { ...next[idx], type: e.target.value };
                      setManualDiscounts(next);
                    }}
                    className="flex-1 bg-surface-container-high border-none rounded-lg py-2 px-3 text-sm outline-none"
                  >
                    <option value="">Type</option>
                    <option value="FLAT">Flat (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="TEACHER_DISCOUNT">Teacher</option>
                    <option value="SIBLING_DISCOUNT">Sibling</option>
                    <option value="RTE_COMMUNITY">RTE</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    placeholder="Value"
                    value={d.value}
                    onChange={(e) => {
                      const next = [...manualDiscounts];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setManualDiscounts(next);
                    }}
                    className="w-20 bg-surface-container-high border-none rounded-lg py-2 px-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setManualDiscounts(manualDiscounts.filter((_, i) => i !== idx))}
                    className="w-8 h-8 mt-0.5 flex items-center justify-center rounded-lg hover:bg-error-container text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setManualDiscounts([...manualDiscounts, { type: "", value: "", reason: "" }])}
                className="w-full bg-surface-container-highest text-primary border-none py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white transition-all"
              >
                <span className="material-symbols-outlined text-lg">sell</span>
                Add Manual Discount
              </button>
            </div>
          </div>

          {/* Sibling insight chip */}
          {discountEligibility?.siblingDiscount?.eligible && (
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#44ddc1]/25 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-sm text-[#001813]">tips_and_updates</span>
              </div>
              <p className="text-xs font-medium text-on-surface-variant">
                {discountEligibility.siblingDiscount.reason || "Sibling discount eligible"}
              </p>
            </div>
          )}

          {/* Summary / CTA card */}
          <div className="bg-primary-container rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <h4 className="font-headline font-bold text-lg text-on-primary-container mb-5">
              Total Assignment Value
            </h4>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between text-sm text-on-primary-container/70">
                <span>Gross Fee</span>
                <span>{fmt(grossFee)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-[#44ddc1] font-bold">
                  <span>Total Discount</span>
                  <span>− {fmt(totalDiscount)}</span>
                </div>
              )}
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between text-2xl font-headline font-black text-white">
                <span>Net Total</span>
                <span>{fmt(netFee)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={loading || !canAssignFee}
              onClick={handleSubmit}
                  style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 px-6 rounded-xl font-headline font-extrabold tracking-tight text-base shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  Assigning...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                  Assign Fee
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── recent assignments table ── */}
      <div className="mt-6">
        <h4 className="font-headline font-bold text-2xl text-primary mb-5">
          Recent Fee Assignments
        </h4>
        <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm">
          {/* header */}
          <div className="grid grid-cols-5 px-7 py-3.5 bg-surface-container-high">
            {["Student", "Standard", "Academic Year", "Net Fee", "Status"].map((h) => (
              <span key={h} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {h}
              </span>
            ))}
          </div>

          {recentAssignments.length === 0 ? (
            <div className="px-7 py-10 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">receipt_long</span>
              No recent assignments found
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {recentAssignments.map((fee, idx) => (
                <div
                  key={fee.id || idx}
                  className={`grid grid-cols-5 px-7 py-5 items-center transition-colors ${
                    idx % 2 === 0
                      ? "bg-white hover:bg-surface-bright"
                      : "bg-surface-container-low hover:bg-surface-bright"
                  }`}
                >
                  {/* Student name */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm flex-shrink-0">
                      {(fee.student?.name || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-primary text-sm truncate">
                      {fee.student?.name || "—"}
                    </span>
                  </div>

                  {/* Standard */}
                  <span className="text-sm text-on-surface-variant">
                    {fee.student?.standard || "—"}
                  </span>

                  {/* Academic year */}
                  <span className="text-sm text-on-surface-variant">{fee.academicYear || "—"}</span>

                  {/* Net fee */}
                  <span className="font-bold text-on-surface">{fmt(fee.netFee)}</span>

                  {/* Status */}
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#44ddc1]/20 text-[#001813] text-[10px] font-black uppercase tracking-tight">
                      Assigned
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignFeePage;
