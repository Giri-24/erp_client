import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getLiveDriverLocations } from "../transport.service";

const fallbackCenter = [13.0827, 80.2707];

const STATUS_CONFIG = {
  inside: {
    label: "ON-ROUTE",
    color: "#44ddc1",
    textColor: "#001813",
    border: "border-l-[#44ddc1]",
    icon: "speed",
  },
  outside: {
    label: "OUT OF ZONE",
    text: "Outside Geofence",
    color: "#ba1a1a",
    textColor: "#ffffff",
    border: "border-l-[#ba1a1a]",
    icon: "warning",
  },
};

const LiveTrackingPage = () => {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState({
    geofence: {
      centerLat: fallbackCenter[0],
      centerLng: fallbackCenter[1],
      radiusMeters: 250,
    },
    drivers: [],
    total: 0,
    insideGeofenceCount: 0,
    outsideGeofenceCount: 0,
    lastUpdatedAt: null,
  });
  const [selectedDriver, setSelectedDriver] = useState(null);

  const fetchLive = async () => {
    try {
      setLoading(true);
      const data = await getLiveDriverLocations();
      if (data) setPayload(data);
    } catch {
      // Keep previous data on brief failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const timer = setInterval(fetchLive, 10000);
    return () => clearInterval(timer);
  }, []);

  const center = useMemo(() => {
    if (payload?.drivers?.length) {
      const first = payload.drivers[0];
      return [first.latitude, first.longitude];
    }
    return [payload.geofence.centerLat, payload.geofence.centerLng];
  }, [payload]);

  const lastRefresh = payload.lastUpdatedAt
    ? new Date(payload.lastUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* ── Left Column: Map + Fleet Cards ── */}
      <div className="flex-[3] flex flex-col gap-5 min-h-0">

        {/* Map */}
        <section className="relative rounded-2xl overflow-hidden shadow-md flex-1 bg-surface-container-low">
          {/* Leaflet Map */}
          <div className="absolute inset-0 z-0">
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Geofence circle */}
              <Circle
                center={[payload.geofence.centerLat, payload.geofence.centerLng]}
                radius={Number(payload.geofence.radiusMeters || 250)}
                pathOptions={{ color: "#1677ff", fillColor: "#1677ff", fillOpacity: 0.08 }}
              />

              {/* Driver markers */}
              {payload.drivers.map((d) => (
                <CircleMarker
                  key={d.id}
                  center={[d.latitude, d.longitude]}
                  radius={10}
                  pathOptions={{
                    color: d.insideSchoolGeofence ? "#16a34a" : "#dc2626",
                    fillColor: d.insideSchoolGeofence ? "#22c55e" : "#ef4444",
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>
                    <div className="text-sm space-y-0.5">
                      <p className="font-bold">{d.driver?.name || "Driver"}</p>
                      <p>📞 {d.driver?.phone || "—"}</p>
                      <p>🚌 {d.driver?.bus?.number || d.busId || "—"}</p>
                      <p>🗺️ {d.driver?.bus?.routeName || "—"}</p>
                      <p>📏 {Number(d.distanceToSchoolMeters || 0).toLocaleString()} m to school</p>
                      <p>🕐 {d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Map zoom controls overlay */}
          <div className="absolute top-5 left-5 z-[500] flex flex-col gap-2">
            <div
              className="flex flex-col gap-2 p-2 rounded-xl shadow-lg"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
            >
              <button className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high rounded-lg transition-colors">
                <span className="material-symbols-outlined text-primary text-xl">add</span>
              </button>
              <div className="h-px bg-outline-variant/30" />
              <button className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high rounded-lg transition-colors">
                <span className="material-symbols-outlined text-primary text-xl">remove</span>
              </button>
            </div>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl shadow-lg hover:bg-surface-container-high transition-colors"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
            >
              <span className="material-symbols-outlined text-primary text-xl">my_location</span>
            </button>
          </div>

          {/* Refresh badge */}
          <div className="absolute top-5 right-5 z-[500]">
            <button
              onClick={fetchLive}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}
            >
              <span
                className={`material-symbols-outlined text-base text-primary ${loading ? "animate-spin" : ""}`}
              >
                refresh
              </span>
              <span className="text-primary">Auto 10s</span>
            </button>
          </div>

          {/* Overlay stat cards at bottom of map */}
          <div className="absolute bottom-5 left-5 right-5 flex gap-3 z-[500]">
            {[
              {
                icon: "route",
                iconBg: "bg-[#44ddc1]/20",
                iconColor: "text-[#001813]",
                label: "Active Drivers",
                value: `${payload.insideGeofenceCount} / ${payload.total}`,
                valueColor: "text-primary",
              },
              {
                icon: "check_circle",
                iconBg: "bg-secondary-container",
                iconColor: "text-primary",
                label: "Inside Geofence",
                value: payload.insideGeofenceCount,
                valueColor: "text-primary",
              },
              {
                icon: "warning",
                iconBg: "bg-error-container",
                iconColor: "text-error",
                label: "Outside Geofence",
                value: payload.outsideGeofenceCount,
                valueColor: "text-error",
              },
              {
                icon: "schedule",
                iconBg: "bg-surface-container",
                iconColor: "text-on-surface-variant",
                label: "Last Refresh",
                value: lastRefresh,
                valueColor: "text-on-surface",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex-1 p-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/40"
                style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)" }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
                  <span className={`material-symbols-outlined text-lg ${stat.iconColor}`}>
                    {stat.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">
                    {stat.label}
                  </p>
                  <p className={`text-lg font-headline font-extrabold leading-tight ${stat.valueColor}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fleet status cards */}
        <section className="flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-headline font-bold text-primary flex items-center gap-2">
              Fleet Intelligence
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-label tracking-tight">
                LIVE
              </span>
            </h3>
            <span className="text-xs text-on-surface-variant">
              Showing {payload.drivers.length} driver{payload.drivers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {payload.drivers.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-6 text-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">directions_bus</span>
              No active drivers at this time
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {payload.drivers.slice(0, 3).map((d) => {
                const inside = d.insideSchoolGeofence;
                const cfg = inside ? STATUS_CONFIG.inside : STATUS_CONFIG.outside;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDriver(d)}
                    className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 ${cfg.border} group`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p
                          className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                          style={{ color: cfg.color }}
                        >
                          {cfg.label}
                        </p>
                        <h4 className="text-sm font-bold text-primary leading-tight">
                          {d.driver?.bus?.routeName || d.driver?.bus?.number || `Bus ${d.busId?.slice(0, 6) || "—"}`}
                        </h4>
                      </div>
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ color: cfg.color }}
                      >
                        {cfg.icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-3">
                      <div className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-sm">person</span>
                      </div>
                      <span className="truncate">{d.driver?.name || "Driver"}</span>
                    </div>
                    <div className="text-[10px] text-on-surface-variant">
                      📏 {Number(d.distanceToSchoolMeters || 0).toLocaleString()} m to school
                    </div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">
                      🕐 {d.createdAt ? new Date(d.createdAt).toLocaleTimeString() : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Right Panel: Driver Manifest ── */}
      <aside className="flex-1 bg-surface-container-low rounded-2xl flex flex-col overflow-hidden shadow-sm min-w-[280px]">
        {/* Panel header */}
        <div className="p-5 border-b border-outline-variant/20 bg-white flex-shrink-0">
          <h3 className="text-lg font-headline font-extrabold text-primary mb-0.5">
            Driver Manifest
          </h3>
          <p className="text-[11px] text-on-surface-variant">
            Live Location Log • Auto-refreshes every 10s
          </p>

          {/* Filter pills */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
              All ({payload.total})
            </span>
            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-3 py-1.5 rounded-full">
              Inside ({payload.insideGeofenceCount})
            </span>
            <span className="bg-error-container text-error text-[10px] font-bold px-3 py-1.5 rounded-full">
              Outside ({payload.outsideGeofenceCount})
            </span>
          </div>
        </div>

        {/* Driver list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {payload.drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-sm p-6 text-center">
              <span className="material-symbols-outlined text-4xl mb-3 opacity-30">
                directions_bus
              </span>
              <p className="font-semibold">No active drivers</p>
              <p className="text-xs mt-1 opacity-70">Location data will appear here once drivers go live</p>
            </div>
          ) : (
            payload.drivers.map((d) => {
              const inside = d.insideSchoolGeofence;
              const isSelected = selectedDriver?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDriver(isSelected ? null : d)}
                  className={`p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${
                    isSelected
                      ? "bg-primary-container text-primary"
                      : "bg-white hover:bg-primary-container/20"
                  }`}
                >
                  {/* Avatar placeholder */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-base ${
                      isSelected ? "bg-primary text-white" : "bg-surface-container-high text-primary"
                    }`}
                  >
                    {(d.driver?.name || "D")[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-primary truncate">
                      {d.driver?.name || "Unknown Driver"}
                    </h5>
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {d.driver?.bus?.number || d.busId || "—"} •{" "}
                      {d.driver?.bus?.routeName || "Unknown Route"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inside
                          ? "bg-[#44ddc1]/20 text-[#001813]"
                          : "bg-error-container text-error"
                      }`}
                    >
                      {inside ? "INSIDE" : "OUTSIDE"}
                    </span>
                    <span className="text-[9px] text-on-surface-variant opacity-70">
                      {d.createdAt ? new Date(d.createdAt).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail drawer for selected driver */}
        {selectedDriver && (
          <div className="border-t border-outline-variant/20 bg-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-primary">Driver Details</h4>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-2 text-xs text-on-surface-variant">
              {[
                { icon: "person", label: "Name", value: selectedDriver.driver?.name || "—" },
                { icon: "call", label: "Phone", value: selectedDriver.driver?.phone || "—" },
                { icon: "directions_bus", label: "Bus", value: selectedDriver.driver?.bus?.number || selectedDriver.busId || "—" },
                { icon: "route", label: "Route", value: selectedDriver.driver?.bus?.routeName || "—" },
                { icon: "social_distance", label: "Distance", value: `${Number(selectedDriver.distanceToSchoolMeters || 0).toLocaleString()} m` },
                { icon: "pin_drop", label: "Location", value: `${Number(selectedDriver.latitude || 0).toFixed(5)}, ${Number(selectedDriver.longitude || 0).toFixed(5)}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">{row.icon}</span>
                  <span className="text-on-surface-variant/70 w-16 flex-shrink-0">{row.label}</span>
                  <span className="font-semibold text-on-surface truncate">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel footer */}
        <div className="p-4 bg-white border-t border-outline-variant/10 flex-shrink-0">
          <button
            onClick={fetchLive}
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all text-sm"
          >
            <span className={`material-symbols-outlined text-base ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            {loading ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default LiveTrackingPage;
