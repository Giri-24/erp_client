import React, { useEffect, useState, useMemo } from "react";
import { Modal, Select, message } from "antd";
import instance from "../utils/axios";
import dayjs from "dayjs";
import { linkSiblings, demoteIndividualStudents } from "../modules/admission/admission.service";
import { getAdminSettings } from "../modules/settings/settings.service";
import { useNavigate } from "react-router-dom";

// ── helpers ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-secondary-container text-on-secondary-container",
  "bg-primary-fixed text-on-primary-fixed",
  "bg-[#44ddc1] text-[#001813]",
  "bg-surface-container-highest text-on-surface",
  "bg-error-container text-error",
];



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

const normalizeTransportMode = (mode = "") => String(mode || "").trim().toUpperCase();

const getTransportFilterValue = (mode = "") => {
  const normalizedMode = normalizeTransportMode(mode);
  if (!normalizedMode || ["LOCAL", "SELF", "WALKING"].includes(normalizedMode)) return "local";
  if (normalizedMode.includes("VAN")) return "van";
  return "van";
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
  const [transportFilter, setTransportFilter] = useState("");
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

  // ── data ─────────────────────────────────────────────────────────────────
  const fetchStudents = () => {
    instance.get("/admissions").then((res) => {
      const approved = (res.data || []).filter((s) => s.admission?.isApproved);
      setStudents(approved);
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
      if (transportFilter && getTransportFilterValue(s.transportMode) !== transportFilter) return false;
      if (areaFilter) {
        const areaStr = areaFilter.toLowerCase();
        const addr = s.address || {};
        const isMatch = 
          (addr.line1 || "").toLowerCase().includes(areaStr) ||
          (addr.line2 || "").toLowerCase().includes(areaStr) ||
          (addr.line3 || "").toLowerCase().includes(areaStr) ||
          (addr.city || "").toLowerCase().includes(areaStr) ||
          (addr.state || "").toLowerCase().includes(areaStr) ||
          (addr.landmark || "").toLowerCase().includes(areaStr) ||
          (addr.area || "").toLowerCase().includes(areaStr) ||
          String(addr.pin || "").toLowerCase().includes(areaStr);
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
  }, [students, classFilter, sectionFilter, genderFilter, transportFilter, areaFilter, fatherFilter, siblingFilter, searchText]);

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
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight mb-2">
            Student Management
          </h2>
          <p className="text-on-surface-variant max-w-md text-sm">
            Comprehensive database of enrolled students. Manage admissions, academic standing, and biographical records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => message.info("Export feature coming soon")}
            className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-surface-container-highest transition-colors active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-xl">file_download</span>
            Export List
          </button>
        </div>
      </div>

      {/* ── Insight stat chips ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: "groups",
            iconBg: "bg-primary-fixed",
            iconColor: "text-on-primary-fixed",
            label: "Total Enrollment",
            value: totalEnrollment,
            decoration: "bg-primary/5",
          },
          {
            icon: "check_circle",
            iconBg: "bg-[#44ddc1]/20",
            iconColor: "text-[#00a28c]",
            label: "Active Students",
            value: activeStudents,
            decoration: "bg-[#44ddc1]/5",
          },
          {
            icon: "pending_actions",
            iconBg: "bg-error-container/50",
            iconColor: "text-error",
            label: "Filtered Results",
            value: filtered.length,
            decoration: "bg-error/5",
          },
        ].map(({ icon, iconBg, iconColor, label, value, decoration }) => (
          <div
            key={label}
            className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] flex items-center gap-4 relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${decoration} rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 pointer-events-none`} />
            <div className={`h-12 w-12 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-black text-primary">{value.toLocaleString("en-IN")}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter + Table card ── */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden">
        {/* Filter bar */}
        <div className="p-5 bg-surface-container-low/50 flex flex-wrap items-center gap-4 border-b border-surface-variant/20">
          {/* Search */}
          <div className="flex-grow min-w-[220px] relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
            <input
              type="text"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              placeholder="Search by name, ID or guardian..."
              className="w-full bg-white border-none rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Standard select */}
            <div className="relative">
              <select
                value={classFilter}
                onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
                className="bg-white border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm cursor-pointer appearance-none min-w-[140px]"
              >
                <option value="">All Standards</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">expand_more</span>
            </div>

            {/* Section select */}
            <div className="relative">
              <select
                value={sectionFilter}
                onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
                className="bg-white border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm cursor-pointer appearance-none min-w-[120px]"
              >
                <option value="">All Sections</option>
                {sectionOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">expand_more</span>
            </div>

            {/* Gender select */}
            <div className="relative">
              <select
                value={genderFilter}
                onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
                className="bg-white border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm cursor-pointer appearance-none min-w-[130px]"
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">expand_more</span>
            </div>

            {/* Transport select */}
            <div className="relative">
              <select
                value={transportFilter}
                onChange={(e) => { setTransportFilter(e.target.value); setPage(1); }}
                className="bg-white border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm cursor-pointer appearance-none min-w-[150px]"
              >
                <option value="">Transport</option>
                <option value="van">Van Student</option>
                <option value="local">Local Student</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">expand_more</span>
            </div>

            {/* Area / Pin */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-base">location_on</span>
              <input
                type="text"
                value={areaFilter}
                onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}
                placeholder="Area Search (City/Street/Pin)"
                className="bg-white border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm min-w-[200px]"
              />
            </div>

            {/* Father Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-base">person</span>
              <input
                type="text"
                value={fatherFilter}
                onChange={(e) => { setFatherFilter(e.target.value); setPage(1); }}
                placeholder="Father's Name..."
                className="bg-white border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm min-w-[170px]"
              />
            </div>

            {/* Sibling select */}
            <div className="relative">
              <select
                value={siblingFilter}
                onChange={(e) => { setSiblingFilter(e.target.value); setPage(1); }}
                className="bg-white border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm cursor-pointer appearance-none min-w-[130px]"
              >
                <option value="">Sibling</option>
                <option value="has">Has Sibling</option>
                <option value="none">No Sibling</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant text-base">expand_more</span>
            </div>

            {/* Clear */}
            {(classFilter || sectionFilter || genderFilter || transportFilter || areaFilter || fatherFilter || siblingFilter || searchText) && (
              <button
                onClick={() => { setClassFilter(""); setSectionFilter(""); setGenderFilter(""); setTransportFilter(""); setAreaFilter(""); setFatherFilter(""); setSiblingFilter(""); setSearchText(""); setPage(1); }}
                className="h-[46px] px-4 flex items-center gap-1 bg-surface-container-highest rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container transition-all text-sm font-medium"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-[0.12em] font-bold">
                <th className="py-4 px-5 w-10" />
                <th className="py-4 px-5">Admission No</th>
                <th className="py-4 px-5">Student Name</th>
                <th className="py-4 px-5">Standard</th>
                <th className="py-4 px-5">Section</th>
                <th className="py-4 px-5">Academic Year</th>
                <th className="py-4 px-5">Gender</th>
                <th className="py-4 px-5">DOB</th>
                <th className="py-4 px-5">Father Name</th>
                <th className="py-4 px-5">Mother Name</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/10">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">group</span>
                    <p className="text-sm font-medium">No students found</p>
                    <p className="text-xs mt-1 opacity-60">Try adjusting the filters above</p>
                  </td>
                </tr>
              ) : (
                pagedRows.map((s) => {
                  const name = s.name || "";
                  const admNo = s.admission?.admissionNo || s.id;
                  const std = s.standard || s.admission?.standard || "—";
                  const dob = s.dob ? dayjs(s.dob).format("DD MMM YYYY") : "—";
                  const isExpanded = expandedId === s.id;
                  const siblings = s.siblings || [];

                  return (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-surface-container-low/30 transition-colors group">
                        {/* Expander */}
                        <td className="py-4 px-5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                            className={`transition-transform duration-200 text-on-surface-variant hover:text-primary ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <span className="material-symbols-outlined text-xl">keyboard_arrow_down</span>
                          </button>
                        </td>

                        {/* Admission No */}
                        <td className="py-5 px-5 font-bold text-primary text-sm">{admNo}</td>

                        {/* Name + avatar */}
                        <td className="py-5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full ${avatarColor(name)} flex items-center justify-center font-black text-xs flex-shrink-0`}>
                              {initials(name)}
                            </div>
                            <div>
                              <p className="font-bold text-primary text-sm">{name}</p>
                              <p className="text-[10px] text-on-surface-variant">
                                {s.users?.email || s.email || ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Standard */}
                        <td className="py-5 px-5">
                          <span className="bg-surface-container-high px-2.5 py-1 rounded-full text-[11px] font-bold">{std}</span>
                        </td>

                        {/* Section */}
                        <td className="py-5 px-5 text-sm text-on-surface-variant">{s.section || "—"}</td>

                        {/* Academic Year */}
                        <td className="py-5 px-5 text-sm text-on-surface-variant">{s.academicYear || "—"}</td>

                        {/* Gender */}
                        <td className="py-5 px-5 text-sm text-on-surface-variant capitalize">{s.gender || "—"}</td>

                        {/* DOB */}
                        <td className="py-5 px-5 text-sm text-on-surface-variant">{dob}</td>

                        {/* Father */}
                        <td className="py-5 px-5 text-sm text-on-surface-variant">{s.family?.fatherName || "—"}</td>

                        {/* Mother */}
                        <td className="py-5 px-5 text-sm text-on-surface-variant">{s.family?.motherName || "—"}</td>

                        {/* Actions */}
                        <td className="py-5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onCollectFee && (
                              <button
                                title="Collect Fee"
                                onClick={() => onCollectFee(s.id)}
                                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">payments</span>
                              </button>
                            )}
                            <button
                              title="Link Sibling"
                              onClick={() => openLinkModal(s)}
                              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">add_link</span>
                            </button>
                            <button
                              title="View"
                              onClick={() => { setDetailStudent(s); setDetailModalOpen(true); }}
                              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                            <button
                              title="Edit"
                              onClick={() => onEdit && onEdit(s)}
                              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            {adminSettings.enableIndividualDemotion && (
                               <button
                               title="Demote Student"
                               onClick={() => handleDemote(s)}
                               className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                             >
                               <span className="material-symbols-outlined text-lg">keyboard_double_arrow_down</span>
                             </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded row: siblings ── */}
                      {isExpanded && (
                        <tr className="bg-surface-container-low/40">
                          <td colSpan={9} className="px-8 py-4">
                            {siblings.length === 0 ? (
                              <div className="flex items-center gap-3 text-sm italic text-on-surface-variant bg-white rounded-xl px-5 py-3 border border-outline-variant/10">
                                <span className="material-symbols-outlined text-base opacity-40">group</span>
                                No siblings linked to this student.
                              </div>
                            ) : (
                              <div className="bg-white rounded-xl border border-outline-variant/10 overflow-hidden shadow-sm">
                                <div className="flex items-center gap-2 px-5 py-3 border-b border-outline-variant/10">
                                  <span className="material-symbols-outlined text-primary text-base">group</span>
                                  <h4 className="font-headline font-bold text-primary text-sm">Linked Siblings</h4>
                                </div>
                                <div className="divide-y divide-outline-variant/10">
                                  {siblings.map((sib) => (
                                    <div key={sib.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-container-low/40 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full ${avatarColor(sib.name || "")} flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                                          {initials(sib.name || sib.firstName || "")}
                                        </div>
                                        <div>
                                          <p className="font-bold text-sm text-primary">{sib.name || `${sib.firstName || ""} ${sib.lastName || ""}`.trim()}</p>
                                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                                            {sib.admission?.admissionNo || sib.admissionNo || ""}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="bg-surface-container-high px-2.5 py-0.5 rounded-full text-[11px] font-bold">{sib.standard || "—"}</span>
                                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                                          sib.admission?.isApproved
                                            ? "bg-[#44ddc1]/20 text-[#005145]"
                                            : "bg-surface-container-high text-on-surface-variant"
                                        }`}>
                                          {sib.admission?.isApproved ? "Approved" : "Pending"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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

        {/* ── Pagination footer ── */}
        <div className="p-5 bg-surface-container-low/30 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-on-surface-variant font-medium">
            Showing{" "}
            <span className="text-primary font-bold">
              {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
            </span>{" "}
            of {filtered.length} students
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border border-surface-variant/30 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + Math.max(1, page - 2);
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-10 w-10 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    p === page
                      ? "bg-primary text-white shadow-sm"
                      : "hover:bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span className="text-on-surface-variant px-1">...</span>
                <button
                  onClick={() => setPage(totalPages)}
                  className="h-10 w-10 flex items-center justify-center hover:bg-surface-container-high rounded-lg text-sm text-on-surface-variant font-medium transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-surface-variant/30 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Insight chip ── */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-full shadow-[0_20px_40px_rgba(1,29,53,0.06)] border border-primary/5">
          <span className="flex h-3 w-3 rounded-full bg-[#44ddc1] animate-pulse" />
          <p className="text-sm font-semibold text-primary">
            {filtered.length} student{filtered.length !== 1 ? "s" : ""} in current view — all admission records loaded.
          </p>
        </div>
      </div>

      {/* ── Link Sibling Modal ── */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleLink}
        confirmLoading={linking}
        okText="Link Siblings"
        centered
        width={440}
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_link</span>
            <span className="font-headline font-bold">Link Sibling for {selectedStudent?.name}</span>
          </div>
        }
      >
        <div className="space-y-4 pt-4">
          <p className="text-on-surface-variant text-sm">
            Select another student to link as a sibling. Records will share certain common details once linked.
          </p>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">
              Find Sibling
            </label>
            <Select
              mode="multiple"
              showSearch
              placeholder="Search by name or admission no..."
              style={{ width: "100%" }}
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

      {/* ── Student Detail Modal ── */}
      <Modal
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setDetailStudent(null); }}
        footer={null}
        width={700}
        centered
        title={
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">person</span>
            <span className="font-headline font-bold text-lg">Student Profile — {detailStudent?.name}</span>
          </div>
        }
      >
        {detailStudent && (
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2 space-y-8">
            <div className="flex items-start gap-6 pb-6 border-b border-outline-variant/10">
              <div className={`w-20 h-20 rounded-2xl ${avatarColor(detailStudent.name)} flex items-center justify-center text-2xl font-black shadow-lg`}>
                {initials(detailStudent.name)}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-primary font-headline">{detailStudent.name}</h3>
                <p className="text-on-surface-variant font-medium">{detailStudent.admission?.admissionNo || "NO ADMISSION NO"}</p>
                <div className="flex gap-2 mt-3">
                  <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">{detailStudent.standard}</span>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${detailStudent.admission?.isApproved ? "bg-[#44ddc1]/20 text-[#005145]" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {detailStudent.admission?.isApproved ? "Approved" : "Pending Approval"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              {[
                { label: "Date of Birth", value: dayjs(detailStudent.dob).format("DD MMM YYYY") },
                { label: "Gender", value: detailStudent.gender },
                { label: "Blood Group", value: detailStudent.bloodGroup },
                { label: "Religion / Community", value: `${detailStudent.religion || ""} / ${detailStudent.community || ""}` },
                { label: "Father Name", value: detailStudent.family?.fatherName },
                { label: "Father Phone", value: detailStudent.family?.fatherPhone },
                { label: "Mother Name", value: detailStudent.family?.motherName },
                { label: "Mother Phone", value: detailStudent.family?.motherPhone },
                { label: "Academic Year", value: detailStudent.academicYear || detailStudent.admission?.academicYear },
                { label: "Transport Mode", value: detailStudent.transportMode || "Local" },
                { label: "Address", value: `${detailStudent.address?.line1 || ""}, ${detailStudent.address?.line2 || ""}, ${detailStudent.address?.city || ""}`, span: 2 },
              ].map((item, i) => (
                <div key={i} className={item.span === 2 ? "col-span-2" : ""}>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-primary">{item.value || "—"}</p>
                </div>
              ))}
            </div>

            {detailStudent.academics && detailStudent.academics.length > 0 && (
              <div className="pt-6 border-t border-outline-variant/10">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-4">Qualifying Examination</p>
                <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-primary">{detailStudent.academics[0].examName}</p>
                    <p className="text-xs font-bold text-on-surface-variant">Reg No: {detailStudent.academics[0].registerNo}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-outline-variant/10 text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">Total Marks</p>
                      <p className="text-sm font-bold text-primary">{detailStudent.academics[0].totalObtainedMarks} / {detailStudent.academics[0].totalMaxMarks}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-outline-variant/10 text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">Percentage</p>
                      <p className="text-sm font-bold text-[#44ddc1]">{detailStudent.academics[0].totalPercentage}%</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-outline-variant/10 text-center">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">Year</p>
                      <p className="text-sm font-bold text-primary">{detailStudent.academics[0].monthYear}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      
    </div>
  );
};

export default StudentView;
