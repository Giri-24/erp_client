import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Descriptions,
  Tabs,
  Alert,
  Popconfirm,
  Divider,
  InputNumber,
  Typography,
} from "antd";
import {
  DollarOutlined,
  CheckOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalculatorOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import {
  generatePayroll,
  getPayroll,
  getPayslip,
  approvePayroll,
  bulkApprovePayroll,
  getLOPReport,
  getPFESISettings,
  cancelPayrollLOP,
  updatePayrollManual,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import { getAdminSettings } from "../../settings/settings.service";
import dayjs from "dayjs";
import { exportPayrollToCSV } from "./payrollExportUtil";
import { hasPermission, PERMISSIONS, getCurrentUser } from "../../../utils/permissions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
const { Option } = Select;
const { Text } = Typography;

const PAY_STATUS_COLORS = {
  draft: "default",
  generated: "gold",
  approved: "green",
  paid: "blue",
  cancelled: "red",
};

const PERMISSION_HOURS_LIMIT = 4; // 4 hrs/month

const CATEGORY_LABELS = {
  TEACHING_REGULAR: "Teaching Regular",
  TEACHING_TRAINEE: "Teaching Trainee",
  TEACHING_PART_TIME: "Part-Time Teacher",
  NON_TEACHING_REGULAR: "Non-Teaching Regular",
  NON_TEACHING_TRAINEE: "Non-Teaching Trainee",
  NON_TEACHING_SECURITY: "Security (Daily Rate)",
  NON_TEACHING_SPORTS: "Sports Staff (Daily Rate)",
  NON_TEACHING_ACTING_DRIVER: "Acting Driver (Daily Rate)",
};

const isActingDriverCategory = (category) => category === "NON_TEACHING_ACTING_DRIVER";

const PayrollPage = ({ selfOnly: selfOnlyProp } = {}) => {
  const [payrollData, setPayrollData] = useState([]);
  const [lopReport, setLopReport] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [adminSettings, setAdminSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [payslipModal, setPayslipModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [bonusModal, setBonusModal] = useState(false);
  const [bonusRecord, setBonusRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("payroll");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedRows, setSelectedRows] = useState([]);
  const [generateForm] = Form.useForm();
  const [bonusForm] = Form.useForm();

  const canManagePayroll = hasPermission(PERMISSIONS.HR_PAYROLL_MANAGE);
  const canApprovePayroll = hasPermission(PERMISSIONS.HR_PAYROLL_APPROVE);
  const currentUser = getCurrentUser();
  const isSelfOnly = selfOnlyProp || (!canManagePayroll && !canApprovePayroll);

  const normalizeAssetSrc = (value) => {
    if (!value) return "";
    if (value.startsWith("data:image") || value.startsWith("http://") || value.startsWith("https://")) return value;
    return `/erp/api/${String(value).replace(/^\/+/, "").replace(/\\/g, "/")}`;
  };

  const getDocumentAssets = () => {
    const assets = adminSettings?.documentAssets || {};
    return {
      hrSignature: assets.hrSignature || adminSettings?.hrSignature || "",
      chairmanSignature: assets.chairmanSignature || adminSettings?.chairmanSignature || "",
      managerSignature: assets.managerSignature || adminSettings?.managerSignature || "",
      rubberStamp: assets.rubberStamp || adminSettings?.rubberStamp || "",
    };
  };

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const params = { month: selectedMonth.format("YYYY-MM") };
      if (isSelfOnly && currentUser?.staffId) params.staffId = currentUser.staffId;
      const data = await getPayroll(params);
      const mapped = data.map((p) => ({
        ...p,
        staffName: p.staff?.name || p.staffName,
        employeeId: p.staff?.employeeId || p.employeeId,
        department: p.staff?.department || p.department,
        designation: p.staff?.designation || p.designation,
        category: p.staff?.category || p.category,
        paymentMode: p.staff?.paymentMode || p.paymentMode,
      }));
      setPayrollData(isSelfOnly && currentUser?.staffId ? mapped.filter(p => p.staffId === currentUser.staffId) : mapped);
    } catch {
      setPayrollData([]);
    }
    setLoading(false);
  };

  const fetchLOPReport = async () => {
    setLoading(true);
    try {
      const data = await getLOPReport({ month: selectedMonth.format("YYYY-MM") });
      setLopReport(data.map((p) => ({
        ...p,
        staffName: p.staff?.name || p.staffName,
        employeeId: p.staff?.employeeId || p.employeeId,
      })));
    } catch {
      setLopReport([]);
    }
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch { /* ignore */ }
  };

  const fetchSettings = async () => {
    try {
      const data = await getPFESISettings();
      setSettings(data);
    } catch { /* ignore */ }
  };

  const fetchAdminDocSettings = async () => {
    try {
      const data = await getAdminSettings();
      setAdminSettings(data || null);
    } catch {
      setAdminSettings(null);
    }
  };

  useEffect(() => {
    if (!isSelfOnly) {
      fetchStaff();
      fetchSettings();
    }
    fetchAdminDocSettings();
  }, []);

  const docAssets = getDocumentAssets();

  useEffect(() => {
    if (activeTab === "payroll") fetchPayroll();
    if (activeTab === "lop" && !isSelfOnly) fetchLOPReport();
  }, [activeTab, selectedMonth]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const values = await generateForm.validateFields();
      await generatePayroll({
        month: values.month.format("YYYY-MM"),
        staffIds: values.staffIds?.length ? values.staffIds : undefined,
      });
      message.success("Payroll generated successfully");
      setGenerateModal(false);
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to generate payroll");
    }
    setGenerating(false);
  };

  const handleApprove = async (id) => {
    try {
      await approvePayroll(id);
      message.success("Payroll approved");
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedRows.length) {
      message.warning("Select payroll records to approve");
      return;
    }
    try {
      await bulkApprovePayroll({ ids: selectedRows });
      message.success(`${selectedRows.length} payroll records approved`);
      setSelectedRows([]);
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Bulk approve failed");
    }
  };

  const handleCancelLOP = async (record) => {
    try {
      await cancelPayrollLOP(record.id);
      message.success("LOP cancelled — full salary will be paid");
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to cancel LOP");
    }
  };

  const openBonusModal = (record) => {
    setBonusRecord(record);
    bonusForm.setFieldsValue({ bonusIncentive: record.bonusIncentive || 0, extraAllowance: record.extraAllowance || 0 });
    setBonusModal(true);
  };

  const handleBonusSave = async () => {
    try {
      const values = await bonusForm.validateFields();
      await updatePayrollManual(bonusRecord.id, values);
      message.success("Bonus/Incentive updated");
      setBonusModal(false);
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update");
    }
  };

  const openPayslip = async (record) => {
    try {
      const data = await getPayslip(record.id);
      setSelectedPayslip(data || record);
      setPayslipModal(true);
    } catch {
      setSelectedPayslip(record);
      setPayslipModal(true);
    }
  };

  // const handleDownloadPayslip = async (record) => {
  //   try {
  //     if (!record.id) {
  //       message.error("Payslip record ID is missing.");
  //       return;
  //     }
  //     const payslip = await getPayslip(record.id);
  //     if (!payslip || !payslip.staff) {
  //       message.error("Payslip data not found for this staff.");
  //       return;
  //     }
  //     const doc = new jsPDF();
  //     autoTable(doc, {
  //       startY: 24,
  //       head: [["Field", "Value"]],
  //       body: [
  //         ["Employee", payslip.staff?.name || "-"],
  //         ["Emp ID", payslip.staff?.employeeId || "-"],
  //         ["Department", payslip.staff?.department || "-"],
  //         ["Designation", payslip.staff?.designation || "-"],
  //         ["Category", payslip.staff?.category || "-"],
  //         ["Pay Mode", payslip.staff?.paymentMode || "-"],
  //       ],
  //     });
  //     doc.text("Payslip", 14, 16);
  //     doc.save(`Payslip_${payslip.staff?.employeeId || "staff"}.pdf`);
  //   } catch (err) {
  //     console.error("Payslip download error:", err);
  //     message.error(err?.response?.data?.message || err?.message || "Failed to download payslip");
  //   }
  // };

  // const handleDownloadPayslipForm = async () => {
  //   try {
  //     if (!selectedPayslip) {
  //       message.error("Payslip data not found.");
  //       return;
  //     }
  //     const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  //     const left = 40; // Increased left padding
  //     let y = 40;
  //     doc.setFontSize(20);
  //     doc.text("Salary Slip", 300, y, { align: "center" });
  //     y += 30;
  //     doc.setFontSize(12);
  //     // Show Pay Period: <Month Year> (when payslip is generated)
  //     const now = new Date();
  //     const monthNames = [
  //       "January", "February", "March", "April", "May", "June",
  //       "July", "August", "September", "October", "November", "December"
  //     ];
  //     const payPeriodStr = `Pay Period: ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  //     doc.text(payPeriodStr, left, y); y += 18;
  //     doc.text(`Pay Date: ${selectedPayslip.payDate || selectedPayslip.month || '-'}`, left, y); y += 18;
  //     doc.text(`Employee Name: ${selectedPayslip.staff?.name || '-'}`, left, y); y += 18;
  //     doc.text(`Emp ID: ${selectedPayslip.staff?.employeeId || '-'}`, left, y); y += 18;
  //     doc.text(`Department: ${selectedPayslip.staff?.department || '-'}`, left, y); y += 18;
  //     doc.text(`Designation: ${selectedPayslip.staff?.designation || '-'}`, left, y); y += 18;
  //     doc.text(`Category: ${selectedPayslip.staff?.category || '-'}`, left, y); y += 18;
  //     doc.text(`Pay Mode: ${selectedPayslip.staff?.paymentMode || '-'}`, left, y); y += 24;
  //     // Earnings & Deductions Table
  //     autoTable(doc, {
  //       startY: y,
  //       margin: { left, right: left },
  //       head: [["Earnings", "Amount", "Deductions", "Amount"]],
  //       body: [
  //         ["Basic Salary", `${(selectedPayslip.basicSalary || 0).toLocaleString()}`, "LOP Deduction", `${(selectedPayslip.lopDeduction || 0).toLocaleString()}`],
  //         ["HRA", `${(selectedPayslip.hra || 0).toLocaleString()}`, "PF Employee", isActingDriverCategory(selectedPayslip.category) ? "N/A" : `${(selectedPayslip.pfDeduction || 0).toLocaleString()}`],
  //         ["Travel Allowance", `${(selectedPayslip.travelAllowance || 0).toLocaleString()}`, "ESI Employee", isActingDriverCategory(selectedPayslip.category) ? "N/A" : `${(selectedPayslip.esiDeduction || 0).toLocaleString()}`],
  //         ["Other Allowances", `${(selectedPayslip.otherAllowances || 0).toLocaleString()}`, "Professional Tax", isActingDriverCategory(selectedPayslip.category) ? "N/A" : `${(selectedPayslip.ptDeduction || 0).toLocaleString()}`],
  //         ["Extra Allowance", `${(selectedPayslip.extraAllowance || 0).toLocaleString()}`, "Fixed Advance", isActingDriverCategory(selectedPayslip.category) ? "N/A" : `${(selectedPayslip.fixedAdvanceDeduction || 0).toLocaleString()}`],
  //         ["Gross Salary", `${(selectedPayslip.grossSalary || 0).toLocaleString()}`, "Total Deductions", `${(selectedPayslip.totalDeductions || 0).toLocaleString()}`],
  //       ],
  //       theme: 'grid',
  //       headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
  //       styles: { fontSize: 11, cellPadding: 6 },
  //     });
  //     y = doc.lastAutoTable.finalY + 16;
  //     // Net Pay
  //     autoTable(doc, {
  //       startY: y,
  //       margin: { left, right: left },
  //       head: [["Net Pay", "Amount"]],
  //       body: [["Net Pay", `${(selectedPayslip.netSalary || 0).toLocaleString()}`]],
  //       theme: 'grid',
  //       headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
  //       styles: { fontSize: 12, cellPadding: 6 },
  //     });
  //     y = doc.lastAutoTable.finalY + 16;
  //     // Employer Contributions
  //     autoTable(doc, {
  //       startY: y,
  //       margin: { left, right: left },
  //       head: [["Employer Contributions", "Amount"]],
  //       body: [
  //         ["Employer PF", `${(selectedPayslip.employerPfContribution || 0).toLocaleString()}`],
  //         ["Employer ESI", `${(selectedPayslip.employerEsiContribution || 0).toLocaleString()}`],
  //         ["CTC (Gross + Employer PF + ESI)", `${(selectedPayslip.ctc || selectedPayslip.grossSalary || 0).toLocaleString()}`],
  //       ],
  //       theme: 'grid',
  //       headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
  //       styles: { fontSize: 11, cellPadding: 6 },
  //     });
  //     doc.save(`Payslip_${selectedPayslip.staff?.employeeId || "staff"}.pdf`);
  //   } catch (err) {
  //     console.error("Payslip form download error:", err);
  //     message.error("Failed to download payslip as form");
  //   }
  // };

  // const handleDownloadPayslipView = async () => {
  //   try {
  //     const payslipElement = document.getElementById("payslip-view-content");
  //     if (!payslipElement) {
  //       message.error("Payslip view not found.");
  //       return;
  //     }
  //     const canvas = await html2canvas(payslipElement, { scale: 2 });
  //     const imgData = canvas.toDataURL("image/png");
  //     const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  //     const pageWidth = pdf.internal.pageSize.getWidth();
  //     const pageHeight = pdf.internal.pageSize.getHeight();
  //     // Fit image to page width, keep aspect ratio
  //     const imgWidth = pageWidth - 40;
  //     const imgHeight = (canvas.height * imgWidth) / canvas.width;
  //     pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
  //     pdf.save(`Payslip_${selectedPayslip?.staff?.employeeId || "staff"}.pdf`);
  //   } catch (err) {
  //     console.error("Payslip view download error:", err);
  //     message.error("Failed to download payslip view");
  //   }
  // };



// ===============================
// DOWNLOAD SIMPLE PAYSLIP
// ===============================
const handleDownloadPayslip = async (record) => {
  try {
    if (!record?.id) {
      message.error("Payslip record ID is missing.");
      return;
    }

    const payslip = await getPayslip(record.id);

    if (!payslip || !payslip.staff) {
      message.error("Payslip data not found.");
      return;
    }

    const doc = new jsPDF("p", "pt", "a4");

    // ===== HEADER =====
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595, 80, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP", 40, 50);

    // ===== COMPANY =====
    doc.setTextColor(40);
    doc.setFontSize(11);

    const startY = 110;

    autoTable(doc, {
      startY,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 8,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 160 },
      },
      body: [
        ["Employee Name", payslip.staff?.name || "-"],
        ["Employee ID", payslip.staff?.employeeId || "-"],
        ["Department", payslip.staff?.department || "-"],
        ["Designation", payslip.staff?.designation || "-"],
        ["Category", payslip.staff?.category || "-"],
        ["Payment Mode", payslip.staff?.paymentMode || "-"],
      ],
    });

    doc.save(
      `Payslip_${payslip.staff?.employeeId || "Employee"}.pdf`
    );
  } catch (err) {
    console.error(err);
    message.error(
      err?.response?.data?.message ||
        err?.message ||
        "Failed to download payslip"
    );
  }
};

// ===============================
// FULL MODERN PAYSLIP PDF
// ===============================
const handleDownloadPayslipForm = async () => {
  try {
    if (!selectedPayslip) {
      message.error("Payslip data not found.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // ================= HEADER =================
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 90, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("SALARY PAYSLIP", 40, 55);

    doc.setFontSize(10);
    doc.text("Generated by ERP System", 40, 72);

    // ================= PAY PERIOD =================
    const now = new Date();

    const monthYear = now.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    doc.setTextColor(0);
    doc.setFontSize(11);

    doc.text(`Pay Period : ${monthYear}`, 40, 120);
    doc.text(
      `Pay Date : ${
        selectedPayslip.payDate || selectedPayslip.month || "-"
      }`,
      40,
      138
    );

    // ================= EMPLOYEE INFO =================
    autoTable(doc, {
      startY: 160,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 7,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        2: { fontStyle: "bold" },
      },
      body: [
        [
          "Employee Name",
          selectedPayslip.staff?.name || "-",
          "Employee ID",
          selectedPayslip.staff?.employeeId || "-",
        ],
        [
          "Department",
          selectedPayslip.staff?.department || "-",
          "Designation",
          selectedPayslip.staff?.designation || "-",
        ],
        [
          "Category",
          selectedPayslip.staff?.category || "-",
          "Payment Mode",
          selectedPayslip.staff?.paymentMode || "-",
        ],
      ],
    });

    // ================= EARNINGS & DEDUCTIONS =================
    const tableStartY = doc.lastAutoTable.finalY + 20;

    autoTable(doc, {
      startY: tableStartY,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 7,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: "bold",
      },
      body: [
        [
          "Basic Salary",
          `${(
            selectedPayslip.basicSalary || 0
          ).toLocaleString()}`,
          "LOP Deduction",
          `${(
            selectedPayslip.lopDeduction || 0
          ).toLocaleString()}`,
        ],
        [
          "HRA",
          `${(selectedPayslip.hra || 0).toLocaleString()}`,
          "PF Deduction",
          `${(
            selectedPayslip.pfDeduction || 0
          ).toLocaleString()}`,
        ],
        [
          "Travel Allowance",
          `${(selectedPayslip.travelAllowance || 0).toLocaleString()}`,
          "ESI Deduction",
          `${(
            selectedPayslip.esiDeduction || 0
          ).toLocaleString()}`,
        ],
        [
          "Other Allowance",
          `${(
            selectedPayslip.otherAllowances || 0
          ).toLocaleString()}`,
          "Professional Tax",
          `${(
            selectedPayslip.ptDeduction || 0
          ).toLocaleString()}`,
        ],
        [
          "Extra Allowance",
          `${(
            selectedPayslip.extraAllowance || 0
          ).toLocaleString()}`,
          "Advance",
          `${(
            selectedPayslip.fixedAdvanceDeduction || 0
          ).toLocaleString()}`,
        ],
      ],
      head: [["EARNINGS", "AMOUNT", "DEDUCTIONS", "AMOUNT"]],
    });

    // ================= SUMMARY =================
    const summaryY = doc.lastAutoTable.finalY + 20;

    autoTable(doc, {
      startY: summaryY,
      theme: "grid",
      styles: {
        fontSize: 11,
        cellPadding: 8,
      },
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: 255,
      },
      body: [
        [
          "Gross Salary",
          `${(
            selectedPayslip.grossSalary || 0
          ).toLocaleString()}`,
        ],
        [
          "Total Deductions",
          `${(
            selectedPayslip.totalDeductions || 0
          ).toLocaleString()}`,
        ],
        [
          "Net Salary",
          `${(
            selectedPayslip.netSalary || 0
          ).toLocaleString()}`,
        ],
      ],
    });

    // ================= FOOTER =================
    const footerY = doc.lastAutoTable.finalY + 40;

    doc.setFontSize(10);
    doc.setTextColor(120);

    doc.text(
      "This is a system generated payslip.",
      40,
      footerY
    );

    doc.text(
      "No signature required.",
      40,
      footerY + 15
    );

    doc.save(
      `Payslip_${selectedPayslip.staff?.employeeId || "Employee"}.pdf`
    );
  } catch (err) {
    console.error("Payslip PDF Error:", err);
    message.error("Failed to generate payslip PDF");
  }
};

// ===============================
// DOWNLOAD VIEW AS PDF
// ===============================
const handleDownloadPayslipView = async () => {
  try {
    const element = document.getElementById(
      "payslip-view-content"
    );

    if (!element) {
      message.error("Payslip view not found.");
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 40;
    const imgHeight =
      (canvas.height * imgWidth) / canvas.width;

    let position = 20;

    // Multi-page support
    if (imgHeight < pdfHeight) {
      pdf.addImage(
        imgData,
        "PNG",
        20,
        position,
        imgWidth,
        imgHeight
      );
    } else {
      let heightLeft = imgHeight;
      let pageHeight = pdfHeight - 40;

      pdf.addImage(
        imgData,
        "PNG",
        20,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 20;

        pdf.addPage();

        pdf.addImage(
          imgData,
          "PNG",
          20,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= pageHeight;
      }
    }

    pdf.save(
      `Payslip_${selectedPayslip?.staff?.employeeId || "Employee"}.pdf`
    );
  } catch (err) {
    console.error(err);
    message.error("Failed to download payslip view");
  }
};

  // Summary calculations
  const totalGross = payrollData.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const totalDeductions = payrollData.reduce((s, p) => s + (p.totalDeductions || 0), 0);
  const totalNet = payrollData.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalLOP = payrollData.reduce((s, p) => s + (p.lopDeduction || 0), 0);
  const totalCTC = payrollData.reduce((s, p) => s + (p.ctc || p.grossSalary || 0), 0);

  const payrollColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName", sorter: (a, b) => (a.staffName || "").localeCompare(b.staffName || "") },
    {
      title: "Category",
      dataIndex: "category",
      render: (v) => {
        const short = {
          TEACHING_REGULAR: "T",
          TEACHING_TRAINEE: "T-Tr",
          TEACHING_PART_TIME: "T-PT",
          NON_TEACHING_REGULAR: "NT",
          NON_TEACHING_TRAINEE: "NT-Tr",
          NON_TEACHING_SECURITY: "Security",
          NON_TEACHING_SPORTS: "Sports",
          NON_TEACHING_ACTING_DRIVER: "ActDrv",
        };
        return short[v] || v || "-";
      },
      width: 80,
    },
    {
      title: "Pay Mode",
      dataIndex: "paymentMode",
      render: (v) => v === "BANK_TRANSFER" ? "BT" : v === "CASH" ? "Cash" : "-",
      width: 70,
    },
    {
      title: "Basic (50%)",
      dataIndex: "basicSalary",
      render: (v) => `${(v || 0).toLocaleString()}`,
    },
    { title: "Gross", dataIndex: "grossSalary", render: (v) => `${(v || 0).toLocaleString()}` },
    {
      title: "LOP Days",
      dataIndex: "lopDays",
      render: (v, r) => r.lopCancelled
        ? <Tag color="green">Cancelled</Tag>
        : v ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag>,
    },
    {
      title: "LOP Ded.",
      dataIndex: "lopDeduction",
      render: (v) => v ? <Tag color="red">₹{v.toLocaleString()}</Tag> : "₹0",
    },
    {
      title: "PF (Emp)",
      dataIndex: "pfDeduction",
      render: (v, r) => isActingDriverCategory(r.category) ? <Tag color="geekblue">N/A</Tag> : `${(v || 0).toLocaleString()}`,
    },
    {
      title: "ESI (Emp)",
      dataIndex: "esiDeduction",
      render: (v, r) => isActingDriverCategory(r.category) ? <Tag color="geekblue">N/A</Tag> : `${(v || 0).toLocaleString()}`,
    },
    {
      title: "Fixed Adv.",
      dataIndex: "fixedAdvanceDeduction",
      render: (v, r) => isActingDriverCategory(r.category) ? <Tag color="geekblue">N/A</Tag> : (v ? `₹${v.toLocaleString()}` : "-"),
    },
    {
      title: "Sal. Adv.",
      dataIndex: "salaryAdvanceDeduction",
      render: (v, r) => isActingDriverCategory(r.category) ? <Tag color="geekblue">N/A</Tag> : (v ? `₹${v.toLocaleString()}` : "-"),
    },
    {
      title: "Other Adv.",
      dataIndex: "otherAdvanceDeduction",
      render: (v, r) => isActingDriverCategory(r.category) ? <Tag color="geekblue">N/A</Tag> : (v ? `₹${v.toLocaleString()}` : "-"),
    },
    {
      title: "Total Ded.",
      dataIndex: "totalDeductions",
      render: (v) => <Tag color="red">₹{(v || 0).toLocaleString()}</Tag>,
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      render: (v) => <Tag color="green">₹{(v || 0).toLocaleString()}</Tag>,
    },
    {
      title: "Bonus",
      dataIndex: "bonusIncentive",
      render: (v) => v ? <Tag color="gold">₹{v.toLocaleString()}</Tag> : "-",
    },
    {
      title: "Extra All.",
      dataIndex: "extraAllowance",
      render: (v) => v ? <Tag color="orange">₹{v.toLocaleString()}</Tag> : "-",
    },
    {
      title: "CTC",
      dataIndex: "ctc",
      render: (v) => v ? `₹${v.toLocaleString()}` : "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <Tag color={PAY_STATUS_COLORS[v] || "default"}>{(v || "").toUpperCase()}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => openPayslip(record)} />
          {canManagePayroll && !record.lopCancelled && (record.lopDays > 0 || record.permissionLopDays > 0) && (
            <Popconfirm title="Cancel LOP and pay full salary?" onConfirm={() => handleCancelLOP(record)}>
              <Button icon={<CloseCircleOutlined />} size="small" danger title="Cancel LOP" />
            </Popconfirm>
          )}
          {canManagePayroll && (
            <Button icon={<GiftOutlined />} size="small" onClick={() => openBonusModal(record)} title="Add Bonus/Incentive" />
          )}
          {canApprovePayroll && record.status === "generated" && (
            <Popconfirm title="Approve this payroll?" onConfirm={() => handleApprove(record.id)}>
              <Button icon={<CheckOutlined />} size="small" type="primary" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const lopColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    { title: "Working Days", dataIndex: "totalWorkingDays" },
    { title: "Present", dataIndex: "presentDays" },
    {
      title: "Absent (LOP)",
      dataIndex: "absentLopDays",
      render: (v) => <Tag color={v > 0 ? "red" : "green"}>{v || 0}</Tag>,
    },
    {
      title: "Permission Hrs",
      dataIndex: "permissionHoursUsed",
      render: (v) => {
        const excess = Math.max(0, (v || 0) - PERMISSION_HOURS_LIMIT);
        return (
          <Space>
            <span>{v || 0}h / {PERMISSION_HOURS_LIMIT}h</span>
            {excess > 0 && <Tag color="red">+{excess}h LOP</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Permission LOP Days",
      dataIndex: "permissionLopDays",
      render: (v) => v ? <Tag color="orange">{v}</Tag> : "0",
    },
    {
      title: "Total LOP Days",
      dataIndex: "totalLopDays",
      render: (v) => <Tag color={v > 0 ? "red" : "green"}>{v || 0}</Tag>,
    },
    {
      title: "Per Day Salary",
      dataIndex: "perDaySalary",
      render: (v) => v ? `₹${v.toLocaleString()}` : "-",
    },
    {
      title: "LOP Deduction",
      dataIndex: "totalLopDeduction",
      render: (v) => v ? <Tag color="red">₹{v.toLocaleString()}</Tag> : "₹0",
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>Payroll</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {isSelfOnly ? "My Payslip" : "Payroll & LOP Calculations"}
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            {isSelfOnly ? "View your monthly payslip and salary breakup." : "Generate monthly payroll with PF, ESI, permission LOP, and attendance-based deductions."}
          </p>
        </div>
        {canManagePayroll && (
          <Space>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={() => {
                generateForm.setFieldsValue({ month: selectedMonth });
                setGenerateModal(true);
              }}
            >
              Generate Payroll
            </Button>
            {selectedRows.length > 0 && canApprovePayroll && (
              <Button icon={<CheckOutlined />} onClick={handleBulkApprove}>
                Approve Selected ({selectedRows.length})
              </Button>
            )}
          </Space>
        )}
      </div>

      {/* Summary Cards */}
      {!isSelfOnly && (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Total Gross" prefix="₹" value={totalGross} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Total Deductions" prefix="₹" value={totalDeductions} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Net Payable" prefix="₹" value={totalNet} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Total LOP" prefix="₹" value={totalLOP} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Total CTC" prefix="₹" value={totalCTC} valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
      </Row>
      )}

      {!isSelfOnly && (
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "payroll", label: "Payroll" },
        { key: "lop", label: "LOP Report" },
      ]} />
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <DatePicker picker="month" value={selectedMonth} onChange={(d) => d && setSelectedMonth(d)} allowClear={false} />
        <Button
          icon={<DownloadOutlined />}
          onClick={() => exportPayrollToCSV(payrollData, selectedMonth.format("YYYY-MM"))}
          disabled={!payrollData.length}
        >
          Export CSV
        </Button>
      </div>

      <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
          {activeTab === "payroll" ? (
            <Table
              columns={payrollColumns}
              dataSource={payrollData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1400 }}
              pagination={{ pageSize: 50 }}
              rowSelection={
                canApprovePayroll
                  ? {
                      selectedRowKeys: selectedRows,
                      onChange: setSelectedRows,
                      getCheckboxProps: (r) => ({ disabled: r.status !== "generated" }),
                    }
                  : undefined
              }
            />
          ) : (
            <Table
              columns={lopColumns}
              dataSource={lopReport}
              rowKey="staffId"
              loading={loading}
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 50 }}
            />
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        title="Generate Monthly Payroll"
        open={generateModal}
        onCancel={() => setGenerateModal(false)}
        onOk={handleGenerate}
        confirmLoading={generating}
        okText="Generate"
      >
        <Alert
          message="Payroll Calculation Includes"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li><strong>Gross = Basic (50%) + HRA (30%) + Travel + Other Allowances</strong></li>
              <li>PF: {settings?.pfEmployeeRate || 12}% employee on <em>Basic (50% of Gross)</em> + {settings?.pfEmployerRate || 12}% employer</li>
              <li>ESI: {settings?.esiEmployeeRate || 0.75}% employee on <em>Basic+HRA (80% of Gross)</em> — skipped if daily wage &lt; ₹{settings?.esiDailyWageThreshold || 176}</li>
              <li>LOP deduction: absent days × (Gross ÷ working days) — <em>skipped for part-time teachers</em></li>
              <li>Security staff: present days × daily rate (default ₹400)</li>
              <li>Sports staff: present days × daily rate (default ₹1500)</li>
              <li>Acting driver: present days × per-day salary, no PF/ESI/PT/advance deductions</li>
              <li>Professional Tax (if enabled)</li>
              <li>Advance deductions: Fixed / Salary / Other (auto-deducted)</li>
              <li><strong>Net = Gross − LOP − Employee PF − Employee ESI − Advances</strong></li>
              <li><strong>CTC = Gross + Employer PF + Employer ESI</strong></li>
              <li>Bonus/Incentive added separately after Net (via the gift icon)</li>
            </ul>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form form={generateForm} layout="vertical">
          <Form.Item name="month" label="Month" rules={[{ required: true }]}>
            <DatePicker picker="month" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="staffIds" label="Staff (leave empty for all)">
            <Select mode="multiple" placeholder="All staff" allowClear showSearch optionFilterProp="children">
              {staff.map((s) => (
                <Option key={s.id} value={s.id}>{s.name} ({s.employeeId})</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Payslip Modal */}
      <Modal title="Payslip" open={payslipModal} onCancel={() => setPayslipModal(false)} footer={[
        <Button key="close" onClick={() => setPayslipModal(false)}>Close</Button>,
        <Button key="print" icon={<DownloadOutlined />} onClick={handleDownloadPayslipForm}>Download PDF</Button>,
        <Button key="printBtn" icon={<CalculatorOutlined />} onClick={() => window.print()}>Print</Button>,
      ]} width={700}>
        {selectedPayslip && (
          <div id="payslip-view-content" style={{ fontFamily: 'Segoe UI, Noto Sans, Arial, sans-serif', color: '#222', background: '#fff', padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#00152a', marginBottom: 0 }}>Monthly Payslip</h2>
              <div style={{ fontSize: 15, color: '#43474d', marginBottom: 4 }}>{selectedPayslip.month || selectedMonth.format("MMMM YYYY")}</div>
            </div>
            <table style={{ width: '100%', marginBottom: 18, borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>Employee</td>
                  <td style={{ padding: 6 }}>{selectedPayslip.staff?.name || '-'}</td>
                  <td style={{ fontWeight: 600, padding: 6 }}>Emp ID</td>
                  <td style={{ padding: 6 }}>{selectedPayslip.staff?.employeeId || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>Department</td>
                  <td style={{ padding: 6 }}>{selectedPayslip.staff?.department || '-'}</td>
                  <td style={{ fontWeight: 600, padding: 6 }}>Designation</td>
                  <td style={{ padding: 6 }}>{selectedPayslip.staff?.designation || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>Category</td>
                  <td style={{ padding: 6 }}>{selectedPayslip.staff?.category || '-'}</td>
                  <td style={{ fontWeight: 600, padding: 6 }}>Pay Mode</td>
                  <td style={{ padding: 6 }}>{selectedPayslip.staff?.paymentMode || '-'}</td>
                </tr>
              </tbody>
            </table>

            {isActingDriverCategory(selectedPayslip.category) && (
              <Alert
                message="Acting Driver Rule"
                description="For acting drivers, salary is calculated as present days × per-day salary. PF, ESI, PT, and advance deductions are not applied."
                type="info"
                style={{ marginTop: 12 }}
              />
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f0f4f8' }}>
                  <th style={{ padding: 8, fontWeight: 700, textAlign: 'left', border: '1px solid #e0e0e0' }}>Earnings</th>
                  <th style={{ padding: 8, fontWeight: 700, textAlign: 'right', border: '1px solid #e0e0e0' }}>Amount (₹)</th>
                  <th style={{ padding: 8, fontWeight: 700, textAlign: 'left', border: '1px solid #e0e0e0' }}>Deductions</th>
                  <th style={{ padding: 8, fontWeight: 700, textAlign: 'right', border: '1px solid #e0e0e0' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Basic Salary (50% Gross)</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.basicSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>LOP Deduction</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.lopDeduction || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>HRA (30% Gross)</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.hra || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>PF Employee</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.pfDeduction || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Travel Allowance</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.travelAllowance || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>ESI Employee</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.esiDeduction || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Other Allowances</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.otherAllowances || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Professional Tax</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.ptDeduction || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Extra Allowance</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.extraAllowance || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Fixed Advance</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.fixedAdvanceDeduction || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr style={{ background: '#f9fafb' }}>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', fontWeight: 700 }}>Gross Salary</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700 }}>{(selectedPayslip.grossSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', fontWeight: 700 }}>Total Deductions</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700 }}>{(selectedPayslip.totalDeductions || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: "right", fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#00152a' }}>
              Net / Take-Home: <span style={{ color: '#52c41a', fontWeight: 800, fontSize: 18 }}>{(selectedPayslip.netSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</span>
            </div>

            {(selectedPayslip.bonusIncentive > 0) && (
              <div style={{ textAlign: "right", fontSize: 15, color: "#fa8c16", marginBottom: 8 }}>
                Bonus / Incentive: <strong>{(selectedPayslip.bonusIncentive || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</strong>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18, fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f0f4f8' }}>
                  <th style={{ padding: 8, fontWeight: 700, textAlign: 'left', border: '1px solid #e0e0e0' }}>Employer Contributions</th>
                  <th style={{ padding: 8, fontWeight: 700, textAlign: 'right', border: '1px solid #e0e0e0' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Employer PF</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.employerPfContribution || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0' }}>Employer ESI</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right' }}>{(selectedPayslip.employerEsiContribution || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
                <tr style={{ background: '#f9fafb' }}>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', fontWeight: 700 }}>CTC (Gross + Employer PF + ESI)</td>
                  <td style={{ padding: 8, border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 700 }}>{(selectedPayslip.ctc || selectedPayslip.grossSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Bonus / Incentive Modal */}
      <Modal
        title="Add Bonus / Incentive"
        open={bonusModal}
        onCancel={() => setBonusModal(false)}
        onOk={handleBonusSave}
        okText="Save"
      >
        <Alert
          message="Bonus/Incentive is added as a separate line item and does not affect Net Salary calculation. It is displayed on the payslip below the Net."
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form form={bonusForm} layout="vertical">
          <Form.Item name="bonusIncentive" label="Bonus / Incentive Amount (₹)">
            <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="extraAllowance" label="Extra Allowance (₹) — added to Gross">
            <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollPage;
