import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, message, Popconfirm, DatePicker, Tag, Select, Modal, Row } from "antd";
import "./AdmissionView.css";
import { SearchOutlined, EditOutlined, DownloadOutlined, DeleteOutlined, PrinterOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.jpeg";

// Redesigned handlePrintPDF logic will be moved inside the component
import instance from "../utils/axios";
import dayjs from "dayjs";
import { getPendingAdmissions, setAdmissionApproval, bulkApproval } from "../modules/admission/admission.service";
import { getAcademicYears, getAcademicYear as fetchCurrentYear } from "../modules/fees/fees.service";
import { getAdminSettings } from "../modules/settings/settings.service";
import { PERMISSIONS, usePermissionHelpers } from "../utils/permissions";

const normalizeStandardValue = (value) => {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  const lower = raw.toLowerCase();

  if (lower === "lkg") return "LKG";
  if (lower === "ukg") return "UKG";

  const stdCodeMatch = lower.match(/^std[_\-\s]?(\d{1,2})$/);
  if (stdCodeMatch) return stdCodeMatch[1];

  const numberMatch = lower.match(/^(\d{1,2})(st|nd|rd|th)?(\s*standard)?$/);
  if (numberMatch) return numberMatch[1];

  return raw;
};

const formatStandardLabel = (value) => {
  const normalized = normalizeStandardValue(value);
  if (normalized === "LKG" || normalized === "UKG") return normalized;

  const num = Number(normalized);
  if (!Number.isNaN(num) && normalized !== "") {
    if (num === 1) return "1st Standard";
    if (num === 2) return "2nd Standard";
    if (num === 3) return "3rd Standard";
    return `${num}th Standard`;
  }

  return value || "";
};

const pdfStyles = {
  pdfWrapper: {
    width: "800px",
    background: "white",
    fontFamily: "'Public Sans', sans-serif",
    color: "#222",
  },
  header: {
    backgroundColor: "#F59E0B",
    padding: "5px 10px",
    textAlign: "center",
    color: "white",
    position: "relative",
    // marginBottom: "30px",
  },
  institutionName: {
    fontSize: "28px",
    fontWeight: "900",
    margin: 0,
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: "12px",
    fontWeight: "500",
    opacity: 0.9,
    margin: "4px 0",
  },
  formTitle: {
    fontSize: "20px",
    fontWeight: "800",
    marginTop: "20px",
    padding: "6px 24px",
    border: "2px solid white",
    display: "inline-block",
    textTransform: "uppercase",
  },
  photoBox: {
    position: "absolute",
    right: "40px",
    top: "30px",
    width: "100px",
    height: "120px",
    border: "1px dashed rgba(255,255,255,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "rgba(255,255,255,0.8)",
  },
  content: {
    padding: "0 40px 40px",
  },
  row: {
    display: "flex",
    gap: "20px",
    marginBottom: "18px",
    alignItems: "flex-end",
  },
  field: {
    display: "flex",
    flex: 1,
    alignItems: "flex-end",
    gap: "10px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#444",
    whiteSpace: "nowrap",
  },
  value: {
    flex: 1,
    borderBottom: "1px dotted #999",
    fontSize: "14px",
    paddingBottom: "2px",
    color: "#000",
    fontWeight: "500",
    minHeight: "20px"
  },
  addressSection: {
    border: "1px dashed #cbd5e1",
    padding: "20px",
    marginTop: "25px",
    marginBottom: "20px",
    position: "relative",
  },
  addressLabel: {
    position: "absolute",
    top: "-10px",
    left: "20px",
    background: "white",
    padding: "0 10px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#F59E0B",
    textTransform: "uppercase",
  },
  declaration: {
    textAlign: "center",
    marginTop: "40px",
    padding: "0 20px",
  },
  declTitle: {
    fontSize: "14px",
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  declText: {
    fontSize: "12px",
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "60px",
  },
  signatureRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 40px",
  },
  sigLine: {
    width: "200px",
    borderTop: "1px dotted #666",
    textAlign: "center",
    paddingTop: "8px",
    fontSize: "12px",
    fontWeight: "700",
  },
  academicSection: {
    marginTop: "25px",
    marginBottom: "20px",
  },
  academicTitle: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#F59E0B",
    textTransform: "uppercase",
    marginBottom: "12px",
    borderBottom: "2px solid #F59E0B",
    paddingBottom: "4px",
    display: "inline-block",
  },
  academicTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  academicTh: {
    backgroundColor: "#fff9f2",
    border: "1px solid #fed7aa",
    padding: "8px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#9a3412",
    textAlign: "center",
  },
  academicTd: {
    border: "1px solid #fed7aa",
    padding: "8px",
    fontSize: "11px",
    textAlign: "center",
  },
  footer: {
    height: "15px",
    backgroundColor: "#F59E0B",
    marginTop: "40px",
  }
};

const AdmissionView = ({ onEdit, mode = "all" }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState({});
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalModalRecord, setApprovalModalRecord] = useState(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkApprovalLoading, setBulkApprovalLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [printingRecord, setPrintingRecord] = useState(null);
  
  const [filterStandard, setFilterStandard] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterFatherName, setFilterFatherName] = useState("");
  const [filterSibling, setFilterSibling] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  const { hasPermission } = usePermissionHelpers();
  const canApprove = hasPermission(PERMISSIONS.ADMISSION_APPROVE) && (adminSettings?.requireApprovalForAdmission ?? true);

  // Re-apply filters whenever data or any filter changes
  useEffect(() => {
    applyFilters(
      searchText,
      filterStandard,
      filterGender,
      filterStatus,
      filterApproval,
      filterDate,
      filterAcademicYear,
      filterSection,
      filterFatherName,
      filterSibling,
      filterArea,
      data
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data,
    searchText,
    filterStandard,
    filterGender,
    filterStatus,
    filterApproval,
    filterDate,
    filterAcademicYear,
    filterSection,
    filterFatherName,
    filterSibling,
    filterArea
  ]);

  const handlePrintPDF = async (record) => {
    setPrintingRecord(record);
    // Wait for DOM to render hidden content
    setTimeout(async () => {
      try {
        const input = document.getElementById("viewPdfContent");
        if (!input) return;
        
        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 800,
        });
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        const pdf = new jsPDF("p", "mm", "a4");
        let position = 0;
        
        const imgData = canvas.toDataURL("image/png");
        
        // Add first page
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Add additional pages if needed
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`Admission_${record.admission?.admissionNo || record.id}.pdf`);
      } catch (err) {
        console.error("PDF Export Error:", err);
        message.error("Failed to generate PDF");
      } finally {
        setPrintingRecord(null);
      }
    }, 100);
  };

  const loadAdminSettings = async () => {
    try {
      const settings = await getAdminSettings();
      setAdminSettings(settings);
    } catch (err) {
      console.error("Failed to load admin settings:", err);
    }
  };

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const rows = mode === "approval"
        ? await getPendingAdmissions()
        : (await instance.get("/admissions")).data;
      setData(rows);
      // Apply filters to initial data
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, rows);
    } catch {
      message.error("Failed to load admissions");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [years] = await Promise.all([
        getAcademicYears(),
        fetchCurrentYear()
      ]);
      setAvailableYears(years || []);
      // Do not set filterAcademicYear by default
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAdmissions();
    loadAdminSettings();
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Helper to get unique values for dropdowns
  const getUnique = (arr, key) => {
    const values = arr.map(item => {
      if (typeof key === 'string') return item[key];
      // for nested keys like ['admission','standard']
      if (Array.isArray(key)) return key.reduce((o, k) => (o ? o[k] : undefined), item);
      return undefined;
    });
    return Array.from(new Set(values.filter(Boolean)));
  };


  // Combined filter
  const applyFilters = (searchVal, std, gender, status, approval, dateRange, academicYear, section, fatherName, sibling, areaSearch, sourceData = data) => {
    let filtered = sourceData.filter((item) => {
      // Search
      if (searchVal && searchVal.trim() !== "") {
        const found = Object.values(item).some((v) =>
          String(v).toLowerCase().includes(searchVal.toLowerCase())
        );
        if (!found) return false;
      }
      // Standard
      if (std && std !== "") {
        const itemStandard = item.admission?.standard || item.standard;
        if (normalizeStandardValue(itemStandard) !== normalizeStandardValue(std)) return false;
      }
      // Gender
      if (gender && gender !== "") {
        if (item.gender !== gender) return false;
      }
      // Status
      if (status && status !== "") {
        const isActive = item.users?.isActive ?? 1;
        if ((status === 'active' && !isActive) || (status === 'inactive' && isActive)) return false;
      }
      // Approval
      if (approval && approval !== "") {
        const isApproved = Boolean(item.admission?.isApproved);
        if ((approval === 'approved' && !isApproved) || (approval === 'pending' && isApproved)) return false;
      }
      // Academic Year
      if (academicYear && academicYear !== "") {
        if (item.academicYear !== academicYear) return false;
      }
      // Section
      if (section && section !== "") {
        if (item.section !== section) return false;
      }
      // Father Name
      if (fatherName && fatherName.trim() !== "") {
        if (!(item.family?.fatherName || "").toLowerCase().includes(fatherName.toLowerCase())) return false;
      }
      // Sibling
      if (sibling && sibling !== "") {
        if (sibling === 'has' && !item.siblingGroupId) return false;
        if (sibling === 'none' && item.siblingGroupId) return false;
      }
      // Area Search
      if (areaSearch && areaSearch.trim() !== "") {
        const areaStr = areaSearch.toLowerCase();
        const address = item.address || {};
        const isMatch = 
          (address.line1 || "").toLowerCase().includes(areaStr) ||
          (address.line2 || "").toLowerCase().includes(areaStr) ||
          (address.line3 || "").toLowerCase().includes(areaStr) ||
          (address.city || "").toLowerCase().includes(areaStr) ||
          (address.state || "").toLowerCase().includes(areaStr) ||
          String(address.pin || "").toLowerCase().includes(areaStr);
        if (!isMatch) return false;
      }
      // Admission Date
      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const admDate = item.admission?.admissionDate;
        if (admDate) {
          const d = dayjs(admDate);
          if (!(d.isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) && d.isBefore(dateRange[1].endOf('day').add(1, 'ms')))) return false;
        } else {
          return false;
        }
      }
      return true;
    });
    setFilteredData(filtered);
  };

  // Handlers
  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleStandard = (value) => {
    setFilterStandard(value);
    applyFilters(searchText, value, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleGender = (value) => {
    setFilterGender(value);
    applyFilters(searchText, filterStandard, value, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleStatus = (value) => {
    setFilterStatus(value);
    applyFilters(searchText, filterStandard, filterGender, value, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleApprovalFilter = (value) => {
    setFilterApproval(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, value, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleDate = (dates) => {
    setFilterDate(dates);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, dates, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleAcademicYear = (value) => {
    setFilterAcademicYear(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, value, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleSection = (value) => {
    setFilterSection(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, value, filterFatherName, filterSibling, filterArea);
  };
  const handleFatherName = (value) => {
    setFilterFatherName(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, value, filterSibling, filterArea);
  };
  const handleSibling = (value) => {
    setFilterSibling(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, value, filterArea);
  };
  const handleArea = (value) => {
    setFilterArea(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, value);
  };

  const handleSetApproval = async (record, approved, reason) => {
    if (!canApprove) {
      message.error("You are not authorized to approve admissions");
      return;
    }

    try {
      setApprovalLoading((prev) => ({ ...prev, [record.id]: true }));
      await setAdmissionApproval(record.id, approved, reason);
      message.success(approved ? "Admission approved" : "Admission marked pending");
      await fetchAdmissions();
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update approval");
    } finally {
      setApprovalLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const openMarkPendingModal = (record) => {
    setApprovalModalRecord(record);
    setApprovalReason("");
    setApprovalModalOpen(true);
  };

  const handleConfirmMarkPending = async () => {
    if (!approvalModalRecord) return;
    await handleSetApproval(approvalModalRecord, false, approvalReason || undefined);
    setApprovalModalOpen(false);
    setApprovalModalRecord(null);
    setApprovalReason("");
  };

  const handleBulkApproval = async (approved) => {
    if (selectedRowKeys.length === 0) {
      message.error("Select at least one admission");
      return;
    }
    try {
      setBulkApprovalLoading(true);
      const result = await bulkApproval(selectedRowKeys, approved);
      message.success(`${result.updatedCount} admissions ${approved ? 'approved' : 'marked pending'}`);
      setSelectedRowKeys([]);
      await fetchAdmissions();
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Bulk approval failed');
    } finally {
      setBulkApprovalLoading(false);
    }
  };

  const rowSelection = canApprove ? {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: false,
    }),
  } : undefined;

  // Sort
  const handleSort = (field) => {
    const order = sortOrder === "ascend" ? "descend" : "ascend";
    setSortOrder(order);
    const sorted = [...filteredData].sort((a, b) => {
      // deeply resolve fields
      const resolvePath = (obj, path) => path.split('.').reduce((o, p) => (o ? o[p] : ""), obj);
      const valA = String(resolvePath(a, field));
      const valB = String(resolvePath(b, field));
      if (order === "ascend") return valA.localeCompare(valB);
      else return valB.localeCompare(valA);
    });
    setFilteredData(sorted);
  };

  // Helper to flatten nested objects
  const flattenObject = (obj, prefix = "") => {
    let result = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    return result;
  };

  // Export CSV with expanded nested objects
  const exportCSV = () => {
    if (!filteredData.length) return;
    // Flatten all rows
    const flatRows = filteredData.map(row => flattenObject(row));
    // Collect all unique keys for columns
    const allKeys = Array.from(new Set(flatRows.flatMap(row => Object.keys(row))));
    // Build CSV rows
    const csvRows = [
      allKeys.join(","),
      ...flatRows.map(row =>
        allKeys.map(k => {
          let v = row[k];
          if (v === undefined || v === null) return "";
          v = String(v).replace(/"/g, '""');
          return `"${v}"`;
        }).join(",")
      )
    ];
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (record) => {
    if (onEdit) onEdit(record);
  };

  const handleDelete = async (id) => {
    try {
      console.log("Deleting ID:", id);
      await instance.delete(`/users/${id}`);
      console.log("Deleted ID:", id);
      setData(data.filter((item) => item.id !== id));
      setFilteredData(filteredData.filter((item) => item.id !== id));
      message.success("Deleted successfully");
    } catch {
      message.error("Delete failed");
    }
  };

  const renderBool = (val) => (val ? "Yes" : "No");
  const renderDate = (date) => (date ? dayjs(date).format("YYYY-MM-DD") : "");

  const expandedRowRender = (record) => {
    const detailGroup = (title, items) => (
      <div className="expand-detail-group">
        <h4 className="expand-detail-title">{title}</h4>
        <div className="expand-detail-grid">
          {items.map(([label, value]) => (
            <div key={label} className="expand-detail-item">
              <div className="expand-detail-label">{label}</div>
              <div className="expand-detail-value">{value || '-'}</div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="expanded-row-container shadow-sm border border-outline-variant/20">
        <div className="flex items-start gap-8 mb-8 pb-8 border-bottom border-outline-variant/20">
          <div className="profile-photo-container">
            {(() => {
              let photoPath = null;
              if (Array.isArray(record.documents) && record.documents.length > 0) {
                photoPath = record.documents[0].photoPath;
              } else if (record.documents && record.documents.photoPath) {
                photoPath = record.documents.photoPath;
              }
              if (photoPath) {
                return <img src={`/erp/api/${photoPath.replace(/\\/g, '/')}`} alt="student" className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-md" />;
              }
              const initials = (record.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return <div className="avatar-initials w-24 h-24 text-2xl rounded-2xl">{initials || '?'}</div>;
            })()}
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="expand-detail-label text-[10px] text-secondary font-bold mb-1">Date of Birth</div>
              <div className="expand-detail-value font-headline text-primary text-lg">{renderDate(record.dob)}</div>
            </div>
            <div>
              <div className="expand-detail-label text-[10px] text-secondary font-bold mb-1">Approval</div>
              <span className={`status-badge ${record.admission?.isApproved ? 'approved' : 'pending'}`}>
                {record.admission?.isApproved ? "Approved" : "Pending"}
              </span>
            </div>
            <div>
              <div className="expand-detail-label text-[10px] text-secondary font-bold mb-1">System Status</div>
              <span className={`status-badge ${(record.users?.isActive ?? 1) ? 'active' : 'inactive'}`}>
                {(record.users?.isActive ?? 1) ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <div className="expand-detail-label text-[10px] text-secondary font-bold mb-1">Joined Date</div>
              <div className="expand-detail-value font-headline text-primary text-lg">{renderDate(record.admission?.admissionDate)}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div>
            {detailGroup("Student Details", [
              ["Religion", record.religion],
              ["Community", record.community],
              ["Caste", record.caste],
              ["Mother Tongue", record.motherTongue],
              ["Aadhar No", record.aadharNo],
              ["Blood Group", record.bloodGroup],
              ["Identification 1", record.identification1],
              ["Identification 2", record.identification2],
              ["Previous School", record.previousSchool],
              ["Transport Mode", record.transportMode],
              ["RTE Student", renderBool(record.rte)],
            ])}
            {detailGroup("Address Information", [
              ["Line 1", record.address?.line1],
              ["Line 2", record.address?.line2],
              ["Line 3", record.address?.line3],
              ["PIN Code", record.address?.pin],
            ])}
          </div>
          <div>
            {detailGroup("Family Details", [
              ["Father Name", record.family?.fatherName],
              ["Father Phone", record.family?.fatherPhone],
              ["Father WhatsApp", record.family?.fatherWhatsapp],
              ["Father Aadhar", record.family?.fatherAadhar],
              ["Father Occupation", record.family?.fatherOccupation],
              ["Mother Name", record.family?.motherName],
              ["Mother Phone", record.family?.motherPhone],
              ["Mother WhatsApp", record.family?.motherWhatsapp],
              ["Mother Aadhar", record.family?.motherAadhar],
              ["Mother Occupation", record.family?.motherOccupation],
              ["Family Income", record.family?.familyIncome],
              ["Siblings", record.family?.siblings],
              ["Hostel Required", renderBool(record.family?.hostelRequired)],
            ])}
            {detailGroup("Admission Administration", [
              ["Admission Date", renderDate(record.admission?.admissionDate)],
              ["Admission From", renderDate(record.admission?.admissionFrom)],
              ["Admission To", renderDate(record.admission?.admissionTo)],
              ["Staff Signature", record.admission?.staffSignature],
              ["Principal Signature", record.admission?.principalSignature],
              ["Approved By Role", record.admission?.approvedByRole],
              ["Approved At", record.admission?.approvedAt ? dayjs(record.admission.approvedAt).format("YYYY-MM-DD HH:mm") : "-"],
            ])}
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: "Admission No", dataIndex: ["admission", "admissionNo"], sorter: true, fixed: "left", width: 140, onHeaderCell: () => ({ onClick: () => handleSort("admission.admissionNo") }),
      render: (text) => <span style={{ fontWeight: 700, color: '#00152a', fontFamily: "'Manrope', sans-serif", fontSize: 13 }}>{text}</span>,
    },
    {
      title: "Student Name", dataIndex: "name", sorter: true, fixed: "left", width: 180, onHeaderCell: () => ({ onClick: () => handleSort("name") }),
      render: (text) => <span style={{ fontWeight: 600, color: '#171c1f' }}>{text}</span>
    },
    {
      title: "Standard",
      dataIndex: "standard",
      width: 140,
      render: (_, record) => formatStandardLabel(record.standard || record.admission?.standard),
    },
    { title: "Gender", dataIndex: "gender", width: 100 },
    { title: "Section", dataIndex: "section", width: 100 },
    { title: "Academic Year", dataIndex: "academicYear", width: 130 },
    {
      title: "Father Name",
      width: 150,
      render: (_, record) => record.family?.fatherName || "-",
    },
    {
      title: "Sibling",
      width: 100,
      render: (_, record) => record.siblingGroupId ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: "Actions",
      fixed: "right",
      width: 320,
      render: (_, record) => (
        <Space size={4}>
          {mode !== "approval" && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ borderRadius: 8, border: 'none', background: '#f0f4f8', fontWeight: 600, fontSize: 12 }}>
              Edit
            </Button>
          )}
          {mode !== "approval" && (
            <Popconfirm title="Delete this admission?" onConfirm={() => handleDelete(record?.users?.id)}>
              <Button size="small" icon={<DeleteOutlined />} danger style={{ borderRadius: 8, border: 'none', fontSize: 12 }}>
                Delete
              </Button>
            </Popconfirm>
          )}
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPDF(record)} style={{ borderRadius: 8, border: 'none', background: '#f0f4f8', fontSize: 12 }}>
            PDF
          </Button>
          {canApprove && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={approvalLoading[record.id]}
                disabled={Boolean(record.admission?.isApproved)}
                onClick={() => handleSetApproval(record, true, undefined)}
                style={{ borderRadius: 8, fontSize: 12 }}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                loading={approvalLoading[record.id]}
                disabled={!Boolean(record.admission?.isApproved)}
                onClick={() => openMarkPendingModal(record)}
                style={{ borderRadius: 8, fontSize: 12, border: 'none' }}
              >
                Pending
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', padding: 16, flexDirection: 'column', gap: 16 }}>
      {/* Editorial page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>Admissions</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: '#00152a', fontWeight: 700 }}>{mode === "approval" ? "Approvals" : "All Students"}</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            {mode === "approval" ? "Pending Approvals" : "Admission Records"}
          </h2>
          <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            {filteredData.length} records found
          </p>
        </div>
        <Space>
          {canApprove && selectedRowKeys.length > 0 && (
            <>
              <button className="gradient-btn" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => handleBulkApproval(true)} disabled={bulkApprovalLoading}>
                Approve ({selectedRowKeys.length})
              </button>
              <button className="ghost-btn" style={{ padding: '8px 20px', fontSize: 13, cursor: 'pointer', border: '1px solid #c3c6ce', borderRadius: 9999, background: 'transparent', fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#ba1a1a' }} onClick={() => handleBulkApproval(false)} disabled={bulkApprovalLoading}>
                Mark Pending ({selectedRowKeys.length})
              </button>
            </>
          )}
          <button onClick={exportCSV} className="ghost-btn" style={{ display: 'flex',  gap: 6, padding: '8px 16px', borderRadius: 9999, border: '1px solid #c3c6ce', background: 'transparent', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, color: '#00152a' }}>
            <DownloadOutlined /> CSV
          </button>
        </Space>
      </div>
      <div className="admission-filter-bar">
        <Input
          placeholder="Search admissions..."
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 220, borderRadius: 9999, background: '#f0f4f8', border: 'none' }}
          prefix={<SearchOutlined style={{ color: '#43474d' }} />}
        />
        <Select
          allowClear
          placeholder="Standard"
          style={{ width: 140, borderRadius: 9999 }}
          value={filterStandard}
          onChange={handleStandard}
          options={getUnique(data, ["admission", "standard"]).map((v) => ({
            label: formatStandardLabel(v),
            value: v,
          }))}
        />
        <Select
          allowClear
          placeholder="Gender"
          style={{ width: 120 }}
          value={filterGender}
          onChange={handleGender}
          options={getUnique(data, "gender").map((v) => ({ label: v, value: v }))}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 120 }}
          value={filterStatus}
          onChange={handleStatus}
          options={[
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ]}
        />
        <Select
          allowClear
          placeholder="Acd Year"
          style={{ width: 120 }}
          value={filterAcademicYear}
          onChange={handleAcademicYear}
          options={availableYears.map((v) => ({ label: v, value: v }))}
        />
        <Select
          allowClear
          placeholder="Approval"
          style={{ width: 130 }}
          value={filterApproval}
          onChange={handleApprovalFilter}
          options={[
            { label: "Approved", value: "approved" },
            { label: "Pending", value: "pending" },
          ]}
        />
        <Select
          allowClear
          placeholder="Section"
          style={{ width: 110 }}
          value={filterSection}
          onChange={handleSection}
          options={getUnique(data, "section").map((v) => ({ label: v, value: v }))}
        />
        <Input
          allowClear
          placeholder="Father Name"
          value={filterFatherName}
          onChange={(e) => handleFatherName(e.target.value)}
          style={{ width: 160, borderRadius: 9999, background: '#f0f4f8', border: 'none' }}
        />
        <Input
          allowClear
          placeholder="Area Search (City/Street/Pin)"
          value={filterArea}
          onChange={(e) => handleArea(e.target.value)}
          style={{ width: 180, borderRadius: 9999, background: '#f0f4f8', border: 'none' }}
          prefix={<SearchOutlined style={{ color: '#43474d' }} />}
        />
        <Select
          allowClear
          placeholder="Sibling"
          style={{ width: 130 }}
          value={filterSibling}
          onChange={handleSibling}
          options={[
            { label: "Has Sibling", value: "has" },
            { label: "No Sibling", value: "none" },
          ]}
        />
        <DatePicker.RangePicker
          style={{ width: 240 }}
          value={filterDate}
          onChange={handleDate}
          placeholder={["From", "To"]}
        />
       
        {mode === "approval" && (
          <button onClick={fetchAdmissions} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9999, border: '1px solid #c3c6ce', background: 'transparent', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, color: '#00152a' }}>
            <ReloadOutlined /> Refresh
          </button>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        expandable={{
          expandedRowRender,
          columnWidth: 48,
        }}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 10 }}
        className="custom-ant-table-header"
      />

      {/* ── HIDDEN PDF TEMPLATE FOR VIEW LIST ── */}
      {printingRecord && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div id="viewPdfContent" style={pdfStyles.pdfWrapper}>
            <div style={pdfStyles.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
                <img src={logo} alt="logo" style={{ width: "80px", filter: "brightness(0) invert(1)" }} />
                <div style={{ textAlign: 'left' }}>
                  <h1 style={pdfStyles.institutionName}>Matric Hr Sec School</h1>
                  <p style={pdfStyles.tagline}>Excellence in Education - Vadugappatti, Salem</p>
                </div>
              </div>
            </div>

            <div style={pdfStyles.content}>
               <div style={pdfStyles.row}>
                  <div style={pdfStyles.field}>
                    <span style={pdfStyles.label}>Student's Name :</span>
                    <span style={pdfStyles.value}>{printingRecord.name}</span>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={pdfStyles.field}>
                    <span style={pdfStyles.label}>Father's Name :</span>
                    <span style={pdfStyles.value}>{printingRecord.family?.fatherName}</span>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={pdfStyles.field}>
                    <span style={pdfStyles.label}>Mother's Name :</span>
                    <span style={pdfStyles.value}>{printingRecord.family?.motherName}</span>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={{...pdfStyles.field, flex: 0.6}}>
                    <span style={pdfStyles.label}>Birth Date :</span>
                    <span style={pdfStyles.value}>{printingRecord.dob ? dayjs(printingRecord.dob).format("DD / MM / YYYY") : ".... / .... / ...."}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.4}}>
                    <span style={pdfStyles.label}>Gender :</span>
                    <span style={pdfStyles.value}>{printingRecord.gender}</span>
                  </div>
               </div>

               <div style={pdfStyles.addressSection}>
                  <span style={pdfStyles.addressLabel}>Residential Address</span>
                  <div style={pdfStyles.row}>
                    <div style={pdfStyles.field}>
                      <span style={pdfStyles.label}>Address Line 1 :</span>
                      <span style={pdfStyles.value}>{printingRecord.address?.line1 || printingRecord.address?.street}</span>
                    </div>
                  </div>
                  <div style={pdfStyles.row}>
                    <div style={{...pdfStyles.field, flex: 0.6}}>
                      <span style={pdfStyles.label}>City :</span>
                      <span style={pdfStyles.value}>{printingRecord.address?.city}</span>
                    </div>
                    <div style={{...pdfStyles.field, flex: 0.4}}>
                      <span style={pdfStyles.label}>Pincode :</span>
                      <span style={pdfStyles.value}>{printingRecord.address?.pin}</span>
                    </div>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Religion :</span>
                    <span style={pdfStyles.value}>{printingRecord.religion}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Nationality :</span>
                    <span style={pdfStyles.value}>Indian</span>
                  </div>
               </div>

               <div style={pdfStyles.academicSection}>
                  <div style={pdfStyles.academicTitle}>III. Academic Performance</div>
                  <div style={{...pdfStyles.row, marginBottom: '10px'}}>
                    <div style={{...pdfStyles.field, flex: 0.4}}>
                      <span style={pdfStyles.label}>Exam :</span>
                      <span style={pdfStyles.value}>{printingRecord.academics?.[0]?.examName}</span>
                    </div>
                    <div style={{...pdfStyles.field, flex: 0.3}}>
                      <span style={pdfStyles.label}>Reg No :</span>
                      <span style={pdfStyles.value}>{printingRecord.academics?.[0]?.registerNo}</span>
                    </div>
                    <div style={{...pdfStyles.field, flex: 0.3}}>
                      <span style={pdfStyles.label}>Year :</span>
                      <span style={pdfStyles.value}>{printingRecord.academics?.[0]?.monthYear}</span>
                    </div>
                  </div>
                  <table style={pdfStyles.academicTable}>
                    <thead>
                      <tr>
                        <th style={pdfStyles.academicTh}>SUBJECT</th>
                        <th style={pdfStyles.academicTh}>MAX MARKS</th>
                        <th style={pdfStyles.academicTh}>MARKS OBTAINED</th>
                        <th style={pdfStyles.academicTh}>PERCENTAGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(printingRecord.academics?.[0]?.subjects || []).map((exam, idx) => (
                        <tr key={idx}>
                          <td style={{...pdfStyles.academicTd, textAlign: 'left'}}>{exam.subjectName}</td>
                          <td style={pdfStyles.academicTd}>{exam.maxMarks}</td>
                          <td style={pdfStyles.academicTd}>{exam.obtainedMarks}</td>
                          <td style={pdfStyles.academicTd}>
                            {exam.maxMarks > 0 ? ((exam.obtainedMarks / exam.maxMarks) * 100).toFixed(1) + '%' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>

               <div style={pdfStyles.row}>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Phone Number :</span>
                    <span style={pdfStyles.value}>{printingRecord.family?.fatherPhone || printingRecord.family?.motherPhone}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Email Address :</span>
                    <span style={pdfStyles.value}>{printingRecord.family?.parentsEmail}</span>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Aadhar Number :</span>
                    <span style={pdfStyles.value}>{printingRecord.aadharNo}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Blood Group :</span>
                    <span style={pdfStyles.value}>{printingRecord.bloodGroup}</span>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={{...pdfStyles.field, flex: 0.4}}>
                    <span style={pdfStyles.label}>Admission For :</span>
                    <span style={pdfStyles.value}>{formatStandardLabel(printingRecord.admission?.standard || printingRecord.standard)}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.25}}>
                    <span style={pdfStyles.label}>Section :</span>
                    <span style={pdfStyles.value}>{printingRecord.section || printingRecord.admission?.section}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.35}}>
                    <span style={pdfStyles.label}>Academic Year :</span>
                    <span style={pdfStyles.value}>{printingRecord.admission?.academicYear}</span>
                  </div>
               </div>

               <div style={pdfStyles.row}>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>Transport :</span>
                    <span style={pdfStyles.value}>{printingRecord.transportMode || (printingRecord.admission?.vanNeeded ? "School Van" : "Local")}</span>
                  </div>
                  <div style={{...pdfStyles.field, flex: 0.5}}>
                    <span style={pdfStyles.label}>RTE Student :</span>
                    <span style={pdfStyles.value}>{printingRecord.rte ? "Yes" : (printingRecord.rteApplied ? "Yes" : "No")}</span>
                  </div>
               </div>

               <div style={pdfStyles.declaration}>
                  <h4 style={pdfStyles.declTitle}>Declaration</h4>
                  <p style={pdfStyles.declText}>
                    I hereby, declaring that I will obey all the rules and regulations of the institution and be fully responsible for violating the rules.
                  </p>
                  
                  <div style={pdfStyles.signatureRow}>
                    <div style={pdfStyles.sigLine}>Student's Signature</div>
                    <div style={pdfStyles.sigLine}>Authorized's Signature</div>
                  </div>
               </div>
            </div>
            {/* <div style={pdfStyles.footer}></div> */}
          </div>
        </div>
      )}

      <Modal
        title="Reason (Optional)"
        open={approvalModalOpen}
        onCancel={() => {
          setApprovalModalOpen(false);
          setApprovalModalRecord(null);
          setApprovalReason("");
        }}
        onOk={handleConfirmMarkPending}
        okText="Save"
      >
        <Input.TextArea
          rows={4}
          placeholder="Why is this admission being marked pending?"
          value={approvalReason}
          onChange={(e) => setApprovalReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default AdmissionView;
