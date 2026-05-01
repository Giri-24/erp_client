import React, { useEffect, useState } from "react";
import { Select, message } from "antd";
import {
  assignStudentTransport,
  getAllTransportRoutes,
  getPendingTransportStudents,
  getStudentTransport,
  getTransportAcademicYears,
  getTransportFee,
  updateSplClassDates,
  stopSplClass,
} from "../transport.service";
import instance from "../../../utils/axios";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");
const formatStandardLabel = (standard) => {
  if (!standard) return "-";
  if (!String(standard).startsWith("STD_")) return standard;
  const value = Number(String(standard).replace("STD_", ""));
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix} Standard`;
};

// ── component ─────────────────────────────────────────────────────────────
const AssignTransportPage = ({ initialStudentId, onMounted }) => {
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // filter state
  const [filterStandard, setFilterStandard] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // form state
  const [studentId, setStudentId] = useState(null);
  const [academicYear, setAcademicYear] = useState("");
  const [routeId, setRouteId] = useState(null);
  const [stopId, setStopId] = useState(null);
  // (removed duplicate busno declaration)
  const [isSplClass, setIsSplClass] = useState(false);

  const [busno, setBusno] = useState("");
  // Buses for selected route
  const [routeBuses, setRouteBuses] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [feePreview, setFeePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTip, setShowTip] = useState(true);

  // spl class tracking
  const [splClassDaysUsed, setSplClassDaysUsed] = useState("");
  const [totalWorkingDays, setTotalWorkingDays] = useState("");
  const [stoppingSplClass, setStoppingSplClass] = useState(false);

  const { hasPermission } = usePermissionHelpers();
  const canAssign = hasPermission(PERMISSIONS.TRANSPORT_ASSIGN);
  // ── data ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (onMounted) onMounted();
    const loadInitialData = async () => {
      try {
        const [years, routeData, admissionsResponse] = await Promise.all([
          getTransportAcademicYears(),
          getAllTransportRoutes(),
          instance.get("/admissions"),
        ]);

        const normalizedYears = years || [];
        setAvailableYears(normalizedYears);
        setAcademicYear((current) => current || normalizedYears[0] || "");
        setRoutes(routeData || []);
        
        const active = (admissionsResponse.data || []).filter(
          (student) => student.users?.isActive !== false && student.admission?.isApproved,
        );
        setStudents(active);

        // Auto-select student if initialStudentId is provided
        if (initialStudentId) {
          // Wait slightly for routes to be set
          setTimeout(() => {
            onStudentChange(initialStudentId);
          }, 100);
        }
      } catch {
        message.error("Failed to load transport form data");
      }
    };

    loadInitialData();
  }, [initialStudentId]);

  useEffect(() => {
    if (!academicYear) return;

    getPendingTransportStudents(academicYear)
      .then((res) => setPendingStudents(res?.students || []))
      .catch(() => setPendingStudents([]));
  }, [academicYear]);

  const onStudentChange = async (id) => {
    setStudentId(id);
    setCurrentAssignment(null);
    setFeePreview(null);
    setSplClassDaysUsed("");
    setTotalWorkingDays("");
    try {
      const assignment = await getStudentTransport(id);
      setCurrentAssignment(assignment);
      setRouteId(assignment.routeId);
      setStopId(assignment.stopId);
      setIsSplClass(!!assignment.isSplClass);
      setSplClassDaysUsed(assignment.splClassDaysUsed ?? "");
      setTotalWorkingDays(assignment.totalWorkingDays ?? "");
      setAcademicYear(assignment.academicYear || academicYear || availableYears[0] || "");
      const route = routes.find((r) => r.id === assignment.routeId);
      setSelectedRoute(route || null);
      setRouteBuses(route?.buses || []);
      const fee = await getTransportFee(id);
      setFeePreview(fee);
    } catch { /* no existing assignment */ }
  };

  const onRouteChange = (id) => {
    setRouteId(id);
    setStopId(null);
    setFeePreview(null);
    const route = routes.find((r) => r.id === id);
    setSelectedRoute(route || null);
    setRouteBuses(route?.buses || []);
  };

  const handleSubmit = async () => {
    if (!canAssign) { message.error("Not authorized to assign transport"); return; }
    if (!studentId) { message.error("Please select a student"); return; }
    if (!routeId) { message.error("Please select a route"); return; }
    if (!busno) { message.error("Please enter bus number"); return; }
    setLoading(true);
    try {
      const response = await assignStudentTransport({ studentId, academicYear, routeId, stopId, busno, isSplClass });
      message.success(response?.message || (currentAssignment ? "Assignment updated!" : "Transport assigned successfully!"));
      const fee = await getTransportFee(studentId);
      setFeePreview(fee);
      const assignment = await getStudentTransport(studentId);
      setCurrentAssignment(assignment);
      const pendingResponse = await getPendingTransportStudents(academicYear);
      setPendingStudents(pendingResponse?.students || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to assign transport");
    }
    setLoading(false);
  };

  const handleStopSplClass = async () => {
    if (!studentId) { message.error("Please select a student"); return; }
    if (!splClassDaysUsed || !totalWorkingDays) { message.error("Please enter days used and total working days"); return; }
    setStoppingSplClass(true);
    try {
      await stopSplClass(studentId, {
        splClassDaysUsed: Number(splClassDaysUsed),
        totalWorkingDays: Number(totalWorkingDays),
      });
      message.success("Special class stopped — pro-rata fee updated");
      const fee = await getTransportFee(studentId);
      setFeePreview(fee);
      const assignment = await getStudentTransport(studentId);
      setCurrentAssignment(assignment);
      setSplClassDaysUsed(assignment.splClassDaysUsed ?? "");
      setTotalWorkingDays(assignment.totalWorkingDays ?? "");
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to stop special class");
    }
    setStoppingSplClass(false);
  };

  // derive unique standard and section options from loaded students
  const standardOptions = Array.from(
    new Set(students.map((s) => s.standard).filter(Boolean))
  ).sort();

  const sectionOptions = Array.from(
    new Set(
      students
        .filter((s) => !filterStandard || s.standard === filterStandard)
        .map((s) => s.section)
        .filter(Boolean)
    )
  ).sort();

  // apply standard + section filters
  const filteredStudents = students.filter((s) => {
    if (filterStandard && s.standard !== filterStandard) return false;
    if (filterSection && (s.section || "") !== filterSection) return false;
    return true;
  });

  // student options for antd Select (uses filtered list)
  const studentOptions = filteredStudents.map((s) => {
    const admNo = s.admission?.admissionNo || "-";
    const standardLabel = s.standardLabel || formatStandardLabel(s.standard);
    const section = s.section ? ` [${s.section}]` : "";
    return {
      value: s.id,
      label: `${s.name}${section} — ${standardLabel} — ${admNo}`,
      searchText: `${s.name} ${standardLabel} ${s.standard} ${s.section || ""} ${admNo}`.toLowerCase(),
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── header ── */}
      <div>
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          <span>Transport</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary-fixed-dim">Assign</span>
        </nav>
        <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight">Assign Transport</h2>
        <p className="text-on-surface-variant mt-1 max-w-lg text-sm">
          Manage student commuting logistics by assigning routes, vehicles, and academic schedules in one unified portal.
        </p>
      </div>

      {/* ── bento grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

        {/* ── LEFT: assignment form (7 cols) ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-ambient overflow-hidden">
          {/* top accent stripe */}
          <div     style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}} className="h-1 w-full bg-linear-to-r from-primary to-primary-container" />

          <div className="p-8 lg:p-10">
            {/* form header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center text-primary shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  person_add
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary font-headline">
                  {currentAssignment ? "Update Assignment" : "New Assignment"}
                </h3>
                <p className="text-sm text-on-surface-variant">Fill details to link student to transport service</p>
              </div>
            </div>

            {/* existing assignment banner */}
            {currentAssignment && (
              <div className="mb-6 flex items-start gap-3 bg-[#44ddc1]/10 border border-[#44ddc1]/30 rounded-xl px-4 py-3">
                <span
                  className="material-symbols-outlined text-[#44ddc1] shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                <p className="text-sm font-medium text-primary">
                  Currently assigned to{" "}
                  <span className="font-bold">{currentAssignment.route?.routeName || "Unknown"}</span>
                  {currentAssignment.stop ? ` — Stop: ${currentAssignment.stop.stopName}` : ""}
                  {currentAssignment.isSplClass ? " — Special Class" : ""}
                </p>
              </div>
            )}

            <div className="space-y-5">
              {/* ── Filter row: Standard + Section + Academic Year ── */}
              <div className="grid grid-cols-3 gap-3">
                {/* Standard filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Standard</label>
                  <div className="relative">
                    <select
                      value={filterStandard}
                      onChange={(e) => { setFilterStandard(e.target.value); setFilterSection(""); setStudentId(null); }}
                      className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-xl font-body text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm"
                    >
                      <option value="">All Standards</option>
                      {standardOptions.map((std) => (
                        <option key={std} value={std}>
                          {formatStandardLabel(std)}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-2.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
                  </div>
                </div>

                {/* Section filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Section</label>
                  <div className="relative">
                    <select
                      value={filterSection}
                      onChange={(e) => { setFilterSection(e.target.value); setStudentId(null); }}
                      className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-xl font-body text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm"
                    >
                      <option value="">All Sections</option>
                      {sectionOptions.map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-2.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
                  </div>
                </div>

                {/* Academic Year filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Academic Year</label>
                  <div className="relative">
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-xl font-body text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-2.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Active filter chips */}
              {(filterStandard || filterSection) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-on-surface-variant">Filtered:</span>
                  {filterStandard && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                      {formatStandardLabel(filterStandard)}
                      <button onClick={() => { setFilterStandard(""); setFilterSection(""); setStudentId(null); }} className="ml-0.5 hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  )}
                  {filterSection && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                      Section {filterSection}
                      <button onClick={() => { setFilterSection(""); setStudentId(null); }} className="ml-0.5 hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant ml-1">{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}</span>
                </div>
              )}

              {/* Student search */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary ml-1">
                  Student
                  <span className="ml-2 text-xs font-normal text-on-surface-variant">
                    {filteredStudents.length} available
                  </span>
                </label>
                <Select
                  showSearch
                  placeholder="Search by name / section / admission no..."
                  className="w-full"
                  value={studentId}
                  onChange={onStudentChange}
                  optionFilterProp="searchText"
                  options={studentOptions}
                  filterOption={(input, option) =>
                    (option?.searchText || "").includes(input.toLowerCase())
                  }
                  size="large"
                />
              </div>
     {/* Route row (academic year now in filter bar above) */}
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-primary ml-1">Route</label>
                  <div className="relative">
                    <select
                      value={routeId || ""}
                      onChange={(e) => onRouteChange(e.target.value || null)}
                      className="w-full px-4 py-3.5 bg-surface-container-high border-none rounded-xl font-body text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm"
                    >
                      <option value="">Select Route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.routeName}{r.routeNo ? ` (${r.routeNo})` : ""} — {fmt(r.baseFee)}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
                  </div>
                </div>
              </div>
              {/* Bus Number dropdown (populated by selected route) */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary ml-1">Bus Number</label>
                <select
                  value={busno}
                  onChange={e => setBusno(e.target.value)}
                  className="w-full px-4 py-3.5 bg-surface-container-high border-none rounded-xl font-body text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm"
                  disabled={!selectedRoute || !routeBuses.length}
                >
                  <option value="">{!selectedRoute ? "Select a route first" : routeBuses.length ? "Select Bus" : "No buses for this route"}</option>
                  {routeBuses.map((bus) => (
                    <option key={bus.id} value={bus.number}>{bus.number} (Capacity: {bus.capacity})</option>
                  ))}
                </select>
              </div>

         

              {selectedRoute?.stops?.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-primary ml-1">Stop <span className="text-on-surface-variant font-normal">(Optional)</span></label>
                  <div className="relative">
                    <select
                      value={stopId || ""}
                      onChange={(e) => setStopId(e.target.value || null)}
                      className="w-full px-4 py-3.5 bg-surface-container-high border-none rounded-xl font-body text-on-surface appearance-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm"
                    >
                      <option value="">No specific stop</option>
                      {[...selectedRoute.stops]
                        .sort((a, b) => a.stopOrder - b.stopOrder)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.stopOrder}. {s.stopName}
                            {s.fee ? ` (${fmt(s.fee)})` : ""}
                            {s.pickupTime ? ` — ${s.pickupTime}` : ""}
                          </option>
                        ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-on-surface-variant text-base">expand_more</span>
                  </div>
                </div>
              )}

              {/* Route info preview */}
              {selectedRoute && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Base Fee", val: fmt(selectedRoute.baseFee) },
                    { label: "Spl. Surcharge", val: selectedRoute.splClassFee > 0 ? fmt(selectedRoute.splClassFee) : "—" },
                    { label: "Total Stops", val: selectedRoute.stops?.length || 0 },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-surface-container-low rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Special class toggle */}
              <div className="bg-surface-container-low p-5 rounded-xl flex items-center justify-between hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
                    <span className="material-symbols-outlined">event_repeat</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-sm">Special Class Requirement</h4>
                    <p className="text-xs text-on-surface-variant">Include transport for late evening sessions</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isSplClass}
                    onChange={(e) => setIsSplClass(e.target.checked)}
                  />
                  <div className="w-12 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              {/* Spl Class Pro-rata Tracking */}
              {isSplClass && currentAssignment?.isSplClass && (
                <div className="bg-surface-container-low p-5 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-sm">calculate</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm">Pro-rata Calculation</h4>
                      <p className="text-xs text-on-surface-variant">Track actual days used for pro-rata transport billing</p>
                    </div>
                  </div>

                  {currentAssignment.splClassStartDate && (
                    <div className="flex items-center gap-2 bg-[#44ddc1]/10 border border-[#44ddc1]/30 rounded-lg px-3 py-2">
                      <span className="material-symbols-outlined text-[#44ddc1] text-sm">event</span>
                      <span className="text-xs font-medium text-primary">
                        Started: {new Date(currentAssignment.splClassStartDate).toLocaleDateString("en-IN")}
                        {currentAssignment.splClassEndDate && ` — Ended: ${new Date(currentAssignment.splClassEndDate).toLocaleDateString("en-IN")}`}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">Days Used</label>
                      <input
                        type="number" min={0}
                        value={splClassDaysUsed}
                        onChange={(e) => setSplClassDaysUsed(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">Total Working Days</label>
                      <input
                        type="number" min={1}
                        value={totalWorkingDays}
                        onChange={(e) => setTotalWorkingDays(e.target.value)}
                        placeholder="e.g. 30"
                        className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {splClassDaysUsed && totalWorkingDays && Number(totalWorkingDays) > 0 && (
                    <div className="bg-primary-fixed/30 rounded-xl px-4 py-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-on-surface-variant">Pro-rata ratio</span>
                      <span className="text-sm font-extrabold text-primary">
                        {splClassDaysUsed} / {totalWorkingDays} = {((Number(splClassDaysUsed) / Number(totalWorkingDays)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {!currentAssignment.splClassEndDate && (
                    <button
                      onClick={handleStopSplClass}
                      disabled={stoppingSplClass || !splClassDaysUsed || !totalWorkingDays}
                      className="w-full py-3 px-4 bg-error text-white font-bold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {stoppingSplClass && <span className="material-symbols-outlined text-sm animate-spin">refresh</span>}
                      <span className="material-symbols-outlined text-sm">stop_circle</span>
                      Stop Special Class & Calculate Pro-rata
                    </button>
                  )}
                </div>
              )}

              {/* Fee preview */}
              {feePreview && (
                <div className="bg-[#44ddc1]/10 border border-[#44ddc1]/30 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Current Transport Fee</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Base Fee", val: fmt(feePreview.baseFee) },
                      { label: "Spl. Class", val: feePreview.splClassFee > 0 ? fmt(feePreview.splClassFee) : "—" },
                      { label: "Total Fee", val: fmt(feePreview.totalFee), highlight: true },
                    ].map(({ label, val, highlight }) => (
                      <div key={label} className="text-center">
                        <p className="text-[10px] text-on-surface-variant font-medium">{label}</p>
                        <p className={`text-sm font-extrabold mt-0.5 ${highlight ? "text-[#005145]" : "text-primary"}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {feePreview.proRataSplClassFee != null && feePreview.proRataSplClassFee !== feePreview.splClassFee && (
                    <div className="mt-3 pt-3 border-t border-[#44ddc1]/20 flex justify-between items-center">
                      <span className="text-xs font-medium text-on-surface-variant">Pro-rata Spl. Class Fee</span>
                      <span className="text-sm font-extrabold text-[#005145]">{fmt(feePreview.proRataSplClassFee)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={loading || !canAssign}
                    style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}}
                className="w-full py-4 px-6 bg-linear-to-br from-primary to-primary-container text-white font-headline font-bold text-lg rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {loading && <span className="material-symbols-outlined text-lg animate-spin">refresh</span>}
                {currentAssignment ? "Update Assignment" : "Assign Transport"}
                {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: context cards (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">

          {/* Dark capacity card */}
          <div className="bg-primary text-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.15)] relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <span
                className="material-symbols-outlined text-[200px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bus_alert
              </span>
            </div>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-[#44ddc1]/20 text-[#44ddc1] text-[10px] font-bold tracking-wider rounded-full mb-5">
                LIVE CAPACITY
              </span>
              <h4 className="text-3xl font-bold font-headline mb-2">{routes.length} Routes</h4>
              <p className="text-primary-fixed/70 text-sm leading-relaxed">
                {routes.length} configured corridors across all zones.
                {routes.reduce((a, r) => a + (r.stops?.length || 0), 0)} total boarding stops.
              </p>
              <div className="mt-7 flex gap-4">
                <div className="bg-white/10 p-4 rounded-xl flex-1 backdrop-blur-sm">
                  <p className="text-xs text-primary-fixed/60 mb-1">Total Routes</p>
                  <p className="text-xl font-bold">{routes.length}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl flex-1 backdrop-blur-sm">
                  <p className="text-xs text-primary-fixed/60 mb-1">Total Stops</p>
                  <p className="text-xl font-bold">{routes.reduce((a, r) => a + (r.stops?.length || 0), 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI insight chip */}
          <div className="bg-white p-6 rounded-2xl shadow-ambient border-l-4 border-[#44ddc1]">
            <div className="flex items-start gap-4">
              <span
                className="material-symbols-outlined text-[#44ddc1] mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
              <div>
                <h5 className="text-sm font-bold text-primary">Intelligent Routing Insight</h5>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Students who requested transport but are not yet mapped for {academicYear || "the selected year"} appear below. Route fee is calculated automatically based on the selected stop.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-ambient">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Students Awaiting Mapping</h4>
              <span className="text-xs font-semibold text-on-surface-variant">{pendingStudents.length} pending</span>
            </div>
            <div className="space-y-3">
              {pendingStudents.slice(0, 5).map((student) => (
                <button
                  key={student.id}
                  onClick={() => onStudentChange(student.id)}
                  className="w-full text-left flex items-center gap-4 cursor-pointer hover:bg-surface rounded-xl px-3 py-2 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary text-xs shrink-0">
                    {student.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{student.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {student.standardLabel || formatStandardLabel(student.standard)} · {student.admissionNo || "No Admission No"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#44ddc1] shrink-0">arrow_forward</span>
                </button>
              ))}
              {pendingStudents.length === 0 && (
                <p className="text-xs text-on-surface-variant italic text-center py-4">No pending transport mapping for this academic year.</p>
              )}
            </div>
          </div>

          {/* Recent assignments */}
          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-5">Available Routes</h4>
            <div className="space-y-3">
              {routes.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 cursor-pointer hover:bg-white rounded-xl px-3 py-2 transition-colors"
                  onClick={() => onRouteChange(r.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary text-xs shrink-0">
                    {(r.routeNo || r.routeName || "").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{r.routeName}</p>
                    <p className="text-xs text-on-surface-variant">
                      {r.stops?.length || 0} stops · {fmt(r.baseFee)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#44ddc1] shrink-0">
                    {routeId === r.id ? "check_circle" : "chevron_right"}
                  </span>
                </div>
              ))}
              {routes.length === 0 && (
                <p className="text-xs text-on-surface-variant italic text-center py-4">No routes configured yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── floating batch pill ── */}
      {showTip && students.length > 0 && (
        <div className="fixed bottom-8 right-8 z-50 pointer-events-auto">
          <div className="bg-white shadow-[0_20px_40px_rgba(1,29,53,0.15)] p-4 rounded-full flex items-center gap-4 border border-outline-variant/10">
            {/* avatar stack */}
            <div className="flex -space-x-3 ml-2">
              {["SC", "RT", `+${Math.max(0, students.length - 2)}`].map((label, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary ${
                    i === 0 ? "bg-primary-fixed" : i === 1 ? "bg-secondary-container" : "bg-surface-container-highest"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="h-6 w-px bg-outline-variant/30" />
            <div className="pr-1">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Pending Mapping</p>
              <p className="text-xs font-bold text-primary">{pendingStudents.length} Students Awaiting Assignment</p>
            </div>
            <button
              onClick={() => setShowTip(false)}
              className="text-on-surface-variant hover:text-primary transition-colors ml-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignTransportPage;
