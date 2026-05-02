import React, { useEffect, useState, useCallback } from "react";
import { Form, message, Select, Modal, InputNumber, Radio } from "antd";
import { useMemo } from "react";

import {
  assignFeeToStudent,
  assignFeeToClass,
  getFeeStructureByStandard,
  checkDiscountEligibility,
  getAcademicYears,
  getAllStudentFees,
  getStudentFee,
  collectPayment,
  getNextReceiptNo,
  cancelPayment,
  refundPayment,
  getPaymentsByStudentFee,
} from "../fees.service";
import { getTransportFee } from "../../transport/transport.service";
import instance from "../../../utils/axios";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

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
const AssignFeePage = ({ initialStudentId, onMounted }) => {
  const [form] = Form.useForm();

  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [filterStandard, setFilterStandard] = useState("");
  const [filterSection, setFilterSection] = useState("");
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

  // manual override values for the eligibility toggles
  const [discountValues, setDiscountValues] = useState({
    autoTeacherDiscount: { type: "PERCENTAGE", value: "" },
    autoSiblingDiscount: { type: "PERCENTAGE", value: "" },
    autoRteDiscount: { type: "PERCENTAGE", value: "" },
  });

  // manual discounts
  const [manualDiscounts, setManualDiscounts] = useState([]);

  const [loading, setLoading] = useState(false);
  const { hasPermission } = usePermissionHelpers();
  const canAssignFee = hasPermission(PERMISSIONS.FEES_ASSIGN);
  const canCollectFee = hasPermission(PERMISSIONS.FEES_COLLECT);

  // existing fee data (when student already has fees assigned)
  const [existingFee, setExistingFee] = useState(null);
  const [existingPayments, setExistingPayments] = useState([]);

  // inline payment fields
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const [payTerm, setPayTerm] = useState(null);
  const [payRemarks, setPayRemarks] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // bulk assign
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkStandard, setBulkStandard] = useState("");
  const [bulkSection, setBulkSection] = useState("");
  const [bulkYear, setBulkYear] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // cancel/refund modal
  const [cancelModal, setCancelModal] = useState({ open: false, payment: null, action: "", reason: "", refundAmount: 0 });

  // ── load initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    instance.get("/admissions").then((res) => {
      const active = res.data.filter((s) => s.users?.isActive !== false);
      setStudents(active);
      // Auto-select student if navigated from StudentView
      if (initialStudentId) {
        const match = active.find((s) => s.id === initialStudentId);
        if (match) {
          // Trigger student selection asynchronously once years are loaded
          setTimeout(() => onStudentChange(initialStudentId), 200);
        }
        if (onMounted) onMounted();
      }
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const calc = (field, eligible) => {
      if (discountToggles[field] && eligible) {
        const val = Number(discountValues[field].value) || 0;
        return discountValues[field].type === "PERCENTAGE" ? grossFee * (val / 100) : val;
      }
      return 0;
    };
    total += calc("autoTeacherDiscount", discountEligibility.teacherDiscount?.eligible);
    total += calc("autoSiblingDiscount", discountEligibility.siblingDiscount?.eligible);
    total += calc("autoRteDiscount", discountEligibility.rteDiscount?.eligible);
    return total;
  })();

  const manualDiscountAmount = manualDiscounts.reduce((s, d) => {
    if (d.type === "FLAT") {
      return s + (Number(d.value) || 0);
    }
    if (d.type === "PERCENTAGE") {
      return s + grossFee * ((Number(d.value) || 0) / 100);
    }
    return s;
  }, 0);

  const totalDiscount = autoDiscountAmount + manualDiscountAmount;
  const netFee = Math.max(grossFee - totalDiscount, 0);

  // ── student change ────────────────────────────────────────────────────────
  const onStudentChange = async (studentId) => {
    const student = students.find((s) => s.id === studentId);
    setSelectedStudent(student);
    setExistingFee(null);
    setExistingPayments([]);

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
      setDiscountValues({
        autoTeacherDiscount: { type: "PERCENTAGE", value: "" },
        autoSiblingDiscount: { type: "PERCENTAGE", value: "" },
        autoRteDiscount: { type: "PERCENTAGE", value: "" },
      });
    } catch {
      setDiscountEligibility(null);
    }

    if (student && selectedYear) {
      loadStructure(student.standard, selectedYear);
      // check if fee already assigned
      try {
        const ef = await getStudentFee(studentId, selectedYear);
        if (ef) {
          setExistingFee(ef);
          const pays = await getPaymentsByStudentFee(ef.id);
          setExistingPayments(pays || []);
        }
      } catch { /* no existing fee */ }
    }
  };

  const onYearChange = async (year) => {
    setSelectedYear(year);
    setFilterStandard("");
    setFilterSection("");
    setSelectedStudent(null);
    setExistingFee(null);
    setExistingPayments([]);
    if (selectedStudent && year) {
      loadStructure(selectedStudent.standard, year);
      try {
        const ef = await getStudentFee(selectedStudent.id, year);
        if (ef) {
          setExistingFee(ef);
          const pays = await getPaymentsByStudentFee(ef.id);
          setExistingPayments(pays || []);
        }
      } catch { /* no existing fee */ }
    }
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
      const finalDiscounts = manualDiscounts
        .filter((d) => d.type && d.value !== "" && d.value !== null)
        .map((d) => ({ ...d, value: Number(d.value) || 0 }));
        
      if (discountToggles.autoTeacherDiscount && discountEligibility?.teacherDiscount?.eligible) {
        finalDiscounts.push({ type: discountValues.autoTeacherDiscount.type, value: Number(discountValues.autoTeacherDiscount.value) || 0, reason: "Teacher Discount" });
      }
      if (discountToggles.autoSiblingDiscount && discountEligibility?.siblingDiscount?.eligible) {
        finalDiscounts.push({ type: discountValues.autoSiblingDiscount.type, value: Number(discountValues.autoSiblingDiscount.value) || 0, reason: "Sibling Discount" });
      }
      if (discountToggles.autoRteDiscount && discountEligibility?.rteDiscount?.eligible) {
        finalDiscounts.push({ type: discountValues.autoRteDiscount.type, value: Number(discountValues.autoRteDiscount.value) || 0, reason: "RTE / Community Discount" });
      }

      // Pass terms from structure so backend creates them even when tuitionFee is explicit
      const termsFromStructure = (structurePreview?.terms || []).map((t) => ({
        termNumber: t.termNumber,
        termName: t.termName,
        amount: t.amount,
        dueDate: t.dueDate ? t.dueDate.split("T")[0] : undefined,
      }));

      await assignFeeToStudent({
        studentId: selectedStudent.id,
        academicYear: selectedYear,
        ...fees,
        customItems,
        terms: termsFromStructure.length > 0 ? termsFromStructure : undefined,
        autoTeacherDiscount: false, // disabled auto flags since we pass calculated manually
        autoSiblingDiscount: false,
        autoRteDiscount: false,
        discounts: finalDiscounts,
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
      setDiscountValues({
        autoTeacherDiscount: { type: "PERCENTAGE", value: "" },
        autoSiblingDiscount: { type: "PERCENTAGE", value: "" },
        autoRteDiscount: { type: "PERCENTAGE", value: "" },
      });
      // refresh list
      getAllStudentFees().then((data) => setRecentAssignments((data || []).slice(0, 5))).catch(() => {});
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to assign fee");
    }
    setLoading(false);
  };

  // ── inline payment handler ──────────────────────────────────────────────
  const handleInlinePayment = async () => {
    if (!existingFee) return;
    if (!payAmount || Number(payAmount) <= 0) { message.error("Enter a valid amount"); return; }
    setPayLoading(true);
    try {
      const payload = {
        studentFeeId: existingFee.id,
        amount: Number(payAmount),
        paymentMode: payMode,
        remarks: payRemarks || undefined,
      };
      if (payTerm) payload.termNumber = payTerm;
      await collectPayment(payload);
      message.success("Payment collected!");
      setPayAmount("");
      setPayRemarks("");
      setPayTerm(null);
      // refresh
      const ef = await getStudentFee(selectedStudent.id, selectedYear);
      setExistingFee(ef);
      const pays = await getPaymentsByStudentFee(ef.id);
      setExistingPayments(pays || []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Payment failed");
    }
    setPayLoading(false);
  };

  // ── bulk assign handler ───────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    if (!bulkStandard || !bulkYear) { message.error("Select standard and year"); return; }
    setBulkLoading(true);
    try {
      const res = await assignFeeToClass({
        standard: bulkStandard,
        section: bulkSection || undefined,
        academicYear: bulkYear,
        autoTeacherDiscount: true,
        autoSiblingDiscount: true,
        autoRteDiscount: true,
      });
      message.success(res.message || "Done");
      setBulkModal(false);
      getAllStudentFees().then((d) => setRecentAssignments((d || []).slice(0, 5))).catch(() => {});
    } catch (e) {
      message.error(e?.response?.data?.message || "Bulk assign failed");
    }
    setBulkLoading(false);
  };

  // ── cancel / refund handler ────────────────────────────────────────────────
  const handleCancelRefund = async () => {
    const { payment, action, reason, refundAmount } = cancelModal;
    if (!payment) return;
    try {
      if (action === "cancel") {
        await cancelPayment(payment.id, { reason: reason || "Manual cancellation" });
        message.success("Payment cancelled");
      } else {
        await refundPayment(payment.id, { refundAmount: Number(refundAmount), reason });
        message.success("Refund processed");
      }
      setCancelModal({ open: false, payment: null, action: "", reason: "", refundAmount: 0 });
      const ef = await getStudentFee(selectedStudent.id, selectedYear);
      setExistingFee(ef);
      const pays = await getPaymentsByStudentFee(ef.id);
      setExistingPayments(pays || []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed");
    }
  };

  const STANDARDS_LIST = [
    "LKG","UKG","STD_1","STD_2","STD_3","STD_4","STD_5",
    "STD_6","STD_7","STD_8","STD_9","STD_10","STD_11","STD_12",
  ];

  // Derive unique sections from students filtered by year + standard
  const availableSections = useMemo(() => {
    let list = students;
    if (selectedYear) list = list.filter((s) => s.academicYear === selectedYear);
    if (filterStandard) list = list.filter((s) => s.standard === filterStandard);
    const sections = [...new Set(list.map((s) => s.section).filter(Boolean))].sort();
    return sections;
  }, [students, selectedYear, filterStandard]);

  // Filter students based on year, standard and section
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedYear) list = list.filter((s) => s.academicYear === selectedYear);
    if (filterStandard) list = list.filter((s) => s.standard === filterStandard);
    if (filterSection) list = list.filter((s) => s.section === filterSection);
    return list;
  }, [students, selectedYear, filterStandard, filterSection]);

  // ── fee input helper ──────────────────────────────────────────────────────
  const FeeInput = ({ label, field }) => (
    <div className="flex flex-col gap-1.5">
      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">
        {label} <span className="text-on-surface-variant normal-case">₹</span>
      </label>
      <input
        type="number"
        min={0}
        value={fees[field]}
        onChange={(e) => setFees((prev) => ({ ...prev, [field]: Number(e.target.value) || 0 }))}
        className="w-full bg-surface-container-high border-none rounded-xl h-11 px-4 text-on-surface focus:bg-surface-container-highest focus:ring-2 focus:ring-primary/30 transition-all font-bold outline-none"
      />
    </div>
  );

  const DiscountRow = ({ label, sub, field, eligible, reason }) => {
    const isChecked = discountToggles[field];
    const valState = discountValues[field];
    const val = Number(valState.value) || 0;
    const savings = valState.type === "PERCENTAGE" ? (grossFee * (val / 100)) : val;
    
    return (
      <div className="flex flex-col gap-2 group p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm text-on-surface flex items-center gap-2">
              {label}
              {eligible && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  Eligible
                </span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant leading-tight mt-1">
              {eligible ? reason || sub : sub}
            </div>
          </div>
          <ToggleSwitch
            checked={isChecked}
            onChange={(v) => setDiscountToggles((prev) => ({ ...prev, [field]: v }))}
            disabled={!eligible}
          />
        </div>
        {isChecked && eligible && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/10 animate-fadeIn">
            <select
              value={valState.type}
              onChange={(e) => setDiscountValues(prev => ({ ...prev, [field]: { ...prev[field], type: e.target.value } }))}
              className="bg-surface-container-high border-none rounded-lg py-1.5 px-2 text-[11px] font-bold uppercase tracking-wide outline-none w-24 text-primary"
            >
              <option value="PERCENTAGE">% (Percent)</option>
              <option value="FLAT">₹ (Flat)</option>
            </select>
            <input
              type="number"
              min={0}
              placeholder="Enter amount..."
              value={valState.value}
              onChange={(e) => setDiscountValues(prev => ({ ...prev, [field]: { ...prev[field], value: e.target.value } }))}
              className="flex-1 bg-surface-container-high border-none rounded-lg py-1.5 px-3 text-sm font-bold outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
            {savings > 0 && (
              <div className="text-[10px] font-bold text-[#001813] bg-[#44ddc1]/20 px-2.5 py-2 rounded items-center flex">
                Saves {fmt(savings)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs mb-2 font-medium">
            <span className="hover:text-primary cursor-pointer transition-colors">Finance</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Fees</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary font-bold">Assign &amp; Collect</span>
          </nav>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Assign &amp; Collect Fees
          </h2>
        </div>
        <button
          onClick={() => { setBulkModal(true); setBulkYear(selectedYear || academicYears[0] || ""); }}
          className="bg-secondary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-[1.02] transition-all shadow"
        >
          <span className="material-symbols-outlined text-base">groups</span>
          Bulk Assign Class
        </button>
      </div>

      {/* Bulk Assign Modal */}
      <Modal
        open={bulkModal} title="Bulk Assign Fees — Whole Class"
        onCancel={() => setBulkModal(false)}
        onOk={handleBulkAssign} okText="Assign to All" confirmLoading={bulkLoading}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">Standard</label>
            <select value={bulkStandard} onChange={(e) => setBulkStandard(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none">
              <option value="">Select...</option>
              {STANDARDS_LIST.map((s) => <option key={s} value={s}>{s.replace("STD_", "Std ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">Section (optional)</label>
            <input value={bulkSection} onChange={(e) => setBulkSection(e.target.value)}
              placeholder="A, B, C..." className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">Academic Year</label>
            <select value={bulkYear} onChange={(e) => setBulkYear(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none">
              <option value="">Select...</option>
              {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <p className="text-xs text-on-surface-variant">
            This will assign fees from the fee structure to all approved students in the selected class who don't already have fees. Auto-discounts (teacher, sibling, RTE) will be applied.
          </p>
        </div>
      </Modal>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              {/* Academic Year */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Academic Year
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest appearance-none transition-all outline-none"
                  >
                    <option value="">Select year...</option>
                    {academicYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">
                    expand_more
                  </span>
                </div>
              </div>
              {/* Standard filter */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Standard
                </label>
                <div className="relative">
                  <select
                    value={filterStandard}
                    onChange={(e) => { setFilterStandard(e.target.value); setFilterSection(""); setSelectedStudent(null); setExistingFee(null); setExistingPayments([]); }}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest appearance-none transition-all outline-none"
                  >
                    <option value="">All Standards</option>
                    {STANDARDS_LIST.map((s) => <option key={s} value={s}>{s.replace("STD_", "Std ")}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">
                    expand_more
                  </span>
                </div>
              </div>
              {/* Section filter */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Section
                </label>
                <div className="relative">
                  <select
                    value={filterSection}
                    onChange={(e) => { setFilterSection(e.target.value); setSelectedStudent(null); setExistingFee(null); setExistingPayments([]); }}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest appearance-none transition-all outline-none"
                  >
                    <option value="">All Sections</option>
                    {availableSections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">
                    expand_more
                  </span>
                </div>
              </div>
              {/* Student */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Student {filteredStudents.length > 0 && <span className="text-on-surface-variant font-medium">({filteredStudents.length})</span>}
                </label>
                <div className="relative">
                  <select
                    value={selectedStudent?.id || ""}
                    onChange={(e) => e.target.value && onStudentChange(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest appearance-none transition-all outline-none"
                  >
                    <option value="">Select student...</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.section ? ` — ${s.section}` : ""}{!filterStandard ? ` — ${s.standard}` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">
                    expand_more
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
          {existingFee ? (
            /* ── Existing Fee: Read-Only View + Collect Payment ── */
            <>
              <div className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
                <h4 className="font-headline font-bold text-xl text-primary flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-secondary">receipt_long</span>
                  Assigned Fee (View Only)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    ["Tuition Fee", existingFee.tuitionFee],
                    ["Transport Fee", existingFee.transportFee],
                    ["Book Fee", existingFee.bookFee],
                    ["Hostel Fee", existingFee.hostelFee],
                    ["Other Fee", existingFee.otherFee],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-surface-container-low rounded-xl p-3">
                      <div className="text-[10px] font-bold text-on-surface-variant uppercase">{label}</div>
                      <div className="text-lg font-bold text-on-surface">{fmt(val)}</div>
                    </div>
                  ))}
                </div>
                {(existingFee.customItems || []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase">Custom Items</div>
                    {existingFee.customItems.map((ci, i) => (
                      <div key={i} className="flex justify-between text-sm px-2">
                        <span>{ci.name}</span><span className="font-bold">{fmt(ci.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-outline-variant/20 grid grid-cols-3 gap-4">
                  <div className="bg-primary-container/30 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-bold uppercase">Total</div>
                    <div className="text-xl font-black text-primary">{fmt(existingFee.totalFee)}</div>
                  </div>
                  <div className="bg-[#44ddc1]/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-bold uppercase">Discount</div>
                    <div className="text-xl font-black text-[#001813]">{fmt(existingFee.discount)}</div>
                  </div>
                  <div className="bg-secondary-container/30 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-bold uppercase">Net Fee</div>
                    <div className="text-xl font-black text-secondary">{fmt(existingFee.netFee)}</div>
                  </div>
                </div>
                {/* Term-wise status */}
                {(existingFee.terms || []).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/20">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-2">Term Breakdown</div>
                    <div className="space-y-2">
                      {existingFee.terms.map((t) => (
                        <div key={t.id} className="flex justify-between items-center bg-surface-container-low rounded-xl px-4 py-2.5">
                          <span className="font-bold text-sm">{t.termName}</span>
                          <span className="text-sm">{fmt(t.amount)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.status === "PAID" ? "bg-[#44ddc1]/20 text-[#001813]" :
                            t.status === "PARTIAL" ? "bg-yellow-100 text-yellow-800" :
                            "bg-surface-container-high text-on-surface-variant"
                          }`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Collect Payment */}
              <div className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.04)]">
                <h4 className="font-headline font-bold text-xl text-primary flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-secondary">payments</span>
                  Collect Payment
                </h4>
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="font-bold">Paid:</span>
                  <span className="text-[#001813] font-bold">{fmt(existingFee.totalPaid || 0)}</span>
                  <span className="mx-2 text-on-surface-variant">|</span>
                  <span className="font-bold">Pending:</span>
                  <span className={`font-bold ${(existingFee.pending || 0) > 0 ? "text-error" : "text-[#001813]"}`}>
                    {fmt(existingFee.pending || 0)}
                  </span>
                </div>
                {(existingFee.pending || 0) <= 0 ? (
                  <div className="bg-[#44ddc1]/10 rounded-xl px-4 py-6 text-center">
                    <span className="material-symbols-outlined text-4xl text-[#001813] mb-2 block">task_alt</span>
                    <span className="font-bold text-[#001813]">Fully Paid — No pending balance</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-on-surface-variant font-bold text-sm">₹</span>
                          <input type="number" min={0} value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-7 pr-4 outline-none font-bold" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Mode</label>
                        <select value={payMode} onChange={(e) => setPayMode(e.target.value)}
                          className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none">
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="GPAY">GPay</option>
                          <option value="BANK">Bank</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                      {(existingFee.terms || []).length > 0 && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase mb-1">Term</label>
                          <select value={payTerm || ""} onChange={(e) => setPayTerm(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none">
                            <option value="">Select term</option>
                            {existingFee.terms.filter((t) => t.status !== "PAID").map((t) => (
                              <option key={t.termNumber} value={t.termNumber}>{t.termName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Remarks</label>
                        <input value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)}
                          placeholder="Optional" className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm" />
                      </div>
                    </div>
                    <button onClick={handleInlinePayment} disabled={payLoading || !canCollectFee}
                      className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50">
                      {payLoading ? (
                        <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Processing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-base">check_circle</span> Collect Payment</>
                      )}
                    </button>
                  </div>
                )}

                {/* Payment history */}
                {existingPayments.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-outline-variant/20">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-2">Payment History</div>
                    <div className="space-y-2">
                      {existingPayments.map((p) => (
                        <div key={p.id} className="flex justify-between items-center bg-surface-container-low rounded-xl px-4 py-2.5">
                          <div>
                            <span className="font-bold text-sm">{fmt(p.amount)}</span>
                            <span className="text-xs text-on-surface-variant ml-2">{p.paymentMode}</span>
                            {p.receiptNo && <span className="text-xs text-on-surface-variant ml-2">#{p.receiptNo}</span>}
                            {p.termNumber && <span className="text-xs text-on-surface-variant ml-2">Term {p.termNumber}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === "CANCELLED" ? "bg-surface-container-high text-on-surface-variant" :
                              p.status === "REFUNDED" ? "bg-error-container text-error" :
                              "bg-[#44ddc1]/20 text-[#001813]"
                            }`}>{p.status || "SUCCESS"}</span>
                            {p.status === "SUCCESS" && canCollectFee && (
                              <>
                                <button onClick={() => setCancelModal({ open: true, payment: p, action: "cancel", reason: "", refundAmount: 0 })}
                                  className="text-xs text-on-surface-variant hover:text-error transition-colors font-bold">Cancel</button>
                                <button onClick={() => setCancelModal({ open: true, payment: p, action: "refund", reason: "", refundAmount: p.amount })}
                                  className="text-xs text-on-surface-variant hover:text-error transition-colors font-bold">Refund</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cancel/Refund Modal */}
              <Modal
                open={cancelModal.open}
                title={cancelModal.action === "cancel" ? "Cancel Receipt" : "Refund Payment"}
                onCancel={() => setCancelModal({ open: false, payment: null, action: "", reason: "", refundAmount: 0 })}
                onOk={handleCancelRefund}
                okText={cancelModal.action === "cancel" ? "Cancel Receipt" : "Process Refund"}
                okButtonProps={{ danger: true }}
              >
                <div className="space-y-3 py-2">
                  {cancelModal.payment && (
                    <div className="bg-surface-container-low rounded-xl px-4 py-3">
                      <div className="text-sm font-bold">Amount: {fmt(cancelModal.payment.amount)}</div>
                      <div className="text-xs text-on-surface-variant">
                        Receipt: {cancelModal.payment.receiptNo || "—"} | Mode: {cancelModal.payment.paymentMode}
                      </div>
                    </div>
                  )}
                  {cancelModal.action === "refund" && (
                    <div>
                      <label className="block text-xs font-bold mb-1">Refund Amount</label>
                      <input type="number" min={0} max={cancelModal.payment?.amount}
                        value={cancelModal.refundAmount}
                        onChange={(e) => setCancelModal((p) => ({ ...p, refundAmount: Number(e.target.value) }))}
                        className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none font-bold" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold mb-1">Reason</label>
                    <input value={cancelModal.reason}
                      onChange={(e) => setCancelModal((p) => ({ ...p, reason: e.target.value }))}
                      placeholder={cancelModal.action === "cancel" ? "Reason for cancellation (e.g. human error)" : "Reason for refund"}
                      className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 outline-none text-sm" />
                  </div>
                </div>
              </Modal>
            </>
          ) : (
          /* ── No existing fee: show the assign form ── */
          <>
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
          </>
          )}
        </div>

        {/* ── right: discounts + summary (only when assigning new fee) ── */}
        {!existingFee && (
          <div className="space-y-5">
            {/* Discount card */}
            <div className="bg-surface-container rounded-2xl p-7">
              <h4 className="font-headline font-bold text-lg text-primary mb-5">
                Discounts Eligibility
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
              <div className="mt-6 pt-6 border-t border-outline-variant/20 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Quick Flat Discount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="Enter custom reduction..."
                      value={manualDiscounts.find((d) => d.reason === "QUICK_FLAT")?.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const existingIdx = manualDiscounts.findIndex((d) => d.reason === "QUICK_FLAT");
                        let next = [...manualDiscounts];
                        if (existingIdx > -1) {
                          if (!val) {
                            next = next.filter((_, i) => i !== existingIdx);
                          } else {
                            next[existingIdx] = { ...next[existingIdx], type: "FLAT", value: val };
                          }
                        } else if (val) {
                          next.push({ type: "FLAT", value: val, reason: "QUICK_FLAT" });
                        }
                        setManualDiscounts(next);
                      }}
                      className="w-full bg-surface-container-high border-none rounded-xl py-2.5 pl-7 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {manualDiscounts
                  .filter((d) => d.reason !== "QUICK_FLAT")
                  .map((d, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={d.type}
                        onChange={(e) => {
                          const realIdx = manualDiscounts.indexOf(d);
                          const next = [...manualDiscounts];
                          next[realIdx] = { ...next[realIdx], type: e.target.value };
                          setManualDiscounts(next);
                        }}
                        className="flex-1 bg-surface-container-high border-none rounded-lg py-2 px-3 text-xs outline-none font-bold"
                      >
                        <option value="">Select Type</option>
                        <option value="FLAT">Flat (₹)</option>
                        <option value="PERCENTAGE">Percentage (%)</option>
                      </select>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-2 text-[10px] font-bold text-on-surface-variant">
                          {d.type === "PERCENTAGE" ? "%" : "₹"}
                        </span>
                        <input
                          type="number"
                          placeholder="0"
                          value={d.value}
                          onChange={(e) => {
                            const realIdx = manualDiscounts.indexOf(d);
                            const next = [...manualDiscounts];
                            next[realIdx] = { ...next[realIdx], value: e.target.value };
                            setManualDiscounts(next);
                          }}
                          className="w-full bg-surface-container-high border-none rounded-lg py-2 pl-6 pr-2 text-sm font-bold outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualDiscounts(manualDiscounts.filter((item) => item !== d))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}

                <button
                  type="button"
                  onClick={() => setManualDiscounts([...manualDiscounts, { type: "", value: "", reason: "CUSTOM" }])}
                  className="w-full border border-dashed border-outline-variant hover:border-primary hover:text-primary transition-all py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
                >
                  + Add Advanced Discount
                </button>
              </div>

              {/* Payable Preview inside Discount Card */}
              <div className="mt-8 pt-6 border-t-2 border-primary/10">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                      Estimated Net Pay
                    </p>
                    <p className="text-2xl font-headline font-black text-primary">{fmt(netFee)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#001813] bg-[#44ddc1]/20 px-2 py-0.5 rounded-full inline-block">
                      Total Savings: {fmt(totalDiscount)}
                    </p>
                  </div>
                </div>
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
                  background: "linear-gradient(to right, #00152a, #102a43)",
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
        )}
      </div>

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
