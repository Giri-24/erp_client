import React, { useEffect, useState, useMemo } from "react";
import { Modal, Select, message, Button, Popconfirm, Input } from "antd";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import instance from "../utils/axios";
import dayjs from "dayjs";
import { linkSiblings, demoteIndividualStudents } from "../modules/admission/admission.service";
import { getAdminSettings } from "../modules/settings/settings.service";
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';

import { useNavigate } from "react-router-dom";

// ── helpers ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all group-hover:scale-110`} style={{ background: `${color}15`, color: color }}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      {trend && (
        <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trend > 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
    <div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-2xl font-black tracking-tighter text-slate-900">{value}</div>
    </div>
  </div>
);



const formatLabel = (text) => {
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

const avatarColor = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const initials = (name = "") => {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const REQUIRED_DOCUMENT_CONFIG = [
  { key: "birthCert", label: "Birth Certificate" },
  { key: "communityCert", label: "Community Certificate" },
  { key: "aadharStudent", label: "Student Aadhaar" },
];

const hasDocumentUploaded = (documentRow, key) => {
  if (!documentRow) return false;
  return Boolean(documentRow[key] || documentRow[`${key}Path`]);
};

const getMissingRequiredDocuments = (student) => {
  const documentRow = student?.documents?.[0];
  return REQUIRED_DOCUMENT_CONFIG.filter(({ key }) => !hasDocumentUploaded(documentRow, key));
};

// ── component ─────────────────────────────────────────────────────────────
const StudentView = ({ onCollectFee, onEdit }) => {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [fatherFilter, setFatherFilter] = useState("");
  const [siblingFilter, setSiblingFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [adminSettings, setAdminSettings] = useState({});

  // row expander
  const [expandedId, setExpandedId] = useState(null);

  // sibling link modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetSiblingIds, setTargetSiblingIds] = useState([]);
  const [linking, setLinking] = useState(false);

  // PDF export for a student row (custom layout)
  const handlePrintPDF = async () => {
    try {
      const input = document.getElementById("pdfContent");
      if (!input) return;

      const canvas = await html2canvas(input, { scale: 3 });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      pdf.save(`Admission_${detailStudent?.admission?.admissionNo}.pdf`);
    } catch (err) {
      console.error(err);
      message.error("PDF generation failed");
    }
  };

  // Archive handler (soft delete)
  const handleArchive = async (studentId) => {
    try {
      await instance.delete(`/admissions/${studentId}`);
      message.success("Student archived");
      fetchStudents();
    } catch {
      message.error("Failed to archive student");
    }
  };
  const fetchStudents = () => {
    instance.get("/admissions").then((res) => {
      const approved = (res.data || []).filter((s) => s.admission?.isApproved);
      const newestFirst = [...approved].sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.admission?.admissionDate || 0).getTime();
        const bDate = new Date(b?.createdAt || b?.admission?.admissionDate || 0).getTime();
        return bDate - aDate;
      });
      setStudents(newestFirst);
      setPage(1);
    });
  };

  const fetchAdminSettings = async () => {
    try {
      const data = await getAdminSettings();
      setAdminSettings(data || {});
    } catch (err) {
      console.error("Failed to fetch admin settings", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAdminSettings();
  }, []);

  // ── filter / search ───────────────────────────────────────────────────────
  const classOptions = useMemo(() =>
    Array.from(new Set(students.map((s) => s.standard || s.admission?.standard).filter(Boolean))).sort(),
    [students]
  );

  const sectionOptions = useMemo(() =>
    Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort(),
    [students]
  );

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter && (s.standard || s.admission?.standard) !== classFilter) return false;
      if (sectionFilter && (s.section || "") !== sectionFilter) return false;
      if (genderFilter && (s.gender || "").toLowerCase() !== genderFilter) return false;
      if (areaFilter) {
        const areaStr = areaFilter.toLowerCase();
        const addr = s.address || {};
        const isMatch =
          (addr.street || "").toLowerCase().includes(areaStr) ||
          (addr.village || "").toLowerCase().includes(areaStr);
        if (!isMatch) return false;
      }
      if (fatherFilter && !(s.family?.fatherName || "").toLowerCase().includes(fatherFilter.toLowerCase())) return false;
      if (siblingFilter) {
        if (siblingFilter === "has" && !s.siblingGroupId) return false;
        if (siblingFilter === "none" && s.siblingGroupId) return false;
      }
      if (q) {
        const blob = [
          s.name, s.standard, s.gender, s.admission?.admissionNo,
          s.family?.fatherName, s.family?.motherName,
        ].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [students, classFilter, sectionFilter, genderFilter, areaFilter, searchText]);

  // ── summary stats ─────────────────────────────────────────────────────────
  const totalEnrollment = students.length;
  const activeStudents = students.filter((s) => s.users?.isActive !== false).length;

  // ── pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── sibling link ──────────────────────────────────────────────────────────
  const openLinkModal = (student) => {
    setSelectedStudent(student);
    setTargetSiblingIds([]);
    setIsModalOpen(true);
  };

  const handleLink = async () => {
    if (!targetSiblingIds.length) { message.error("Please select at least one sibling to link"); return; }
    setLinking(true);
    try {
      await linkSiblings({ studentIds: [selectedStudent.id, ...targetSiblingIds] });
      message.success("Siblings linked successfully!");
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Linking failed");
    }
    setLinking(false);
  };

  const handleDemote = (student) => {
    Modal.confirm({
      title: 'Confirm Demotion',
      content: `Are you sure you want to demote ${student.name}? This will reduce their standard by one level.`,
      okText: 'Yes, Demote',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await demoteIndividualStudents({ studentIds: [student.id] });
          message.success(`${student.name} demoted successfully`);
          fetchStudents();
        } catch (err) {
          message.error(err?.response?.data?.message || 'Demotion failed');
        }
      },
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="student-view-modern p-8 min-h-screen bg-[#fdfdfd]">
        <style>{`
        .student-view-modern { font-family: 'Public Sans', sans-serif; }
        .premium-table thead th { background: #f8fafc !important; color: #64748b !important; font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; border-bottom: 1px solid #f1f5f9 !important; padding: 16px 20px !important; }
        .premium-table tbody td { padding: 16px 20px !important; border-bottom: 1px solid #f8fafc !important; }
        .filter-input { border-radius: 14px !important; border: 1px solid #f1f5f9 !important; background: #ffffff !important; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .filter-input:hover, .filter-input:focus { border-color: #00152a !important; box-shadow: 0 4px 12px rgba(0,21,42,0.05); }
        .status-tag { border-radius: 9999px; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 12px; }
        .student-view-modern .material-symbols-outlined { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
        .student-view-modern .material-symbols-outlined.text-sm,
        .student-view-modern .material-symbols-outlined.text-base,
        .student-view-modern .material-symbols-outlined.text-[18px],
        .student-view-modern .material-symbols-outlined.text-[14px] {
          line-height: 1;
          height: 1em;
          min-width: 1em;
        }
      `}</style>

        {/* Header Section */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Archive List</span>
              <span className="text-slate-200">/</span>
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Active Directory</span>
            </div>
            <h1 className="text-5xl font-black leading-tight tracking-tighter text-slate-900">
              Student <span className="text-teal-600">Management</span>
            </h1>
          </div>
          <button
            onClick={() => message.info("Export protocol initiated")}
            className="px-6 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all flex items-center gap-2"
          >
            <span className="text-sm leading-none material-symbols-outlined">file_download</span>
            Export Archive
          </button>
        </div>

        {/* Summary Stats Bento Grid */}
        <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Students" value={totalEnrollment} icon="groups" color="#0f172a" trend={8} />
          <StatCard title="Active Profile" value={activeStudents} icon="verified" color="#10b981" />
          <StatCard title="Filtered Scope" value={filtered.length} icon="filter_alt" color="#6366f1" />
          <StatCard title="Siblings Group" value={students.filter(s => s.siblingGroupId).length} icon="family_restroom" color="#f59e0b" />
        </div>

        {/* Filter Control Bar */}
        <div className="p-6 mb-8 bg-white border shadow-sm rounded-3xl border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-grow min-w-[300px] h-11">
              <span className="absolute text-base leading-none -translate-y-1/2 material-symbols-outlined left-3 top-1/2 text-slate-400">
                search
              </span>

              <Input
                placeholder="Search Student (Name, ID, Guardian)..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select
                value={classFilter || undefined}
                placeholder="All Standard"
                allowClear
                onChange={(val) => { setClassFilter(val || ''); setPage(1); }}
                style={{ minWidth: 140 }}
                options={[
                  ...classOptions.map((c) => ({ value: c, label: c })),
                ]}
              />

              <Select
                value={sectionFilter || undefined}
                placeholder="Sections"
                allowClear
                onChange={(val) => { setSectionFilter(val || ''); setPage(1); }}
                style={{ minWidth: 120 }}
                options={sectionOptions.map((c) => ({ value: c, label: c }))}
              />

              <Select
                value={genderFilter || undefined}
                placeholder="Gender"
                allowClear
                onChange={(val) => { setGenderFilter(val || ''); setPage(1); }}
                style={{ minWidth: 120 }}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 mt-4 border-t border-slate-50">
            <div className="w-64">
              <Input
                value={areaFilter}
                onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}
                placeholder="Street / Village"
                prefix={<EnvironmentOutlined className="text-slate-400" />}
                allowClear
                size="large"
                className="filter-input text-[11px] font-bold"
              />
            </div>

            {(classFilter || sectionFilter || genderFilter || areaFilter || fatherFilter || siblingFilter || searchText) && (
              <button
                onClick={() => { setClassFilter(""); setSectionFilter(""); setGenderFilter(""); setAreaFilter(""); setFatherFilter(""); setSiblingFilter(""); setSearchText(""); setPage(1); }}
                className="px-4 py-2 flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all"
              >
                <span className="text-sm leading-none material-symbols-outlined">close</span>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr>
                  <th className="w-12" />
                  <th>Student Details</th>
                  <th>Academic STD</th>
                  <th>Father's Name</th>
                  <th>Area</th>
                  <th className="text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <span className="block mb-4 text-5xl material-symbols-outlined text-slate-200">person_search</span>
                      <p className="text-sm font-bold text-slate-400">No records matching the current criteria.</p>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((s) => {
                    const isExpanded = expandedId === s.id;
                    const name = s.name || "Unknown";
                    const initialsStr = initials(name);
                    let photoPath = s.documents?.[0]?.photoPath;
                    const areaValue = s.address?.street || s.address?.village || "";
                    const missingRequiredDocs = getMissingRequiredDocuments(s);
                    const hasMissingRequiredDocs = missingRequiredDocs.length > 0;
                    const missingRequiredDocsTitle = hasMissingRequiredDocs
                      ? `Missing: ${missingRequiredDocs.map((doc) => doc.label).join(", ")}`
                      : "All required documents uploaded";

                    return (
                      <React.Fragment key={s.id}>
                        <tr id={`student-row-${s.id}`} className="transition-all group hover:bg-slate-50/50">
                          <td className="text-center">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : s.id)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-slate-900 text-white rotate-180' : 'text-slate-300 hover:text-slate-900 hover:bg-slate-100'}`}
                            >
                              <span className="text-sm leading-none material-symbols-outlined">expand_more</span>
                            </button>
                          </td>
                          <td>
                            <div className="flex items-center gap-4">
                              <div className="relative w-10 h-10">
                                {hasMissingRequiredDocs && (
                                  <span
                                    className="absolute z-10 w-3 h-3 rounded-full -top-1 -right-1 bg-rose-500 ring-2 ring-white"
                                    title={missingRequiredDocsTitle}
                                  />
                                )}
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px] border-2 border-white shadow-sm overflow-hidden">
                                  {photoPath ? (
                                    <img src={`/erp/api/${photoPath.replace(/\\/g, '/')}`} className="object-cover w-full h-full" alt="" />
                                  ) : initialsStr}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-[13px] font-black text-slate-900 tracking-tight leading-none">{name}</div>
                                  {hasMissingRequiredDocs && (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest"
                                      title={missingRequiredDocsTitle}
                                    >
                                      Docs Missing
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.admission?.admissionNo || s.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-900">{s.standard || s.admission?.standard}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.academicYear} | {s.section || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-900">{s.family?.fatherName || "Private"}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.gender} | Indian</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-tag ${areaValue ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                              {areaValue || "—"}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onCollectFee && onCollectFee(s.id)}
                                className="flex items-center justify-center text-teal-600 transition-all shadow-sm w-9 h-9 rounded-xl bg-teal-50 hover:bg-teal-600 hover:text-white"
                                title="Fee Ledger"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">payments</span>
                              </button>
                              <button
                                onClick={() => openLinkModal(s)}
                                className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
                                title="Siblings Link"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">add_link</span>
                              </button>
                              <button
                                onClick={() => { setDetailStudent(s); setDetailModalOpen(true); }}
                                className="relative flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
                                title={hasMissingRequiredDocs ? `Full Bio. ${missingRequiredDocsTitle}` : "Full Bio"}
                              >
                                {hasMissingRequiredDocs && (
                                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                                )}
                                <span className="material-symbols-outlined text-[18px] leading-none">badge</span>
                              </button>
                              <button
                                onClick={() => onEdit && onEdit(s)}
                                className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">edit_note</span>
                              </button>
                              {/* demote button  */}
                              {adminSettings?.enableIndividualDemotion && <button onClick={() => handleDemote(s)} className="flex items-center justify-center text-yellow-600 transition-all shadow-sm w-9 h-9 rounded-xl bg-yellow-50 hover:bg-yellow-600 hover:text-black" title="Demote"><span className="material-symbols-outlined text-[18px] leading-none">arrow_downward</span></button>}
                              {/* Archive button */}
                              <Popconfirm title="Archive student record?" onConfirm={() => handleArchive(s.id)}>
                                <button
                                  className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                  title="Archive"
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">archive</span>
                                </button>
                              </Popconfirm>
                              {/* Issue PDF button */}
                              <button
                                onClick={() => {
                                  setDetailStudent(s);
                                  setTimeout(() => handlePrintPDF(), 300);
                                }} className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-900 hover:bg-slate-900 hover:text-white"
                                title="Issue PDF"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">picture_as_pdf</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={6} className="px-12 py-6">
                              <div className="grid grid-cols-1 gap-8 p-8 bg-white border shadow-sm rounded-3xl border-slate-100 lg:grid-cols-12">
                                {/* Student Profile Overview */}
                                <div className="flex flex-col items-center text-center lg:col-span-3">
                                  <div className="relative mb-6">
                                    {photoPath ? (
                                      <img
                                        src={`/erp/api/${photoPath.replace(/\\/g, '/')}`}
                                        className="w-40 h-40 rounded-[40px] object-cover border-4 border-white shadow-2xl"
                                        alt={s.name}
                                      />
                                    ) : (
                                      <div className="w-40 h-40 rounded-[40px] bg-slate-200 text-slate-400 flex items-center justify-center text-5xl font-black border-4 border-white shadow-xl">
                                        {s.name?.charAt(0)}
                                      </div>
                                    )}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                      Roll #{s.admission?.admissionNo || s.id}
                                    </div>
                                  </div>
                                  <h2 className="mb-1 text-2xl font-black tracking-tighter text-slate-900">{s.name}</h2>
                                  <div className="flex items-center justify-center gap-2 mb-6">
                                    <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest rounded-full">{s.gender}</span>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">{s.bloodGroup}</span>
                                  </div>
                                  <div className="w-full space-y-2">
                                    <div className="flex items-center justify-between p-3 text-xs bg-white border shadow-sm rounded-2xl border-slate-100">
                                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Admission Date</span>
                                      <span className="font-black text-slate-900">{s.admission?.admissionDate ? dayjs(s.admission?.admissionDate).format('YYYY-MM-DD') : '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 text-xs bg-white border shadow-sm rounded-2xl border-slate-100">
                                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Current Grade</span>
                                      <span className="font-black text-slate-900">{s.standard || s.admission?.standard}</span>
                                    </div>
                                    <div className={`flex justify-between items-center p-3 rounded-2xl border text-xs shadow-sm ${hasMissingRequiredDocs ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                                      <span className={`font-bold uppercase tracking-widest text-[9px] ${hasMissingRequiredDocs ? 'text-rose-500' : 'text-slate-400'}`}>Required Docs</span>
                                      <span className={`font-black ${hasMissingRequiredDocs ? 'text-rose-600' : 'text-teal-600'}`} title={missingRequiredDocsTitle}>
                                        {hasMissingRequiredDocs ? `${missingRequiredDocs.length} Missing` : 'Complete'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Detailed Info Groups */}
                                <div className="grid grid-cols-1 gap-6 lg:col-span-9 md:grid-cols-2">
                                  <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[14px]">verified_user</span> Governance Data
                                    </h4>
                                    <div className="grid grid-cols-1 gap-y-2">
                                      <div><span className="text-xs font-bold text-slate-400">Religion:</span> <span className="text-xs font-black text-slate-900">{s.religion}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Community:</span> <span className="text-xs font-black text-slate-900">{s.community}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Caste:</span> <span className="text-xs font-black text-slate-900">{s.caste}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Mother Tongue:</span> <span className="text-xs font-black text-slate-900">{s.motherTongue}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Aadhar ID:</span> <span className="text-xs font-black text-slate-900">{s.aadharNo}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Identification:</span> <span className="text-xs font-black text-slate-900">{s.identification1}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">School Origination:</span> <span className="text-xs font-black text-slate-900">{s.previousSchool}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Transport Mode:</span> <span className="text-xs font-black text-slate-900">{s.transportMode}</span></div>
                                    </div>
                                  </div>
                                  <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[14px]">family_history</span> Family Matrix
                                    </h4>
                                    <div className="grid grid-cols-1 gap-y-2">
                                      <div><span className="text-xs font-bold text-slate-400">Father:</span> <span className="text-xs font-black text-slate-900">{s.family?.fatherName}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Father Mob.:</span> <span className="text-xs font-black text-slate-900">{s.family?.fatherPhone}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Mother:</span> <span className="text-xs font-black text-slate-900">{s.family?.motherName}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Mother Mob.:</span> <span className="text-xs font-black text-slate-900">{s.family?.motherPhone}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Primary Email:</span> <span className="text-xs font-black text-slate-900">{s.family?.parentsEmail}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Annual Income:</span> <span className="text-xs font-black text-slate-900">₹{s.family?.familyIncome || 0}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Sibling Registry:</span> <span className="text-xs font-black text-slate-900">{s.siblings && s.siblings.length > 0 ? `${s.siblings.length} Linked (${s.siblings.map(sib => sib.name).join(', ')})` : "None"}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Residential Area:</span> <span className="text-xs font-black text-slate-900">{s.address?.city}</span></div>
                                    </div>
                                  </div>
                                  <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[14px]">school</span> Academic Standing
                                    </h4>
                                    <div className="grid grid-cols-1 gap-y-2">
                                      <div><span className="text-xs font-bold text-slate-400">Registration No:</span> <span className="text-xs font-black text-slate-900">{s.admission?.registerNo}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Academic Period:</span> <span className="text-xs font-black text-slate-900">{s.admission?.academicYear}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Valid From:</span> <span className="text-xs font-black text-slate-900">{s.admission?.admissionFrom}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Valid To:</span> <span className="text-xs font-black text-slate-900">{s.admission?.admissionTo}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Hostel Request:</span> <span className="text-xs font-black text-slate-900">{s.family?.hostelRequired ? "Yes" : "No"}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">RTE Status:</span> <span className="text-xs font-black text-slate-900">{s.rte ? "Yes" : "No"}</span></div>
                                    </div>
                                  </div>
                                  <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[14px]">ink_pen</span> Administrative Seal
                                    </h4>
                                    <div className="grid grid-cols-1 gap-y-2">
                                      <div><span className="text-xs font-bold text-slate-400">Staff Seal:</span> <span className="text-xs font-black text-slate-900">{s.admission?.staffSignature}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Principal Seal:</span> <span className="text-xs font-black text-slate-900">{s.admission?.principalSignature}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">System Auditor:</span> <span className="text-xs font-black text-slate-900">{s.admission?.approvedByRole}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Audit Timestamp:</span> <span className="text-xs font-black text-slate-900">{s.admission?.approvedAt ? dayjs(s.admission.approvedAt).format("DD MMM YYYY, HH:mm") : "-"}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50">
            <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
              Visible: <span className="text-slate-900">{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center justify-center w-10 h-10 transition-all bg-white border rounded-xl border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${p === page ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center justify-center w-10 h-10 transition-all bg-white border rounded-xl border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <button key="cancel" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
            Abort
          </button>,
          <button key="submit" onClick={handleLink} className="px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all" disabled={linking}>
            {linking ? 'Establishing Link...' : 'Authorize Linkage'}
          </button>
        ]}
        centered
        width={560}
        className="premium-modal"
        title={
          <div className="flex items-center gap-4 py-2">
            <div className="flex items-center justify-center w-12 h-12 text-teal-600 shadow-sm rounded-2xl bg-teal-50">
              <span className="leading-none material-symbols-outlined">add_link</span>
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Family Matrix</div>
              <div className="text-xl font-black tracking-tight text-slate-900">Siblings Link
                — {selectedStudent?.name}</div>
            </div>
          </div>
        }
      >
        <div className="py-6 space-y-8">
          <div className="p-6 italic border bg-slate-50 rounded-3xl border-slate-100">
            <p className="text-slate-500 text-[13px] font-bold leading-relaxed">
              Link siblings to group students with the same parents into one family for unified records, shared fees tracking, and streamlined communication.
            </p>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              Progeny Search
            </label>
            <Select
              mode="multiple"
              showSearch
              placeholder="Search Student by name or Admission ID..."
              className="w-full premium-select"
              style={{ width: "100%" }}
              size="large"
              optionFilterProp="label"
              onChange={setTargetSiblingIds}
              value={targetSiblingIds}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={students
                .filter((s) => s.id !== selectedStudent?.id)
                .map((s) => ({
                  label: `${s.name} (${s.admission?.admissionNo || s.id})`,
                  value: s.id,
                }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── Student Profile Application Modal ── */}
      <Modal
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setDetailStudent(null); }}
        footer={null}
        width={1100}
        centered
        className="premium-modal"
        styles={{ body: { padding: 0 } }}
      >
        {detailStudent && (
          <div className="overflow-hidden bg-white">
            {/* Header Section */}
            <div className="relative p-12 overflow-hidden text-white bg-slate-900">
              <div className="absolute top-0 right-0 -mt-48 -mr-48 rounded-full w-96 h-96 bg-teal-500/10 blur-3xl" />
              <div className="relative flex items-center gap-10">
                <div className="w-32 h-32 rounded-[40px] bg-white/5 border-4 border-white/10 flex items-center justify-center text-5xl font-black text-teal-400 shadow-2xl">
                  {initials(detailStudent.name)}
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <h2 className="text-5xl tracking-tighter text-white">{detailStudent.name}</h2>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${detailStudent.admission?.isApproved ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {detailStudent.admission?.isApproved ? 'Verified Personnel' : 'Pending Audit'}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-lg font-bold text-slate-400">
                    <span className="flex items-center gap-2"><span className="text-teal-400 material-symbols-outlined">id_card</span> {detailStudent.admission?.admissionNo || detailStudent.id}</span>
                    <span className="opacity-20">|</span>
                    <span className="flex items-center gap-2"><span className="text-teal-400 material-symbols-outlined">school</span> {detailStudent.standard}</span>
                    <span className="opacity-20">|</span>
                    <span className="flex items-center gap-2"><span className="text-teal-400 material-symbols-outlined">calendar_today</span> {detailStudent.academicYear}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-12">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                {/* Main Application Content */}
                <div className="space-y-10 lg:col-span-8">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-2 h-8 rounded-full bg-slate-900" />
                      <h4 className="text-2xl font-black tracking-tight text-slate-900">Personnel Biography</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden border shadow-sm bg-slate-100 rounded-3xl border-slate-100">
                      {[
                        { label: "Temporal Birth", value: dayjs(detailStudent.dob).format("DD MMM YYYY"), icon: "event" },
                        { label: "Biological Gender", value: detailStudent.gender, icon: "diversity_3" },
                        { label: "Ancestry / Faith", value: `${detailStudent.religion || ""} / ${detailStudent.community || ""}`, icon: "history_edu" },
                        { label: "Vitality (Blood)", value: detailStudent.bloodGroup, icon: "bloodtype" },
                        { label: "Paternal Root", value: detailStudent.family?.fatherName, icon: "person" },
                        { label: "Maternal Root", value: detailStudent.family?.motherName, icon: "person_4" },
                        { label: "Contact Channel", value: detailStudent.family?.fatherPhone || detailStudent.family?.motherPhone, icon: "call" },
                        { label: "Logistic Mode", value: detailStudent.transportMode || "Local Transit", icon: "potted_plant" },
                      ].map((item, idx) => (
                        <div key={idx} className="p-6 transition-all bg-white hover:bg-slate-50/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">{item.icon}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
                          </div>
                          <div className="text-[14px] font-extrabold text-slate-900">{item.value || 'N/A'}</div>
                        </div>
                      ))}
                      <div className="col-span-2 p-6 bg-white border-t border-slate-50 hover:bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Resident Domicile</span>
                        </div>
                        <div className="text-[14px] font-extrabold text-slate-900 leading-relaxed">
                          {[detailStudent.address?.line1, detailStudent.address?.line2, detailStudent.address?.city, detailStudent.address?.state].filter(Boolean).join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {detailStudent.academics && detailStudent.academics.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-8 bg-teal-500 rounded-full" />
                        <h4 className="text-2xl font-black tracking-tight text-slate-900">Academic History</h4>
                      </div>
                      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl">
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <div className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Qualifying Examination</div>
                            <div className="text-2xl font-black">{detailStudent.academics[0].examName}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Board Register</div>
                            <div className="text-lg font-black">{detailStudent.academics[0].registerNo}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-6">
                          <div className="p-5 text-center border bg-white/5 rounded-2xl border-white/10">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate</div>
                            <div className="text-xl font-black text-teal-400">{detailStudent.academics[0].totalObtainedMarks} / {detailStudent.academics[0].totalMaxMarks}</div>
                          </div>
                          <div className="p-5 text-center bg-teal-500 shadow-lg rounded-2xl shadow-teal-500/20">
                            <div className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-2">Percentage</div>
                            <div className="text-2xl font-black text-white">{detailStudent.academics[0].totalPercentage}%</div>
                          </div>
                          <div className="p-5 text-center border bg-white/5 rounded-2xl border-white/10">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Session</div>
                            <div className="text-xl font-black text-white">{detailStudent.academics[0].monthYear}</div>
                          </div>
                          <div className="p-5 text-center border bg-white/5 rounded-2xl border-white/10">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Stream</div>
                            <div className="text-xl font-black text-teal-400">{detailStudent.academics[0].stream || 'General'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Content */}
                <div className="lg:col-span-4">
                  <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 h-full">
                    <h4 className="flex items-center gap-3 mb-8 text-lg font-black text-slate-900">
                      <span className="material-symbols-outlined text-slate-400">shield</span> Institutional Status
                    </h4>

                    <div className="space-y-6">
                      <div className="p-6 bg-white border shadow-sm rounded-3xl border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Vitality</div>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full animate-pulse ${detailStudent.users?.isActive !== false ? 'bg-teal-500' : 'bg-rose-500'}`} />
                          <span className="text-lg font-black text-slate-900">{detailStudent.users?.isActive !== false ? 'Active Individual' : 'Archived Record'}</span>
                        </div>
                      </div>

                      <div className="p-6 bg-white border shadow-sm rounded-3xl border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">supervisor_account</span>
                          Sibling Link
                        </div>
                        {detailStudent.siblings && detailStudent.siblings.length > 0 ? (
                          <div className="space-y-2">
                            {detailStudent.siblings.map((sib) => (
                              <div key={sib.id} className="flex items-center gap-3 p-3 border bg-slate-50 rounded-2xl border-slate-100">
                                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                                  {sib.name?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-[12px] font-black text-slate-900 leading-tight">{sib.name}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sib.standard} {sib.admission?.admissionNo ? `· ${sib.admission.admissionNo}` : ''}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-lg font-black text-slate-900">
                            Independent
                            <span className="material-symbols-outlined text-slate-200">family_restroom</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-12 mt-12 border-t border-slate-200">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Audit Synchronized</h5>
                        <p className="text-xs font-bold leading-relaxed text-slate-500">
                          Profile was last validated on {dayjs().format('DD MMMM YYYY')}. All academic and biographical vectors are consistent with institutional standards.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>


      <div
        id="pdfContent"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "794px",
          minHeight: "1123px",
          background: "#fff",
          fontFamily: "'Arial', sans-serif",
          fontSize: "11px",
          color: "#000",
        }}
      >
        {/* ── HEADER ── */}
        <div style={{ borderBottom: "3px solid #000", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/logo.png" alt="logo" style={{ width: "56px", height: "56px", objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: "900", fontSize: "17px", letterSpacing: "0.02em", color: "#000" }}>
                {adminSettings?.schoolName || "MATRIC HR SEC SCHOOL"}
              </div>
              <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>
                {adminSettings?.address || "Excellence in Education"}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "900", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.08em", border: "2px solid #000", padding: "4px 14px", display: "inline-block" }}>
              Admission Form
            </div>
            <div style={{ fontSize: "10px", marginTop: "6px", color: "#444" }}>
              Adm. No: <strong>{detailStudent?.admission?.admissionNo || "—"}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              Date: <strong>{detailStudent?.admission?.admissionDate ? dayjs(detailStudent.admission.admissionDate).format("DD/MM/YYYY") : "—"}</strong>
            </div>
          </div>
        </div>

        {/* ── STEPPER BAR ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "2px solid #000" }}>
          <tbody>
            <tr>
              {["1. Student", "2. Family", "3. Address", "4. Academic", "5. Documents", "6. Review"].map((step, i) => (
                <td key={i} style={{
                  textAlign: "center", padding: "6px 4px",
                  background: i % 2 === 0 ? "#000" : "#444",
                  color: "#fff", fontWeight: "800", fontSize: "9px",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  border: "1px solid #000"
                }}>{step}</td>
              ))}
            </tr>
          </tbody>
        </table>

        <div style={{ padding: "16px 20px" }}>

          {/* ── SECTION HELPER ── */}
          {/* Each section uses a label-value table with alternating row shading */}

          {/* ── STEP 1: STUDENT PROFILE ── */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ background: "#000", color: "#fff", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 10px" }}>
              1. Student Profile
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <tbody>
                {[
                  [["Student Name", detailStudent?.name], ["Admission No", detailStudent?.admission?.admissionNo], ["Academic Year", detailStudent?.admission?.academicYear || detailStudent?.academicYear]],
                  [["Standard", detailStudent?.standard || detailStudent?.admission?.standard], ["Section", detailStudent?.section || "—"], ["Admission Date", detailStudent?.admission?.admissionDate ? dayjs(detailStudent.admission.admissionDate).format("DD/MM/YYYY") : "—"]],
                  [["Gender", detailStudent?.gender], ["Date of Birth", detailStudent?.dob ? dayjs(detailStudent.dob).format("DD/MM/YYYY") : "—"], ["Blood Group", detailStudent?.bloodGroup || "—"]],
                  [["Religion", detailStudent?.religion || "—"], ["Community", detailStudent?.community || "—"], ["Caste", detailStudent?.caste || "—"]],
                  [["Mother Tongue", detailStudent?.motherTongue || "—"], ["Aadhar No", detailStudent?.aadharNo || "—"], ["Transport Mode", detailStudent?.transportMode || "—"]],
                  [["RTE Applied", detailStudent?.rte ? "Yes" : "No"], ["Van Needed", detailStudent?.vanNeeded ? "Yes" : "No"], ["Previous School", detailStudent?.previousSchool || "—"]],
                ].map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                    {row.map(([label, value], ci) => (
                      <React.Fragment key={ci}>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", fontWeight: "700", color: "#333", width: "12%", whiteSpace: "nowrap" }}>{label}</td>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", color: "#000", width: "22%" }}>{value || "—"}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── STEP 2: FAMILY ── */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ background: "#000", color: "#fff", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 10px" }}>
              2. Family Details
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <tbody>
                {[
                  [["Father's Name", detailStudent?.family?.fatherName], ["Father's Phone", detailStudent?.family?.fatherPhone], ["Father's Occupation", detailStudent?.family?.fatherOccupation]],
                  [["Mother's Name", detailStudent?.family?.motherName], ["Mother's Phone", detailStudent?.family?.motherPhone], ["Mother's Occupation", detailStudent?.family?.motherOccupation]],
                  [["Parent's Email", detailStudent?.family?.parentsEmail], ["Annual Income", detailStudent?.family?.familyIncome ? `Rs.${detailStudent.family.familyIncome}` : "—"], ["Hostel Required", detailStudent?.family?.hostelRequired ? "Yes" : "No"]],
                ].map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                    {row.map(([label, value], ci) => (
                      <React.Fragment key={ci}>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", fontWeight: "700", color: "#333", width: "12%", whiteSpace: "nowrap" }}>{label}</td>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", color: "#000", width: "22%" }}>{value || "—"}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── STEP 3: ADDRESS ── */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ background: "#000", color: "#fff", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 10px" }}>
              3. Address
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <tbody>
                {[
                  [["Address Line 1", detailStudent?.address?.line1], ["Address Line 2", detailStudent?.address?.line2], ["Address Line 3", detailStudent?.address?.line3]],
                  [["City", detailStudent?.address?.city], ["State", detailStudent?.address?.state], ["Pincode", detailStudent?.address?.pin]],
                  [["Landmark", detailStudent?.address?.landmark], ["Area", detailStudent?.address?.area], ["Nationality", "Indian"]],
                ].map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                    {row.map(([label, value], ci) => (
                      <React.Fragment key={ci}>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", fontWeight: "700", color: "#333", width: "12%", whiteSpace: "nowrap" }}>{label}</td>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", color: "#000", width: "22%" }}>{value || "—"}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── STEP 4: ACADEMIC HISTORY ── */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ background: "#000", color: "#fff", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 10px" }}>
              4. Academic History
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ background: "#444", color: "#fff" }}>
                  {["Exam / Board", "Register No", "Month & Year", "Stream", "Max Marks", "Marks Obtained", "Percentage"].map((h, i) => (
                    <th key={i} style={{ border: "1px solid #000", padding: "5px 8px", fontWeight: "800", fontSize: "9px", textTransform: "uppercase", textAlign: "left", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailStudent?.academics?.length > 0 ? detailStudent.academics.map((ac, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", fontWeight: "700" }}>{ac.examName || "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px" }}>{ac.registerNo || "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px" }}>{ac.monthYear || "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px" }}>{ac.stream || "General"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center" }}>{ac.totalMaxMarks ?? ac.maxMarks ?? "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center" }}>{ac.totalObtainedMarks ?? ac.marksObtained ?? "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center", fontWeight: "800" }}>{ac.totalPercentage ?? ac.percentage ?? "—"}%</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center", color: "#666" }}>No academic records available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── STEP 5: DOCUMENTS CHECKLIST ── */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ background: "#000", color: "#fff", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 10px" }}>
              5. Documents Checklist
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ background: "#444", color: "#fff" }}>
                  <th style={{ border: "1px solid #000", padding: "5px 8px", textAlign: "left", fontWeight: "800", fontSize: "9px", textTransform: "uppercase" }}>Document</th>
                  <th style={{ border: "1px solid #000", padding: "5px 8px", textAlign: "center", fontWeight: "800", fontSize: "9px", textTransform: "uppercase", width: "100px" }}>Status</th>
                  <th style={{ border: "1px solid #000", padding: "5px 8px", textAlign: "left", fontWeight: "800", fontSize: "9px", textTransform: "uppercase" }}>Document</th>
                  <th style={{ border: "1px solid #000", padding: "5px 8px", textAlign: "center", fontWeight: "800", fontSize: "9px", textTransform: "uppercase", width: "100px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [["Birth Certificate", detailStudent?.documents?.[0]?.birthCert], ["Community Certificate", detailStudent?.documents?.[0]?.communityCert]],
                  [["Student Aadhaar", detailStudent?.documents?.[0]?.aadharStudent], ["Student Photo", detailStudent?.documents?.[0]?.photoPath]],
                  [["TC / Migration", detailStudent?.documents?.[0]?.tcPath], ["Other Document", detailStudent?.documents?.[0]?.otherDoc]],
                ].map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                    {row.map(([label, val], ci) => (
                      <React.Fragment key={ci}>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", fontWeight: "700" }}>{label}</td>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-block", padding: "2px 10px", fontWeight: "800", fontSize: "9px",
                            border: "1px solid #000",
                            background: val ? "#000" : "#fff",
                            color: val ? "#fff" : "#000",
                            textTransform: "uppercase", letterSpacing: "0.05em"
                          }}>{val ? "Uploaded" : "Missing"}</span>
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── STEP 6: REVIEW & APPROVAL ── */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ background: "#000", color: "#fff", fontWeight: "900", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 10px" }}>
              6. Review &amp; Approval
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <tbody>
                {[
                  [["Approval Status", detailStudent?.admission?.isApproved ? "Approved" : "Pending"], ["Approved By", detailStudent?.admission?.approvedByRole || "—"], ["Approved At", detailStudent?.admission?.approvedAt ? dayjs(detailStudent.admission.approvedAt).format("DD MMM YYYY, HH:mm") : "—"]],
                  [["Register No", detailStudent?.admission?.registerNo || "—"], ["Valid From", detailStudent?.admission?.admissionFrom || "—"], ["Valid To", detailStudent?.admission?.admissionTo || "—"]],
                ].map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                    {row.map(([label, value], ci) => (
                      <React.Fragment key={ci}>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", fontWeight: "700", color: "#333", width: "12%", whiteSpace: "nowrap" }}>{label}</td>
                        <td style={{ border: "1px solid #ccc", padding: "5px 8px", color: "#000", width: "22%" }}>{value}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── DECLARATION ── */}
          <div style={{ border: "1px solid #000", padding: "10px 12px", marginBottom: "18px" }}>
            <div style={{ fontWeight: "900", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "5px" }}>Declaration</div>
            <p style={{ margin: 0, fontSize: "10px", color: "#333", lineHeight: "1.7" }}>
              I hereby declare that all the information provided in this admission form is true and correct to the best of my knowledge.
              I undertake to abide by the rules and regulations of the institution.
            </p>
          </div>

          {/* ── SIGNATURES ── */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                {["Parent / Guardian Signature", "Student Signature", "Principal Signature"].map((label, i) => (
                  <td key={i} style={{ border: "1px solid #000", padding: "32px 12px 8px", textAlign: "center", width: "33%" }}>
                    <div style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>{label}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: "2px solid #000", padding: "7px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <div style={{ fontSize: "9px", color: "#444" }}>
            Generated on {dayjs().format("DD MMM YYYY, HH:mm")}
          </div>
          <div style={{ fontSize: "9px", color: "#444", fontWeight: "700" }}>
            {adminSettings?.schoolName || "MATRIC HR SEC SCHOOL"} — Confidential Record
          </div>
        </div>
      </div>


    </div>



  );
};

export default StudentView;
