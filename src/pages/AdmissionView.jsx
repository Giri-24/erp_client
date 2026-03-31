import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, message, Popconfirm, DatePicker, Tag, Select, Modal } from "antd";
import "./AdmissionView.css";
import { SearchOutlined, EditOutlined, DownloadOutlined, DeleteOutlined, PrinterOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// Print PDF for a single admission
const handlePrintPDF = (record) => {
  const doc = new jsPDF();
  // Add logo if available
  const logoImg = new Image();
  logoImg.src = "/images/logo.png";
  logoImg.onload = () => {
    doc.addImage(logoImg, "PNG", 80, 10, 50, 25);
    addContent();
  };
  logoImg.onerror = () => {
    addContent();
  };
  function addContent() {
    let y = 40;
    doc.setFontSize(18);
    doc.text("Admission Form", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(12);
    // Student Info Table
    const fields = [
      ["Admission No", record.admission?.admissionNo || ""],
      ["Student Name", record.name || ""],
      ["Standard", formatStandardLabel(record.standard || record.admission?.standard)],
      ["Gender", record.gender || ""],
      ["DOB", record.dob ? dayjs(record.dob).format("YYYY-MM-DD") : ""],
      ["Religion", record.religion || ""],
      ["Community", record.community || ""],
      ["Caste", record.caste || ""],
      ["Mother Tongue", record.motherTongue || ""],
      ["Aadhar No", record.aadharNo || ""],
      ["Blood Group", record.bloodGroup || ""],
      ["Identification 1", record.identification1 || ""],
      ["Identification 2", record.identification2 || ""],
      ["Previous School", record.previousSchool || ""],
      ["Transport Mode", record.transportMode || ""],
      ["RTE", record.rte ? "Yes" : "No"],
      ["App Approved", record.admission?.isApproved ? "Yes" : "No"],
      ["Admission Date", record.admission?.admissionDate ? dayjs(record.admission.admissionDate).format("YYYY-MM-DD") : ""],
      ["Admission From", record.admission?.admissionFrom ? dayjs(record.admission.admissionFrom).format("YYYY-MM-DD") : ""],
      ["Admission To", record.admission?.admissionTo ? dayjs(record.admission.admissionTo).format("YYYY-MM-DD") : ""],
      ["Admission Status", (record.users?.isActive ?? 1) ? "Active" : "Inactive"],
    ];
    autoTable(doc, {
      startY: y + 5,
      head: [["Field", "Value"]],
      body: fields,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 10 },
    });
    doc.save(`admission_${record.admission?.admissionNo || record.id}.pdf`);
  }
};
import instance from "../utils/axios";
import dayjs from "dayjs";
import { getPendingAdmissions, setAdmissionApproval, bulkApproval } from "../modules/admission/admission.service";
import { getAcademicYears, getAcademicYear as fetchCurrentYear } from "../modules/fees/fees.service";
import { hasPermission, PERMISSIONS } from "../utils/permissions";

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
  const canApprove = hasPermission(PERMISSIONS.ADMISSION_APPROVE);

  // Filter states
  const [filterStandard, setFilterStandard] = useState(undefined);
  const [filterGender, setFilterGender] = useState(undefined);
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [filterApproval, setFilterApproval] = useState(undefined);
  const [filterDate, setFilterDate] = useState([]);
  const [filterAcademicYear, setFilterAcademicYear] = useState(undefined);
  const [availableYears, setAvailableYears] = useState([]);

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const rows = mode === "approval"
        ? await getPendingAdmissions()
        : (await instance.get("/admissions")).data;
      setData(rows);
      // Apply filters to initial data
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, rows);
    } catch {
      message.error("Failed to load admissions");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [years, currentYearObj] = await Promise.all([
        getAcademicYears(),
        fetchCurrentYear()
      ]);
      setAvailableYears(years || []);
      const initialYear = currentYearObj?.year || currentYearObj;
      if (initialYear && !filterAcademicYear) {
        setFilterAcademicYear(initialYear);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadInitialData();
    fetchAdmissions();
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
  const applyFilters = (searchVal, std, gender, status, approval, dateRange, academicYear, sourceData = data) => {
    let filtered = sourceData.filter((item) => {
      // Search
      let matchesSearch = true;
      if (searchVal) {
        matchesSearch = Object.values(item).some((v) =>
          String(v).toLowerCase().includes(searchVal.toLowerCase())
        );
      }
      // Standard
      let matchesStd = true;
      if (std) {
        const itemStandard = item.admission?.standard || item.standard;
        matchesStd = normalizeStandardValue(itemStandard) === normalizeStandardValue(std);
      }
      // Gender
      let matchesGender = true;
      if (gender) {
        matchesGender = item.gender === gender;
      }
      // Status
      let matchesStatus = true;
      if (status !== undefined) {
        const isActive = item.users?.isActive ?? 1;
        matchesStatus = (status === 'active' && isActive) || (status === 'inactive' && !isActive);
      }
      // Approval
      let matchesApproval = true;
      if (approval !== undefined) {
        const isApproved = Boolean(item.admission?.isApproved);
        matchesApproval = (approval === 'approved' && isApproved) || (approval === 'pending' && !isApproved);
      }
      // Academic Year
      let matchesAcademicYear = true;
      if (academicYear) {
        matchesAcademicYear = item.admission?.academicYear === academicYear;
      }
      // Admission Date
      let matchesDate = true;
      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const admDate = item.admission?.admissionDate;
        if (admDate) {
          const d = dayjs(admDate);
          matchesDate = d.isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) && d.isBefore(dateRange[1].endOf('day').add(1, 'ms'));
        }
      }
      return matchesSearch && matchesStd && matchesGender && matchesStatus && matchesApproval && matchesDate && matchesAcademicYear;
    });
    setFilteredData(filtered);
  };

  // Handlers
  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear);
  };
  const handleStandard = (value) => {
    setFilterStandard(value);
    applyFilters(searchText, value, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear);
  };
  const handleGender = (value) => {
    setFilterGender(value);
    applyFilters(searchText, filterStandard, value, filterStatus, filterApproval, filterDate, filterAcademicYear);
  };
  const handleStatus = (value) => {
    setFilterStatus(value);
    applyFilters(searchText, filterStandard, filterGender, value, filterApproval, filterDate, filterAcademicYear);
  };
  const handleApprovalFilter = (value) => {
    setFilterApproval(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, value, filterDate, filterAcademicYear);
  };
  const handleDate = (dates) => {
    setFilterDate(dates);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, dates, filterAcademicYear);
  };
  const handleAcademicYear = (value) => {
    setFilterAcademicYear(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, value);
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
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate);
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
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate);
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
    <div>
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
        <DatePicker.RangePicker
          style={{ width: 240 }}
          value={filterDate}
          onChange={handleDate}
          placeholder={["From", "To"]}
        />
        <button onClick={exportCSV} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9999, border: '1px solid #c3c6ce', background: 'transparent', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, color: '#00152a' }}>
          <DownloadOutlined /> CSV
        </button>
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
