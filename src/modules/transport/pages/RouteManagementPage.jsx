import React, { useEffect, useState } from "react";
import { Modal, Input, InputNumber, message, Popconfirm } from "antd";
import {
  getAllTransportRoutes,
  createTransportRoute,
  updateTransportRoute,
  deleteTransportRoute,
} from "../transport.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

const statusMeta = (route) => {
  const s = (route.status || "ACTIVE").toUpperCase();
  if (s === "ACTIVE") return { label: "ACTIVE", border: "border-[#44ddc1]", dot: "bg-[#44ddc1]" };
  if (s === "SUSPENDED") return { label: "SUSPENDED", border: "border-error", dot: "bg-error" };
  return { label: "SCHEDULED", border: "border-primary", dot: "bg-primary" };
};

// ── component ─────────────────────────────────────────────────────────────
const RouteManagementPage = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [savingRoute, setSavingRoute] = useState(false);
  const [showTip, setShowTip] = useState(true);

  // inline form state
  const [stops, setStops] = useState([]);

  // inline create form state (left panel)
  const [inlineForm, setInlineForm] = useState({
    routeName: "", routeNo: "", baseFee: "", splClassFee: "", description: "", conductorName: "", conductorPhone: "",
  });
  const [inlineStops, setInlineStops] = useState([]);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [showInlineForm, setShowInlineForm] = useState(false);

  const { hasPermission } = usePermissionHelpers();
  const canCreate = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_DELETE);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllTransportRoutes();
      setRoutes(data || []);
    } catch { message.error("Failed to load routes"); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── inline form helpers ──────────────────────────────────────────────────
  const resetInlineForm = () => {
    setInlineForm({ routeName: "", routeNo: "", baseFee: "", splClassFee: "", description: "" });
    setInlineStops([]);
    setEditingRouteId(null);
  };

  const openCreate = () => {
    if (!canCreate) { message.error("Not authorized to create routes"); return; }
    resetInlineForm();
    setShowInlineForm(true);
  };

  const openInlineEdit = (route) => {
    if (!canUpdate) { message.error("Not authorized to update routes"); return; }
    setEditingRouteId(route.id);
    setInlineForm({
      routeName: route.routeName || "",
      routeNo: route.routeNo || "",
      baseFee: route.baseFee || "",
      splClassFee: route.splClassFee || "",
      description: route.description || "",
      conductorName: route.conductorName || "",
      conductorPhone: route.conductorPhone || "",
    });
    setInlineStops(
      [...(route.stops || [])].sort((a, b) => a.stopOrder - b.stopOrder).map((s) => ({
        id: s.id,
        stopName: s.stopName || "",
        stopOrder: s.stopOrder || 1,
        distanceKm: s.distanceKm ?? "",
        pickupTime: s.pickupTime || "",
        dropTime: s.dropTime || "",
        fee: s.fee ?? "",
      }))
    );
    setShowInlineForm(true);
  };

  const addStop = () => {
    setInlineStops((prev) => [
      ...prev,
      { stopName: "", stopOrder: prev.length + 1, distanceKm: "", pickupTime: "", dropTime: "", fee: "" },
    ]);
  };

  const removeStop = (idx) => setInlineStops((prev) => prev.filter((_, i) => i !== idx));

  const updateStop = (idx, field, value) => {
    setInlineStops((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handlePublish = async () => {
    if (!inlineForm.routeName) { message.error("Route name is required"); return; }
    if (!inlineForm.baseFee) { message.error("Base fee is required"); return; }
    setSavingRoute(true);
    try {
      const payload = {
        routeName: inlineForm.routeName,
        routeNo: inlineForm.routeNo,
        baseFee: Number(inlineForm.baseFee),
        splClassFee: Number(inlineForm.splClassFee || 0),
        description: inlineForm.description,
        conductorName: inlineForm.conductorName || undefined,
        conductorPhone: inlineForm.conductorPhone || undefined,
        stops: inlineStops.map((s, i) => ({
          ...s,
          stopOrder: i + 1,
          distanceKm: s.distanceKm !== "" ? Number(s.distanceKm) : undefined,
          fee: s.fee !== "" ? Number(s.fee) : undefined,
        })),
      };
      if (editingRouteId) {
        await updateTransportRoute(editingRouteId, payload);
        message.success("Route updated successfully!");
      } else {
        await createTransportRoute(payload);
        message.success("Route published successfully!");
      }
      resetInlineForm();
      setShowInlineForm(false);
      fetchData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to save route"); }
    setSavingRoute(false);
  };

  const handleDelete = async (id) => {
    if (!canDelete) { message.error("Not authorized to delete routes"); return; }
    try {
      await deleteTransportRoute(id);
      message.success("Route deleted");
      fetchData();
    } catch (err) { message.error(err?.response?.data?.message || "Failed to delete route"); }
  };

  const openDetail = (route) => {
    setSelectedRoute(route);
    setDetailModal(true);
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">

      {/* ── editorial header ── */}
      <section>
        <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tight mb-2">
          Route Architecture
        </h2>
        <p className="text-on-surface-variant text-lg font-light max-w-2xl">
          Design precision-engineered logistics pathways. Map every stop, optimize scheduling, and manage institutional mobility with a curated workflow.
        </p>
      </section>

      {/* ── main workspace ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

        {/* ── LEFT: form panel (7 cols) ── */}
        <div className="lg:col-span-7 space-y-7">

          {/* Route configuration card */}
          <div className="bg-white rounded-2xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]">add_road</span>
            </div>
            <div className="flex items-center gap-3 mb-7">
              <div     style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}} className="h-10 w-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white">edit_note</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-primary">Route Configuration</h3>
              {!showInlineForm && canCreate && (
                <button
                  onClick={openCreate}
                      style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white rounded-full text-xs font-bold shadow-md hover:opacity-90 transition-opacity active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  New Route
                </button>
              )}
            </div>

            {!showInlineForm ? (
              <div className="text-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl opacity-20 block mb-3">route</span>
                <p className="text-sm font-medium">No route selected for editing.</p>
                <p className="text-xs opacity-60 mt-1">Click "New Route" above or edit an existing corridor from the right panel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: "Route Name", field: "routeName", placeholder: "e.g. North Campus Express", full: false },
                  { label: "Route Number", field: "routeNo", placeholder: "RT-402", full: false },
                  { label: "Base Fee (₹)", field: "baseFee", placeholder: "4500", type: "number", full: false },
                  { label: "Special Surcharge (₹)", field: "splClassFee", placeholder: "1250", type: "number", full: false },
                  { label: "Conductor Name", field: "conductorName", placeholder: "e.g. Ramesh Kumar", full: false },
                  { label: "Conductor Phone", field: "conductorPhone", placeholder: "e.g. 9876543210", full: false },
                ].map(({ label, field, placeholder, type }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest px-1">{label}</label>
                    <input
                      type={type || "text"}
                      value={inlineForm[field]}
                      onChange={(e) => setInlineForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 p-4 rounded-xl text-primary font-medium text-sm outline-none transition-all"
                    />
                  </div>
                ))}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest px-1">Route Description</label>
                  <textarea
                    rows={3}
                    value={inlineForm.description}
                    onChange={(e) => setInlineForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the service area, vehicle requirements, and specific operational constraints..."
                    className="w-full bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 p-4 rounded-xl text-primary font-medium text-sm outline-none resize-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stops section */}
          {showInlineForm && (
            <div className="bg-white rounded-2xl p-8 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-secondary-container rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                  </div>
                  <h3 className="font-headline text-xl font-bold text-primary">Sequence of Stops</h3>
                </div>
                <button
                  onClick={addStop}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-full text-xs font-bold text-primary"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Stop
                </button>
              </div>

              <div className="space-y-3">
                {inlineStops.length === 0 && (
                  <div className="text-center py-6 text-on-surface-variant text-sm italic opacity-60">
                    No stops added yet. Click "Add Stop" to begin.
                  </div>
                )}
                {inlineStops.map((stop, idx) => (
                  <div key={idx} className="flex flex-wrap md:flex-nowrap gap-4 items-center bg-surface-container-low p-4 rounded-xl hover:shadow-sm transition-shadow">
                    {/* number */}
                    <div className="shrink-0 w-6 flex justify-center">
                      <span className="h-6 w-6 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* stop name */}
                    <div className="flex-[2] min-w-[120px]">
                      <input
                        type="text"
                        value={stop.stopName}
                        onChange={(e) => updateStop(idx, "stopName", e.target.value)}
                        placeholder="Stop Name"
                        className="bg-transparent border-none text-sm font-semibold w-full focus:ring-0 outline-none p-0 text-primary"
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Stop Name</p>
                    </div>

                    {/* distance */}
                    <div className="flex-1 min-w-[70px]">
                      <input
                        type="number"
                        value={stop.distanceKm}
                        onChange={(e) => updateStop(idx, "distanceKm", e.target.value)}
                        placeholder="0.0"
                        className="bg-transparent border-none text-sm font-semibold w-full focus:ring-0 outline-none p-0"
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Distance (km)</p>
                    </div>

                    {/* fee */}
                    <div className="flex-1 min-w-[70px]">
                      <input
                        type="number"
                        value={stop.fee}
                        onChange={(e) => updateStop(idx, "fee", e.target.value)}
                        placeholder="—"
                        className="bg-transparent border-none text-sm font-semibold w-full focus:ring-0 outline-none p-0 text-amber-600"
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5" title="Leave blank for base fee">Override Fee (₹)</p>
                    </div>

                    {/* pickup */}
                    <div className="flex-1 min-w-[80px]">
                      <input
                        type="text"
                        value={stop.pickupTime}
                        onChange={(e) => updateStop(idx, "pickupTime", e.target.value)}
                        placeholder="07:30 AM"
                        className="bg-transparent border-none text-sm font-semibold w-full focus:ring-0 outline-none p-0 text-[#44ddc1]"
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Pickup</p>
                    </div>

                    {/* drop */}
                    <div className="flex-1 min-w-[80px]">
                      <input
                        type="text"
                        value={stop.dropTime}
                        onChange={(e) => updateStop(idx, "dropTime", e.target.value)}
                        placeholder="04:15 PM"
                        className="bg-transparent border-none text-sm font-semibold w-full focus:ring-0 outline-none p-0"
                      />
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Drop</p>
                    </div>

                    {/* delete */}
                    <div className="shrink-0 w-8 flex justify-end">
                      <button
                        onClick={() => removeStop(idx)}
                        className="text-on-surface-variant/40 hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* action buttons */}
              <div className="mt-7 flex justify-end gap-4">
                <button
                  onClick={() => { resetInlineForm(); setShowInlineForm(false); }}
                  className="px-8 py-3 text-sm font-bold text-primary hover:bg-surface-container-high rounded-full transition-colors"
                >
                  Discard Draft
                </button>
                <button
                  disabled={savingRoute}
                  onClick={handlePublish}
                      style={{
  background: 'linear-gradient(to right, #00152a, #102a43)'
}}
                  className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-br from-primary to-primary-container rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {savingRoute && <span className="material-symbols-outlined text-sm animate-spin">refresh</span>}
                  {editingRouteId ? "Update Route" : "Publish Route"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: existing routes list (5 cols) ── */}
        <div className="lg:col-span-5 space-y-7">

          {/* Preview / map placeholder */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(1,29,53,0.06)] h-48 relative group">
            {/* Background map image */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoH8l--y-juE8OQNflns63e2LuNce7SX4cp2K8D_GPVINSunt2C1CVqzrm-1eaHMRNWoR7gfr0_svPzqq9LdNrA1RGc1CGMSy0LjuoI5rvndSxfDPw3mIx-cci_vVI8_-DR8NdTW05hIITNhi1NKqo0HWAVmdEtSnwkMJl5Fh-6AmUFDkfm0xC82LNYQKuYJej7yWwzwfFxoY58XDdLbbtNuom1ijBTjLnrxHce1KuzP--__rqlFdZUd-p7bqi2FfLzcvl5CJWubE"
              alt="Route map visualization"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            {/* Gradient overlay + text */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent flex flex-col justify-end p-6">
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[120px] text-white">map</span>
              </div>
              <span className="text-white font-headline font-bold text-lg relative z-10">Route Topology Preview</span>
              <p className="text-white/70 text-xs relative z-10 mt-1">
                {routes.length} corridor{routes.length !== 1 ? "s" : ""} configured · {routes.reduce((a, r) => a + (r.stops?.length || 0), 0)} total stops
              </p>
            </div>
          </div>

          {/* Established corridors */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_20px_40px_rgba(1,29,53,0.06)]">
            <h3 className="font-headline text-lg font-bold text-primary mb-5">
              Established Corridors
            </h3>

            {loading ? (
              <div className="text-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl animate-spin opacity-30">refresh</span>
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-sm italic opacity-60">
                No routes configured yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {routes.map((route) => {
                  const { label, border, dot } = statusMeta(route);
                  return (
                    <div key={route.id} className={`flex items-center justify-between p-4 bg-surface rounded-xl border-l-4 ${border} hover:shadow-sm transition-shadow`}>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-on-surface-variant mb-0.5 uppercase tracking-tight flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
                          {route.routeNo ? `${route.routeNo} · ` : ""}{label}
                        </p>
                        <h4 className="font-headline font-bold text-primary leading-tight truncate">{route.routeName}</h4>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          {route.stops?.length || 0} Stop{(route.stops?.length || 0) !== 1 ? "s" : ""}
                          {" · "}{fmt(route.baseFee)} base fee
                          {route.splClassFee > 0 ? ` · +${fmt(route.splClassFee)} surcharge` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-3">
                        <button
                          onClick={() => openDetail(route)}
                          className="p-2 hover:bg-surface-container-high rounded-lg text-primary transition-colors"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-xl">visibility</span>
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => openInlineEdit(route)}
                            className="p-2 hover:bg-surface-container-high rounded-lg text-primary transition-colors"
                            title="Edit Route"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                        )}
                        {canDelete && (
                          <Popconfirm
                            title="Delete this route?"
                            onConfirm={() => handleDelete(route.id)}
                            okType="danger"
                          >
                            <button className="p-2 hover:bg-error-container/20 rounded-lg text-error transition-colors" title="Delete">
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canCreate && (
              <button
                onClick={openCreate}
                className="w-full mt-5 py-3 text-xs font-bold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create New Corridor
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── efficiency analytics ── */}
      <section>
        <div className="flex items-center gap-4 mb-5">
          <span className="h-px flex-1 bg-outline-variant/30" />
          <h3 className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-widest">
            Efficiency Analytics
          </h3>
          <span className="h-px flex-1 bg-outline-variant/30" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: "speed", iconColor: "text-[#44ddc1]", label: "Total Routes", value: routes.length, unit: "configured" },
            { icon: "location_on", iconColor: "text-primary", label: "Total Stops", value: routes.reduce((a, r) => a + (r.stops?.length || 0), 0), unit: "across all routes" },
            { icon: "payments", iconColor: "text-secondary", label: "Avg. Base Fee", value: routes.length > 0 ? `₹${Math.round(routes.reduce((a, r) => a + Number(r.baseFee || 0), 0) / routes.length).toLocaleString("en-IN")}` : "—", unit: "per route" },
          ].map(({ icon, iconColor, label, value, unit }) => (
            <div key={label} className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group">
              <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span
                  className={`material-symbols-outlined text-3xl ${iconColor}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-headline font-extrabold text-primary">{value}</p>
                <p className="text-[10px] text-on-surface-variant">{unit}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── detail modal ── */}
      <Modal
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDetailModal(false)} className="px-6 py-2 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low transition-colors">
              Close
            </button>
            {canUpdate && selectedRoute && (
              <button onClick={() => { setDetailModal(false); openInlineEdit(selectedRoute); }} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">edit</span>Edit Route
              </button>
            )}
          </div>
        }
        width={680}
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">route</span>
            <span className="font-headline font-bold">Route Details — {selectedRoute?.routeName || ""}</span>
          </div>
        }
      >
        {selectedRoute && (
          <div className="space-y-5">
            {/* summary grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Route Name", val: selectedRoute.routeName },
                { label: "Route No", val: selectedRoute.routeNo || "—" },
                { label: "Base Fee", val: fmt(selectedRoute.baseFee) },
                { label: "Spl Class Fee", val: selectedRoute.splClassFee > 0 ? fmt(selectedRoute.splClassFee) : "—" },
                { label: "Total Stops", val: selectedRoute.stops?.length || 0 },
                { label: "Students", val: selectedRoute.students?.length || 0 },
              ].map(({ label, val }) => (
                <div key={label} className="p-3 bg-surface-container-low rounded-xl">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {selectedRoute.description && (
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-on-surface">{selectedRoute.description}</p>
              </div>
            )}

            {/* stops */}
            {selectedRoute.stops?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Stop Sequence</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {[...selectedRoute.stops]
                    .sort((a, b) => a.stopOrder - b.stopOrder)
                    .map((stop, i) => (
                      <div key={stop.id || i} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                        <span className="h-6 w-6 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                          {String(stop.stopOrder || i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-primary truncate">{stop.stopName}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {stop.distanceKm != null ? `${stop.distanceKm} km` : ""}
                            {stop.pickupTime ? ` · ↑ ${stop.pickupTime}` : ""}
                            {stop.dropTime ? ` · ↓ ${stop.dropTime}` : ""}
                            {stop.fee ? ` · ₹${stop.fee}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── floating insight chip ── */}
      {showTip && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="bg-white py-3 px-6 rounded-full shadow-[0_20px_40px_rgba(1,29,53,0.15)] flex items-center gap-3 border border-white/40">
            <span className="h-2 w-2 rounded-full bg-[#44ddc1] animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-primary">
              {routes.length} route{routes.length !== 1 ? "s" : ""} configured · Path optimization active
            </span>
            <button onClick={() => setShowTip(false)} className="ml-2 hover:rotate-90 transition-transform flex-shrink-0">
              <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteManagementPage;
