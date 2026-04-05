import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { notification, Modal, Input, Form, message } from "antd";
import { getAPMTrackingData } from "../apm.service";
import {
  pushOdometerSnapshots,
  getDailyMileage,
  getVehicleDriverMap,
  upsertVehicleDriver,
  removeVehicleDriver,
  pushTripEvents,
} from "../transport.service";
import { getLiveDriverBusStatus } from "../transport.service";

// ── School center (PSF campus) ────────────────────────────────────────────
const SCHOOL_CENTER = [11.4648, 77.9264];

// ── Vehicle status helpers ────────────────────────────────────────────────
const STATUS_MAP = {
  Running: { label: "RUNNING", color: "#16a34a", bg: "bg-green-100", text: "text-green-700", border: "border-l-green-500", icon: "speed" },
  Stopped: { label: "STOPPED", color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700", border: "border-l-amber-500", icon: "local_parking" },
  Idle: { label: "IDLE", color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700", border: "border-l-blue-500", icon: "pause_circle" },
  InActive: { label: "INACTIVE", color: "#9ca3af", bg: "bg-gray-100", text: "text-gray-500", border: "border-l-gray-400", icon: "power_off" },
};

const getStatusCfg = (statusStr) => STATUS_MAP[statusStr] || STATUS_MAP.InActive;

// ── Custom bus marker icon ────────────────────────────────────────────────
const makeBusIcon = (statusStr) => {
  const cfg = getStatusCfg(statusStr);
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${cfg.color};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px ${cfg.color}44;
      border:3px solid white;
    "><span class="material-symbols-outlined" style="color:white;font-size:18px;">directions_bus</span></div>`,
  });
};

// ── Map auto-recenter component ───────────────────────────────────────────
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center]);
  return null;
};

// ── component ─────────────────────────────────────────────────────────────
const LiveTrackingPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [dailyMileage, setDailyMileage] = useState({});  // { deviceId: { dailyKm, firstReading, lastReading } }
  const [driverMap, setDriverMap] = useState({});  // plateNo → { name, phone, licenseNo }
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignVehicle, setAssignVehicle] = useState(null);
  const [assignForm] = Form.useForm();
  const mapRef = useRef(null);
  const prevIgnitionRef = useRef({});  // { deviceId: boolean } — tracks previous ignition states
  const [driverBusStatus, setDriverBusStatus] = useState(null);

  // ── Driver-Vehicle mapping (backend with localStorage fallback) ─────────
  const loadDriverMap = useCallback(async () => {
    const map = await getVehicleDriverMap();
    setDriverMap(map);
  }, []);

  useEffect(() => { loadDriverMap(); }, [loadDriverMap]);

  const getDriver = useCallback((v) => driverMap[v.plateNo] || null, [driverMap]);

  const openAssignModal = (vehicle, e) => {
    if (e) e.stopPropagation();
    setAssignVehicle(vehicle);
    const existing = driverMap[vehicle.plateNo];
    assignForm.setFieldsValue({
      driverName: existing?.name || "",
      driverPhone: existing?.phone || "",
      driverLicense: existing?.licenseNo || "",
    });
    setAssignModalOpen(true);
  };

  const handleAssignDriver = async () => {
    const values = await assignForm.validateFields();
    const map = await upsertVehicleDriver(assignVehicle.plateNo, {
      name: values.driverName,
      phone: values.driverPhone || "",
      licenseNo: values.driverLicense || "",
    });
    setDriverMap({ ...map });
    message.success(`Driver assigned to ${assignVehicle.plateNo}`);
    setAssignModalOpen(false);
    assignForm.resetFields();
  };

  const handleRemoveDriver = async (plateNo) => {
    const map = await removeVehicleDriver(plateNo);
    setDriverMap({ ...map });
    message.success("Driver removed");
  };

  const fetchMileage = useCallback(async () => {
    try {
      const data = await getDailyMileage();
      if (Array.isArray(data)) {
        const map = {};
        data.forEach((r) => { map[r.deviceId] = r; });
        setDailyMileage(map);
      }
    } catch { /* mileage is non-critical */ }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAPMTrackingData();
      const list = Array.isArray(data) ? data : [];

      // Detect ignition state transitions and log events
      const prev = prevIgnitionRef.current;
      const tripEvents = [];
      if (Object.keys(prev).length > 0) {
        list.forEach((v) => {
          const wasOn = prev[v.deviceId];
          const isOn = !!v.ignitionStatus;
          if (isOn && wasOn === false) {
            notification.info({
              message: `🔑 Ignition ON`,
              description: `${v.plateNo || "Unknown"} just started`,
              placement: "topRight",
              duration: 6,
            });
            tripEvents.push({
              plateNo: v.plateNo || "",
              deviceId: v.deviceId,
              event: "IGNITION_ON",
              driverName: driverMap[v.plateNo]?.name || null,
              latitude: v.latitude,
              longitude: v.longitude,
              speed: v.speed,
              odometer: v.odometer,
            });
          } else if (!isOn && wasOn === true) {
            tripEvents.push({
              plateNo: v.plateNo || "",
              deviceId: v.deviceId,
              event: "IGNITION_OFF",
              driverName: driverMap[v.plateNo]?.name || null,
              latitude: v.latitude,
              longitude: v.longitude,
              speed: v.speed,
              odometer: v.odometer,
            });
          }
        });
      }
      // Save current ignition states
      const ignMap = {};
      list.forEach((v) => { ignMap[v.deviceId] = !!v.ignitionStatus; });
      prevIgnitionRef.current = ignMap;

      // Push ignition events to backend (fire-and-forget)
      if (tripEvents.length > 0) {
        pushTripEvents(tripEvents).catch(() => {});
      }

      setVehicles(list);
      setLastRefresh(new Date());

      // Push odometer snapshots to backend (fire-and-forget)
      if (list.length > 0) {
        const snapshots = list
          .filter((v) => v.deviceId && v.odometer != null)
          .map((v) => ({ deviceId: v.deviceId, plateNo: v.plateNo || "", odometer: v.odometer }));
        if (snapshots.length > 0) {
          pushOdometerSnapshots(snapshots).catch(() => {});
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMileage();
    const timer = setInterval(fetchData, 15000);
    const mileageTimer = setInterval(fetchMileage, 60000); // refresh mileage every 60s
    return () => { clearInterval(timer); clearInterval(mileageTimer); };
  }, [fetchData, fetchMileage]);

  // ── derived data ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = vehicles;
    if (filter !== "all") list = list.filter((v) => v.vehicleStatusString === filter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter((v) =>
        (v.plateNo || "").toLowerCase().includes(q) ||
        (v.vehicleName || "").toLowerCase().includes(q) ||
        (v.serialNo || "").toLowerCase().includes(q) ||
        (driverMap[v.plateNo]?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, filter, searchText]);

  const stats = useMemo(() => {
    const running = vehicles.filter((v) => v.vehicleStatusString === "Running").length;
    const stopped = vehicles.filter((v) => v.vehicleStatusString === "Stopped").length;
    const idle = vehicles.filter((v) => v.vehicleStatusString === "Idle").length;
    const inactive = vehicles.filter((v) => v.vehicleStatusString === "InActive").length;
    return { total: vehicles.length, running, stopped, idle, inactive };
  }, [vehicles]);

  const mapCenter = useMemo(() => {
    if (selectedVehicle) return [selectedVehicle.latitude, selectedVehicle.longitude];
    if (filtered.length > 0) return [filtered[0].latitude, filtered[0].longitude];
    return SCHOOL_CENTER;
  }, [selectedVehicle, filtered]);

  const mapZoom = selectedVehicle ? 16 : 14;

  const formatTime = (dt) => {
    if (!dt) return "—";
    try { return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
  };

  const formatDate = (dt) => {
    if (!dt) return "—";
    try { return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
  };

  // Enhanced: driver+bus live status
  useEffect(() => {
    const fetchDriverBusStatus = async () => {
      try {
        const status = await getLiveDriverBusStatus();
        setDriverBusStatus(status);
      } catch {}
    };
    fetchDriverBusStatus();
    const interval = setInterval(fetchDriverBusStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* ── Left Column: Map + Fleet Cards ── */}
      <div className="flex-[3] flex flex-col gap-5 min-h-0">

        {/* Map */}
        <section className="relative rounded-2xl overflow-hidden shadow-md flex-1 bg-surface-container-low">
          <div className="absolute inset-0 z-0">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={mapCenter} zoom={mapZoom} />

              {/* Vehicle markers */}
              {filtered.map((v) => {
                const driver = getDriver(v);
                return (
                <Marker
                  key={v.deviceId}
                  position={[v.latitude, v.longitude]}
                  icon={makeBusIcon(v.vehicleStatusString)}
                  eventHandlers={{ click: () => setSelectedVehicle(v) }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[180px]">
                      <p className="font-bold text-base">{v.plateNo || "Unknown"}</p>
                      {driver && <p className="text-xs font-semibold text-blue-700">👤 {driver.name}</p>}
                      {driver?.phone && <p className="text-xs">📞 {driver.phone || driver.mobile}</p>}
                      <p className="text-xs text-gray-500">{v.vehicleStatusString} • {v.speed} km/h</p>
                      <p className="text-xs">🔋 {v.mainPowerStatus}V</p>
                      <p className="text-xs">📡 Signal: {v.gsmSignalStrength}</p>
                      <p className="text-xs">🕐 {formatDate(v.deviceTime)}</p>
                      {v.ignitionStatus && <p className="text-xs text-green-600 font-bold">🔑 Ignition ON</p>}
                    </div>
                  </Popup>
                </Marker>
                );
              })}

              {/* School marker */}
              <Marker
                position={SCHOOL_CENTER}
                icon={L.divIcon({
                  className: "",
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
                  html: `<div style="width:40px;height:40px;border-radius:50%;background:#00152a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,21,42,0.4);border:3px solid white;"><span class="material-symbols-outlined" style="color:#44ddc1;font-size:20px;">school</span></div>`,
                })}
              >
                <Popup><p className="font-bold text-sm">PSF School Campus</p></Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Refresh badge */}
          <div className="absolute top-5 right-5 z-[500]">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
            >
              <span className={`material-symbols-outlined text-base text-primary ${loading ? "animate-spin" : ""}`}>refresh</span>
              <span className="text-primary">Auto 15s</span>
            </button>
          </div>

          {/* Error toast */}
          {error && (
            <div className="absolute top-5 left-5 z-[500] bg-error-container text-error px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
              <span className="material-symbols-outlined text-sm align-middle mr-1">error</span>
              {error}
            </div>
          )}

          {/* Bottom stat cards */}
          <div className="absolute bottom-5 left-5 right-5 flex gap-3 z-[500]">
            {[
              { icon: "directions_bus", iconBg: "bg-primary/20", iconColor: "text-primary", label: "Total Fleet", value: stats.total, valueColor: "text-primary" },
              { icon: "speed", iconBg: "bg-green-100", iconColor: "text-green-700", label: "Running", value: stats.running, valueColor: "text-green-700" },
              { icon: "local_parking", iconBg: "bg-amber-100", iconColor: "text-amber-700", label: "Stopped", value: stats.stopped, valueColor: "text-amber-700" },
              { icon: "power_off", iconBg: "bg-gray-100", iconColor: "text-gray-500", label: "Inactive", value: stats.inactive, valueColor: "text-gray-500" },
              { icon: "schedule", iconBg: "bg-surface-container", iconColor: "text-on-surface-variant", label: "Last Refresh", value: lastRefresh ? lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—", valueColor: "text-on-surface" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex-1 p-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/40"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)" }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                  <span className={`material-symbols-outlined text-lg ${stat.iconColor}`}>{stat.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">{stat.label}</p>
                  <p className={`text-lg font-headline font-extrabold leading-tight ${stat.valueColor}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fleet cards */}
        <section className="shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-headline font-bold text-primary flex items-center gap-2">
              Fleet Overview
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-label tracking-tight">LIVE</span>
            </h3>
            <span className="text-xs text-on-surface-variant">{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-6 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">directions_bus</span>
              No vehicles match the current filter
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filtered.slice(0, 6).map((v) => {
                const cfg = getStatusCfg(v.vehicleStatusString);
                const mileage = dailyMileage[v.deviceId];
                const driver = getDriver(v);
                return (
                  <div
                    key={v.deviceId}
                    onClick={() => setSelectedVehicle(v)}
                    className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 ${cfg.border} group`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                        <h4 className="text-sm font-bold text-primary leading-tight">{v.plateNo || "Unknown"}</h4>
                      </div>
                      <span className="material-symbols-outlined text-xl" style={{ color: cfg.color }}>{cfg.icon}</span>
                    </div>
                    {driver && (
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xs text-primary">person</span>
                        </div>
                        <span className="truncate font-medium">{driver.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
                      <span className="material-symbols-outlined text-sm">speed</span>
                      <span>{v.speed} km/h</span>
                      {mileage && (
                        <span className="ml-auto text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                          {mileage.dailyKm} km today
                        </span>
                      )}
                      {!mileage && v.ignitionStatus && (
                        <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">IGN ON</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
                      <span>🔋 {v.mainPowerStatus}V</span>
                      <span>📡 {v.gsmSignalStrength}</span>
                      <span>{formatTime(v.deviceTime)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Right Panel: Vehicle List ── */}
      <aside className="flex-1 bg-surface-container-low rounded-2xl flex flex-col overflow-hidden shadow-sm min-w-[280px]">
        {/* Panel header */}
        <div className="p-5 border-b border-outline-variant/20 bg-white shrink-0">
          <h3 className="text-lg font-headline font-extrabold text-primary mb-0.5">Vehicle Tracker</h3>
          <p className="text-[11px] text-on-surface-variant">GPS Live Feed • Auto-refreshes every 15s</p>

          {/* Search */}
          <div className="mt-3 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-base">search</span>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search plate or driver..."
              className="w-full bg-surface-container-high border-none rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filter pills */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {[
              { key: "all", label: `All (${stats.total})` },
              { key: "Running", label: `Running (${stats.running})` },
              { key: "Stopped", label: `Stopped (${stats.stopped})` },
              { key: "InActive", label: `Inactive (${stats.inactive})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                  filter === f.key ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-sm p-6 text-center">
              <span className="material-symbols-outlined text-4xl mb-3 opacity-30">directions_bus</span>
              <p className="font-semibold">No vehicles found</p>
              <p className="text-xs mt-1 opacity-70">Tracking data will appear once GPS devices report</p>
            </div>
          ) : (
            filtered.map((v) => {
              const cfg = getStatusCfg(v.vehicleStatusString);
              const isSelected = selectedVehicle?.deviceId === v.deviceId;
              const mileage = dailyMileage[v.deviceId];
              const driver = getDriver(v);
              return (
                <div
                  key={v.deviceId}
                  onClick={() => setSelectedVehicle(isSelected ? null : v)}
                  className={`p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${
                    isSelected ? "bg-primary-container text-primary" : "bg-white hover:bg-primary-container/20"
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}20` }}
                  >
                    <span className="material-symbols-outlined" style={{ color: cfg.color, fontSize: 22 }}>directions_bus</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-primary truncate">{v.plateNo || "Unknown"}</h5>
                    {driver && <p className="text-[10px] text-blue-600 font-semibold truncate">👤 {driver.name}</p>}
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {v.speed} km/h • {formatTime(v.deviceTime)}
                      {mileage ? ` • ${mileage.dailyKm} km today` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    {v.ignitionStatus && (
                      <span className="text-[9px] font-bold text-green-600">🔑 ON</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail drawer */}
        {selectedVehicle && (() => {
          const mileage = dailyMileage[selectedVehicle.deviceId];
          const driver = getDriver(selectedVehicle);
          return (
          <div className="border-t border-outline-variant/20 bg-white p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-primary">{selectedVehicle.plateNo || "Vehicle Details"}</h4>
              <button onClick={() => setSelectedVehicle(null)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Driver info card */}
            {driver ? (
              <div className="mb-3 p-3 rounded-xl bg-primary-container/30 border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary">{driver.name}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {driver.phone || "No phone"}
                      {driver.licenseNo ? ` • DL: ${driver.licenseNo}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => openAssignModal(selectedVehicle, e)}
                      className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                      title="Edit Driver"
                    >
                      <span className="material-symbols-outlined text-xs text-primary">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveDriver(selectedVehicle.plateNo); }}
                      className="w-7 h-7 rounded-full bg-error/10 flex items-center justify-center hover:bg-error/20 transition-colors"
                      title="Remove Driver"
                    >
                      <span className="material-symbols-outlined text-xs text-error">person_remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => openAssignModal(selectedVehicle, e)}
                className="w-full mb-3 p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary-container/10 flex items-center justify-center gap-2 text-xs font-bold text-primary hover:bg-primary-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Assign Driver
              </button>
            )}

            {/* Daily mileage highlight */}
            {mileage && (
              <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-blue-600">route</span>
                  <span className="text-xs font-bold text-blue-700">Today's Mileage</span>
                </div>
                <p className="text-xl font-headline font-extrabold text-blue-800">{mileage.dailyKm} km</p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Start: {mileage.firstReading?.toFixed(2)} km • Now: {mileage.lastReading?.toFixed(2)} km
                </p>
              </div>
            )}

            <div className="space-y-2 text-xs text-on-surface-variant">
              {[
                { icon: "directions_bus", label: "Plate No", value: selectedVehicle.plateNo || "—" },
                { icon: "speed", label: "Speed", value: `${selectedVehicle.speed} km/h` },
                { icon: "power", label: "Ignition", value: selectedVehicle.ignitionStatus ? "ON" : "OFF" },
                { icon: "battery_charging_full", label: "Battery", value: `${selectedVehicle.internalBatteryVoltage}V` },
                { icon: "electrical_services", label: "Main Power", value: `${selectedVehicle.mainPowerStatus}V` },
                { icon: "cell_tower", label: "GSM Signal", value: `${selectedVehicle.gsmSignalStrength}` },
                { icon: "pin_drop", label: "Location", value: `${selectedVehicle.latitude.toFixed(5)}, ${selectedVehicle.longitude.toFixed(5)}` },
                { icon: "straighten", label: "Odometer", value: `${selectedVehicle.odometer.toFixed(2)} km` },
                { icon: "schedule", label: "Device Time", value: formatDate(selectedVehicle.deviceTime) },
                { icon: "tag", label: "IMEI", value: selectedVehicle.imei || "—" },
                { icon: "qr_code", label: "Serial No", value: selectedVehicle.serialNo || "—" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">{row.icon}</span>
                  <span className="text-on-surface-variant/70 w-20 shrink-0">{row.label}</span>
                  <span className="font-semibold text-on-surface truncate">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {/* Panel footer */}
        <div className="p-4 bg-white border-t border-outline-variant/10 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all text-sm"
          >
            <span className={`material-symbols-outlined text-base ${loading ? "animate-spin" : ""}`}>refresh</span>
            {loading ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>
      </aside>

      {/* ── Assign Driver Modal ── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person_add</span>
            <span>Assign Driver to {assignVehicle?.plateNo}</span>
          </div>
        }
        open={assignModalOpen}
        onOk={handleAssignDriver}
        onCancel={() => { setAssignModalOpen(false); assignForm.resetFields(); }}
        okText="Save"
        okButtonProps={{ style: { background: "#00152a" } }}
      >
        <Form form={assignForm} layout="vertical" className="mt-4">
          <Form.Item
            name="driverName"
            label="Driver Name"
            rules={[{ required: true, message: "Driver name is required" }]}
          >
            <Input placeholder="e.g. Rajesh Kumar" prefix={<span className="material-symbols-outlined text-sm text-gray-400">person</span>} />
          </Form.Item>
          <Form.Item name="driverPhone" label="Phone Number">
            <Input placeholder="e.g. 9876543210" prefix={<span className="material-symbols-outlined text-sm text-gray-400">call</span>} />
          </Form.Item>
          <Form.Item name="driverLicense" label="License Number">
            <Input placeholder="e.g. TN01 2023001234" prefix={<span className="material-symbols-outlined text-sm text-gray-400">badge</span>} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LiveTrackingPage;
