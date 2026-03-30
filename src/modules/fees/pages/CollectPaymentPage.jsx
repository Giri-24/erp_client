import React, { useEffect, useState, useRef } from "react";
import { message, Modal, Form, Input, InputNumber, Select, Radio, Alert, Space } from "antd";
import { WhatsAppOutlined, MessageOutlined, LinkOutlined, CheckCircleOutlined } from "@ant-design/icons";
import {
  cancelPayment,
  collectPayment,
  getAllStudentFees,
  getPaymentsByStudentFee,
  getNextReceiptNo,
  getAcademicYears,
  refundPayment,
  sendPaymentLink,
  getPaymentLinks,
  checkPaymentLinkStatus,
} from "../fees.service";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash", icon: "payments" },
  { value: "UPI", label: "UPI / Online", icon: "language" },
  { value: "BANK", label: "Bank Transfer", icon: "receipt_long" },
];

const RECEIPT_COMPONENT_LABELS = {
  transportFee: "Transport Fee",
  bookFee: "Book Fee",
  hostelFee: "Hostel Fee",
  otherFee: "Other Fee",
  customItems: "Custom Items",
};

const getAvailableReceiptComponentOptions = (fee) => {
  if (!fee) return [];
  const opts = [];
  if (Number(fee.transportFee || 0) > 0) opts.push("transportFee");
  if (Number(fee.bookFee || 0) > 0) opts.push("bookFee");
  if (Number(fee.hostelFee || 0) > 0) opts.push("hostelFee");
  if (Number(fee.otherFee || 0) > 0) opts.push("otherFee");
  if ((fee.customItems || []).length > 0) opts.push("customItems");
  return opts;
};

const buildReceiptFeeRows = (payment) => {
  const selected = Array.isArray(payment?.receiptComponents)
    ? payment.receiptComponents
    : ["transportFee", "bookFee", "hostelFee", "otherFee", "customItems"];
  const rows = [{ key: "tuitionFee", label: "Tuition Fee", amount: Number(payment?.tuitionFee || 0) }];
  if (selected.includes("transportFee") && Number(payment?.transportFee || 0) > 0)
    rows.push({ key: "transportFee", label: "Transport Fee", amount: Number(payment.transportFee) });
  if (selected.includes("bookFee") && Number(payment?.bookFee || 0) > 0)
    rows.push({ key: "bookFee", label: "Book Fee", amount: Number(payment.bookFee) });
  if (selected.includes("hostelFee") && Number(payment?.hostelFee || 0) > 0)
    rows.push({ key: "hostelFee", label: "Hostel Fee", amount: Number(payment.hostelFee) });
  if (selected.includes("otherFee") && Number(payment?.otherFee || 0) > 0)
    rows.push({ key: "otherFee", label: "Other Fee", amount: Number(payment.otherFee) });
  if (selected.includes("customItems"))
    (payment?.customItems || []).forEach((ci) =>
      rows.push({ key: `custom-${ci.id || ci.name}`, label: ci.name, amount: Number(ci.amount || 0) })
    );
  return rows;
};

const statusBadge = (status) => {
  const s = (status || "SUCCESS").toUpperCase();
  if (s === "REFUNDED")
    return <span className="px-3 py-1 bg-error-container text-error rounded-full text-xs font-bold uppercase">Refunded</span>;
  if (s === "CANCELLED")
    return <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold uppercase">Cancelled</span>;
  return <span className="px-3 py-1 bg-[#44ddc1]/20 text-[#00201a] rounded-full text-xs font-bold uppercase">Success</span>;
};

// ── component ─────────────────────────────────────────────────────────────
const CollectPaymentPage = () => {
  const [form] = Form.useForm();
  const [statusActionForm] = Form.useForm();
  const [linkForm] = Form.useForm();
  const printRef = useRef(null);

  const [studentFees, setStudentFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [printPayment, setPrintPayment] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, action: "", payment: null, loading: false });
  const [linkModal, setLinkModal] = useState({ open: false, loading: false });
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [linkResult, setLinkResult] = useState(null);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [receiptNo, setReceiptNo] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [termNumber, setTermNumber] = useState(null);
  const [receiptComponents, setReceiptComponents] = useState([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const canCollectFee = hasPermission(PERMISSIONS.FEES_COLLECT);

  // ── data fetching ─────────────────────────────────────────────────────
  const fetchAcademicYears = async () => {
    try {
      const years = await getAcademicYears();
      setAcademicYearOptions(years || []);
      if (years?.length > 0) setAcademicYear((prev) => prev || years[0]);
    } catch { /* silent */ }
  };

  const fetchReceiptNo = async () => {
    try {
      const data = await getNextReceiptNo();
      setReceiptNo(data.nextReceiptNo || "");
    } catch { /* silent */ }
  };

  const fetchFees = async (yr) => {
    try {
      const data = await getAllStudentFees(yr || academicYear);
      setStudentFees(data || []);
    } catch { message.error("Failed to load student fees"); }
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchReceiptNo();
  }, []);

  useEffect(() => {
    if (academicYear) fetchFees(academicYear);
  }, [academicYear]);

  const onSelectFee = async (feeId) => {
    const fee = studentFees.find((f) => f.id === feeId);
    setSelectedFee(fee);
    setAmount("");
    setTermNumber(null);
    setReceiptComponents(getAvailableReceiptComponentOptions(fee));
    setLinkResult(null);

    try {
      const list = await getPaymentsByStudentFee(feeId);
      setPayments(list || []);
    } catch { setPayments([]); }

    try {
      const links = await getPaymentLinks(feeId);
      const pending = (links || []).filter((l) => l.status === "PENDING");
      if (pending.length > 0) {
        await Promise.allSettled(pending.map((l) => checkPaymentLinkStatus(l.merchantTransactionId)));
        const refreshed = await getPaymentLinks(feeId);
        setPaymentLinks(refreshed || []);
      } else {
        setPaymentLinks(links || []);
      }
    } catch { setPaymentLinks([]); }
  };

  const handleCollect = async () => {
    if (!canCollectFee) { message.error("You are not authorized to collect payments"); return; }
    if (!selectedFee) { message.error("Please select a student"); return; }
    if (!amount || Number(amount) <= 0) { message.error("Please enter an amount"); return; }
    if (selectedFee.terms?.length > 0 && !termNumber) { message.error("Please select a term"); return; }

    setLoading(true);
    try {
      const payload = {
        studentFeeId: selectedFee.id,
        amount: Number(amount),
        paymentMode,
        receiptNo,
        remarks,
        termNumber: termNumber || undefined,
        receiptComponents,
      };
      const result = await collectPayment(payload);
      message.success("Payment collected successfully!");

      // show print receipt
      setPrintPayment({
        ...result,
        studentName: selectedFee?.student?.name,
        standard: selectedFee?.student?.standard,
        totalFee: selectedFee?.totalFee,
        netFee: selectedFee?.netFee,
        tuitionFee: selectedFee?.tuitionFee,
        transportFee: selectedFee?.transportFee,
        bookFee: selectedFee?.bookFee,
        hostelFee: selectedFee?.hostelFee,
        otherFee: selectedFee?.otherFee,
        customItems: selectedFee?.customItems,
        discounts: selectedFee?.discounts,
        receiptComponents,
        status: result?.status || "SUCCESS",
      });

      // show toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);

      // reset form
      setAmount("");
      setRemarks("");
      setTermNumber(null);
      await fetchReceiptNo();

      // refresh
      await fetchFees(academicYear);
      const paymentList = await getPaymentsByStudentFee(selectedFee.id);
      setPayments(paymentList || []);
      const updatedFees = await getAllStudentFees(academicYear);
      const updatedFee = updatedFees.find((f) => f.id === selectedFee.id);
      setSelectedFee(updatedFee || null);
    } catch (err) {
      message.error(err?.response?.data?.message || "Payment failed");
    }
    setLoading(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`<html><head><title>Fee Receipt</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:20px}
        .receipt{max-width:700px;margin:0 auto;border:2px solid #333;padding:24px}
        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
        .header h2{margin:0 0 4px;font-size:22px}.header p{margin:0;color:#555;font-size:13px}
        .receipt-no{text-align:right;font-weight:bold;font-size:16px;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:13px}
        th{background:#f5f5f5}.total-row td{font-weight:bold;background:#fafafa}
        .footer{margin-top:24px;display:flex;justify-content:space-between}
        .footer div{text-align:center}
        .sign-line{border-top:1px solid #333;width:150px;margin-top:40px;padding-top:4px;font-size:12px}
        @media print{body{padding:0}}
      </style></head>
      <body>${content.innerHTML}</body>
      <script>window.print();window.close();<\/script></html>`);
    win.document.close();
  };

  const handlePrintExistingPayment = (payment) => {
    setPrintPayment({
      ...payment,
      studentName: selectedFee?.student?.name,
      standard: selectedFee?.student?.standard,
      totalFee: selectedFee?.totalFee,
      netFee: selectedFee?.netFee,
      tuitionFee: selectedFee?.tuitionFee,
      transportFee: selectedFee?.transportFee,
      bookFee: selectedFee?.bookFee,
      hostelFee: selectedFee?.hostelFee,
      otherFee: selectedFee?.otherFee,
      customItems: selectedFee?.customItems,
      discounts: selectedFee?.discounts,
      receiptComponents: payment?.receiptComponents,
    });
  };

  const openStatusModal = (action, payment) => {
    if (!canCollectFee) { message.error("Not authorized"); return; }
    statusActionForm.resetFields();
    setStatusModal({ open: true, action, payment, loading: false });
  };

  const submitStatusAction = async () => {
    try {
      const values = await statusActionForm.validateFields();
      setStatusModal((p) => ({ ...p, loading: true }));
      if (statusModal.action === "cancel") {
        await cancelPayment(statusModal.payment.id, { reason: values.reason });
        message.success("Payment cancelled");
      } else {
        await refundPayment(statusModal.payment.id, { reason: values.reason, refundAmount: Number(values.refundAmount) });
        message.success("Payment refunded");
      }
      if (selectedFee?.id) {
        const list = await getPaymentsByStudentFee(selectedFee.id);
        setPayments(list || []);
      }
      const refreshed = await getAllStudentFees(academicYear);
      setStudentFees(refreshed || []);
      if (selectedFee?.id) setSelectedFee(refreshed.find((f) => f.id === selectedFee.id) || null);
      setStatusModal({ open: false, action: "", payment: null, loading: false });
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Failed");
      setStatusModal((p) => ({ ...p, loading: false }));
    }
  };

  const openLinkModal = () => {
    if (!selectedFee) return;
    const fam = selectedFee?.student?.family || {};
    linkForm.setFieldsValue({
      phoneNumber: fam.fatherWhatsapp || fam.fatherPhone || fam.motherWhatsapp || fam.motherPhone || "",
      amount: selectedFee.pending > 0 ? selectedFee.pending : undefined,
      channel: "WHATSAPP",
    });
    setLinkResult(null);
    setLinkModal({ open: true, loading: false });
  };

  const handleSendLink = async () => {
    try {
      const values = await linkForm.validateFields();
      setLinkModal((p) => ({ ...p, loading: true }));
      const result = await sendPaymentLink({
        studentFeeId: selectedFee.id,
        amount: Number(values.amount),
        phoneNumber: values.phoneNumber,
        channel: values.channel,
      });
      setLinkResult(result);
      const links = await getPaymentLinks(selectedFee.id);
      setPaymentLinks(links || []);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Failed to send link");
    }
    setLinkModal((p) => ({ ...p, loading: false }));
  };

  const filteredPayments = paymentStatusFilter === "ALL"
    ? payments
    : payments.filter((p) => (p.status || "SUCCESS") === paymentStatusFilter);

  const modeIcon = (mode) => {
    if (mode === "CASH") return "payments";
    if (mode === "UPI" || mode === "BANK") return "language";
    return "receipt_long";
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-2 font-medium">
          <span>Finance</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary font-bold">Collect Fees</span>
        </nav>
        <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">
          Collect Student Fees
        </h2>
      </div>

      {/* ── 12-col bento grid ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── LEFT: form (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Section 1: Select recipient */}
          <section className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.06)] relative overflow-hidden">
            {/* decorative corner */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />

            <div className="flex items-center gap-4 mb-7">
              <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}>person_search</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg text-primary">Select Recipient</h3>
                <p className="text-sm text-on-surface-variant">Identify the student and academic session</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Academic Year
                </label>
                <div className="relative">
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
                  >
                    {academicYearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Search Student
                </label>
                <div className="relative">
                  <select
                    value={selectedFee?.id || ""}
                    onChange={(e) => e.target.value && onSelectFee(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
                  >
                    <option value="">Select student...</option>
                    {studentFees.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.student?.name} — {f.student?.standard} — Pending: {fmt(f.pending)}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-primary/40 pointer-events-none text-base">expand_more</span>
                </div>
              </div>
            </div>

            {/* Term selector (if applicable) */}
            {selectedFee?.terms?.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Term</label>
                <div className="flex gap-2 flex-wrap">
                  {selectedFee.terms.map((t) => (
                    <button
                      key={t.termNumber}
                      type="button"
                      onClick={() => setTermNumber(t.termNumber)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        termNumber === t.termNumber
                          ? "bg-primary text-white"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                      }`}
                    >
                      {t.termName} — {fmt(t.amount)}
                      {t.status && <span className="ml-1 opacity-60">({t.status})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Payment transaction */}
          <section className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
            <div className="flex items-center gap-4 mb-7">
              <div className="w-12 h-12 bg-tertiary-fixed rounded-xl flex items-center justify-center text-tertiary flex-shrink-0">
                <span className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg text-primary">Payment Transaction</h3>
                <p className="text-sm text-on-surface-variant">Enter receipt details and payment mode</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-xl font-headline font-bold text-primary focus:bg-surface-container-highest transition-colors outline-none"
                />
              </div>

              {/* Payment mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Payment Mode
                </label>
                <div className="flex gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMode(m.value)}
                      className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        paymentMode === m.value
                          ? "bg-primary text-white"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt no */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  placeholder="REC-2024-001"
                  className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
                />
              </div>
            </div>

            {/* Receipt components */}
            {selectedFee && getAvailableReceiptComponentOptions(selectedFee).length > 0 && (
              <div className="flex flex-wrap gap-5 mb-6 p-4 bg-surface rounded-xl">
                {getAvailableReceiptComponentOptions(selectedFee).map((key) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={receiptComponents.includes(key)}
                      onChange={(e) => {
                        setReceiptComponents((prev) =>
                          e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)
                        );
                      }}
                      className="w-4 h-4 rounded border-outline accent-primary"
                    />
                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                      Include {RECEIPT_COMPONENT_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Collect button */}
            <button
              type="button"
              disabled={loading || !canCollectFee || !selectedFee || Number(selectedFee?.pending || 0) <= 0}
              onClick={handleCollect}
                  style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-lg shadow-[0_10px_20px_rgba(0,21,42,0.2)] hover:shadow-[0_15px_30px_rgba(0,21,42,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {loading ? (
                <><span className="material-symbols-outlined text-base animate-spin">refresh</span>Processing...</>
              ) : (
                <><span className="material-symbols-outlined">point_of_sale</span>Collect Payment</>
              )}
            </button>

            {/* Send payment link */}
            {canCollectFee && selectedFee && (selectedFee.pending || 0) > 0 && (
              <button
                type="button"
                onClick={openLinkModal}
                className="w-full mt-3 py-3 rounded-xl border-2 border-outline-variant text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                Send Payment Link (Digital)
              </button>
            )}
          </section>
        </div>

        {/* ── RIGHT: summary + digital invoicing (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Account summary card */}
          <section className="bg-primary-container rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10">
              <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-5 flex items-center gap-2 text-on-primary-container">
              <span className="material-symbols-outlined text-secondary-fixed-dim">bar_chart</span>
              Account Summary
            </h3>

            {selectedFee ? (
              <div className="space-y-3">
                {[
                  { label: "Total Fee", val: selectedFee.totalFee },
                  { label: "Discount", val: selectedFee.discount, negative: true },
                  { label: "Net Fee", val: selectedFee.netFee, divider: true },
                  { label: "Amount Paid", val: selectedFee.totalPaid },
                ].map(({ label, val, negative, divider }) => (
                  <React.Fragment key={label}>
                    {divider && <div className="h-px bg-white/10 my-1" />}
                    <div className="flex justify-between items-center text-on-primary-container/80">
                      <span className="text-sm">{label}</span>
                      <span className="font-bold">{negative ? "− " : ""}{fmt(val)}</span>
                    </div>
                  </React.Fragment>
                ))}
                <div className="mt-6 bg-white/10 rounded-2xl p-5 backdrop-blur-md border border-white/10 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-secondary-fixed mb-1 font-bold">Pending Balance</p>
                  <p className={`text-4xl font-headline font-extrabold ${Number(selectedFee.pending || 0) > 0 ? "text-white" : "text-[#44ddc1]"}`}>
                    {fmt(selectedFee.pending)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-on-primary-container/60 text-sm text-center py-8">
                <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">person_search</span>
                Select a student to view their account summary
              </div>
            )}
          </section>

          {/* Payment links / digital invoicing */}
          <section className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
            <h3 className="font-headline font-bold text-primary mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">send</span>
              Digital Invoicing
            </h3>
            <div className="space-y-3">
              {paymentLinks.slice(0, 3).map((link, i) => (
                <div key={link.id || i} className="flex items-center justify-between p-3 bg-surface rounded-xl hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      link.channel === "WHATSAPP" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      <span className="material-symbols-outlined text-base">
                        {link.channel === "WHATSAPP" ? "chat" : "mail"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">
                        {link.channel === "WHATSAPP" ? "WhatsApp Invoice" : "SMS Receipt"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {link.createdAt ? new Date(link.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    link.status === "SUCCESS"
                      ? "bg-green-100 text-green-700"
                      : link.status === "PENDING"
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-error-container text-error"
                  }`}>
                    {link.status === "SUCCESS" ? "Sent" : link.status === "PENDING" ? "Pending" : link.status}
                  </span>
                </div>
              ))}
              {paymentLinks.length === 0 && (
                <p className="text-xs text-on-surface-variant text-center py-4">No payment links sent yet</p>
              )}
            </div>
            <button
              onClick={() => message.info("Filter by status from the history table below")}
              className="w-full mt-5 py-2.5 text-sm font-bold text-primary border-2 border-primary-fixed rounded-xl hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">history</span>
              View Log History
            </button>
          </section>
        </div>

        {/* ── BOTTOM: payment history table (full width) ── */}
        {(filteredPayments.length > 0 || payments.length > 0) && (
          <div className="col-span-12">
            <section className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-headline font-bold text-lg text-primary">Payment History</h3>
                  <p className="text-sm text-on-surface-variant">
                    {selectedFee ? `Recent fee transactions for ${selectedFee.student?.name}` : "All transactions"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="bg-surface-container-high border-none rounded-xl py-2 px-4 text-sm font-medium outline-none appearance-none"
                  >
                    <option value="ALL">All Status</option>
                    <option value="SUCCESS">Success</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface">
                      {["Date", "Receipt No", "Term", "Amount", "Mode", "Status", "Actions"].map((h, i) => (
                        <th key={h} className={`px-5 py-3.5 ${i === 0 ? "rounded-tl-xl" : ""} ${i === 6 ? "rounded-tr-xl text-center" : ""} ${i === 3 ? "text-right" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="border-b border-surface-container-low hover:bg-surface-bright transition-colors">
                        <td className="px-5 py-4 font-medium">
                          {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-4 text-on-surface-variant">{p.receiptNo || "—"}</td>
                        <td className="px-5 py-4 text-on-surface-variant">{p.termNumber ? `Term ${p.termNumber}` : "General"}</td>
                        <td className="px-5 py-4 text-right font-bold text-primary">{fmt(p.amount)}</td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">{modeIcon(p.paymentMode)}</span>
                            {p.paymentMode || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">{statusBadge(p.status)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintExistingPayment(p)}
                              title="Print Receipt"
                              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">print</span>
                            </button>
                            {canCollectFee && p.status !== "CANCELLED" && p.status !== "REFUNDED" && (
                              <>
                                <button
                                  onClick={() => openStatusModal("refund", p)}
                                  title="Refund"
                                  className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">replay</span>
                                </button>
                                <button
                                  onClick={() => openStatusModal("cancel", p)}
                                  title="Cancel"
                                  className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center text-error hover:bg-error hover:text-white transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">receipt_long</span>
                          No payments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── Print receipt modal ── */}
      <Modal
        open={!!printPayment}
        title="Fee Receipt Preview"
        onCancel={() => setPrintPayment(null)}
        width={700}
        footer={[
          <button key="close" onClick={() => setPrintPayment(null)} className="px-6 py-2 rounded-xl border border-outline-variant font-bold text-sm mr-2 hover:bg-surface-container-low transition-colors">
            Close
          </button>,
          <button key="print" onClick={handlePrint} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-sm">print</span>Print Receipt
          </button>,
        ]}
      >
        {printPayment && (
          <div ref={printRef}>
            <div className="receipt">
              <div className="header">
                <h2>School ERP</h2>
                <p>Fee Payment Receipt</p>
              </div>
              <div className="receipt-no">Receipt No: {printPayment.receiptNo || "N/A"}</div>
              <div className="receipt-no" style={{ marginTop: -4 }}>Status: {printPayment.status || "SUCCESS"}</div>
              <table>
                <tbody>
                  <tr><th width="35%">Student Name</th><td>{printPayment.studentName}</td></tr>
                  <tr><th>Standard</th><td>{printPayment.standard}</td></tr>
                  <tr><th>Payment Date</th><td>{new Date(printPayment.paymentDate).toLocaleDateString()}</td></tr>
                  <tr><th>Payment Mode</th><td>{printPayment.paymentMode}</td></tr>
                  {printPayment.termNumber && <tr><th>Term</th><td>Term {printPayment.termNumber}</td></tr>}
                  <tr><th>Amount Paid</th><td style={{ fontSize: "16px", fontWeight: "bold" }}>₹{printPayment.amount?.toLocaleString()}</td></tr>
                </tbody>
              </table>
              <h4 style={{ marginTop: 16, marginBottom: 8 }}>Receipt Fee Components</h4>
              <table>
                <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                <tbody>
                  {buildReceiptFeeRows(printPayment).map((row) => (
                    <tr key={row.key}><td>{row.label}</td><td>₹{row.amount?.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
              {printPayment.totalFee && (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>Fee Summary</h4>
                  <table>
                    <tbody>
                      <tr><th width="35%">Total Fee</th><td>₹{printPayment.totalFee?.toLocaleString()}</td></tr>
                      <tr><th>Net Fee (after discount)</th><td>₹{printPayment.netFee?.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </>
              )}
              {printPayment.remarks && <p style={{ marginTop: 12 }}><strong>Remarks:</strong> {printPayment.remarks}</p>}
              <div className="footer">
                <div><div className="sign-line">Student / Parent</div></div>
                <div><div className="sign-line">Authorized Signatory</div></div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel / Refund modal ── */}
      <Modal
        open={statusModal.open}
        title={statusModal.action === "refund" ? "Refund Payment" : "Cancel Payment"}
        onCancel={() => setStatusModal({ open: false, action: "", payment: null, loading: false })}
        onOk={submitStatusAction}
        confirmLoading={statusModal.loading}
        okText={statusModal.action === "refund" ? "Confirm Refund" : "Confirm Cancel"}
        okButtonProps={{ danger: true }}
      >
        <Form form={statusActionForm} layout="vertical">
          {statusModal.action === "refund" && (
            <Form.Item
              name="refundAmount"
              label="Refund Amount"
              rules={[{ required: true, message: "Refund amount is required" }]}
              initialValue={statusModal.payment?.amount}
            >
              <InputNumber min={1} max={Number(statusModal.payment?.amount || 1)} style={{ width: "100%" }} prefix="₹" />
            </Form.Item>
          )}
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Please provide a reason" }]}>
            <Input.TextArea rows={3} placeholder={statusModal.action === "refund" ? "Reason for refund" : "Reason for cancellation"} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Send Payment Link modal ── */}
      <Modal
        open={linkModal.open}
        title={<Space><LinkOutlined />Send Payment Link</Space>}
        onCancel={() => { setLinkModal({ open: false, loading: false }); setLinkResult(null); }}
        footer={
          linkResult
            ? [<button key="close" onClick={() => { setLinkModal({ open: false, loading: false }); setLinkResult(null); }} className="px-6 py-2 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low transition-colors">Close</button>]
            : [
                <button key="cancel" onClick={() => setLinkModal({ open: false, loading: false })} className="px-6 py-2 rounded-xl border border-outline-variant font-bold text-sm mr-2 hover:bg-surface-container-low transition-colors">Cancel</button>,
                <button key="send" disabled={linkModal.loading} onClick={handleSendLink} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">send</span>
                  {linkModal.loading ? "Sending..." : "Generate & Send Link"}
                </button>,
              ]
        }
        width={520}
      >
        {linkResult ? (
          <div>
            {linkResult.notificationWarning ? (
              <Alert type="warning" showIcon message="Link created but notification failed" description={linkResult.notificationWarning} style={{ marginBottom: 16 }} />
            ) : (
              <Alert type="success" showIcon icon={<CheckCircleOutlined />}
                message={`Payment link sent via ${linkResult.channel}`}
                description={`A ₹${Number(linkResult.amount).toLocaleString()} payment link was ${linkResult.notificationSent ? "sent" : "created"} for ${selectedFee?.student?.name}.`}
                style={{ marginBottom: 16 }}
              />
            )}
            <div className="space-y-2 text-sm">
              {[
                { label: "Amount", val: fmt(linkResult.amount) },
                { label: "Channel", val: linkResult.channel },
                { label: "Phone", val: linkResult.phoneNumber },
                { label: "Status", val: linkResult.status },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-bold">{val}</span>
                </div>
              ))}
              {linkResult.phonePeUrl && (
                <a href={linkResult.phonePeUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline block pt-2">
                  Open Payment Link →
                </a>
              )}
            </div>
          </div>
        ) : (
          <Form form={linkForm} layout="vertical">
            <Alert type="info" showIcon message={`Pending balance: ${fmt(selectedFee?.pending)}`} description="A payment link will be generated and sent to the parent." style={{ marginBottom: 16 }} />
            <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
              <InputNumber min={1} max={selectedFee?.pending || undefined} style={{ width: "100%" }} prefix="₹" precision={2} />
            </Form.Item>
            <Form.Item name="phoneNumber" label="Parent's Phone Number" rules={[{ required: true }]} extra="Pre-filled from student's family record.">
              <Input placeholder="e.g. 9876543210" maxLength={15} />
            </Form.Item>
            <Form.Item name="channel" label="Send via" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value="WHATSAPP"><Space><WhatsAppOutlined style={{ color: "#25D366" }} />WhatsApp</Space></Radio.Button>
                <Radio.Button value="SMS"><Space><MessageOutlined />SMS</Space></Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* ── Success toast ── */}
      <div
        className={`fixed bottom-8 right-8 flex items-center gap-4 bg-tertiary text-white px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 z-50 ${
          showSuccessToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-[#44ddc1] text-[#001813] flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-sm font-bold">check</span>
        </div>
        <div>
          <p className="font-headline font-bold text-sm">Payment Recorded</p>
          <p className="text-xs opacity-80">Receipt #{receiptNo || "generated"}</p>
        </div>
      </div>
    </div>
  );
};

export default CollectPaymentPage;
