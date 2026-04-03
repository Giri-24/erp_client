import React, { useEffect, useState } from "react";
import { Select, message } from "antd";
import { getAllStudentFees, getStudentKitIssues, issueKitItem, removeKitIssue, getAcademicYears } from "../fees.service";
import instance from "../../../utils/axios";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

const KitIssuePage = () => {
  const [students, setStudents] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [kitData, setKitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);

  // load academic years on mount
  useEffect(() => {
    Promise.all([
      getAcademicYears(),
      instance.get("/admissions").then((r) => r.data || []),
    ]).then(([years, admissions]) => {
      const yearList = years || [];
      setAcademicYearOptions(yearList);
      if (yearList.length > 0) setAcademicYear(yearList[0]);
      const active = (admissions || []).filter((s) => s.users?.isActive !== false && s.admission?.isApproved);
      setStudents(active);
    }).catch(() => {});
  }, []);

  // load student fees when academic year changes
  useEffect(() => {
    if (!academicYear) return;
    getAllStudentFees(academicYear).then((fees) => {
      setStudentFees(fees || []);
    }).catch(() => setStudentFees([]));
  }, [academicYear]);

  const onStudentChange = async (id) => {
    setStudentId(id);
    setSelectedFee(null);
    setKitData(null);
    const fee = studentFees.find((f) => f.studentId === id);
    if (fee) {
      setSelectedFee(fee);
      try {
        const data = await getStudentKitIssues(fee.id);
        setKitData(data);
      } catch { /* no kit data */ }
    } else {
      message.warning("No fee record found for this student in " + academicYear);
    }
  };

  const handleIssue = async (storeItemId, amount) => {
    if (!selectedFee) return;
    setIssuing(true);
    try {
      await issueKitItem({
        studentFeeId: selectedFee.id,
        storeItemId,
        quantity: 1,
        amount,
      });
      message.success("Kit item issued");
      const data = await getStudentKitIssues(selectedFee.id);
      setKitData(data);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to issue kit item");
    }
    setIssuing(false);
  };

  const handleRemove = async (kitIssueId) => {
    try {
      await removeKitIssue(kitIssueId);
      message.success("Kit item removed");
      if (selectedFee) {
        const data = await getStudentKitIssues(selectedFee.id);
        setKitData(data);
      }
    } catch {
      message.error("Failed to remove kit item");
    }
  };

  const studentOptions = students.map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.standardLabel || s.standard || ""} — ${s.admission?.admissionNo || "-"}`,
    searchText: `${s.name} ${s.standard} ${s.admission?.admissionNo || ""}`.toLowerCase(),
  }));

  const bookFee = kitData?.bookFee ?? selectedFee?.bookFee ?? 0;
  const kitAmount = kitData?.kitAmount ?? 0;
  const bookBalance = kitData?.bookBalance ?? bookFee;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          <span>Fee Management</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary-fixed-dim">Kit Issue</span>
        </nav>
        <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight">Kit / Book Issue</h2>
        <p className="text-on-surface-variant mt-1 max-w-lg text-sm">
          Issue kit items (shoes, belt, uniform, etc.) against a student's book fee allocation. Remaining balance is updated in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT: form */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden">
          <div style={{ background: "linear-gradient(to right, #00152a, #102a43)" }} className="h-1 w-full" />
          <div className="p-8 lg:p-10 space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary font-headline">Issue Kit Item</h3>
                <p className="text-sm text-on-surface-variant">Select student and issue POS items against book fees</p>
              </div>
            </div>

            {/* Academic year + Student selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary ml-1">Academic Year</label>
              <Select
                value={academicYear || undefined}
                onChange={(val) => { setAcademicYear(val); setStudentId(null); setSelectedFee(null); setKitData(null); }}
                options={academicYearOptions.map((y) => ({ label: y, value: y }))}
                placeholder="Select academic year"
                size="large"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary ml-1">Student</label>
              <Select
                showSearch
                placeholder="Search by name / standard / admission no..."
                className="w-full"
                value={studentId}
                onChange={onStudentChange}
                optionFilterProp="searchText"
                options={studentOptions}
                filterOption={(input, option) => (option?.searchText || "").includes(input.toLowerCase())}
                size="large"
              />
            </div>

            {/* Balance cards */}
            {selectedFee && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Book Fee", val: bookFee },
                  { label: "Kit Issued", val: kitAmount, warn: true },
                  { label: "Balance", val: bookBalance, highlight: true },
                ].map(({ label, val, warn, highlight }) => (
                  <div key={label} className="text-center p-4 bg-surface-container-low rounded-xl">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
                    <p className={`text-lg font-extrabold mt-1 ${highlight ? "text-[#005145]" : warn ? "text-error" : "text-primary"}`}>{fmt(val)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Kit Items — toggle cards */}
            {selectedFee && kitData && (kitData.allowedKitItems || []).length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">Kit Items from Fee Structure</p>
                {(kitData.allowedKitItems || []).map((item) => {
                  const issued = (kitData.kitIssues || []).find((ki) => ki.storeItem?.id === item.storeItemId);
                  const isIssued = !!issued;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all ${isIssued ? "bg-[#e8f5e9] ring-1 ring-[#4caf50]/30" : "bg-surface-container-low"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isIssued ? "bg-[#4caf50]/15" : "bg-primary-fixed"}`}>
                          <span className={`material-symbols-outlined text-lg ${isIssued ? "text-[#2e7d32]" : "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isIssued ? "check_circle" : "inventory_2"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{item.storeItem?.name || "Item"}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {item.storeItem?.category || "—"} · Qty: {item.quantity || 1} · {fmt(item.amount || item.storeItem?.sellingPrice || 0)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          isIssued
                            ? handleRemove(issued.id)
                            : handleIssue(item.storeItemId, item.amount || item.storeItem?.sellingPrice || 0)
                        }
                        disabled={issuing}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                          isIssued
                            ? "bg-white text-error hover:bg-error-container"
                            : "text-white hover:opacity-90 active:scale-[0.97]"
                        }`}
                        style={!isIssued ? { background: "linear-gradient(to right, #00152a, #102a43)" } : undefined}
                      >
                        <span className="material-symbols-outlined text-sm">{isIssued ? "remove_circle" : "add_circle"}</span>
                        {isIssued ? "Remove" : "Issue"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedFee && kitData && (kitData.allowedKitItems || []).length === 0 && (
              <div className="text-center py-6 text-on-surface-variant bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-3xl block mb-2 opacity-25">info</span>
                <p className="text-sm font-medium">No kit items mapped in fee structure</p>
                <p className="text-xs mt-1 opacity-70">Map POS items in the Fee Structure page first</p>
              </div>
            )}

            {selectedFee && !kitData && (
              <div className="text-center py-6 text-on-surface-variant bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-3xl block mb-2 opacity-25">warning</span>
                <p className="text-sm font-medium">No fee data found</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: issued items list */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Issued Kit Items</h4>

            {!kitData || (kitData.kitIssues || []).length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl block mb-2 opacity-25">inventory_2</span>
                <p className="text-sm font-medium">No kit items issued yet</p>
                <p className="text-xs mt-1 opacity-70">Select a student and issue items from the left panel</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(kitData.kitIssues || []).map((ki) => (
                  <div key={ki.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-sm">inventory_2</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{ki.storeItem?.name || "Item"}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          Qty: {ki.quantity || 1} · {ki.issuedDate ? new Date(ki.issuedDate).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{fmt(ki.amount)}</span>
                      <button
                        onClick={() => handleRemove(ki.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="bg-white p-6 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] border-l-4 border-[#44ddc1]">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-[#44ddc1] mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              <div>
                <h5 className="text-sm font-bold text-primary">Kit Fee Logic</h5>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Kit items are deducted from the student's Book / Kit fee. If the book fee is ₹5,000 and ₹2,000 worth of items (shoes, belt, etc.) are issued, the remaining book balance is ₹3,000.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitIssuePage;
