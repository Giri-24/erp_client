import React, { useEffect, useState, useRef } from "react";
import { message, Modal, Form, Input, InputNumber, Select, Radio, Alert, Space, Checkbox, Table } from "antd";
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
  getSiblingFees,
} from "../fees.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";
import { getAdminSettings } from "../../settings/settings.service";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Math.round(Number(v || 0)).toLocaleString("en-IN");

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash", icon: "payments" },
  { value: "UPI", label: "UPI / Online", icon: "language" },
  { value: "GPAY", label: "GPay", icon: "phone_android" },
  { value: "BANK", label: "Bank Transfer", icon: "receipt_long" },
  { value: "CHEQUE", label: "Cheque", icon: "description" },
];

const RECEIPT_COMPONENT_LABELS = {
  transportFee: "Transport Fee",
  bookFee: "Book Fee",
  hostelFee: "Hostel Fee",
  otherFee: "Other Fee",
  customItems: "Custom Items",
};

const formatPaidComponentLabel = (key) => {
  const k = String(key || "").trim();
  const map = {
    tuition: "Tuition Fee",
    transport: "Transport Fee",
    book: "Book Fee",
    hostel: "Hostel Fee",
    other: "Other Fee",
  };
  if (map[k]) return map[k];
  return k
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const formatStandardLabel = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  if (lower === "lkg") return "LKG";
  if (lower === "ukg") return "UKG";
  const stdMatch = lower.match(/^std[_\-\s]?(\d{1,2})$/);
  if (stdMatch) {
    const num = Number(stdMatch[1]);
    if (num === 1) return "1st Standard";
    if (num === 2) return "2nd Standard";
    if (num === 3) return "3rd Standard";
    return `${num}th Standard`;
  }
  const numMatch = lower.match(/^(\d{1,2})(st|nd|rd|th)?(\s*standard)?$/);
  if (numMatch) {
    const num = Number(numMatch[1]);
    if (num === 1) return "1st Standard";
    if (num === 2) return "2nd Standard";
    if (num === 3) return "3rd Standard";
    return `${num}th Standard`;
  }
  return raw;
};

const COMPONENT_FEE_FIELDS = {
  transportFee: "transportFee",
  bookFee: "bookFee",
  hostelFee: "hostelFee",
  otherFee: "otherFee",
};

const computeTermComponents = (fee) => {
  if (!fee?.terms?.length) return fee?.terms || [];
  const nTerms = fee.terms.length;
  const splitEvenly = (val, n) => {
    const perTerm = Math.round((val / n) * 100) / 100;
    return Array.from({ length: n }, (_, i) =>
      i === n - 1 ? Math.round((val - perTerm * (n - 1)) * 100) / 100 : perTerm
    );
  };
  const hasComponents = fee.terms.some(
    (t) => (t.tuitionAmount || 0) > 0 || (t.transportAmount || 0) > 0
  );
  if (hasComponents) return fee.terms;
  const tuition = splitEvenly(Number(fee.tuitionFee || 0), nTerms);
  const transport = splitEvenly(Number(fee.transportFee || 0), nTerms);
  return fee.terms.map((t, i) => ({
    ...t,
    tuitionAmount: tuition[i],
    transportAmount: transport[i],
    bookAmount: 0,
    hostelAmount: 0,
    otherAmount: 0,
  }));
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

const formatAllocationSummary = (splitPayments = []) => {
  if (!Array.isArray(splitPayments) || splitPayments.length === 0) return "";
  return splitPayments
    .map((p) => {
      const compText = p?.paidComponents && typeof p.paidComponents === "object"
        ? ` (${Object.entries(p.paidComponents).map(([k, v]) => `${formatPaidComponentLabel(k)}: ${fmt(v)}`).join(", ")})`
        : "";
      return `${p.termNumber ? `Term ${p.termNumber}` : "Other Fees"}: ${fmt(p.amount)}${compText}`;
    })
    .join(" | ");
};

const statusBadge = (status) => {
  const s = (status || "SUCCESS").toUpperCase();
  if (s === "REFUNDED")
    return <span className="px-3 py-1 bg-error-container text-error rounded-full text-xs font-bold uppercase">Refunded</span>;
  if (s === "CANCELLED")
    return <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold uppercase">Cancelled</span>;
  return <span className="px-3 py-1 bg-[#44ddc1]/20 text-[#00201a] rounded-full text-xs font-bold uppercase">Success</span>;
};

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { key: "collect",  label: "Collect Payment", icon: "point_of_sale" },
  { key: "history",  label: "Payment History",  icon: "receipt_long"  },
  { key: "summary",  label: "Fee Summary",      icon: "bar_chart"     },
  { key: "siblings", label: "Sibling Fees",     icon: "group"         },
];

// ── component ─────────────────────────────────────────────────────────────
const CollectPaymentPage = ({ studentId }) => {
  const [form] = Form.useForm();
  const [statusActionForm] = Form.useForm();
  const [linkForm] = Form.useForm();
  const printRef = useRef(null);
  const paymentFormRef = useRef(null);

  const [activeTab, setActiveTab] = useState("collect");

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
  const [amountInputKey, setAmountInputKey] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [termNumber, setTermNumber] = useState(null);
  const [receiptComponents, setReceiptComponents] = useState([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState([]);
  const [payComponents, setPayComponents] = useState([]);
  const [payingNonTerm, setPayingNonTerm] = useState(false);
  const [extraTermNumbers, setExtraTermNumbers] = useState([]);
  const [admissionNoSearch, setAdmissionNoSearch] = useState("");
  const [siblingData, setSiblingData] = useState([]);
  const [documentAssets, setDocumentAssets] = useState({});

  const normalizeAssetSrc = (value) => {
    if (!value) return "";
    if (value.startsWith("data:image") || value.startsWith("http://") || value.startsWith("https://")) return value;
    return `/erp/api/${String(value).replace(/^\/+/, "").replace(/\\/g, "/")}`;
  };

  const setAmountFromSystem = (next) => {
    setAmount(String(next ?? ""));
    setAmountInputKey((k) => k + 1);
  };

  const { hasPermission } = usePermissionHelpers();
  const canCollectFee = hasPermission(PERMISSIONS.FEES_COLLECT);

  // ── data fetching ─────────────────────────────────────────────────────
  const fetchAcademicYears = async () => {
    try {
      const years = await getAcademicYears();
      setAcademicYearOptions(years || []);
      if (years?.length > 0) setAcademicYear((prev) => prev || years[0]);
    } catch { }
  };

  const fetchReceiptNo = async () => {
    try {
      const data = await getNextReceiptNo();
      setReceiptNo(data.nextReceiptNo || "");
    } catch { }
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
    (async () => {
      try {
        const settings = await getAdminSettings();
        const assets = settings?.documentAssets || {};
        setDocumentAssets({
          principalSignature: assets.principalSignature || settings?.principalSignature || "",
          hrSignature: assets.hrSignature || settings?.hrSignature || "",
          chairmanSignature: assets.chairmanSignature || settings?.chairmanSignature || "",
          rubberStamp: assets.rubberStamp || settings?.rubberStamp || "",
        });
      } catch {
        setDocumentAssets({});
      }
    })();
  }, []);

  useEffect(() => {
    if (academicYear) fetchFees(academicYear);
  }, [academicYear]);

  const enrichWithVirtualTerm = (fee) => {
    if (!fee || (fee.terms && fee.terms.length > 0)) return fee;
    const nTerms = Number(fee.numberOfTerms || 1);
    const tuition = Number(fee.tuitionFee || 0);
    const transport = Number(fee.transportFee || 0);
    const termBase = tuition + transport;
    const splitEvenly = (total, n) => {
      const per = Math.round((total / n) * 100) / 100;
      return Array.from({ length: n }, (_, i) =>
        i === n - 1 ? Math.round((total - per * (n - 1)) * 100) / 100 : per
      );
    };
    const tuitionSplit = splitEvenly(tuition, nTerms);
    const transportSplit = splitEvenly(transport, nTerms);
    const termAmounts = splitEvenly(termBase, nTerms);
    const paidPerTerm = {};
    (fee.payments || payments || []).forEach((p) => {
      if (p.status === "SUCCESS" && p.termNumber) {
        paidPerTerm[p.termNumber] = (paidPerTerm[p.termNumber] || 0) + Number(p.amount);
      }
    });
    const terms = Array.from({ length: nTerms }, (_, i) => {
      const termNum = i + 1;
      const amount = termAmounts[i];
      const paid = paidPerTerm[termNum] || 0;
      return {
        termNumber: termNum,
        termName: nTerms === 1 ? "Full Fee" : `Term ${termNum}`,
        amount: Math.round(amount),
        status: paid >= amount ? "PAID" : "UNPAID",
        tuitionAmount: tuitionSplit[i],
        transportAmount: transportSplit[i],
        bookAmount: 0,
        hostelAmount: 0,
        otherAmount: 0,
      };
    });
    return { ...fee, terms };
  };

  useEffect(() => {
    if (selectedFee && studentFees.length > 0) {
      const updated = studentFees.find((f) => f.id === selectedFee.id);
      if (updated) {
        setSelectedFee(enrichWithVirtualTerm(updated));
      } else {
        setSelectedFee(null);
        setPayments([]);
      }
    }
  }, [studentFees]);

  useEffect(() => {
    if (studentId && studentFees.length > 0) {
      const fee = studentFees.find(f => f.student?.id === studentId);
      if (fee) onSelectFee(fee.id);
    }
  }, [studentId, studentFees]);

  const fetchSiblingFees = async (studentId) => {
    if (!studentId) { setSiblingData([]); return; }
    try {
      const data = await getSiblingFees(studentId);
      setSiblingData(data || []);
    } catch {
      setSiblingData([]);
    }
  };

  const handleAdmissionNoSearch = () => {
    if (!admissionNoSearch.trim()) return;
    const fee = studentFees.find(
      (f) =>
        f.student?.admission?.admissionNo?.toLowerCase() === admissionNoSearch.trim().toLowerCase()
    );
    if (fee) {
      onSelectFee(fee.id);
    } else {
      message.warning("No student found with this admission number in the selected academic year");
    }
  };

  const onSelectFee = async (feeId) => {
    let fee = studentFees.find((f) => f.id === feeId);
    fee = enrichWithVirtualTerm(fee);
    setSelectedFee(fee);
    setAmountFromSystem("");
    setTermNumber(null);
    setPayingNonTerm(false);
    setPayComponents([]);
    setExtraTermNumbers([]);
    setReceiptComponents(getAvailableReceiptComponentOptions(fee));
    setLinkResult(null);
    fetchSiblingFees(fee?.student?.id);
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

  useEffect(() => {
    if (splitMode && selectedFee?.terms?.length > 0) {
      setSplitPayments(
        selectedFee.terms
          .filter((t) => t.status !== "PAID")
          .map((t) => ({
            termNumber: t.termNumber,
            amount: "",
            termName: t.termName,
            pending: Math.round(t.amount - (payments?.filter((p) => p.termNumber === t.termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0)),
          }))
      );
    }
  }, [splitMode, selectedFee, payments]);

  const handleCollect = async () => {
    if (!canCollectFee) { message.error("You are not authorized to collect payments"); return; }
    if (!selectedFee) { message.error("Please select a student"); return; }
    if (!splitMode) {
      if (!amount || Number(amount) <= 0) { message.error("Please enter an amount"); return; }
      if (selectedFee.terms?.length > 0 && !termNumber && !payingNonTerm) { message.error("Please select a term or Non-Term Fees"); return; }
    }
    setLoading(true);
    try {
      let payload;
      if (splitMode) {
        const paymentsArr = splitPayments.filter((p) => Number(p.amount) > 0);
        if (paymentsArr.length === 0) { message.error("Enter at least one term amount"); setLoading(false); return; }
        const totalSplitAmount = paymentsArr.reduce((sum, p) => sum + Math.round(Number(p.amount)), 0);
        payload = {
          studentFeeId: selectedFee.id,
          amount: totalSplitAmount,
          paymentMode,
          receiptNo,
          remarks,
          splitPayments: paymentsArr.map((p) => ({ termNumber: p.termNumber, amount: Math.round(Number(p.amount)) })),
        };
      } else {
        const actualAmount = Number(amount);
        let paidComps = null;
        if (payComponents.length > 0 && termNumber) {
          const enriched = computeTermComponents(selectedFee);
          const selTerm = enriched.find((t) => t.termNumber === termNumber);
          if (selTerm) {
            const termPayments = payments?.filter((p) => p.termNumber === termNumber && p.status === "SUCCESS") || [];
            const componentPaid = {};
            termPayments.forEach((p) => {
              if (p.paidComponents && typeof p.paidComponents === "object") {
                Object.entries(p.paidComponents).forEach(([k, v]) => {
                  componentPaid[k] = (componentPaid[k] || 0) + Number(v);
                });
              }
            });
            const components = [
              { key: "tuition", val: selTerm.tuitionAmount || 0 },
              { key: "transport", val: selTerm.transportAmount || 0 },
              { key: "book", val: selTerm.bookAmount || 0 },
              { key: "hostel", val: selTerm.hostelAmount || 0 },
              { key: "other", val: selTerm.otherAmount || 0 },
            ].map((c) => ({ ...c, paidAmount: componentPaid[c.key] || 0 }));
            const selectedVals = payComponents
              .map((k) => components.find((c) => c.key === k))
              .filter(Boolean)
              .map((c) => ({ key: c.key, val: Math.round(c.val - c.paidAmount) }));
            const totalSelected = selectedVals.reduce((s, it) => s + it.val, 0);
            paidComps = {};
            if (selectedVals.length === 1) {
              paidComps[selectedVals[0].key] = actualAmount;
            } else if (totalSelected > 0) {
              let rem = actualAmount;
              selectedVals.forEach((it, i) => {
                if (i === selectedVals.length - 1) { paidComps[it.key] = rem; }
                else { const share = Math.round((it.val / totalSelected) * actualAmount); paidComps[it.key] = share; rem -= share; }
              });
            }
          }
        }

        const extraTerms = (() => {
          if (!Array.isArray(extraTermNumbers) || extraTermNumbers.length === 0 || !selectedFee?.terms?.length) return [];
          return extraTermNumbers
            .map((tn) => {
              const t = selectedFee.terms.find((x) => x.termNumber === tn);
              if (!t) return null;
              const paid = payments?.filter((p) => p.termNumber === tn && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0;
              const bal = Math.max(0, Math.round(t.amount - paid));
              if (bal <= 0) return null;
              return { termNumber: tn, amount: bal };
            })
            .filter(Boolean);
        })();

        payload = {
          studentFeeId: selectedFee.id,
          amount: Math.round(Number(amount)),
          paymentMode,
          receiptNo,
          remarks,
          termNumber: termNumber || undefined,
          receiptComponents,
          ...(paidComps ? { paidComponents: paidComps } : {}),
        };
      }

      const result = await collectPayment(payload);
      if (Array.isArray(result?.splitPayments) && result.splitPayments.length > 0) {
        message.success(`Payment auto-allocated: ${formatAllocationSummary(result.splitPayments)}`);
      } else {
        message.success("Payment collected successfully!");
      }
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
        paidComponents: result?.paidComponents || payload.paidComponents,
        splitPayments: result?.splitPayments || undefined,
        totalCollected: result?.totalCollected || result?.amount,
        status: result?.status || "SUCCESS",
      });
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
      setAmountFromSystem("");
      setRemarks("");
      setTermNumber(null);
      setPayComponents([]);
      setPayingNonTerm(false);
      setSplitMode(false);
      setSplitPayments([]);
      setExtraTermNumbers([]);
      await fetchReceiptNo();
      await fetchFees(academicYear);
      const paymentList = await getPaymentsByStudentFee(selectedFee.id);
      setPayments(paymentList || []);
      const updatedFees = await getAllStudentFees(academicYear);
      const updatedFee = updatedFees.find((f) => f.id === selectedFee.id);
      setSelectedFee(updatedFee ? enrichWithVirtualTerm(updatedFee) : null);
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
        .sign-img{display:block;width:120px;height:40px;object-fit:contain;margin:0 auto 6px}
        .stamp-img{display:block;width:70px;height:70px;object-fit:contain;margin:0 auto 6px}
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

  // ── Student selector (shared across tabs) ───────────────────────────────
  const StudentSelector = () => (
    <div className="bg-white rounded-2xl px-7 py-5 shadow-[0_4px_20px_rgba(1,29,53,0.06)] border border-outline-variant/20">
      <div className="flex flex-wrap items-end gap-4">
        {/* Academic Year */}
        <div className="space-y-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Academic Year</label>
          <div className="relative">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
            >
              {academicYearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-base">expand_more</span>
          </div>
        </div>

        {/* Admission No */}
        <div className="space-y-1 min-w-[180px]">
          <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Admission No</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={admissionNoSearch}
              onChange={(e) => setAdmissionNoSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdmissionNoSearch()}
              placeholder="e.g. ADM-001"
              className="flex-1 bg-surface-container-high border-none rounded-xl py-2.5 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
            />
            <button
              type="button"
              onClick={handleAdmissionNoSearch}
              className="px-3 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">search</span>
            </button>
          </div>
        </div>

        {/* Student search */}
        <div className="space-y-1 flex-1 min-w-[260px]">
          <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Search Student</label>
          <div className="relative">
            <select
              value={selectedFee?.id || ""}
              onChange={(e) => e.target.value && onSelectFee(e.target.value)}
              className="w-full bg-surface-container-high border-none rounded-xl py-2.5 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
            >
              <option value="">Select student...</option>
              {studentFees.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.student?.admission?.admissionNo ? `[${f.student.admission.admissionNo}] ` : ""}{f.student?.name} — {formatStandardLabel(f.student?.standard)} — Pending: {fmt(f.pending)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-primary/40 pointer-events-none text-base">expand_more</span>
          </div>
        </div>

        {/* Selected student badge */}
        {selectedFee && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/8 rounded-xl border border-primary/15">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black flex-shrink-0">
              {(selectedFee.student?.name || "?")[0]}
            </div>
            <div>
              <p className="text-sm font-bold text-primary leading-none">{selectedFee.student?.name}</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                {formatStandardLabel(selectedFee.student?.standard)} · Pending: <span className={`font-bold ${Number(selectedFee.pending) > 0 ? "text-error" : "text-[#2e7d32]"}`}>{fmt(selectedFee.pending)}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── TAB: Collect Payment ─────────────────────────────────────────────────
  const CollectTab = () => (
    <div className="grid grid-cols-12 gap-5">
      {/* Left: form */}
      <div className="col-span-12 lg:col-span-8">
        <section ref={paymentFormRef} className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
          <div className="flex items-center gap-4 mb-7">
            <div className="w-12 h-12 bg-tertiary-fixed rounded-xl flex items-center justify-center text-tertiary flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-primary">Payment Transaction</h3>
              <p className="text-sm text-on-surface-variant">Enter receipt details and payment mode</p>
            </div>
          </div>

          {/* Term selection */}
          {selectedFee?.terms?.length > 0 && (
            <div className="mb-8 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">account_tree</span>
                  <label className="text-[11px] font-extrabold text-primary uppercase tracking-widest">Term Distribution</label>
                </div>
                <Checkbox
                  checked={splitMode}
                  onChange={e => {
                    setSplitMode(e.target.checked);
                    if (e.target.checked) setTermNumber(null);
                  }}
                  className="text-primary font-bold text-xs"
                >
                  Split Payment Across Terms
                </Checkbox>
              </div>

              {!splitMode ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {selectedFee.terms.map((t) => {
                      const paid = payments?.filter((p) => p.termNumber === t.termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0;
                      const balance = Math.round(t.amount - paid);
                      const isPaid = t.status === "PAID" || balance <= 0;
                      return (
                        <button
                          key={t.termNumber}
                          type="button"
                          onClick={() => {
                            if (isPaid) return;
                            setTermNumber(t.termNumber);
                            setPayingNonTerm(false);
                            setPayComponents([]);
                            setExtraTermNumbers([]);
                            setAmountFromSystem(balance.toString());
                          }}
                          disabled={isPaid}
                          className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 text-left transition-all ${termNumber === t.termNumber
                            ? "border-primary bg-primary text-white shadow-lg"
                            : isPaid
                              ? "border-[#4caf50]/30 bg-[#e8f5e9]/60 text-[#2e7d32] cursor-not-allowed"
                              : "border-outline-variant/30 bg-white text-on-surface hover:border-primary/40 hover:bg-primary/5"
                            }`}
                        >
                          <span className="text-xs font-bold">{t.termName}</span>
                          <span className={`text-[11px] mt-0.5 ${termNumber === t.termNumber ? "text-white/80" : isPaid ? "text-[#2e7d32]" : "text-on-surface-variant"}`}>
                            {isPaid ? "✓ Paid" : `Balance: ${fmt(balance)}`}
                          </span>
                        </button>
                      );
                    })}

                    {/* Non-term fees button */}
                    {(() => {
                      const nonTermTotal = Number(selectedFee.bookFee || 0) + Number(selectedFee.hostelFee || 0) + Number(selectedFee.otherFee || 0) +
                        (selectedFee.customItems || []).reduce((s, ci) => s + Number(ci.amount || 0), 0);
                      if (nonTermTotal <= 0) return null;
                      const nonTermPaid = payments?.filter((p) => !p.termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0;
                      const nonTermBal = Math.round(nonTermTotal - nonTermPaid);
                      const isNonTermPaid = nonTermBal <= 0;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (isNonTermPaid) return;
                            setPayingNonTerm(true);
                            setTermNumber(null);
                            setPayComponents([]);
                            setExtraTermNumbers([]);
                            setAmountFromSystem(nonTermBal.toString());
                          }}
                          disabled={isNonTermPaid}
                          className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 text-left transition-all ${payingNonTerm
                            ? "border-tertiary bg-tertiary text-white shadow-lg"
                            : isNonTermPaid
                              ? "border-[#4caf50]/30 bg-[#e8f5e9]/60 text-[#2e7d32] cursor-not-allowed"
                              : "border-outline-variant/30 bg-white text-on-surface hover:border-tertiary/40 hover:bg-tertiary/5"
                            }`}
                        >
                          <span className="text-xs font-bold">Other Fees</span>
                          <span className={`text-[11px] mt-0.5 ${payingNonTerm ? "text-white/80" : isNonTermPaid ? "text-[#2e7d32]" : "text-tertiary"}`}>
                            {isNonTermPaid ? "✓ Paid" : `Balance: ${fmt(nonTermBal)}`}
                          </span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Component quick-pay (term) */}
                  {termNumber && (() => {
                    const enriched = computeTermComponents(selectedFee);
                    const selTerm = enriched.find((t) => t.termNumber === termNumber);
                    if (!selTerm) return null;
                    const termPayments = payments?.filter((p) => p.termNumber === termNumber && p.status === "SUCCESS") || [];
                    const paid = termPayments.reduce((s, p) => s + p.amount, 0);
                    const bal = Math.round(selTerm.amount - paid);
                    const componentPaid = {};
                    termPayments.forEach((p) => {
                      if (p.paidComponents && typeof p.paidComponents === "object") {
                        Object.entries(p.paidComponents).forEach(([k, v]) => {
                          componentPaid[k] = (componentPaid[k] || 0) + Number(v);
                        });
                      }
                    });
                    const components = [
                      { key: "tuition", label: "Tuition", val: selTerm.tuitionAmount || 0, icon: "school" },
                      ...(Number(selTerm.transportAmount || 0) > 0 ? [{ key: "transport", label: "Transport", val: selTerm.transportAmount, icon: "directions_bus", highlight: true }] : []),
                      ...(Number(selTerm.bookAmount || 0) > 0 ? [{ key: "book", label: "Book", val: selTerm.bookAmount, icon: "menu_book" }] : []),
                      ...(Number(selTerm.hostelAmount || 0) > 0 ? [{ key: "hostel", label: "Hostel", val: selTerm.hostelAmount, icon: "hotel" }] : []),
                      ...(Number(selTerm.otherAmount || 0) > 0 ? [{ key: "other", label: "Other", val: selTerm.otherAmount, icon: "more_horiz" }] : []),
                    ].map((c) => ({ ...c, paidAmount: componentPaid[c.key] || 0, isFullyPaid: (componentPaid[c.key] || 0) >= c.val }));
                    const unpaidComponents = components.filter((c) => !c.isFullyPaid);
                    const toggleComponent = (key) => {
                      const comp = components.find((c) => c.key === key);
                      if (comp?.isFullyPaid) return;
                      let next = payComponents.includes(key) ? payComponents.filter((k) => k !== key) : [...payComponents, key];
                      setPayComponents(next);
                      if (next.length === 0 || next.length === unpaidComponents.length) {
                        setPayComponents([]);
                        setAmountFromSystem(bal.toString());
                      } else {
                        const sum = Math.min(
                          components.filter((c) => next.includes(c.key)).reduce((s, c) => s + Math.round(c.val - c.paidAmount), 0),
                          bal
                        );
                        setAmountFromSystem(Math.round(sum).toString());
                      }
                    };
                    const allSelected = payComponents.length === 0;
                    return (
                      <div className="mt-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{selTerm.termName} — Balance {fmt(bal)}</span>
                          {bal > 0 && (
                            <button type="button" onClick={() => { setPayComponents([]); setAmountFromSystem(bal.toString()); }}
                              className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${allSelected ? "bg-primary text-white" : "bg-white text-primary hover:bg-primary/10"}`}>
                              Pay Full Term
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {components.map((c) => {
                            const isActive = payComponents.includes(c.key);
                            if (c.isFullyPaid) {
                              return (
                                <div key={c.key} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/20 cursor-default">
                                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  {c.label} <span className="text-[10px] text-[#2e7d32]/70">{fmt(c.val)} Paid</span>
                                </div>
                              );
                            }
                            const remaining = Math.round(c.val - c.paidAmount);
                            return (
                              <button key={c.key} type="button" onClick={() => toggleComponent(c.key)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${isActive ? c.highlight ? "bg-tertiary text-white border-tertiary shadow-md" : "bg-primary text-white border-primary shadow-md" : allSelected ? c.highlight ? "bg-tertiary-fixed/20 text-tertiary border-tertiary/20" : "bg-white text-on-surface-variant border-outline-variant/30" : "bg-white text-on-surface-variant border-outline-variant/30 opacity-60"}`}>
                                <span className="material-symbols-outlined text-sm">{c.icon}</span>
                                {c.label}
                                <span className={`text-[10px] font-medium ${isActive ? "text-white/80" : allSelected && c.highlight ? "text-tertiary" : "text-on-surface-variant"}`}>
                                  {c.paidAmount > 0 ? `${fmt(remaining)} left` : fmt(c.val)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {payComponents.length > 0 && (
                          <div className="mt-2 text-[10px] text-primary font-bold">
                            Paying: {payComponents.map((k) => components.find((c) => c.key === k)?.label).join(" + ")} = {fmt(amount)}
                          </div>
                        )}

                        {/* one-shot extra term pick */}
                        {selectedFee?.terms?.length > 1 && (
                          <div className="mt-4 pt-3 border-t border-primary/10">
                            <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                              Also include other term balances in this single shot
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedFee.terms
                                .filter((t) => t.termNumber !== termNumber)
                                .map((t) => {
                                  const tPaid = payments?.filter((p) => p.termNumber === t.termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0;
                                  const tBal = Math.max(0, Math.round(t.amount - tPaid));
                                  if (tBal <= 0) return null;
                                  const active = extraTermNumbers.includes(t.termNumber);
                                  return (
                                    <button
                                      key={`extra-${t.termNumber}`}
                                      type="button"
                                      onClick={() => {
                                        setExtraTermNumbers((prev) => {
                                          const next = prev.includes(t.termNumber)
                                            ? prev.filter((n) => n !== t.termNumber)
                                            : [...prev, t.termNumber];
                                          const selectedCompSum = payComponents.length > 0
                                            ? components
                                              .filter((c) => payComponents.includes(c.key))
                                              .reduce((s, c) => s + Math.round(c.val - c.paidAmount), 0)
                                            : bal;
                                          const extraSum = next.reduce((s, tn) => {
                                            const trm = selectedFee.terms.find((x) => x.termNumber === tn);
                                            if (!trm) return s;
                                            const paidVal = payments?.filter((p) => p.termNumber === tn && p.status === "SUCCESS").reduce((ss, p) => ss + p.amount, 0) || 0;
                                            return s + Math.max(0, Math.round(trm.amount - paidVal));
                                          }, 0);
                                          setAmountFromSystem(Math.max(0, Math.round(selectedCompSum + extraSum)).toString());
                                          return next;
                                        });
                                      }}
                                      className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${active
                                        ? "bg-primary text-white border-primary"
                                        : "bg-white text-on-surface-variant border-outline-variant/40 hover:border-primary/40"
                                        }`}
                                    >
                                      {t.termName} {fmt(tBal)}
                                    </button>
                                  );
                                })}
                            </div>
                            {extraTermNumbers.length > 0 && (
                              <div className="mt-2 text-[10px] text-primary font-bold">
                                Total this shot (current selection + extra terms): {fmt(amount)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="bg-white rounded-xl border border-outline-variant/50 overflow-hidden shadow-sm">
                  <Table
                    size="small"
                    dataSource={splitPayments.map((sp) => {
                      const enriched = computeTermComponents(selectedFee);
                      const t = enriched.find((tt) => tt.termNumber === sp.termNumber);
                      return { ...sp, term: t, key: sp.termNumber };
                    })}
                    columns={[
                      { title: "Term", dataIndex: "termName", render: (v) => <span className="font-bold text-primary text-xs">{v}</span> },
                      { title: "Pending", dataIndex: "pending", render: v => <span className="text-xs font-medium text-on-surface-variant">{fmt(v)}</span> },
                      {
                        title: "Amount to Pay", dataIndex: "termNumber",
                        render: (termNum) => (
                          <input
                            type="number"
                            min={0}
                            max={splitPayments.find(s => s.termNumber === termNum)?.pending}
                            value={splitPayments.find(s => s.termNumber === termNum)?.amount || ""}
                            onChange={(e) => setSplitPayments(prev => prev.map(s => s.termNumber === termNum ? { ...s, amount: e.target.value } : s))}
                            placeholder="0"
                            className="w-28 bg-surface-container-high border-none rounded-lg py-1.5 px-3 text-sm font-medium outline-none focus:bg-surface-container-highest"
                          />
                        )
                      },
                    ]}
                    pagination={false}
                  />
                </div>
              )}
            </div>
          )}

          {/* Receipt No + Amount */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Receipt No</label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
              />
            </div>
            {!splitMode && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Amount (₹)</label>
                <input
                  key={amountInputKey}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  defaultValue={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={(e) => {
                    const sanitized = (e.target.value || "").replace(/[^0-9]/g, "");
                    e.target.value = sanitized;
                    setAmount(sanitized);
                  }}
                  placeholder="Enter amount"
                  className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
                />
              </div>
            )}
          </div>

          {/* Payment mode */}
          <div className="mb-6">
            <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1 mb-2 block">Payment Mode</label>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMode(m.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${paymentMode === m.value
                    ? "border-primary bg-primary text-white shadow-md"
                    : "border-outline-variant/40 bg-white text-on-surface-variant hover:border-primary/40 hover:bg-primary/5"
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6 space-y-1.5">
            <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes..."
              rows={2}
              className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none resize-none"
            />
          </div>

          {/* Receipt components */}
          {selectedFee && getAvailableReceiptComponentOptions(selectedFee).length > 0 && (
            <div className="mb-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider block mb-3">Receipt Components to Include</label>
              <div className="flex flex-wrap gap-3">
                {getAvailableReceiptComponentOptions(selectedFee).map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={receiptComponents.includes(key)}
                      onChange={(e) => {
                        setReceiptComponents(prev =>
                          e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)
                        );
                      }}
                      className="w-4 h-4 rounded border-outline accent-primary"
                    />
                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                      {RECEIPT_COMPONENT_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Collect button */}
          <button
            type="button"
            disabled={loading || !canCollectFee || !selectedFee || Number(selectedFee?.pending || 0) <= 0}
            onClick={handleCollect}
            style={{ background: 'linear-gradient(to right, #00152a, #102a43)' }}
            className="w-full py-4 rounded-xl text-white font-headline font-bold text-lg shadow-[0_10px_20px_rgba(0,21,42,0.2)] hover:shadow-[0_15px_30px_rgba(0,21,42,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? (
              <><span className="material-symbols-outlined text-base animate-spin">refresh</span>Processing...</>
            ) : (
              <><span className="material-symbols-outlined">point_of_sale</span>Collect Payment</>
            )}
          </button>

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

      {/* Right: account summary */}
      <div className="col-span-12 lg:col-span-4 space-y-5">
        <section className="bg-primary-container rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10">
            <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
          </div>
          <h3 className="font-headline font-bold text-lg mb-5 flex items-center gap-2 text-on-primary-container">
            <span className="material-symbols-outlined text-secondary-fixed-dim">bar_chart</span>
            Account Summary
          </h3>
          {selectedFee ? (
            <div className="space-y-3 text-white">
              <div className="mb-4">
                <p className="text-lg font-headline font-extrabold text-white">{selectedFee.student?.name || "—"}</p>
                <p className="text-[11px] text-on-primary-container/70">
                  {selectedFee.student?.admission?.admissionNo && <span className="font-bold">{selectedFee.student.admission.admissionNo} · </span>}
                  {formatStandardLabel(selectedFee.student?.standard)}{selectedFee.student?.section ? ` - ${selectedFee.student.section}` : ""} · {selectedFee.academicYear || academicYear}
                </p>
              </div>
              {[
                { label: "Total Fee", val: selectedFee.totalFee },
                { label: "Discount", val: selectedFee.discount, negative: true },
                { label: "Net Fee", val: selectedFee.netFee, divider: true },
                { label: "Amount Paid", val: selectedFee.totalPaid },
              ].map(({ label, val, negative, divider }) => (
                <React.Fragment key={label}>
                  {divider && <div className="h-px bg-white/10 my-1" />}
                  <div className="flex justify-between items-center text-on-primary-container/80">
                    <span className="text-sm text-white-dim">{label}</span>
                    <span className="font-bold text-white">{negative ? "− " : ""}{fmt(val)}</span>
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
      </div>
    </div>
  );

  // ── TAB: Payment History ─────────────────────────────────────────────────
  const HistoryTab = () => (
    <section className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden">
      {/* Toolbar */}
      <div className="px-7 py-5 border-b border-outline-variant/20 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          Payment History
          {selectedFee && <span className="text-sm font-normal text-on-surface-variant">— {selectedFee.student?.name}</span>}
        </h3>
        <div className="flex gap-2">
          {["ALL", "SUCCESS", "REFUNDED", "CANCELLED"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPaymentStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentStatusFilter === f
                ? "bg-primary text-white"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {!selectedFee ? (
        <div className="py-20 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl block mb-3 opacity-30">person_search</span>
          <p className="text-sm">Select a student above to view payment history</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface">
                {["Date", "Receipt No", "Term", "Amount", "Mode", "Status", "Actions"].map((h, i) => (
                  <th key={h} className={`px-5 py-3.5 ${i === 3 ? "text-right" : ""} ${i === 6 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, idx) => (
                <tr key={p.id || idx} className="border-b border-surface-container-low hover:bg-surface-bright transition-colors">
                  <td className="px-5 py-4 font-medium">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">{p.receiptNo || "—"}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{p.termNumber ? `Term ${p.termNumber}` : "General"}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-bold text-primary">{fmt(p.amount)}</div>
                    {p.paidComponents && Object.keys(p.paidComponents).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
                        {Object.entries(p.paidComponents).map(([k, v]) => (
                          <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${k === "transport" ? "bg-tertiary-fixed/20 text-tertiary" : "bg-surface-container-high text-on-surface-variant"}`}>
                            {formatPaidComponentLabel(k)} {fmt(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">{modeIcon(p.paymentMode)}</span>
                      {p.paymentMode || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">{statusBadge(p.status)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handlePrintExistingPayment(p)} title="Print Receipt"
                        className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">print</span>
                      </button>
                      {canCollectFee && p.status !== "CANCELLED" && p.status !== "REFUNDED" && (
                        <>
                          <button onClick={() => openStatusModal("refund", p)} title="Refund"
                            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">replay</span>
                          </button>
                          <button onClick={() => openStatusModal("cancel", p)} title="Cancel"
                            className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center text-error hover:bg-error hover:text-white transition-all">
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
                  <td colSpan={7} className="px-5 py-16 text-center text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">receipt_long</span>
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  // ── TAB: Fee Summary ─────────────────────────────────────────────────────
  const SummaryTab = () => {
    if (!selectedFee) return (
      <div className="bg-white rounded-2xl py-20 text-center text-on-surface-variant shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
        <span className="material-symbols-outlined text-4xl block mb-3 opacity-30">bar_chart</span>
        <p className="text-sm">Select a student above to view fee summary</p>
      </div>
    );

    return (
      <div className="grid grid-cols-12 gap-5">
        {/* Account summary */}
        <div className="col-span-12 lg:col-span-4">
          <section className="bg-primary-container rounded-2xl p-7 shadow-xl relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10">
              <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-5 flex items-center gap-2 text-on-primary-container">
              <span className="material-symbols-outlined text-secondary-fixed-dim">bar_chart</span>
              Account Summary
            </h3>
            <div className="space-y-3">
              <div className="mb-4">
                <p className="text-lg font-headline font-extrabold text-white">{selectedFee.student?.name}</p>
                <p className="text-[11px] text-on-primary-container/70">
                  {selectedFee.student?.admission?.admissionNo && <span className="font-bold">{selectedFee.student.admission.admissionNo} · </span>}
                  {formatStandardLabel(selectedFee.student?.standard)} · {selectedFee.academicYear || academicYear}
                </p>
              </div>
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
                    <span className="font-bold text-white">{negative ? "− " : ""}{fmt(val)}</span>
                  </div>
                </React.Fragment>
              ))}
              <div className="mt-6 bg-white/10 rounded-2xl p-5 border border-white/10 text-center">
                <p className="text-[10px] uppercase tracking-widest text-secondary-fixed mb-1 font-bold">Pending Balance</p>
                <p className={`text-4xl font-headline font-extrabold ${Number(selectedFee.pending || 0) > 0 ? "text-white" : "text-[#44ddc1]"}`}>
                  {fmt(selectedFee.pending)}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Term-wise status */}
        {selectedFee.terms?.length > 0 && (
          <div className="col-span-12 lg:col-span-8">
            <section className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
              <h3 className="font-headline font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                Term-Wise Status
              </h3>
              <div className="space-y-3">
                {selectedFee.terms.map((t) => {
                  const paid = payments?.filter((p) => p.termNumber === t.termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0;
                  const termAmt = Number(t.amount || 0);
                  const balance = Math.round(termAmt - paid);
                  const isPaid = t.status === "PAID" || balance <= 0;
                  const isPartial = paid > 0 && !isPaid;
                  const pctPaid = termAmt > 0 ? Math.min(Math.round((paid / termAmt) * 100), 100) : 0;
                  return (
                    <div key={t.termNumber} className={`p-3.5 rounded-xl border ${isPaid ? "bg-[#e8f5e9]/60 border-[#4caf50]/20" : isPartial ? "bg-amber-50/60 border-amber-200" : "bg-surface-container-low border-outline-variant/20"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isPaid ? "bg-[#4caf50] text-white" : isPartial ? "bg-amber-400 text-white" : "bg-surface-container-highest text-on-surface-variant"}`}>{t.termNumber}</span>
                          <span className="text-sm font-bold text-on-surface">{t.termName}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isPaid ? "bg-[#4caf50]/20 text-[#2e7d32]" : isPartial ? "bg-amber-100 text-amber-700" : "bg-surface-container-highest text-on-surface-variant"}`}>
                          {isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid"}
                        </span>
                      </div>
                      {t.dueDate && (
                        <p className="text-[10px] text-on-surface-variant mb-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">event</span>
                          Due: {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-on-surface-variant">Amount: <span className="font-bold text-on-surface">{fmt(termAmt)}</span></span>
                        <span className="text-on-surface-variant">Paid: <span className="font-bold text-[#2e7d32]">{fmt(paid)}</span></span>
                      </div>
                      {!isPaid && (
                        <div className="flex justify-between text-[11px] mb-1.5">
                          <span className="text-on-surface-variant">Balance:</span>
                          <span className="font-bold text-error">{fmt(balance)}</span>
                        </div>
                      )}
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${isPaid ? "bg-[#4caf50]" : isPartial ? "bg-amber-400" : "bg-outline-variant/30"}`}
                          style={{ width: `${pctPaid}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Component breakdown table */}
              <div className="mt-6">
                <h4 className="font-headline font-bold text-sm text-primary mb-3">Component Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="text-left py-2 px-3">Component</th>
                        {computeTermComponents(selectedFee).map((t) => (
                          <th key={t.termNumber} className="text-right py-2 px-3">{t.termName}</th>
                        ))}
                        <th className="text-right py-2 px-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Tuition", field: "tuitionAmount", total: selectedFee.tuitionFee },
                        ...(Number(selectedFee.transportFee || 0) > 0 ? [{ label: "Transport", field: "transportAmount", total: selectedFee.transportFee, highlight: true }] : []),
                      ].map((row) => (
                        <tr key={row.field} className={row.highlight ? "bg-tertiary-fixed/10" : ""}>
                          <td className={`py-2 px-3 font-bold ${row.highlight ? "text-tertiary" : "text-on-surface"}`}>{row.label}</td>
                          {computeTermComponents(selectedFee).map((t) => (
                            <td key={t.termNumber} className="text-right py-2 px-3 font-medium text-on-surface-variant">{fmt(t[row.field] || 0)}</td>
                          ))}
                          <td className="text-right py-2 px-3 font-bold text-on-surface">{fmt(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-outline-variant/30">
                        <td className="py-2 px-3 font-extrabold text-primary">Total</td>
                        {computeTermComponents(selectedFee).map((t) => (
                          <td key={t.termNumber} className="text-right py-2 px-3 font-extrabold text-primary">{fmt(t.amount)}</td>
                        ))}
                        <td className="text-right py-2 px-3 font-extrabold text-primary">
                          {fmt(Number(selectedFee.tuitionFee || 0) + Number(selectedFee.transportFee || 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  };

  // ── TAB: Siblings ────────────────────────────────────────────────────────
  const SiblingsTab = () => {
    if (!selectedFee) return (
      <div className="bg-white rounded-2xl py-20 text-center text-on-surface-variant shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
        <span className="material-symbols-outlined text-4xl block mb-3 opacity-30">group</span>
        <p className="text-sm">Select a student above to view sibling fees</p>
      </div>
    );

    return (
      <section className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
        <h3 className="font-headline font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          Sibling Fees
        </h3>

        {!selectedFee.student?.siblingGroupId ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">person</span>
            <p className="text-sm">No sibling group assigned for this student.</p>
          </div>
        ) : siblingData.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">group_off</span>
            <p className="text-sm">No siblings found in this group.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-on-surface-variant mb-4">
              {siblingData.length} sibling{siblingData.length > 1 ? "s" : ""} found — parents can pay for siblings here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {siblingData.map((sib) => {
                const totalNet = sib.fees.reduce((s, f) => s + Number(f.netFee || 0), 0);
                const totalPaid = sib.fees.reduce((s, f) => s + Number(f.totalPaid || 0), 0);
                const totalPending = sib.fees.reduce((s, f) => s + Number(f.pending || 0), 0);
                const paidPercent = totalNet > 0 ? Math.round((totalPaid / totalNet) * 100) : 0;
                const pendingFee = sib.fees.find((f) => Number(f.pending) > 0);
                return (
                  <div key={sib.id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-primary text-sm font-black flex-shrink-0">
                          {(sib.name || "?")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{sib.name}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {sib.admission?.admissionNo && <span className="font-bold">{sib.admission.admissionNo} · </span>}
                            {formatStandardLabel(sib.standard)}{sib.section ? ` - ${sib.section}` : ""}
                          </p>
                        </div>
                      </div>
                      {pendingFee && (
                        <button
                          type="button"
                          onClick={async () => {
                            const feeYear = pendingFee.academicYear;
                            if (feeYear !== academicYear) {
                              setAcademicYear(feeYear);
                              try {
                                const freshFees = await getAllStudentFees(feeYear);
                                setStudentFees(freshFees || []);
                                const match = (freshFees || []).find((sf) => sf.id === pendingFee.id);
                                if (match) {
                                  const enriched = enrichWithVirtualTerm(match);
                                  setSelectedFee(enriched);
                                  const list = await getPaymentsByStudentFee(match.id);
                                  setPayments(list || []);
                                }
                              } catch { message.error("Failed to load sibling fees"); }
                            } else {
                              onSelectFee(pendingFee.id);
                            }
                            setActiveTab("collect");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[11px]">point_of_sale</span>
                          Pay
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      {sib.fees.map((f) => (
                        <div key={f.id} className="flex justify-between items-center py-1 border-b border-outline-variant/15 last:border-0">
                          <span className="text-on-surface-variant">{f.academicYear}</span>
                          <div className="flex gap-3">
                            <span>Net: <span className="font-bold text-on-surface">{fmt(f.netFee)}</span></span>
                            <span>Paid: <span className="font-bold text-[#2e7d32]">{fmt(f.totalPaid)}</span></span>
                            <span>Pending: <span className={`font-bold ${Number(f.pending) > 0 ? "text-error" : "text-[#2e7d32]"}`}>{fmt(f.pending)}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-on-surface-variant">Overall progress</span>
                        <span className="font-bold text-primary">{paidPercent}%</span>
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${paidPercent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    );
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page header */}
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

      {/* Shared student selector */}
      <StudentSelector />

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface-container-low rounded-2xl p-1.5 w-fit">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          // Badge counts
          let badge = null;
          if (tab.key === "history" && payments.length > 0) badge = payments.length;
          if (tab.key === "siblings" && siblingData.length > 0) badge = siblingData.length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive
                ? "bg-white text-primary shadow-[0_2px_8px_rgba(1,29,53,0.12)]"
                : "text-on-surface-variant hover:text-primary hover:bg-white/50"
                }`}
            >
              <span className="material-symbols-outlined text-base" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
              {tab.label}
              {badge && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "collect"  && CollectTab()}
        {activeTab === "history"  && HistoryTab()}
        {activeTab === "summary"  && SummaryTab()}
        {activeTab === "siblings" && SiblingsTab()}
      </div>

      {/* ── Print receipt modal ── */}
      <Modal
        open={!!printPayment}
        title="Fee Receipt Preview"
        onCancel={() => setPrintPayment(null)}
        width={700}
        footer={[
          <button key="close" onClick={() => setPrintPayment(null)} className="px-6 py-2 rounded-xl border border-outline-variant font-bold text-sm mr-2 hover:bg-surface-container-low transition-colors">Close</button>,
          <button key="print" onClick={handlePrint} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-sm">print</span>Print Receipt
          </button>,
        ]}
      >
        {printPayment && (
          <div ref={printRef}>
            <div className="receipt">
              <div className="header"><h2>School ERP</h2><p>Fee Payment Receipt</p></div>
              <div className="receipt-no">Receipt No: {printPayment.receiptNo || "N/A"}</div>
              <div className="receipt-no" style={{ marginTop: -4 }}>Status: {printPayment.status || "SUCCESS"}</div>
              <table>
                <tbody>
                  <tr><th width="35%">Student Name</th><td>{printPayment.studentName}</td></tr>
                  <tr><th>Standard</th><td>{printPayment.standard}</td></tr>
                  <tr><th>Payment Date</th><td>{new Date(printPayment.paymentDate).toLocaleDateString()}</td></tr>
                  <tr><th>Payment Mode</th><td>{printPayment.paymentMode}</td></tr>
                  {printPayment.termNumber && <tr><th>Term</th><td>Term {printPayment.termNumber}</td></tr>}
                  <tr><th>Amount Paid</th><td style={{ fontSize: "16px", fontWeight: "bold" }}>₹{Number(printPayment.totalCollected || printPayment.amount || 0).toLocaleString()}</td></tr>
                </tbody>
              </table>
              {Array.isArray(printPayment.splitPayments) && printPayment.splitPayments.length > 0 && (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>Auto Allocation</h4>
                  <table>
                    <thead><tr><th>Allocated To</th><th>Amount</th><th>Components</th></tr></thead>
                    <tbody>
                      {printPayment.splitPayments.map((sp, idx) => (
                        <tr key={`${sp.termNumber || "other"}-${idx}`}>
                          <td>{sp.termNumber ? `Term ${sp.termNumber}` : "Other Fees"}</td>
                          <td>₹{Number(sp.amount || 0).toLocaleString()}</td>
                          <td>
                            {sp?.paidComponents && typeof sp.paidComponents === "object"
                              ? Object.entries(sp.paidComponents)
                                .map(([k, v]) => `${formatPaidComponentLabel(k)}: ₹${Number(v || 0).toLocaleString()}`)
                                .join(", ")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                      <tr className="total-row"><td>Total Allocated</td><td>₹{Number(printPayment.totalCollected || printPayment.amount || 0).toLocaleString()}</td><td>-</td></tr>
                    </tbody>
                  </table>
                </>
              )}
              {printPayment.paidComponents && Object.keys(printPayment.paidComponents).length > 0 ? (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>Paid Components</h4>
                  <table><thead><tr><th>Component</th><th>Amount</th></tr></thead>
                    <tbody>
                      {Object.entries(printPayment.paidComponents).map(([k, v]) => (
                        <tr key={k}><td>{formatPaidComponentLabel(k)}</td><td>₹{Number(v).toLocaleString()}</td></tr>
                      ))}
                      <tr className="total-row"><td>Total Paid</td><td>₹{printPayment.amount?.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>Receipt Fee Components</h4>
                  <table><thead><tr><th>Component</th><th>Amount</th></tr></thead>
                    <tbody>
                      {buildReceiptFeeRows(printPayment).map((row) => (
                        <tr key={row.key}><td>{row.label}</td><td>₹{row.amount?.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {printPayment.totalFee && (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>Fee Summary</h4>
                  <table><tbody>
                    <tr><th width="35%">Total Fee</th><td>₹{printPayment.totalFee?.toLocaleString()}</td></tr>
                    <tr><th>Net Fee (after discount)</th><td>₹{printPayment.netFee?.toLocaleString()}</td></tr>
                  </tbody></table>
                </>
              )}
              {printPayment.remarks && <p style={{ marginTop: 12 }}><strong>Remarks:</strong> {printPayment.remarks}</p>}
              <div className="footer">
                <div><div className="sign-line">Student / Parent</div></div>
                <div>
                  {normalizeAssetSrc(documentAssets?.hrSignature) && (
                    <img src={normalizeAssetSrc(documentAssets.hrSignature)} alt="HR Signature" className="sign-img" />
                  )}
                  <div className="sign-line">HR Signature</div>
                </div>
                <div>
                  {normalizeAssetSrc(documentAssets?.rubberStamp) && (
                    <img src={normalizeAssetSrc(documentAssets.rubberStamp)} alt="Rubber Stamp" className="stamp-img" />
                  )}
                  <div className="sign-line">School Seal</div>
                </div>
                <div>
                  {normalizeAssetSrc(documentAssets?.chairmanSignature) && (
                    <img src={normalizeAssetSrc(documentAssets.chairmanSignature)} alt="Chairman Signature" className="sign-img" />
                  )}
                  <div className="sign-line">Chairman Signature</div>
                </div>
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
            <Form.Item name="refundAmount" label="Refund Amount" rules={[{ required: true, message: "Refund amount is required" }]} initialValue={statusModal.payment?.amount}>
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
              {[{ label: "Amount", val: fmt(linkResult.amount) }, { label: "Channel", val: linkResult.channel }, { label: "Phone", val: linkResult.phoneNumber }, { label: "Status", val: linkResult.status }].map(({ label, val }) => (
                <div key={label} className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-bold">{val}</span>
                </div>
              ))}
              {linkResult.phonePeUrl && (
                <a href={linkResult.phonePeUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline block pt-2">Open Payment Link →</a>
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
      <div className={`fixed bottom-8 right-8 flex items-center gap-4 bg-tertiary text-white px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 z-50 ${showSuccessToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
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