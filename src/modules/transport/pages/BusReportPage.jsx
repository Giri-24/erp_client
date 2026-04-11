import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { notification } from "antd";

const API_BASE = (() => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (!apiUrl) return '';
    const url = new URL(apiUrl, window.location.origin);
    return url.origin;
  } catch {
    return '';
  }
})();

/* ── Resolve image URL (supports absolute Supabase URLs and relative local paths) ── */
const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

/* ── Receipt Image Modal ── */
const ReceiptModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  const src = resolveImageUrl(imageUrl);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-3xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-red-50 transition-colors"
        >
          <span className="material-symbols-outlined text-lg text-red-600">close</span>
        </button>
        <img
          src={src}
          alt="Fuel receipt"
          className="rounded-xl shadow-2xl max-h-[85vh] w-auto object-contain bg-white"
          onError={(e) => { e.target.src = ''; e.target.alt = 'Failed to load image'; }}
        />
        <div className="mt-2 text-center">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
};
import { getAPMTrackingData } from "../apm.service";
import {
  getDailyMileage,
  getVehicleDriverMap,
  getBusReport,
  getDailyTripSummary,
  getTripHistory,
  getFuelLogs,
} from "../transport.service";
import { getLiveDriverBusStatus } from "../transport.service";

const SCHOOL_CENTER = [11.4648, 77.9264];

// ── helpers ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
  Running: { label: "RUNNING", color: "#16a34a", bg: "bg-green-100", text: "text-green-700", icon: "speed" },
  Stopped: { label: "STOPPED", color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700", icon: "local_parking" },
  Idle:    { label: "IDLE",    color: "#3b82f6", bg: "bg-blue-100",  text: "text-blue-700",  icon: "pause_circle" },
  InActive:{ label: "INACTIVE",color: "#9ca3af", bg: "bg-gray-100",  text: "text-gray-500",  icon: "power_off" },
};
const getStatusCfg = (s) => STATUS_MAP[s] || STATUS_MAP.InActive;

const fmtTime = (dt) => {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return "—"; }
};
const fmtDate = (dt) => {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};
const fmtDistance = (m) => {
  if (m == null) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
};
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const today = () => toDateInput(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return toDateInput(d); };

const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom || map.getZoom(), { animate: true }); }, [center]);
  return null;
};

const makeBusIcon = (statusStr) => {
  const cfg = getStatusCfg(statusStr);
  return L.divIcon({
    className: "", iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${cfg.color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${cfg.color}44;border:3px solid white;"><span class="material-symbols-outlined" style="color:white;font-size:18px;">directions_bus</span></div>`,
  });
};

const driverIcon = L.divIcon({
  className: "", iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15],
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#3b82f6;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,0.6);border:2px solid white;"><span class="material-symbols-outlined" style="color:white;font-size:16px;">person_pin</span></div>`,
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const BusReportPage = () => {
  const [receiptModalUrl, setReceiptModalUrl] = useState(null);
  /* ── state ── */
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driverMap, setDriverMap] = useState({});
  const [driverBusStatus, setDriverBusStatus] = useState(null);
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [reportDate, setReportDate] = useState(today());
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [tripSummary, setTripSummary] = useState([]);
  const [showMap, setShowMap] = useState(true);
  const [dailyMileage, setDailyMileage] = useState({});
  const [fuelLogs, setFuelLogs] = useState([]);
  const prevIgnitionRef = useRef({});

  /* ── quick date buttons ── */
  const quickDates = [
    { label: "Today", value: today() },
    { label: "Yesterday", value: yesterday() },
  ];

  /* ── load driver map ── */
  useEffect(() => {
    getVehicleDriverMap().then(setDriverMap).catch(() => {});
  }, []);

  /* ── fetch live APM data ── */
  const fetchLive = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAPMTrackingData();
      const list = Array.isArray(data) ? data : [];

      // Ignition notifications
      const prev = prevIgnitionRef.current;
      if (Object.keys(prev).length > 0) {
        list.forEach((v) => {
          const wasOn = prev[v.deviceId];
          const isOn = !!v.ignitionStatus;
          if (isOn && wasOn === false) {
            notification.info({ message: "Ignition ON", description: `${v.plateNo || "Unknown"} started`, placement: "topRight", duration: 6 });
          } else if (!isOn && wasOn === true) {
            notification.warning({ message: "Ignition OFF", description: `${v.plateNo || "Unknown"} turned off`, placement: "topRight", duration: 6 });
          }
        });
      }
      const ignMap = {};
      list.forEach((v) => { ignMap[v.deviceId] = !!v.ignitionStatus; });
      prevIgnitionRef.current = ignMap;

      setVehicles(list);
    } catch { /* fail silently */ }
    finally { setLoading(false); }
  }, []);

  /* ── fetch driver-bus live status ── */
  useEffect(() => {
    const fetchDriverStatus = async () => {
      try { setDriverBusStatus(await getLiveDriverBusStatus()); } catch {}
    };
    fetchDriverStatus();
    const iv = setInterval(fetchDriverStatus, 15000);
    return () => clearInterval(iv);
  }, []);

  /* ── fetch daily mileage ── */
  const fetchMileage = useCallback(async () => {
    try {
      const data = await getDailyMileage();
      if (Array.isArray(data)) {
        const m = {};
        data.forEach((r) => { m[r.deviceId] = r; });
        setDailyMileage(m);
      }
    } catch {}
  }, []);

  /* ── auto-refresh ── */
  useEffect(() => {
    fetchLive();
    fetchMileage();
    const t1 = setInterval(fetchLive, 15000);
    const t2 = setInterval(fetchMileage, 60000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchLive, fetchMileage]);

  /* ── fetch trip summary when date changes ── */
  useEffect(() => {
    getDailyTripSummary(reportDate).then((d) => setTripSummary(Array.isArray(d) ? d : [])).catch(() => setTripSummary([]));
  }, [reportDate]);

  /* ── fetch bus report when selected plate or date changes ── */
  useEffect(() => {
    if (!selectedPlate) { setReport(null); setFuelLogs([]); return; }
    setReportLoading(true);
    getBusReport(selectedPlate, reportDate)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setReportLoading(false));
    // Fetch fuel logs for selected bus
    const startOfDay = reportDate + "T00:00:00.000Z";
    const endOfDay = reportDate + "T23:59:59.999Z";
    getFuelLogs({ plateNo: selectedPlate, from: startOfDay, to: endOfDay })
      .then((d) => setFuelLogs(Array.isArray(d) ? d : []))
      .catch(() => setFuelLogs([]));
  }, [selectedPlate, reportDate]);

  /* ── enriched driver tracking ── */
  const enrichedDrivers = useMemo(() => {
    if (!driverBusStatus?.drivers) return [];
    return driverBusStatus.drivers.map((d) => {
      const plateNo = Object.keys(driverMap).find(
        (pl) => driverMap[pl].phone === d.driver?.phone || driverMap[pl].name === d.driver?.name
      ) || d.driver?.bus?.number;
      const assignedBus = plateNo ? vehicles.find((v) => v.plateNo === plateNo) : null;

      let distanceToBusMeters = null;
      let busStatus = null; // null means no bus GPS available
      if (assignedBus?.latitude && assignedBus?.longitude && d.latitude && d.longitude) {
        distanceToBusMeters = haversine(d.latitude, d.longitude, assignedBus.latitude, assignedBus.longitude);
        busStatus = distanceToBusMeters <= 50 ? "in-bus" : "outside";
      }
      return { ...d, distanceToBusMeters, driverBusStatus: busStatus, assignedBus, plateNo };
    });
  }, [driverBusStatus, vehicles, driverMap]);

  /* ── selected vehicle live data ── */
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.plateNo === selectedPlate), [vehicles, selectedPlate]);
  const selectedDriver = useMemo(() => (selectedPlate ? driverMap[selectedPlate] : null), [selectedPlate, driverMap]);
  const selectedDriverLive = useMemo(() => {
    if (!selectedDriver) return null;
    return enrichedDrivers.find(
      (d) => (d.driver?.phone && selectedDriver.phone && d.driver.phone === selectedDriver.phone) ||
             (d.driver?.name && selectedDriver.name && d.driver.name === selectedDriver.name) ||
             (d.plateNo === selectedPlate)
    ) || null;
  }, [enrichedDrivers, selectedDriver, selectedPlate]);

  /* ── filtered vehicle list ── */
  const filtered = useMemo(() => {
    if (!searchText.trim()) return vehicles;
    const q = searchText.toLowerCase();
    return vehicles.filter(
      (v) => (v.plateNo || "").toLowerCase().includes(q) ||
             (v.vehicleName || "").toLowerCase().includes(q) ||
             (driverMap[v.plateNo]?.name || "").toLowerCase().includes(q)
    );
  }, [vehicles, searchText, driverMap]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total: vehicles.length,
    running: vehicles.filter((v) => v.vehicleStatusString === "Running").length,
    stopped: vehicles.filter((v) => v.vehicleStatusString === "Stopped").length,
    inactive: vehicles.filter((v) => v.vehicleStatusString === "InActive").length,
  }), [vehicles]);

  /* ── trip summary for selected bus ── */
  const selectedTripSummary = useMemo(() => {
    if (!selectedPlate) return null;
    return tripSummary.find((t) => t.plateNo === selectedPlate) || null;
  }, [tripSummary, selectedPlate]);

  /* ── map center ── */
  const mapCenter = useMemo(() => {
    if (selectedVehicle) return [selectedVehicle.latitude, selectedVehicle.longitude];
    if (filtered.length > 0) return [filtered[0].latitude, filtered[0].longitude];
    return SCHOOL_CENTER;
  }, [selectedVehicle, filtered]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)]">

      {/* ────────────────── LEFT: Bus list ────────────────── */}
      <aside className="w-[300px] shrink-0 bg-surface-container-low rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-outline-variant/20 bg-white shrink-0">
          <h3 className="text-base font-headline font-extrabold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">analytics</span>
            Bus Report
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-0.5">Select a bus to view report</p>

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

          {/* Stats pills */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {[
              { label: `All ${stats.total}`, color: "text-primary", bg: "bg-primary/10" },
              { label: `${stats.running} Running`, color: "text-green-700", bg: "bg-green-100" },
              { label: `${stats.stopped} Stopped`, color: "text-amber-700", bg: "bg-amber-100" },
              { label: `${stats.inactive} Off`, color: "text-gray-500", bg: "bg-gray-100" },
            ].map((s) => (
              <span key={s.label} className={`text-[9px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.map((v) => {
            const cfg = getStatusCfg(v.vehicleStatusString);
            const isSel = selectedPlate === v.plateNo;
            const driver = driverMap[v.plateNo];
            const mileage = dailyMileage[v.deviceId];
            return (
              <div
                key={v.deviceId}
                onClick={() => setSelectedPlate(isSel ? null : v.plateNo)}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${isSel ? "bg-primary-container ring-2 ring-primary/30" : "bg-white hover:bg-primary-container/20"}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${cfg.color}20` }}>
                  <span className="material-symbols-outlined" style={{ color: cfg.color, fontSize: 20 }}>directions_bus</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-primary truncate">{v.plateNo || "Unknown"}</h5>
                  {driver && <p className="text-[10px] text-blue-600 font-semibold truncate">{driver.name}</p>}
                  <p className="text-[10px] text-on-surface-variant truncate">
                    {v.speed} km/h {mileage ? `• ${mileage.dailyKm} km today` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  {v.ignitionStatus && <span className="text-[9px] text-green-600 font-bold">IGN ON</span>}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ────────────────── CENTER: Map + Report ────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">

        {/* Date selector bar */}
        <div className="flex items-center gap-3 shrink-0">
          {quickDates.map((qd) => (
            <button
              key={qd.label}
              onClick={() => setReportDate(qd.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${reportDate === qd.value ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
            >
              {qd.label}
            </button>
          ))}
          <input
            type="date"
            value={reportDate}
            max={today()}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-surface-container-high border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-all"
            >
              <span className="material-symbols-outlined text-sm">{showMap ? "map" : "map"}</span>
              {showMap ? "Hide Map" : "Show Map"}
            </button>
            <button
              onClick={fetchLive}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 transition-all"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Map section (collapsible) */}
        {showMap && (
          <section className="relative rounded-2xl overflow-hidden shadow-md h-[300px] shrink-0 bg-surface-container-low">
            <MapContainer center={mapCenter} zoom={selectedVehicle ? 16 : 13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={mapCenter} zoom={selectedVehicle ? 16 : 13} />

              {/* Vehicle markers */}
              {(selectedVehicle ? [selectedVehicle] : filtered).map((v) => (
                <Marker key={v.deviceId} position={[v.latitude, v.longitude]} icon={makeBusIcon(v.vehicleStatusString)}
                  eventHandlers={{ click: () => setSelectedPlate(v.plateNo) }}>
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-bold">{v.plateNo}</p>
                      <p className="text-xs">{v.vehicleStatusString} • {v.speed} km/h</p>
                      {v.ignitionStatus && <p className="text-xs text-green-600 font-bold">Ignition ON</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Driver marker for selected vehicle */}
              {selectedDriverLive && selectedDriverLive.latitude && (
                <>
                  <Marker position={[selectedDriverLive.latitude, selectedDriverLive.longitude]} icon={driverIcon}>
                    <Popup>
                      <div className="text-sm min-w-[140px]">
                        <p className="font-bold text-blue-700">{selectedDriverLive.driver?.name || "Driver"}</p>
                        <p className={`text-xs font-bold ${selectedDriverLive.driverBusStatus === "in-bus" ? "text-green-600" : "text-amber-600"}`}>
                          {selectedDriverLive.driverBusStatus === "in-bus" ? "Inside Bus" : "Outside Bus"}
                        </p>
                        {selectedDriverLive.distanceToBusMeters != null && selectedDriverLive.driverBusStatus !== "in-bus" && (
                          <p className="text-xs">Distance: {fmtDistance(selectedDriverLive.distanceToBusMeters)}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {selectedDriverLive.assignedBus && (
                    <Polyline
                      positions={[
                        [selectedDriverLive.latitude, selectedDriverLive.longitude],
                        [selectedDriverLive.assignedBus.latitude, selectedDriverLive.assignedBus.longitude],
                      ]}
                      color="#3b82f6" weight={3} dashArray="6, 8" opacity={0.8}
                    />
                  )}
                </>
              )}

              {/* Driver location history trail */}
              {report?.driverLocationHistory?.length > 1 && (
                <Polyline
                  positions={report.driverLocationHistory.map((loc) => [loc.latitude, loc.longitude])}
                  color="#8b5cf6" weight={3} opacity={0.7}
                />
              )}
              {report?.driverLocationHistory?.length > 0 && (
                <>
                  <Marker
                    position={[report.driverLocationHistory[0].latitude, report.driverLocationHistory[0].longitude]}
                    icon={L.divIcon({
                      className: "", iconSize: [20, 20], iconAnchor: [10, 10],
                      html: `<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:10px;font-weight:bold;">S</span></div>`,
                    })}
                  >
                    <Popup><p className="text-xs font-bold">Driver Start — {fmtTime(report.driverLocationHistory[0].createdAt)}</p></Popup>
                  </Marker>
                  <Marker
                    position={[report.driverLocationHistory[report.driverLocationHistory.length - 1].latitude, report.driverLocationHistory[report.driverLocationHistory.length - 1].longitude]}
                    icon={L.divIcon({
                      className: "", iconSize: [20, 20], iconAnchor: [10, 10],
                      html: `<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:10px;font-weight:bold;">E</span></div>`,
                    })}
                  >
                    <Popup><p className="text-xs font-bold">Driver End — {fmtTime(report.driverLocationHistory[report.driverLocationHistory.length - 1].createdAt)}</p></Popup>
                  </Marker>
                </>
              )}

              {/* School marker */}
              <Marker
                position={SCHOOL_CENTER}
                icon={L.divIcon({
                  className: "", iconSize: [36, 36], iconAnchor: [18, 18],
                  html: `<div style="width:36px;height:36px;border-radius:50%;background:#00152a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,21,42,0.4);border:3px solid white;"><span class="material-symbols-outlined" style="color:#44ddc1;font-size:18px;">school</span></div>`,
                })}
              >
                <Popup><p className="font-bold text-sm">School Campus</p></Popup>
              </Marker>
            </MapContainer>

            {/* Driver status overlay on map */}
            {selectedDriverLive && (
              <div className="absolute top-3 left-3 z-[500] p-3 rounded-xl shadow-lg border border-white/40" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedDriverLive.driverBusStatus === "in-bus" ? "bg-green-100" : selectedDriverLive.driverBusStatus === "outside" ? "bg-amber-100" : "bg-gray-100"}`}>
                    <span className={`material-symbols-outlined text-sm ${selectedDriverLive.driverBusStatus === "in-bus" ? "text-green-700" : selectedDriverLive.driverBusStatus === "outside" ? "text-amber-700" : "text-gray-500"}`}>person_pin</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">{selectedDriverLive.driver?.name || "Driver"}</p>
                    <p className={`text-[10px] font-bold ${selectedDriverLive.driverBusStatus === "in-bus" ? "text-green-600" : selectedDriverLive.driverBusStatus === "outside" ? "text-amber-600" : "text-gray-400"}`}>
                      {selectedDriverLive.driverBusStatus === "in-bus" ? "Inside Bus" : selectedDriverLive.driverBusStatus === "outside" ? `Outside Bus — ${fmtDistance(selectedDriverLive.distanceToBusMeters)} away` : "No bus GPS"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ──────── Report Content ──────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!selectedPlate ? (
            /* ── No bus selected: show fleet summary ── */
            <div className="space-y-4">
              <h3 className="text-base font-headline font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">summarize</span>
                Fleet Summary — {reportDate === today() ? "Today" : reportDate === yesterday() ? "Yesterday" : reportDate}
              </h3>

              {/* Trip summary cards */}
              {tripSummary.length === 0 ? (
                <div className="bg-surface-container-low rounded-xl p-8 text-center">
                  <span className="material-symbols-outlined text-4xl opacity-30 block mb-2">event_busy</span>
                  <p className="text-sm text-on-surface-variant">No trip events recorded for this date</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">Ignition events will appear here once buses start reporting</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {tripSummary.map((t) => {
                    const liveV = vehicles.find((v) => v.plateNo === t.plateNo);
                    const cfg = liveV ? getStatusCfg(liveV.vehicleStatusString) : getStatusCfg("InActive");
                    return (
                      <div
                        key={t.plateNo}
                        onClick={() => setSelectedPlate(t.plateNo)}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 group"
                        style={{ borderColor: cfg.color }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-primary">{t.plateNo}</h4>
                            {t.driverName && <p className="text-[10px] text-blue-600 font-semibold">{t.driverName}</p>}
                          </div>
                          <span className="material-symbols-outlined text-lg" style={{ color: cfg.color }}>{cfg.icon}</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-green-600">key</span>
                            <span>{t.ignitionOnCount} start{t.ignitionOnCount !== 1 ? "s" : ""}</span>
                            <span className="mx-1">•</span>
                            <span>{t.ignitionOffCount} stop{t.ignitionOffCount !== 1 ? "s" : ""}</span>
                          </div>
                          {t.totalRunningMinutes > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-blue-600">schedule</span>
                              <span>{Math.floor(t.totalRunningMinutes / 60)}h {t.totalRunningMinutes % 60}m running</span>
                            </div>
                          )}
                          {t.distanceKm != null && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-purple-600">route</span>
                              <span>{t.distanceKm} km</span>
                            </div>
                          )}
                          {t.firstStartTime && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-500">play_arrow</span>
                              <span>First start: {fmtTime(t.firstStartTime)}</span>
                            </div>
                          )}
                          {t.lastStopTime && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-500">stop</span>
                              <span>Last stop: {fmtTime(t.lastStopTime)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* All buses live status */}
              <h3 className="text-base font-headline font-bold text-primary flex items-center gap-2 mt-6">
                <span className="material-symbols-outlined text-lg">directions_bus</span>
                All Buses — Live
              </h3>
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {vehicles.map((v) => {
                  const cfg = getStatusCfg(v.vehicleStatusString);
                  const driver = driverMap[v.plateNo];
                  const mileage = dailyMileage[v.deviceId];
                  return (
                    <div
                      key={v.deviceId}
                      onClick={() => setSelectedPlate(v.plateNo)}
                      className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 group"
                      style={{ borderColor: cfg.color }}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <h5 className="text-xs font-bold text-primary">{v.plateNo}</h5>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      {driver && <p className="text-[10px] text-blue-600 font-semibold truncate mb-1">{driver.name}</p>}
                      <div className="text-[10px] text-on-surface-variant space-y-0.5">
                        <p>{v.speed} km/h {v.ignitionStatus ? "• IGN ON" : ""}</p>
                        {mileage && <p className="text-blue-700 font-bold">{mileage.dailyKm} km today</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Bus selected: show individual report ── */
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedPlate(null)} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
                <div>
                  <h3 className="text-lg font-headline font-extrabold text-primary">{selectedPlate}</h3>
                  <p className="text-[10px] text-on-surface-variant">
                    Report for {reportDate === today() ? "Today" : reportDate === yesterday() ? "Yesterday" : reportDate}
                  </p>
                </div>
                {selectedVehicle && (() => {
                  const cfg = getStatusCfg(selectedVehicle.vehicleStatusString);
                  return <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
                })()}
              </div>

              {/* Live status cards */}
              {selectedVehicle && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Speed */}
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm text-green-600">speed</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Speed</span>
                    </div>
                    <p className="text-xl font-headline font-extrabold text-primary">{selectedVehicle.speed} <span className="text-xs font-normal">km/h</span></p>
                  </div>
                  {/* Ignition */}
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`material-symbols-outlined text-sm ${selectedVehicle.ignitionStatus ? "text-green-600" : "text-red-500"}`}>key</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Ignition</span>
                    </div>
                    <p className={`text-xl font-headline font-extrabold ${selectedVehicle.ignitionStatus ? "text-green-600" : "text-red-500"}`}>
                      {selectedVehicle.ignitionStatus ? "ON" : "OFF"}
                    </p>
                  </div>
                  {/* Odometer */}
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm text-blue-600">straighten</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Odometer</span>
                    </div>
                    <p className="text-xl font-headline font-extrabold text-primary">{selectedVehicle.odometer?.toFixed(1)} <span className="text-xs font-normal">km</span></p>
                  </div>
                  {/* Battery */}
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm text-amber-600">battery_charging_full</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Power</span>
                    </div>
                    <p className="text-xl font-headline font-extrabold text-primary">{selectedVehicle.mainPowerStatus} <span className="text-xs font-normal">V</span></p>
                  </div>
                </div>
              )}

              {/* Driver card */}
              {selectedDriver && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative ${selectedDriverLive?.driverBusStatus === "in-bus" ? "bg-green-100" : selectedDriverLive?.driverBusStatus === "outside" ? "bg-amber-100" : "bg-gray-100"}`}>
                      <span className={`material-symbols-outlined ${selectedDriverLive?.driverBusStatus === "in-bus" ? "text-green-700" : selectedDriverLive?.driverBusStatus === "outside" ? "text-amber-700" : "text-gray-500"}`}>person</span>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedDriverLive?.driverBusStatus === "in-bus" ? "bg-green-500" : selectedDriverLive?.driverBusStatus === "outside" ? "bg-amber-500" : "bg-gray-400"}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary">{selectedDriver.name}</p>
                      {selectedDriver.phone && <p className="text-[10px] text-on-surface-variant">{selectedDriver.phone}</p>}
                      {selectedDriver.licenseNo && <p className="text-[10px] text-on-surface-variant">DL: {selectedDriver.licenseNo}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {selectedDriverLive ? (
                        <>
                          {selectedDriverLive.driverBusStatus === "in-bus" ? (
                            <p className="text-xs font-bold text-green-600">Inside Bus</p>
                          ) : selectedDriverLive.driverBusStatus === "outside" ? (
                            <>
                              <p className="text-xs font-bold text-amber-600">Outside Bus</p>
                              {selectedDriverLive.distanceToBusMeters != null && (
                                <p className="text-[10px] text-on-surface-variant">{fmtDistance(selectedDriverLive.distanceToBusMeters)} away</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs font-bold text-gray-400">No bus GPS</p>
                          )}
                          <p className="text-[10px] text-on-surface-variant mt-0.5">
                            School: {fmtDistance(selectedDriverLive.distanceToSchoolMeters)}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-gray-400">No live data</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Report: Mileage + Ignition Summary */}
              {reportLoading ? (
                <div className="bg-surface-container-low rounded-xl p-8 text-center">
                  <span className="material-symbols-outlined text-2xl animate-spin text-primary block mb-2">progress_activity</span>
                  <p className="text-sm text-on-surface-variant">Loading report...</p>
                </div>
              ) : report ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Daily Mileage */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-600">route</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Mileage</span>
                      </div>
                      <p className="text-2xl font-headline font-extrabold text-blue-800">
                        {report.mileage?.dailyKm ?? "—"} <span className="text-xs font-normal">km</span>
                      </p>
                      {report.mileage && (
                        <p className="text-[10px] text-blue-600 mt-1">
                          {report.mileage.startOdometer?.toFixed(1)} → {report.mileage.endOdometer?.toFixed(1)} km
                        </p>
                      )}
                    </div>
                    {/* Ignition starts */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-sm text-green-600">key</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Starts</span>
                      </div>
                      <p className="text-2xl font-headline font-extrabold text-green-800">{report.ignitionSummary?.onCount ?? 0}</p>
                      {report.ignitionSummary?.firstStart && (
                        <p className="text-[10px] text-green-600 mt-1">First: {fmtTime(report.ignitionSummary.firstStart)}</p>
                      )}
                    </div>
                    {/* Running time */}
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-sm text-purple-600">timer</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Running</span>
                      </div>
                      {(() => {
                        const mins = report.ignitionSummary?.totalRunningMinutes ?? 0;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return <p className="text-2xl font-headline font-extrabold text-purple-800">{h}h {m}m</p>;
                      })()}
                      {report.ignitionSummary?.lastStop && (
                        <p className="text-[10px] text-purple-600 mt-1">Last stop: {fmtTime(report.ignitionSummary.lastStop)}</p>
                      )}
                    </div>
                    {/* Bus info */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-sm text-gray-600">info</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Info</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{report.bus?.number || selectedPlate}</p>
                      {report.route && <p className="text-[10px] text-gray-600">{report.route.routeName}</p>}
                      {report.driver && <p className="text-[10px] text-gray-600">{report.driver.name}</p>}
                    </div>
                  </div>

                  {/* Trip Events Timeline */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-outline-variant/10">
                      <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">timeline</span>
                        Ignition Events Timeline
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-label">{report.tripEvents?.length || 0} events</span>
                      </h4>
                    </div>
                    {(!report.tripEvents || report.tripEvents.length === 0) ? (
                      <div className="p-8 text-center text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">event_busy</span>
                        No ignition events recorded
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-surface-container-low sticky top-0">
                            <tr>
                              <th className="text-left p-3 font-bold text-on-surface-variant">Time</th>
                              <th className="text-left p-3 font-bold text-on-surface-variant">Event</th>
                              <th className="text-left p-3 font-bold text-on-surface-variant">Speed</th>
                              <th className="text-left p-3 font-bold text-on-surface-variant">Odometer</th>
                              <th className="text-left p-3 font-bold text-on-surface-variant">Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.tripEvents.map((evt, i) => (
                              <tr key={evt.id || i} className="border-t border-outline-variant/10 hover:bg-primary-container/10">
                                <td className="p-3 font-semibold">{fmtTime(evt.timestamp)}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    evt.event === "IGNITION_ON" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    <span className="material-symbols-outlined text-[10px]">{evt.event === "IGNITION_ON" ? "play_arrow" : "stop"}</span>
                                    {evt.event === "IGNITION_ON" ? "ON" : "OFF"}
                                  </span>
                                </td>
                                <td className="p-3">{evt.speed != null ? `${evt.speed} km/h` : "—"}</td>
                                <td className="p-3">{evt.odometer != null ? `${evt.odometer.toFixed(1)} km` : "—"}</td>
                                <td className="p-3 text-[10px] text-on-surface-variant">
                                  {evt.latitude && evt.longitude ? `${evt.latitude.toFixed(4)}, ${evt.longitude.toFixed(4)}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-surface-container-low rounded-xl p-8 text-center">
                  <span className="material-symbols-outlined text-4xl opacity-30 block mb-2">description</span>
                  <p className="text-sm text-on-surface-variant">No report data for this bus on the selected date</p>
                </div>
              )}

              {/* Fuel Log Section — always shown when a bus is selected */}
              {selectedPlate && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-outline-variant/10">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">local_gas_station</span>
                      Fuel Log
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-label">{fuelLogs.length} entries</span>
                    </h4>
                  </div>
                  {fuelLogs.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant text-sm">
                      <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">local_gas_station</span>
                      No fuel entries for this date
                      <p className="text-[10px] mt-1 text-on-surface-variant/60">Drivers can log fuel fill-ups from their mobile app</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/10">
                      {fuelLogs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-primary-container/10 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg text-orange-600">local_gas_station</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-bold text-on-surface">{log.litres} L</span>
                                  <span className="text-[10px] text-on-surface-variant">at</span>
                                  <span className="text-sm font-bold text-primary">{log.odometer?.toFixed(1)} km</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                                  {log.driver && <span>👤 {log.driver.name}</span>}
                                  <span>{fmtTime(log.timestamp)}</span>
                                </div>
                                {log.imageUrl && (
                                  <button
                                    onClick={() => setReceiptModalUrl(log.imageUrl)}
                                    className="inline-flex items-center gap-2 mt-1.5 group"
                                  >
                                    <img
                                      src={resolveImageUrl(log.imageUrl)}
                                      alt="Receipt"
                                      className="w-10 h-10 rounded-lg object-cover border border-outline-variant/20 shadow-sm group-hover:shadow-md group-hover:border-blue-300 transition-all"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span className="text-[10px] text-blue-600 group-hover:underline flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-xs">photo_camera</span>
                                      View receipt
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {log.totalCost != null && (
                                <p className="text-sm font-bold text-on-surface">₹{log.totalCost.toFixed(0)}</p>
                              )}
                              {log.fuelCostPerLitre != null && (
                                <p className="text-[10px] text-on-surface-variant">₹{log.fuelCostPerLitre.toFixed(2)}/L</p>
                              )}
                              {log.kmPerLitre != null && (
                                <p className="text-[10px] font-bold text-green-700 mt-0.5">{log.kmPerLitre} km/L</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Driver Location History */}
              {report?.driverLocationHistory?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-outline-variant/10">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">person_pin_circle</span>
                      Driver Location History
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-label">{report.driverLocationHistory.length} points</span>
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-1">First Seen</p>
                        <p className="text-sm font-bold text-green-800">{fmtTime(report.driverLocationHistory[0].createdAt)}</p>
                        <p className="text-[10px] text-green-600">{report.driverLocationHistory[0].latitude.toFixed(4)}, {report.driverLocationHistory[0].longitude.toFixed(4)}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-1">Last Seen</p>
                        <p className="text-sm font-bold text-red-800">{fmtTime(report.driverLocationHistory[report.driverLocationHistory.length - 1].createdAt)}</p>
                        <p className="text-[10px] text-red-600">{report.driverLocationHistory[report.driverLocationHistory.length - 1].latitude.toFixed(4)}, {report.driverLocationHistory[report.driverLocationHistory.length - 1].longitude.toFixed(4)}</p>
                      </div>
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-1">Total Points</p>
                        <p className="text-sm font-bold text-violet-800">{report.driverLocationHistory.length}</p>
                        <p className="text-[10px] text-violet-600">GPS pings recorded</p>
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-surface-container-low sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-bold text-on-surface-variant">#</th>
                            <th className="text-left p-2 font-bold text-on-surface-variant">Time</th>
                            <th className="text-left p-2 font-bold text-on-surface-variant">Latitude</th>
                            <th className="text-left p-2 font-bold text-on-surface-variant">Longitude</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.driverLocationHistory.map((loc, i) => (
                            <tr key={loc.id} className="border-t border-outline-variant/10 hover:bg-primary-container/10">
                              <td className="p-2 text-on-surface-variant">{i + 1}</td>
                              <td className="p-2 font-semibold">{fmtTime(loc.createdAt)}</td>
                              <td className="p-2">{loc.latitude.toFixed(6)}</td>
                              <td className="p-2">{loc.longitude.toFixed(6)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {receiptModalUrl && <ReceiptModal imageUrl={receiptModalUrl} onClose={() => setReceiptModalUrl(null)} />}
    </div>
  );
};

export default BusReportPage;

