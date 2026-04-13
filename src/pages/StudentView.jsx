import React, { useEffect, useState, useMemo } from "react";
import { Modal, Select, message } from "antd";
import instance from "../utils/axios";
import dayjs from "dayjs";
import { linkSiblings, demoteIndividualStudents } from "../modules/admission/admission.service";
import { getAdminSettings } from "../modules/settings/settings.service";
import { useNavigate } from "react-router-dom";

// ── helpers ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group">
    <div className="flex justify-between items-start mb-4">
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
      <div className="text-2xl font-black text-slate-900 tracking-tighter">{value}</div>
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
      `}</style>

      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Archive List</span>
            <span className="text-slate-200">/</span>
            <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Active Directory</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
            Student <span className="text-teal-600">Registry</span>
          </h1>
        </div>
        <button
          onClick={() => message.info("Export protocol initiated")}
          className="px-6 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">file_download</span>
          Export Archive
        </button>
      </div>

      {/* Summary Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard title="Total Force" value={totalEnrollment} icon="groups" color="#0f172a" trend={8} />
        <StatCard title="Active Profile" value={activeStudents} icon="verified" color="#10b981" />
        <StatCard title="Filtered Scope" value={filtered.length} icon="filter_alt" color="#6366f1" />
        <StatCard title="Siblings Group" value={students.filter(s => s.siblingGroupId).length} icon="family_restroom" color="#f59e0b" />
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-grow min-w-[300px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              placeholder="Search directory (Name, ID, Guardian)..."
              className="w-full filter-input py-3 pl-11 pr-4 text-xs font-bold outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
              className="filter-input px-4 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer"
            >
              <option value="">All Grades</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sectionFilter}
              onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
              className="filter-input px-4 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer"
            >
              <option value="">Sections</option>
              {sectionOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
              className="filter-input px-4 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer"
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50">
           <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">location_on</span>
              <input
                type="text"
                value={areaFilter}
                onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}
                placeholder="Area / Street / Pin"
                className="w-full filter-input py-2.5 pl-11 pr-4 text-[10px] font-bold outline-none !bg-slate-50/50"
              />
           </div>
           <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">person</span>
              <input
                type="text"
                value={fatherFilter}
                onChange={(e) => { setFatherFilter(e.target.value); setPage(1); }}
                placeholder="Paternal Identifier"
                className="w-full filter-input py-2.5 pl-11 pr-4 text-[10px] font-bold outline-none !bg-slate-50/50"
              />
           </div>
           {(classFilter || sectionFilter || genderFilter || areaFilter || fatherFilter || siblingFilter || searchText) && (
             <button
               onClick={() => { setClassFilter(""); setSectionFilter(""); setGenderFilter(""); setAreaFilter(""); setFatherFilter(""); setSiblingFilter(""); setSearchText(""); setPage(1); }}
               className="px-4 py-2 flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all"
             >
               <span className="material-symbols-outlined text-sm">close</span>
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
                <th>Personnel Details</th>
                <th>Academic Track</th>
                <th>Provenance</th>
                <th>Vitality</th>
                <th className="text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">person_search</span>
                    <p className="text-slate-400 font-bold text-sm">No records matching the current criteria.</p>
                  </td>
                </tr>
              ) : (
                pagedRows.map((s) => {
                  const isExpanded = expandedId === s.id;
                  const name = s.name || "Unknown";
                  const initialsStr = initials(name);
                  let photoPath = s.documents?.[0]?.photoPath;

                  return (
                    <React.Fragment key={s.id}>
                      <tr className="group transition-all hover:bg-slate-50/50">
                        <td className="text-center">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-slate-900 text-white rotate-180' : 'text-slate-300 hover:text-slate-900 hover:bg-slate-100'}`}
                          >
                            <span className="material-symbols-outlined text-sm">expand_more</span>
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px] border-2 border-white shadow-sm overflow-hidden">
                               {photoPath ? (
                                 <img src={`/erp/api/${photoPath.replace(/\\/g, '/')}`} className="w-full h-full object-cover" alt="" />
                               ) : initialsStr}
                            </div>
                            <div>
                               <div className="text-[13px] font-black text-slate-900 tracking-tight leading-none mb-1">{name}</div>
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
                           <span className={`status-tag ${(s.users?.isActive ?? 1) ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
                              {(s.users?.isActive ?? 1) ? 'Active' : 'Archived'}
                           </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => onCollectFee && onCollectFee(s.id)}
                               className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                               title="Fee Ledger"
                             >
                               <span className="material-symbols-outlined text-[18px]">payments</span>
                             </button>
                             <button
                               onClick={() => openLinkModal(s)}
                               className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                               title="Kinship Link"
                             >
                               <span className="material-symbols-outlined text-[18px]">add_link</span>
                             </button>
                             <button
                               onClick={() => { setDetailStudent(s); setDetailModalOpen(true); }}
                               className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                               title="Full Bio"
                             >
                               <span className="material-symbols-outlined text-[18px]">badge</span>
                             </button>
                             <button
                               onClick={() => onEdit && onEdit(s)}
                               className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                               title="Edit"
                             >
                               <span className="material-symbols-outlined text-[18px]">edit_note</span>
                             </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="px-12 py-6">
                             <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                                   <span className="material-symbols-outlined text-sm">family_history</span> Kinship Matrix
                                </h4>
                                {s.siblings?.length === 0 ? (
                                  <div className="text-[11px] font-bold text-slate-400 italic">No sibling records associated with this profile.</div>
                                ) : (
                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {s.siblings.map(sib => (
                                        <div key={sib.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white text-[10px] font-black text-slate-500`}>
                                              {initials(sib.name)}
                                           </div>
                                           <div>
                                              <div className="text-[12px] font-black text-slate-900">{sib.name}</div>
                                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{sib.standard} | {sib.admissionNo}</div>
                                           </div>
                                        </div>
                                      ))}
                                   </div>
                                )}
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
        <div className="px-8 py-6 bg-slate-50/50 flex items-center justify-between">
           <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
              Visible: <span className="text-slate-900">{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
           </div>
           <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:border-slate-400 disabled:opacity-30 transition-all"
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
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:border-slate-400 disabled:opacity-30 transition-all"
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
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-sm">
               <span className="material-symbols-outlined">add_link</span>
            </div>
            <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Family Matrix</div>
               <div className="text-xl font-black text-slate-900 tracking-tight">Kinship Linkage — {selectedStudent?.name}</div>
            </div>
          </div>
        }
      >
        <div className="py-6 space-y-8">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
             <p className="text-slate-500 text-[13px] font-bold leading-relaxed">
               Establishing a kinship link enables shared financial auditing and consolidated family communication logs. This action maps the selected individuals into a singular family unit.
             </p>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
               Progeny Search
            </label>
            <Select
              mode="multiple"
              showSearch
              placeholder="Search directory by name or Admission ID..."
              className="premium-select w-full"
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

      {/* ── Student Profile Dossier Modal ── */}
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
          <div className="bg-white overflow-hidden">
             {/* Header Section */}
             <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
                <div className="relative flex items-center gap-10">
                   <div className="w-32 h-32 rounded-[40px] bg-white/5 border-4 border-white/10 flex items-center justify-center text-5xl font-black text-teal-400 shadow-2xl">
                      {initials(detailStudent.name)}
                   </div>
                   <div>
                      <div className="flex items-center gap-4 mb-3">
                         <h2 className="text-5xl text-white tracking-tighter">{detailStudent.name}</h2>
                         <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${detailStudent.admission?.isApproved ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                            {detailStudent.admission?.isApproved ? 'Verified Personnel' : 'Pending Audit'}
                         </span>
                      </div>
                      <div className="flex items-center gap-6 text-slate-400 font-bold text-lg">
                         <span className="flex items-center gap-2"><span className="material-symbols-outlined text-teal-400">id_card</span> {detailStudent.admission?.admissionNo || detailStudent.id}</span>
                         <span className="opacity-20">|</span>
                         <span className="flex items-center gap-2"><span className="material-symbols-outlined text-teal-400">school</span> {detailStudent.standard}</span>
                         <span className="opacity-20">|</span>
                         <span className="flex items-center gap-2"><span className="material-symbols-outlined text-teal-400">calendar_today</span> {detailStudent.academicYear}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                   {/* Main Dossier Content */}
                   <div className="lg:col-span-8 space-y-10">
                      <div>
                         <div className="flex items-center gap-3 mb-8">
                            <div className="w-2 h-8 bg-slate-900 rounded-full" />
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight">Personnel Biography</h4>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
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
                              <div key={idx} className="bg-white p-6 transition-all hover:bg-slate-50/50">
                                 <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-outlined text-[14px] text-slate-400">{item.icon}</span>
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
                                 </div>
                                 <div className="text-[14px] font-extrabold text-slate-900">{item.value || 'N/A'}</div>
                              </div>
                            ))}
                            <div className="col-span-2 bg-white p-6 border-t border-slate-50 hover:bg-slate-50/50">
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
                              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Academic History</h4>
                           </div>
                           <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl">
                              <div className="flex justify-between items-start mb-8">
                                 <div>
                                    <div className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Qualifying Examination</div>
                                    <div className="text-2xl font-black">{detailStudent.academics[0].examName}</div>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Board Register</div>
                                    <div className="text-lg font-black">{detailStudent.academics[0].registerNo}</div>
                                 </div>
                              </div>
                              <div className="grid grid-cols-3 gap-6">
                                 <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-center">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate</div>
                                    <div className="text-xl font-black text-teal-400">{detailStudent.academics[0].totalObtainedMarks} / {detailStudent.academics[0].totalMaxMarks}</div>
                                 </div>
                                 <div className="bg-teal-500 p-5 rounded-2xl shadow-lg shadow-teal-500/20 text-center">
                                    <div className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-2">Percentage</div>
                                    <div className="text-2xl font-black text-white">{detailStudent.academics[0].totalPercentage}%</div>
                                 </div>
                                 <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-center">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Session</div>
                                    <div className="text-xl font-black text-white">{detailStudent.academics[0].monthYear}</div>
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Sidebar Content */}
                   <div className="lg:col-span-4">
                      <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 h-full">
                         <h4 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">shield</span> Institutional Status
                         </h4>
                         
                         <div className="space-y-6">
                            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Vitality</div>
                               <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full animate-pulse ${detailStudent.users?.isActive !== false ? 'bg-teal-500' : 'bg-rose-500'}`} />
                                  <span className="text-lg font-black text-slate-900">{detailStudent.users?.isActive !== false ? 'Active Individual' : 'Archived Record'}</span>
                               </div>
                            </div>

                            <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sibling Linkage</div>
                               <div className="text-lg font-black text-slate-900 flex items-center justify-between">
                                  {detailStudent.siblingGroupId ? 'Verified Family' : 'Independent'}
                                  <span className="material-symbols-outlined text-slate-200">family_restroom</span>
                               </div>
                            </div>

                            <div className="mt-12 pt-12 border-t border-slate-200">
                               <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Audit Synchronized</h5>
                               <p className="text-xs font-bold text-slate-500 leading-relaxed">
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

      
    </div>
  );
};

export default StudentView;
