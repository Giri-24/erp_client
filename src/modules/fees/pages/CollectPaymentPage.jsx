import React, { useEffect, useState, useRef } from "react";
import { message, Modal, Form, Input, InputNumber, Select, Radio, Alert, Space, Checkbox, Table } from "antd";
import { WhatsAppOutlined, MessageOutlined, LinkOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../../assets/logo.jpeg";
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

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Math.round(Number(v || 0)).toLocaleString("en-IN");

const fmtPdfCurrency = (v) => `Rs. ${Math.round(Number(v || 0)).toLocaleString("en-IN")}`;
const RECEIPT_SCHOOL_NAME = "PSF Matriculation Hr Sec School";

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

// Compute per-term component split (only tuition + transport are term-wise)
const computeTermComponents = (fee) => {
  if (!fee?.terms?.length) return fee?.terms || [];
  const nTerms = fee.terms.length;
  const splitEvenly = (val, n) => {
    const perTerm = Math.round((val / n) * 100) / 100;
    return Array.from({ length: n }, (_, i) =>
      i === n - 1 ? Math.round((val - perTerm * (n - 1)) * 100) / 100 : perTerm
    );
  };
  // Check if component amounts are already populated
  const hasComponents = fee.terms.some(
    (t) => (t.tuitionAmount || 0) > 0 || (t.transportAmount || 0) > 0
  );
  if (hasComponents) return fee.terms;
  // Fallback: only split tuition + transport; book/hostel/other are non-term
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

const getPaidComponentLabel = (payment, key) => {
  const labelMap = {
    tuition: "Tuition Fee",
    transport: "Transport Fee",
    book: "Book Fee",
    hostel: "Hostel Fee",
    other: "Other Fee",
  };

  if (labelMap[key]) return labelMap[key];

  if (key?.startsWith("custom-")) {
    const customKey = key.slice("custom-".length);
    const customItem = (payment?.customItems || []).find(
      (item) => String(item.id || item.name) === customKey
    );
    if (customItem?.name) return customItem.name;
  }

  return key
    ?.replace(/([a-z])([A-Z])/g, "$1 $2")
    ?.replace(/^\w/, (ch) => ch.toUpperCase()) || "Component";
};

const getReceiptFileName = (payment) => {
  const baseName = String(payment?.receiptNo || "fee-receipt")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${baseName || "fee-receipt"}.pdf`;
};

const getStudentAdmissionNo = (fee) =>
  fee?.student?.admission?.admissionNo ||
  fee?.student?.admissions?.[0]?.admissionNo ||
  fee?.student?.admissionNo ||
  "";

const loadReceiptLogo = () =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = logo;
  });

const receiptPreviewStyles = {
  wrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 620,
    margin: "0 auto",
    border: "1px solid #dbe3ea",
    borderRadius: 24,
    padding: "28px 24px",
    background: "#ffffff",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
  },
  header: {
    textAlign: "center",
    borderBottom: "2px solid #1f2937",
    paddingBottom: 14,
    marginBottom: 18,
  },
  logoWrapper: {
    width: 116,
    height: 88,
    borderRadius: 20,
    background: "#ffffff",
    border: "1px solid #d8dee5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
    padding: 8,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  headerTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#0b1f33",
    lineHeight: 1.3,
    maxWidth: 420,
    marginInline: "auto",
  },
  headerSubtitle: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "#52606d",
  },
  meta: {
    textAlign: "right",
    fontWeight: 700,
    fontSize: 15,
    color: "#142235",
    marginBottom: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "12px 0 0",
  },
  th: {
    border: "1px solid #d8dee5",
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 700,
    color: "#16263a",
    background: "#f8fafc",
    verticalAlign: "top",
  },
  td: {
    border: "1px solid #d8dee5",
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 13,
    color: "#334155",
    verticalAlign: "top",
  },
  amountCell: {
    textAlign: "right",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 800,
    color: "#142235",
  },
  totalRow: {
    background: "#f8fafc",
    fontWeight: 700,
  },
  remarks: {
    marginTop: 14,
    color: "#334155",
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 28,
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
  },
  footerItem: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
  },
  signLine: {
    width: "100%",
    maxWidth: 180,
    borderTop: "1px solid #334155",
    paddingTop: 8,
    textAlign: "center",
    fontSize: 12,
    color: "#334155",
  },
  actions: {
    margin: "20px auto 0",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    maxWidth: 620,
  },
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
const CollectPaymentPage = ({ studentId }) => {
  const [form] = Form.useForm();
  const [statusActionForm] = Form.useForm();
  const [linkForm] = Form.useForm();
  const printRef = useRef(null);
  const paymentFormRef = useRef(null);

  const [studentFees, setStudentFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [admissionFilter, setAdmissionFilter] = useState("");
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
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState([]);
  const [payComponents, setPayComponents] = useState([]);  // which components to pay: ["tuition", "transport", ...] or [] = full term
  const [payingNonTerm, setPayingNonTerm] = useState(false);  // paying non-term fees (book, hostel, other, custom)
  const [admissionNoSearch, setAdmissionNoSearch] = useState("");
  const [siblingData, setSiblingData] = useState([]);  // sibling fees from API (cross-year)

  const { hasPermission } = usePermissionHelpers();
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
      const nextFees = data || [];
      setStudentFees(nextFees);
      if (!nextFees.some((f) => f.id === selectedFee?.id)) {
        setSelectedFee(null);
        setPayments([]);
        setPaymentLinks([]);
        setLinkResult(null);
        setAmount("");
        setTermNumber(null);
        setPayComponents([]);
        setPayingNonTerm(false);
      }
    } catch { message.error("Failed to load student fees"); }
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchReceiptNo();
  }, []);

  useEffect(() => {
    if (academicYear) fetchFees(academicYear);
  }, [academicYear]);

  // Keep selectedFee in sync when studentFees refreshes
  // Helper: enrich fee with virtual terms if none exist in DB
  const enrichWithVirtualTerm = (fee) => {
    if (!fee || (fee.terms && fee.terms.length > 0)) return fee;
    const nTerms = Number(fee.numberOfTerms || 1);
    const tuition = Number(fee.tuitionFee || 0);
    const transport = Number(fee.transportFee || 0);
    const termBase = tuition + transport; // only tuition+transport are term-distributed
    const splitEvenly = (total, n) => {
      const per = Math.round((total / n) * 100) / 100;
      return Array.from({ length: n }, (_, i) =>
        i === n - 1 ? Math.round((total - per * (n - 1)) * 100) / 100 : per
      );
    };
    const tuitionSplit = splitEvenly(tuition, nTerms);
    const transportSplit = splitEvenly(transport, nTerms);
    const termAmounts = splitEvenly(termBase, nTerms);
    // Calculate paid per term from existing payments
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
        // Fee no longer exists in new data (e.g. academic year changed)
        setSelectedFee(null);
        setPayments([]);
      }
    }
  }, [studentFees]);

  useEffect(() => {
  if (studentId && studentFees.length > 0) {
    const fee = studentFees.find(f => f.student?.id === studentId);

    if (fee) {
      onSelectFee(fee.id); // 🔥 auto select
    }
  }
}, [studentId, studentFees]);

  // siblingData is fetched from API in onSelectFee (cross-year support)

  // Fetch sibling fees from API (cross-year)
  const fetchSiblingFees = async (studentId) => {
    if (!studentId) { setSiblingData([]); return; }
    try {
      const data = await getSiblingFees(studentId);
      setSiblingData(data || []);
    } catch {
      setSiblingData([]);
    }
  };

  // Search by admission number
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
    setAmount("");
    setTermNumber(null);
    setPayingNonTerm(false);
    setPayComponents([]);
    setReceiptComponents(getAvailableReceiptComponentOptions(fee));
    setLinkResult(null);

    // Fetch sibling data
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

  // When a fee is selected, pre-fill splitPayments with pending terms
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
        const paymentsArr = splitPayments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ termNumber: p.termNumber, amount: Number(p.amount) }));
        const total = paymentsArr.reduce((s, p) => s + p.amount, 0);
        
        if (!paymentsArr.length) { 
          message.error("Enter at least one term payment"); 
          setLoading(false);
          return; 
        }
        if (total <= 0) { 
          message.error("Total amount must be positive"); 
          setLoading(false);
          return; 
        }
        
        payload = {
          studentFeeId: selectedFee.id,
          amount: total,
          paymentMode,
          receiptNo,
          remarks,
          payments: paymentsArr,
          receiptComponents,
        };
      } else {
        // Build paidComponents from chip selection
        let paidComps;
        if (payComponents.length > 0 && termNumber) {
          const enriched = computeTermComponents(selectedFee);
          const selTerm = enriched.find((t) => t.termNumber === termNumber);
          if (selTerm) {
            const keyMap = { tuition: "tuitionAmount", transport: "transportAmount", book: "bookAmount", hostel: "hostelAmount", other: "otherAmount" };
            paidComps = {};
            payComponents.forEach((k) => { paidComps[k] = Math.round(selTerm[keyMap[k]] || 0); });
          }
        } else if (payComponents.length > 0 && payingNonTerm) {
          // Non-term component selection
          const feeMap = { book: Number(selectedFee.bookFee || 0), hostel: Number(selectedFee.hostelFee || 0), other: Number(selectedFee.otherFee || 0) };
          paidComps = {};
          payComponents.forEach((k) => {
            if (feeMap[k] !== undefined) {
              paidComps[k] = Math.round(feeMap[k]);
            } else {
              // custom item — use readable name as key
              const ci = (selectedFee.customItems || []).find((c) => `custom-${c.id || c.name}` === k);
              if (ci) paidComps[ci.name] = Math.round(Number(ci.amount || 0));
            }
          });
        }
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
        paidComponents: result?.paidComponents || payload.paidComponents,
        status: result?.status || "SUCCESS",
      });

      // show toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);

      // reset form
      setAmount("");
      setRemarks("");
      setTermNumber(null);
      setPayComponents([]);
      setPayingNonTerm(false);
      setSplitMode(false);
      setSplitPayments([]);
      await fetchReceiptNo();

      // refresh
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

  const handleDownloadReceipt = async (payment = printPayment) => {
    if (!payment) {
      message.error("Receipt is not ready to download");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 14;
      let cursorY = 16;

      try {
        const receiptLogo = await loadReceiptLogo();
        const maxLogoWidth = 32;
        const maxLogoHeight = 24;
        const logoRatio = receiptLogo.width / receiptLogo.height;
        let logoWidth = maxLogoWidth;
        let logoHeight = logoWidth / logoRatio;
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * logoRatio;
        }
        doc.addImage(receiptLogo, "JPEG", (pageWidth - logoWidth) / 2, cursorY, logoWidth, logoHeight);
        cursorY += logoHeight + 7;
      } catch {
        cursorY += 4;
      }

      const paymentInfoRows = [
        ["Student Name", payment.studentName || "N/A"],
        ["Standard", payment.standard || "N/A"],
        ["Payment Date", payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"],
        ["Payment Mode", payment.paymentMode || "N/A"],
        ...(payment.termNumber ? [["Term", `Term ${payment.termNumber}`]] : []),
        ["Amount Paid", fmtPdfCurrency(payment.amount)],
      ];

      const hasPaidComponents = payment.paidComponents && Object.keys(payment.paidComponents).length > 0;
      const componentRows = hasPaidComponents
        ? [
            ...Object.entries(payment.paidComponents).map(([key, value]) => [
              getPaidComponentLabel(payment, key),
              fmtPdfCurrency(value),
            ]),
            ["Total Paid", fmtPdfCurrency(payment.amount)],
          ]
        : buildReceiptFeeRows(payment).map((row) => [row.label, fmtPdfCurrency(row.amount)]);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const schoolNameLines = doc.splitTextToSize(RECEIPT_SCHOOL_NAME, pageWidth - marginX * 2);
      doc.text(schoolNameLines, pageWidth / 2, cursorY, { align: "center" });
      cursorY += schoolNameLines.length * 7;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Fee Payment Receipt", pageWidth / 2, cursorY, { align: "center" });
      cursorY += 8;
      doc.setLineWidth(0.4);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 7;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`Receipt No: ${payment.receiptNo || "N/A"}`, pageWidth - marginX, cursorY, { align: "right" });
      cursorY += 5.5;
      doc.text(`Status: ${payment.status || "SUCCESS"}`, pageWidth - marginX, cursorY, { align: "right" });
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY + 3,
        body: paymentInfoRows,
        theme: "grid",
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 52, fontStyle: "bold" },
          1: { cellWidth: "auto" },
        },
      });
      cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(hasPaidComponents ? "Paid Components" : "Receipt Fee Components", marginX, cursorY);

      autoTable(doc, {
        startY: cursorY + 3,
        head: [["Component", "Amount"]],
        body: componentRows,
        theme: "grid",
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [0, 21, 42] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 45, halign: "right" },
        },
      });
      cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;

      if (payment.totalFee) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Fee Summary", marginX, cursorY);

        autoTable(doc, {
          startY: cursorY + 3,
          body: [
            ["Total Fee", fmtPdfCurrency(payment.totalFee)],
            ["Net Fee (after discount)", fmtPdfCurrency(payment.netFee)],
          ],
          theme: "grid",
          margin: { left: marginX, right: marginX },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 52, fontStyle: "bold" },
            1: { cellWidth: "auto" },
          },
        });
        cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;
      }

      if (payment.remarks) {
        doc.setFont("helvetica", "bold");
        doc.text("Remarks:", marginX, cursorY);
        doc.setFont("helvetica", "normal");
        const remarkLines = doc.splitTextToSize(String(payment.remarks), pageWidth - marginX * 2 - 18);
        doc.text(remarkLines, marginX + 18, cursorY);
        cursorY += Math.max(8, remarkLines.length * 5 + 4);
      }

      if (cursorY > pageHeight - 28) {
        doc.addPage();
        cursorY = 24;
      }

      const signatureY = cursorY + 16;
      doc.line(marginX + 8, signatureY, marginX + 60, signatureY);
      doc.line(pageWidth - marginX - 60, signatureY, pageWidth - marginX - 8, signatureY);
      doc.setFontSize(10);
      doc.text("Student / Parent", marginX + 34, signatureY + 6, { align: "center" });
      doc.text("Authorized Signatory", pageWidth - marginX - 34, signatureY + 6, { align: "center" });

      doc.save(getReceiptFileName(payment));
    } catch (err) {
      console.error("Receipt download failed", err);
      message.error("Failed to download receipt");
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      message.error("Popup blocked. Please allow popups or use Download Receipt.");
      return;
    }
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
      <script>window.print();window.close();</script></html>`);
    win.document.close();
  };

  const buildPrintablePayment = (payment) => ({
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
    status: payment?.status || "SUCCESS",
  });

  const handlePrintExistingPayment = (payment) => {
    setPrintPayment(buildPrintablePayment(payment));
  };

  const handleDownloadExistingPayment = (payment) => {
    handleDownloadReceipt(buildPrintablePayment(payment));
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

  const classOptions = Array.from(
    new Set(studentFees.map((f) => f.student?.standard).filter(Boolean))
  ).sort();

  const sectionOptions = Array.from(
    new Set(
      studentFees
        .filter((f) => !classFilter || f.student?.standard === classFilter)
        .map((f) => f.student?.section)
        .filter(Boolean)
    )
  ).sort();

  const filteredStudentFees = studentFees.filter((f) => {
    const studentName = (f.student?.name || "").toLowerCase();
    const admissionNo = getStudentAdmissionNo(f).toLowerCase();
    const standard = f.student?.standard || "";
    const section = f.student?.section || "";
    const studentQuery = studentSearch.trim().toLowerCase();
    const admissionQuery = admissionFilter.trim().toLowerCase();

    if (studentQuery && !studentName.includes(studentQuery) && !admissionNo.includes(studentQuery)) return false;
    if (classFilter && standard !== classFilter) return false;
    if (sectionFilter && section !== sectionFilter) return false;
    if (admissionQuery && !admissionNo.includes(admissionQuery)) return false;
    return true;
  });

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
                <p className="text-sm text-on-surface-variant">Find the student by name, class, section, or admission number</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-xs text-on-surface-variant">
                Showing records for <span className="font-bold text-primary">{academicYear || "latest academic year"}</span>
              </p>
              {(studentSearch || classFilter || sectionFilter || admissionFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentSearch("");
                    setClassFilter("");
                    setSectionFilter("");
                    setAdmissionFilter("");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
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
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Student name"
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant pointer-events-none text-base">search</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Class
                </label>
                <div className="relative">
                  <select
                    value={classFilter}
                    onChange={(e) => {
                      setClassFilter(e.target.value);
                      setSectionFilter("");
                    }}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
                  >
                    <option value="">All Classes</option>
                    {classOptions.map((standard) => (
                      <option key={standard} value={standard}>{standard}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Section
                </label>
                <div className="relative">
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
                  >
                    <option value="">All Sections</option>
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Admission Number
                </label>
                <div className="relative">
                  <input
                    value={admissionFilter}
                    onChange={(e) => setAdmissionFilter(e.target.value)}
                    placeholder="Admission no"
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant pointer-events-none text-base">badge</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                  Select Student
                </label>
                <span className="text-[11px] font-medium text-on-surface-variant">
                  {filteredStudentFees.length} match{filteredStudentFees.length !== 1 ? "es" : ""}
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedFee?.id || ""}
                  onChange={(e) => e.target.value && onSelectFee(e.target.value)}
                  className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none appearance-none"
                >
                  <option value="">Select student...</option>
                  {filteredStudentFees.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.student?.name} - {f.student?.standard || "-"}{f.student?.section ? `-${f.student.section}` : ""} - {getStudentAdmissionNo(f) || "No Admission No"} - Pending: {fmt(f.pending)}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 text-primary/40 pointer-events-none text-base">expand_more</span>
              </div>
              {filteredStudentFees.length === 0 && (
                <p className="text-xs text-error font-medium px-1">
                  No students found for the selected filters.
                </p>
              )}
            </div>

            <div className="hidden grid grid-cols-2 gap-5">
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
                  Admission No
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={admissionNoSearch}
                    onChange={(e) => setAdmissionNoSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdmissionNoSearch()}
                    placeholder="e.g. ADM-001"
                    className="flex-1 bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm font-medium focus:bg-surface-container-highest transition-colors outline-none"
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
                        {f.student?.admission?.admissionNo ? `[${f.student.admission.admissionNo}] ` : ""}{f.student?.name} — {formatStandardLabel(f.student?.standard)} — Pending: {fmt(f.pending)}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-primary/40 pointer-events-none text-base">expand_more</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Payment transaction */}
          <section ref={paymentFormRef} className="bg-white rounded-2xl p-7 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
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

            {/* Term selection moved from Section 1 for better flow */}
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
                              setTermNumber(t.termNumber);
                              setPayingNonTerm(false);
                              setPayComponents([]);  // reset component selection
                              setAmount(balance.toString());
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                              termNumber === t.termNumber && !payingNonTerm
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                : isPaid
                                ? "bg-green-50 text-green-700 border-green-100 cursor-not-allowed opacity-60"
                                : "bg-white text-on-surface-variant border-surface-container-highest hover:border-primary/30 hover:bg-surface-bright"
                            }`}
                            disabled={isPaid}
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span>{t.termName}</span>
                              {t.dueDate && (
                                <span className={`text-[10px] opacity-60 ${termNumber === t.termNumber && !payingNonTerm ? "text-white/70" : ""}`}>
                                  Due: {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                </span>
                              )}
                              <span className={`text-[10px] opacity-70 ${termNumber === t.termNumber && !payingNonTerm ? "text-white/80" : ""}`}>
                                {isPaid ? "Paid" : `Bal: ${fmt(balance)}`}
                              </span>
                            </div>
                          </button>
                        );
                      })}

                      {/* Non-Term Fees button (Book, Hostel, Other, Custom) */}
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
                              setTermNumber(null);
                              setPayingNonTerm(true);
                              setPayComponents([]);
                              setAmount(nonTermBal.toString());
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                              payingNonTerm
                                ? "bg-tertiary text-white border-tertiary shadow-lg shadow-tertiary/20 scale-[1.02]"
                                : isNonTermPaid
                                ? "bg-green-50 text-green-700 border-green-100 cursor-not-allowed opacity-60"
                                : "bg-white text-tertiary border-tertiary/30 hover:border-tertiary/60 hover:bg-tertiary-fixed/10"
                            }`}
                            disabled={isNonTermPaid}
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">shopping_bag</span>
                                Other Fees
                              </span>
                              <span className={`text-[10px] opacity-70 ${payingNonTerm ? "text-white/80" : ""}`}>
                                {isNonTermPaid ? "Paid" : `Bal: ${fmt(nonTermBal)}`}
                              </span>
                            </div>
                          </button>
                        );
                      })()}
                    </div>

                    {/* Non-Term Fees — interactive component selection */}
                    {payingNonTerm && (() => {
                      // Aggregate per-component paid from prior non-term payments
                      const nonTermPayments = payments?.filter((p) => !p.termNumber && p.status === "SUCCESS") || [];
                      const componentPaid = {};
                      nonTermPayments.forEach((p) => {
                        if (p.paidComponents && typeof p.paidComponents === "object") {
                          Object.entries(p.paidComponents).forEach(([k, v]) => {
                            componentPaid[k] = (componentPaid[k] || 0) + Number(v);
                          });
                        }
                      });

                      const items = [
                        ...(Number(selectedFee.bookFee || 0) > 0 ? [{ key: "book", label: "Book Fee", val: Number(selectedFee.bookFee), icon: "menu_book" }] : []),
                        ...(Number(selectedFee.hostelFee || 0) > 0 ? [{ key: "hostel", label: "Hostel Fee", val: Number(selectedFee.hostelFee), icon: "hotel" }] : []),
                        ...(Number(selectedFee.otherFee || 0) > 0 ? [{ key: "other", label: "Other Fee", val: Number(selectedFee.otherFee), icon: "more_horiz" }] : []),
                        ...((selectedFee.customItems || []).map((ci) => ({ key: `custom-${ci.id || ci.name}`, label: ci.name, val: Number(ci.amount || 0), icon: "label" }))),
                      ].map((c) => ({
                        ...c,
                        paidAmount: componentPaid[c.key] || 0,
                        isFullyPaid: (componentPaid[c.key] || 0) >= c.val,
                      }));

                      const unpaidItems = items.filter((c) => !c.isFullyPaid);
                      const nonTermBal = Math.round(unpaidItems.reduce((s, c) => s + (c.val - c.paidAmount), 0));

                      const toggleNonTermComp = (key) => {
                        const comp = items.find((c) => c.key === key);
                        if (comp?.isFullyPaid) return;
                        let next;
                        if (payComponents.includes(key)) {
                          next = payComponents.filter((k) => k !== key);
                        } else {
                          next = [...payComponents, key];
                        }
                        setPayComponents(next);
                        if (next.length === 0 || next.length === unpaidItems.length) {
                          setPayComponents([]);
                          setAmount(nonTermBal.toString());
                        } else {
                          const sum = Math.min(
                            items.filter((c) => next.includes(c.key)).reduce((s, c) => s + Math.round(c.val - c.paidAmount), 0),
                            nonTermBal
                          );
                          setAmount(Math.round(sum).toString());
                        }
                      };

                      const allSelected = payComponents.length === 0;
                      return (
                        <div className="mt-3 p-4 bg-tertiary/5 rounded-xl border border-tertiary/10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">
                              Non-Term Fees — Balance {fmt(nonTermBal)}
                            </span>
                            {nonTermBal > 0 && (
                              <button
                                type="button"
                                onClick={() => { setPayComponents([]); setAmount(nonTermBal.toString()); }}
                                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${
                                  allSelected ? "bg-tertiary text-white" : "bg-white text-tertiary hover:bg-tertiary/10"
                                }`}
                              >
                                Pay All
                              </button>
                            )}
                          </div>
                          {nonTermBal > 0 && (
                            <p className="text-[10px] text-on-surface-variant mb-2">
                              Select specific fees to pay (e.g., Book Fee only) or pay all:
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {items.map((c) => {
                              const isActive = payComponents.includes(c.key);
                              if (c.isFullyPaid) {
                                return (
                                  <div
                                    key={c.key}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/20 cursor-default"
                                  >
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    {c.label}
                                    <span className="text-[10px] text-[#2e7d32]/70">{fmt(c.val)} Paid</span>
                                  </div>
                                );
                              }
                              const remaining = Math.round(c.val - c.paidAmount);
                              return (
                                <button
                                  key={c.key}
                                  type="button"
                                  onClick={() => toggleNonTermComp(c.key)}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                                    isActive
                                      ? "bg-tertiary text-white border-tertiary shadow-md"
                                      : allSelected
                                      ? "bg-tertiary-fixed/20 text-tertiary border-tertiary/20"
                                      : "bg-white text-on-surface-variant border-outline-variant/30 opacity-60"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-sm">{c.icon}</span>
                                  {c.label}
                                  <span className={`text-[10px] font-medium ${
                                    isActive ? "text-white/80" : allSelected ? "text-tertiary" : "text-on-surface-variant"
                                  }`}>
                                    {c.paidAmount > 0 ? `${fmt(remaining)} left` : fmt(c.val)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {payComponents.length > 0 && (
                            <div className="mt-2 text-[10px] text-tertiary font-bold">
                              Paying: {payComponents.map((k) => items.find((c) => c.key === k)?.label).join(" + ")} = {fmt(amount)}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Selected term — quick pay by component */}
                    {termNumber && (() => {
                      const enriched = computeTermComponents(selectedFee);
                      const selTerm = enriched.find((t) => t.termNumber === termNumber);
                      if (!selTerm) return null;
                      const termPayments = payments?.filter((p) => p.termNumber === termNumber && p.status === "SUCCESS") || [];
                      const paid = termPayments.reduce((s, p) => s + p.amount, 0);
                      const bal = Math.round(selTerm.amount - paid);

                      // Aggregate per-component paid amounts from past payments
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
                      ].map((c) => ({
                        ...c,
                        paidAmount: componentPaid[c.key] || 0,
                        isFullyPaid: (componentPaid[c.key] || 0) >= c.val,
                      }));

                      const unpaidComponents = components.filter((c) => !c.isFullyPaid);

                      const toggleComponent = (key) => {
                        const comp = components.find((c) => c.key === key);
                        if (comp?.isFullyPaid) return; // can't toggle paid components
                        let next;
                        if (payComponents.includes(key)) {
                          next = payComponents.filter((k) => k !== key);
                        } else {
                          next = [...payComponents, key];
                        }
                        setPayComponents(next);
                        if (next.length === 0 || next.length === unpaidComponents.length) {
                          setPayComponents([]);
                          setAmount(bal.toString());
                        } else {
                          const sum = Math.min(
                            components.filter((c) => next.includes(c.key)).reduce((s, c) => s + Math.round(c.val - c.paidAmount), 0),
                            bal
                          );
                          setAmount(Math.round(sum).toString());
                        }
                      };

                      const allSelected = payComponents.length === 0;
                      return (
                        <div className="mt-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                              {selTerm.termName} — Balance {fmt(bal)}
                            </span>
                            {bal > 0 && (
                              <button
                                type="button"
                                onClick={() => { setPayComponents([]); setAmount(bal.toString()); }}
                                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${
                                  allSelected ? "bg-primary text-white" : "bg-white text-primary hover:bg-primary/10"
                                }`}
                              >
                                Pay Full Term
                              </button>
                            )}
                          </div>
                          {bal > 0 && (
                            <p className="text-[10px] text-on-surface-variant mb-2">
                              Select specific components to pay (e.g., Transport only) or pay full term:
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {components.map((c) => {
                              const isActive = payComponents.includes(c.key);
                              if (c.isFullyPaid) {
                                return (
                                  <div
                                    key={c.key}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/20 cursor-default"
                                  >
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    {c.label}
                                    <span className="text-[10px] text-[#2e7d32]/70">{fmt(c.val)} Paid</span>
                                  </div>
                                );
                              }
                              const remaining = Math.round(c.val - c.paidAmount);
                              return (
                                <button
                                  key={c.key}
                                  type="button"
                                  onClick={() => toggleComponent(c.key)}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                                    isActive
                                      ? c.highlight
                                        ? "bg-tertiary text-white border-tertiary shadow-md"
                                        : "bg-primary text-white border-primary shadow-md"
                                      : allSelected
                                      ? c.highlight
                                        ? "bg-tertiary-fixed/20 text-tertiary border-tertiary/20"
                                        : "bg-white text-on-surface-variant border-outline-variant/30"
                                      : "bg-white text-on-surface-variant border-outline-variant/30 opacity-60"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-sm">{c.icon}</span>
                                  {c.label}
                                  <span className={`text-[10px] font-medium ${
                                    isActive ? "text-white/80" : allSelected && c.highlight ? "text-tertiary" : "text-on-surface-variant"
                                  }`}>
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
                        </div>
                      );
                    })()}

                    {/* Component-wise breakdown per term (only Tuition + Transport) */}
                    {(() => {
                      const enrichedTerms = computeTermComponents(selectedFee);
                      const nonTermFees = [
                        ...(Number(selectedFee.bookFee || 0) > 0 ? [{ label: "Book Fee", amount: Number(selectedFee.bookFee), icon: "menu_book" }] : []),
                        ...(Number(selectedFee.hostelFee || 0) > 0 ? [{ label: "Hostel Fee", amount: Number(selectedFee.hostelFee), icon: "hotel" }] : []),
                        ...(Number(selectedFee.otherFee || 0) > 0 ? [{ label: "Other Fee", amount: Number(selectedFee.otherFee), icon: "more_horiz" }] : []),
                        ...((selectedFee.customItems || []).map((ci) => ({ label: ci.name, amount: Number(ci.amount || 0), icon: "label" }))),
                      ];
                      return (
                        <>
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                                <th className="text-left py-2 px-3">Component</th>
                                {enrichedTerms.map((t) => (
                                  <th key={t.termNumber} className="text-right py-2 px-3">{t.termName}</th>
                                ))}
                                <th className="text-right py-2 px-3">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { label: "Tuition", field: "tuitionAmount", total: selectedFee.tuitionFee },
                                ...(Number(selectedFee.transportFee || 0) > 0
                                  ? [{ label: "Transport", field: "transportAmount", total: selectedFee.transportFee, highlight: true }]
                                  : []),
                              ].map((row) => (
                                <tr key={row.field} className={row.highlight ? "bg-tertiary-fixed/10" : ""}>
                                  <td className={`py-2 px-3 font-bold ${row.highlight ? "text-tertiary" : "text-on-surface"}`}>
                                    {row.label}
                                  </td>
                                  {enrichedTerms.map((t) => (
                                    <td key={t.termNumber} className="text-right py-2 px-3 font-medium text-on-surface-variant">
                                      {fmt(t[row.field] || 0)}
                                    </td>
                                  ))}
                                  <td className="text-right py-2 px-3 font-bold text-on-surface">{fmt(row.total)}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-outline-variant/30">
                                <td className="py-2 px-3 font-extrabold text-primary">Total</td>
                                {enrichedTerms.map((t) => (
                                  <td key={t.termNumber} className="text-right py-2 px-3 font-extrabold text-primary">
                                    {fmt(t.amount)}
                                  </td>
                                ))}
                                <td className="text-right py-2 px-3 font-extrabold text-primary">
                                  {fmt(Number(selectedFee.tuitionFee || 0) + Number(selectedFee.transportFee || 0))}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {/* Non-term fees (Book, Hostel, Other, Custom — paid as lump sum) */}
                        {nonTermFees.length > 0 && (
                          <div className="mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                              Non-Term Fees (paid separately)
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {nonTermFees.map((nf, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-outline-variant/20 text-xs font-bold text-on-surface">
                                  <span className="material-symbols-outlined text-sm text-on-surface-variant">{nf.icon}</span>
                                  {nf.label}: {fmt(nf.amount)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-outline-variant/50 overflow-hidden shadow-sm">
                    <Table
                      dataSource={splitPayments.map((sp) => {
                        const enriched = computeTermComponents(selectedFee);
                        const t = enriched.find((tt) => tt.termNumber === sp.termNumber);
                        return { ...sp, term: t };
                      })}
                      columns={[
                        { 
                          title: "Term", 
                          dataIndex: "termName",
                          render: (v) => <span className="font-bold text-primary text-xs">{v}</span>
                        },
                        {
                          title: "Breakdown",
                          dataIndex: "term",
                          render: (t) => t ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-on-surface-variant">
                              <span>Tuition: {fmt(t.tuitionAmount || 0)}</span>
                              {Number(t.transportAmount || 0) > 0 && (
                                <span className="text-tertiary font-bold">Transport: {fmt(t.transportAmount)}</span>
                              )}
                              {Number(t.bookAmount || 0) > 0 && <span>Book: {fmt(t.bookAmount)}</span>}
                              {Number(t.otherAmount || 0) > 0 && <span>Other: {fmt(t.otherAmount)}</span>}
                            </div>
                          ) : null,
                        },
                        { 
                          title: "Pending", 
                          dataIndex: "pending", 
                          render: v => <span className="text-xs font-medium text-on-surface-variant">{fmt(v)}</span> 
                        },
                        {
                          title: "Amount",
                          dataIndex: "amount",
                          width: 140,
                          render: (v, row, idx) => (
                            <InputNumber
                              min={0}
                              max={row.pending}
                              value={v}
                              placeholder="0.00"
                              variant="filled"
                              style={{ width: '100%' }}
                              className="text-xs font-bold"
                              onChange={val => {
                                const next = [...splitPayments];
                                next[idx].amount = val;
                                setSplitPayments(next);
                              }}
                            />
                          ),
                        },
                      ]}
                      pagination={false}
                      rowKey="termNumber"
                      size="small"
                      className="split-payment-table"
                    />
                    <div className="p-3 bg-surface-container-highest/30 flex justify-between items-center border-t border-outline-variant/50">
                      <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Distributed Total</span>
                      <p className="text-sm font-black text-primary">
                        {fmt(splitPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-5 mb-6">
              {/* Amount */}
              {!splitMode && (() => {
                const selTerm = termNumber ? selectedFee?.terms?.find((t) => t.termNumber === termNumber) : null;
                const maxBal = selTerm
                  ? Math.round(selTerm.amount - (payments?.filter((p) => p.termNumber === termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0))
                  : undefined;
                return (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary/60 uppercase tracking-wider ml-1">
                      Amount to Collect (₹)
                      {maxBal !== undefined && <span className="text-on-surface-variant font-medium ml-2">Max: {fmt(maxBal)}</span>}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={maxBal || undefined}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-xl font-headline font-bold text-primary focus:bg-surface-container-highest transition-colors outline-none"
                    />
                    {maxBal !== undefined && Number(amount) > maxBal && (
                      <p className="text-xs text-error font-medium ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        Amount exceeds term balance ({fmt(maxBal)}). Transport & other fees are already included in the term amount.
                      </p>
                    )}
                  </div>
                );
              })()}

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
                  disabled
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

            {/* Receipt components with amounts */}
            {selectedFee && getAvailableReceiptComponentOptions(selectedFee).length > 0 && (
              <div className="mb-6 p-4 bg-surface rounded-xl">
                <p className="text-[10px] text-on-surface-variant mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">info</span>
                  These components are already included in the term amounts above. Checking/unchecking controls what appears on the printed receipt.
                </p>
                <div className="flex flex-wrap gap-4">
                {getAvailableReceiptComponentOptions(selectedFee).map((key) => {
                  const feeAmount = Number(selectedFee[COMPONENT_FEE_FIELDS[key]] || 0);
                  const perTerm = selectedFee.terms?.length
                    ? Math.round((feeAmount / selectedFee.terms.length) * 100) / 100
                    : feeAmount;
                  return (
                    <label key={key} className={`flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-lg transition-colors ${
                      receiptComponents.includes(key) ? "bg-primary-fixed/30" : "hover:bg-surface-container-low"
                    }`}>
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
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                          Include {RECEIPT_COMPONENT_LABELS[key]}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/70">
                          {key === "customItems"
                            ? fmt((selectedFee.customItems || []).reduce((s, ci) => s + Number(ci.amount || 0), 0)) + " total"
                            : `${fmt(feeAmount)} total` + (selectedFee.terms?.length > 1 ? ` · ${fmt(perTerm)}/term` : "")}
                        </span>
                      </div>
                    </label>
                  );
                })}
                </div>
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

          {/* Term-Wise Summary */}
          {selectedFee && selectedFee.terms?.length > 0 && (
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
                    <div key={t.termNumber} className={`p-3.5 rounded-xl border ${
                      isPaid ? "bg-[#e8f5e9]/60 border-[#4caf50]/20" : isPartial ? "bg-amber-50/60 border-amber-200" : "bg-surface-container-low border-outline-variant/20"
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isPaid ? "bg-[#4caf50] text-white" : isPartial ? "bg-amber-400 text-white" : "bg-surface-container-highest text-on-surface-variant"
                          }`}>{t.termNumber}</span>
                          <span className="text-sm font-bold text-on-surface">{t.termName}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isPaid ? "bg-[#4caf50]/20 text-[#2e7d32]" : isPartial ? "bg-amber-100 text-amber-700" : "bg-surface-container-highest text-on-surface-variant"
                        }`}>
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
                        <div
                          className={`h-1.5 rounded-full transition-all ${isPaid ? "bg-[#4caf50]" : isPartial ? "bg-amber-400" : "bg-outline-variant/30"}`}
                          style={{ width: `${pctPaid}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Non-term fees summary */}
                {(() => {
                  const nonTermTotal = Number(selectedFee.bookFee || 0) + Number(selectedFee.hostelFee || 0) + Number(selectedFee.otherFee || 0) +
                    (selectedFee.customItems || []).reduce((s, ci) => s + Number(ci.amount || 0), 0);
                  if (nonTermTotal <= 0) return null;
                  const nonTermPaid = payments?.filter((p) => !p.termNumber && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0) || 0;
                  const nonTermBal = Math.round(nonTermTotal - nonTermPaid);
                  return (
                    <div className={`p-3.5 rounded-xl border ${
                      nonTermBal <= 0 ? "bg-[#e8f5e9]/60 border-[#4caf50]/20" : "bg-tertiary-fixed/10 border-tertiary/10"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-tertiary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">shopping_bag</span>Other Fees
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          nonTermBal <= 0 ? "bg-[#4caf50]/20 text-[#2e7d32]" : "bg-tertiary/10 text-tertiary"
                        }`}>{nonTermBal <= 0 ? "Paid" : "Pending"}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-on-surface-variant">Total: <span className="font-bold">{fmt(nonTermTotal)}</span></span>
                        <span className="text-on-surface-variant">Bal: <span className={`font-bold ${nonTermBal > 0 ? "text-error" : "text-[#2e7d32]"}`}>{fmt(nonTermBal)}</span></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>
          )}

          {/* Sibling Fee Summary */}
          {selectedFee && (
            <section className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
              <h3 className="font-headline font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                Sibling Fees
              </h3>
              {!selectedFee.student?.siblingGroupId ? (
                <p className="text-xs text-on-surface-variant text-center py-4">
                  <span className="material-symbols-outlined text-2xl block mb-2 opacity-30">person</span>
                  No sibling group assigned for this student.
                </p>
              ) : siblingData.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-4">
                  <span className="material-symbols-outlined text-2xl block mb-2 opacity-30">group_off</span>
                  No siblings found in this group.
                </p>
              ) : (
                <p className="text-xs text-on-surface-variant mb-4">
                  {siblingData.length} sibling{siblingData.length > 1 ? "s" : ""} found — parents can pay for siblings here.
                </p>
              )}
              {siblingData.length > 0 && (
              <div className="space-y-3">
                {siblingData.map((sib) => {
                  const totalNet = sib.fees.reduce((s, f) => s + Number(f.netFee || 0), 0);
                  const totalPaid = sib.fees.reduce((s, f) => s + Number(f.totalPaid || 0), 0);
                  const totalPending = sib.fees.reduce((s, f) => s + Number(f.pending || 0), 0);
                  const paidPercent = totalNet > 0 ? Math.round((totalPaid / totalNet) * 100) : 0;
                  // Find a fee record in the current academic year for "Pay" button
                  const currentYearFee = sib.fees.find((f) => f.academicYear === academicYear);
                  const feeInStudentFees = currentYearFee ? studentFees.find((sf) => sf.id === currentYearFee.id) : null;
                  return (
                    <div key={sib.id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 hover:border-primary/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-primary">{sib.name}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {sib.admission?.admissionNo && <span className="font-bold">{sib.admission.admissionNo} · </span>}
                            {formatStandardLabel(sib.standard)}{sib.section ? ` - ${sib.section}` : ""}
                          </p>
                        </div>
                        {(() => {
                          const pendingFee = sib.fees.find((f) => Number(f.pending) > 0);
                          if (!pendingFee) return null;
                          return (
                            <button
                              type="button"
                              onClick={async () => {
                                const feeYear = pendingFee.academicYear;
                                if (feeYear !== academicYear) {
                                  setAcademicYear(feeYear);
                                  // Wait for fees to load with new year, then select
                                  try {
                                    const freshFees = await getAllStudentFees(feeYear);
                                    setStudentFees(freshFees || []);
                                    const match = (freshFees || []).find((sf) => sf.id === pendingFee.id);
                                    if (match) {
                                      const enriched = enrichWithVirtualTerm(match);
                                      setSelectedFee(enriched);
                                      setAmount("");
                                      setTermNumber(null);
                                      setPayingNonTerm(false);
                                      setPayComponents([]);
                                      setReceiptComponents(getAvailableReceiptComponentOptions(enriched));
                                      fetchSiblingFees(enriched?.student?.id);
                                      const payList = await getPaymentsByStudentFee(pendingFee.id);
                                      setPayments(payList || []);
                                    }
                                  } catch { message.error("Failed to load fees for that year"); }
                                } else if (feeInStudentFees) {
                                  onSelectFee(feeInStudentFees.id);
                                }
                                setTimeout(() => {
                                  paymentFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }, 200);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">payments</span>
                              Pay
                            </button>
                          );
                        })()}
                      </div>
                      {/* Per-year fee breakdown */}
                      {sib.fees.length > 0 ? sib.fees.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 text-[10px] mb-1">
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">{f.academicYear}</span>
                          <span className="text-on-surface-variant">Net: <span className="font-bold text-on-surface">{fmt(f.netFee)}</span></span>
                          <span className="text-on-surface-variant">Paid: <span className="font-bold text-green-700">{fmt(f.totalPaid)}</span></span>
                          <span className={`font-bold ${Number(f.pending) > 0 ? "text-error" : "text-green-700"}`}>
                            {Number(f.pending) > 0 ? `Pending: ${fmt(f.pending)}` : "Paid"}
                          </span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-on-surface-variant">No fees assigned</p>
                      )}
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full transition-all ${totalPending > 0 ? "bg-primary" : "bg-green-500"}`}
                          style={{ width: `${Math.min(paidPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Family total summary */}
                {(() => {
                  const familyTotal = siblingData.reduce((s, sib) => s + sib.fees.reduce((ss, f) => ss + Number(f.netFee || 0), 0), 0) + Number(selectedFee.netFee || 0);
                  const familyPaid = siblingData.reduce((s, sib) => s + sib.fees.reduce((ss, f) => ss + Number(f.totalPaid || 0), 0), 0) + Number(selectedFee.totalPaid || 0);
                  const familyPending = siblingData.reduce((s, sib) => s + sib.fees.reduce((ss, f) => ss + Number(f.pending || 0), 0), 0) + Number(selectedFee.pending || 0);
                  return (
                    <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Family Total (All Siblings)</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-on-surface-variant">Total Fee</p>
                          <p className="text-sm font-bold text-primary">{fmt(familyTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant">Paid</p>
                          <p className="text-sm font-bold text-green-700">{fmt(familyPaid)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant">Pending</p>
                          <p className={`text-sm font-bold ${familyPending > 0 ? "text-error" : "text-green-700"}`}>{fmt(familyPending)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              )}
            </section>
          )}

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
                        <td className="px-5 py-4 text-right">
                          <div className="font-bold text-primary">{fmt(p.amount)}</div>
                          {p.paidComponents && Object.keys(p.paidComponents).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 justify-end">
                              {Object.entries(p.paidComponents).map(([k, v]) => (
                                <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  k === "transport" ? "bg-tertiary-fixed/20 text-tertiary" : "bg-surface-container-high text-on-surface-variant"
                                }`}>
                                  {k.startsWith("custom-") ? k.replace(/^custom-[\w-]+/, "Custom") : k.charAt(0).toUpperCase() + k.slice(1)} {fmt(v)}
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
                            <button
                              onClick={() => handleDownloadExistingPayment(p)}
                              title="Download Receipt"
                              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">download</span>
                            </button>
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
        width={820}
        centered
        footer={null}
      >
        {printPayment && (
          <div>
            <div ref={printRef} style={receiptPreviewStyles.wrapper}>
              <div className="receipt" style={receiptPreviewStyles.card}>
                <div className="header" style={receiptPreviewStyles.header}>
                  <div style={receiptPreviewStyles.logoWrapper}>
                    <img src={logo} alt="School Logo" style={receiptPreviewStyles.logo} />
                  </div>
                  <h2 style={receiptPreviewStyles.headerTitle}>{RECEIPT_SCHOOL_NAME}</h2>
                  <p style={receiptPreviewStyles.headerSubtitle}>Fee Payment Receipt</p>
                </div>
              <div className="receipt-no" style={receiptPreviewStyles.meta}>Receipt No: {printPayment.receiptNo || "N/A"}</div>
              <div className="receipt-no" style={{ ...receiptPreviewStyles.meta, marginTop: -2, marginBottom: 14 }}>Status: {printPayment.status || "SUCCESS"}</div>
              <table style={receiptPreviewStyles.table}>
                <tbody>
                  <tr><th width="35%" style={receiptPreviewStyles.th}>Student Name</th><td style={receiptPreviewStyles.td}>{printPayment.studentName}</td></tr>
                  <tr><th style={receiptPreviewStyles.th}>Standard</th><td style={receiptPreviewStyles.td}>{printPayment.standard}</td></tr>
                  <tr><th style={receiptPreviewStyles.th}>Payment Date</th><td style={receiptPreviewStyles.td}>{printPayment.paymentDate ? new Date(printPayment.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</td></tr>
                  <tr><th style={receiptPreviewStyles.th}>Payment Mode</th><td style={receiptPreviewStyles.td}>{printPayment.paymentMode}</td></tr>
                  {printPayment.termNumber && <tr><th style={receiptPreviewStyles.th}>Term</th><td style={receiptPreviewStyles.td}>Term {printPayment.termNumber}</td></tr>}
                  <tr><th style={receiptPreviewStyles.th}>Amount Paid</th><td style={{ ...receiptPreviewStyles.td, fontSize: 18, fontWeight: 800, color: "#0b1f33" }}>{fmt(printPayment.amount)}</td></tr>
                </tbody>
              </table>
              {printPayment.paidComponents && Object.keys(printPayment.paidComponents).length > 0 ? (
                <>
                  <h4 style={receiptPreviewStyles.sectionTitle}>Paid Components</h4>
                  <table style={receiptPreviewStyles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...receiptPreviewStyles.th, width: "70%" }}>Component</th>
                        <th style={{ ...receiptPreviewStyles.th, textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(printPayment.paidComponents).map(([k, v]) => (
                        <tr key={k}>
                          <td style={receiptPreviewStyles.td}>{getPaidComponentLabel(printPayment, k)}</td>
                          <td style={{ ...receiptPreviewStyles.td, ...receiptPreviewStyles.amountCell }}>{fmt(v)}</td>
                        </tr>
                      ))}
                      <tr className="total-row" style={receiptPreviewStyles.totalRow}>
                        <td style={{ ...receiptPreviewStyles.td, fontWeight: 800 }}>Total Paid</td>
                        <td style={{ ...receiptPreviewStyles.td, ...receiptPreviewStyles.amountCell, fontWeight: 800 }}>{fmt(printPayment.amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <h4 style={receiptPreviewStyles.sectionTitle}>Receipt Fee Components</h4>
                  <table style={receiptPreviewStyles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...receiptPreviewStyles.th, width: "70%" }}>Component</th>
                        <th style={{ ...receiptPreviewStyles.th, textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildReceiptFeeRows(printPayment).map((row) => (
                        <tr key={row.key}><td style={receiptPreviewStyles.td}>{row.label}</td><td style={{ ...receiptPreviewStyles.td, ...receiptPreviewStyles.amountCell }}>{fmt(row.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {printPayment.totalFee && (
                <>
                  <h4 style={receiptPreviewStyles.sectionTitle}>Fee Summary</h4>
                  <table style={receiptPreviewStyles.table}>
                    <tbody>
                      <tr><th width="35%" style={receiptPreviewStyles.th}>Total Fee</th><td style={{ ...receiptPreviewStyles.td, ...receiptPreviewStyles.amountCell }}>{fmt(printPayment.totalFee)}</td></tr>
                      <tr><th style={receiptPreviewStyles.th}>Net Fee (after discount)</th><td style={{ ...receiptPreviewStyles.td, ...receiptPreviewStyles.amountCell }}>{fmt(printPayment.netFee)}</td></tr>
                    </tbody>
                  </table>
                </>
              )}
              {printPayment.remarks && <p style={receiptPreviewStyles.remarks}><strong>Remarks:</strong> {printPayment.remarks}</p>}
              <div className="footer" style={receiptPreviewStyles.footer}>
                <div style={receiptPreviewStyles.footerItem}><div className="sign-line" style={receiptPreviewStyles.signLine}>Student / Parent</div></div>
                <div style={receiptPreviewStyles.footerItem}><div className="sign-line" style={receiptPreviewStyles.signLine}>Authorized Signatory</div></div>
              </div>
            </div>
            </div>
            <div style={receiptPreviewStyles.actions}>
              <button onClick={() => handleDownloadReceipt()} className="flex-1 min-w-[180px] px-6 py-3 rounded-xl border border-primary text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">download</span>Download Receipt
              </button>
              <button onClick={handlePrint} className="flex-1 min-w-[180px] px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined text-sm">print</span>Print Receipt
              </button>
              <button onClick={() => setPrintPayment(null)} className="flex-1 min-w-[180px] px-6 py-3 rounded-xl border border-outline-variant font-bold text-sm flex items-center justify-center hover:bg-surface-container-low transition-colors">
                Close
              </button>
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
