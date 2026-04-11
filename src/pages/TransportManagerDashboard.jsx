import React, { useEffect, useState } from "react";
import { message, Spin, Tag } from "antd";
import dayjs from "dayjs";
import {
  getTransportDashboard,
  getTransportAcademicYears,
  getAllDrivers,
  getAllBuses,
  getDailyTripSummary,
} from "../modules/transport/transport.service";

const fmtNum = (v) => Number(v || 0).toLocaleString("en-IN");

const TransportManagerDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [tripSummary, setTripSummary] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (academicYear) loadData();
  }, [academicYear]);

  const loadInitial = async () => {
    try {
      const years = await getTransportAcademicYears();
      setAvailableYears(years || []);
      setAcademicYear(years?.[0] || "2026-2027");
    } catch {
      setAcademicYear("2026-2027");
    }
  };

  const loadData = async () => {
    setLoading(true);
    const today = dayjs().format("YYYY-MM-DD");
    try {
      const results = await Promise.allSettled([
        getTransportDashboard(academicYear),
        getAllDrivers(),
        getAllBuses(),
        getDailyTripSummary(today),
      ]);

      if (results[0].status === "fulfilled") setDashboard(results[0].value || null);
      if (results[1].status === "fulfilled") setDrivers(results[1].value || []);
      if (results[2].status === "fulfilled") setBuses(results[2].value || []);
      if (results[3].status === "fulfilled") setTripSummary(results[3].value || []);
    } catch {
      message.error("Failed to load transport dashboard");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <Spin size="large" />
      </div>
    );
  }

  const overview = dashboard?.overview || {};
  const todaySummary = dashboard?.today || {};
  const routes = dashboard?.routes || [];

  const totalStudents = overview.assignedStudents || 0;
  const activeRoutes = overview.totalRoutes || routes.length;
  const totalDrivers = overview.totalDrivers || drivers.length;
  const totalBuses = overview.totalBuses || buses.length;
  const onlineBuses = overview.onlineBuses || 0;
  const pendingStudents = overview.pendingStudents || 0;

  const busStatusColor = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "RUNNING") return "green";
    if (s === "STOPPED") return "orange";
    if (s === "IDLE") return "blue";
    return "default";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-primary tracking-tight">
            Transport Manager
          </h2>
          <p className="text-on-surface-variant mt-1">
            {dayjs().format("dddd, MMMM D, YYYY")} — Fleet & route overview
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-4 py-2 bg-surface-container-high rounded-xl text-sm font-bold text-primary border-none focus:ring-2 focus:ring-primary"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => onNavigate("transport-live")}
            style={{ background: "linear-gradient(to right, #00152a, #102a43)" }}
            className="px-6 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/10 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">location_on</span>
            Live Tracking
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Routes</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{activeRoutes}</h3>
            </div>
            <span className="p-2.5 bg-primary-fixed rounded-full text-primary material-symbols-outlined text-xl">route</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{fmtNum(totalStudents)} students assigned</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2e7d32]/5 rounded-full blur-2xl group-hover:bg-[#2e7d32]/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Buses</p>
              <h3 className="text-3xl font-extrabold font-headline text-[#2e7d32]">{totalBuses}</h3>
            </div>
            <span className="p-2.5 bg-[#e8f5e9] rounded-full text-[#2e7d32] material-symbols-outlined text-xl">directions_bus</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">
            {onlineBuses} recently online buses
          </p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-tertiary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Drivers</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{totalDrivers}</h3>
            </div>
            <span className="p-2.5 bg-tertiary-fixed rounded-full text-on-tertiary-fixed-variant material-symbols-outlined text-xl">person</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">Active fleet drivers</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-secondary-fixed-dim/5 rounded-full blur-2xl group-hover:bg-secondary-fixed-dim/10 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Students on Transport</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{fmtNum(totalStudents)}</h3>
            </div>
            <span className="p-2.5 bg-secondary-fixed rounded-full text-on-secondary-fixed-variant material-symbols-outlined text-xl">group</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2">{pendingStudents} pending mapping in {academicYear}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { key: "transport-live", icon: "location_on", label: "Live Tracking", color: "bg-primary/10 text-primary" },
          { key: "transport-routes", icon: "route", label: "Routes", color: "bg-secondary-fixed text-on-secondary-fixed-variant" },
          { key: "transport-assign", icon: "transfer_within_a_station", label: "Assign Transport", color: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
          { key: "transport-view", icon: "manage_search", label: "View Transport", color: "bg-amber-50 text-amber-700" },
          { key: "transport-report", icon: "analytics", label: "Fuel & Mileage", color: "bg-blue-50 text-blue-700" },
          { key: "transport-drivers", icon: "person", label: "Drivers", color: "bg-primary-fixed text-primary" },
          { key: "transport-buses", icon: "directions_bus_filled", label: "Buses", color: "bg-surface-container-high text-on-surface-variant" },
        ].map((action) => (
          <button
            key={action.key}
            onClick={() => onNavigate(action.key)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-lowest shadow-ambient-sm hover:shadow-ambient transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className={`material-symbols-outlined text-2xl p-3 rounded-full ${action.color}`}>{action.icon}</span>
            <span className="text-[11px] font-bold text-on-surface-variant text-center">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Operations + Route Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Operations */}
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
          <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
            <h4 className="text-base font-bold font-headline text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2e7d32] text-lg">monitoring</span>
              Today's Operations
            </h4>
            <button
              onClick={() => onNavigate("transport-report")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Open Reports <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
            <div className="rounded-xl bg-[#f5fbf7] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#2e7d32]">Fuel Logs</p>
              <p className="mt-2 text-3xl font-headline font-extrabold text-[#2e7d32]">{fmtNum(todaySummary.fuelLogs)}</p>
              <p className="text-xs text-on-surface-variant mt-1">{fmtNum(todaySummary.fuelLitres)} litres logged</p>
            </div>
            <div className="rounded-xl bg-[#f8f6ff] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b4db2]">Trip Events</p>
              <p className="mt-2 text-3xl font-headline font-extrabold text-[#5b4db2]">{fmtNum(todaySummary.tripEvents)}</p>
              <p className="text-xs text-on-surface-variant mt-1">{fmtNum(todaySummary.mileageSnapshots)} mileage snapshots</p>
            </div>
            <div className="rounded-xl bg-[#fff7ed] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b45309]">Fuel Cost</p>
              <p className="mt-2 text-3xl font-headline font-extrabold text-[#b45309]">₹{fmtNum(todaySummary.fuelCost)}</p>
              <p className="text-xs text-on-surface-variant mt-1">Today's recorded spend</p>
            </div>
            <div className="rounded-xl bg-[#eff6ff] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1d4ed8]">Drivers</p>
              <p className="mt-2 text-3xl font-headline font-extrabold text-[#1d4ed8]">{fmtNum(drivers.length)}</p>
              <p className="text-xs text-on-surface-variant mt-1">Assigned across the fleet</p>
            </div>
          </div>
        </div>

        {/* Routes Overview */}
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
          <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
            <h4 className="text-base font-bold font-headline text-primary">Routes Overview</h4>
            <button
              onClick={() => onNavigate("transport-routes")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Manage Routes <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          {routes.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">No routes configured</div>
          ) : (
            <div className="divide-y divide-surface-container-low max-h-80 overflow-y-auto">
              {routes.slice(0, 12).map((route, idx) => (
                <div key={route.id || idx} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                  <span className="material-symbols-outlined text-tertiary">route</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{route.name || route.routeName}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {route.stops?.length || route.stopsCount || 0} stops
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary">{route.studentsCount || route.students?.length || 0} students</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container-low flex justify-between items-center">
          <h4 className="text-base font-bold font-headline text-primary">Today's Bus Activity</h4>
          <Tag color={tripSummary.length > 0 ? busStatusColor('RUNNING') : 'default'}>
            {tripSummary.length} active records
          </Tag>
        </div>
        {tripSummary.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">No trip events recorded today</div>
        ) : (
          <div className="divide-y divide-surface-container-low max-h-96 overflow-y-auto">
            {tripSummary.slice(0, 12).map((item) => (
              <div key={item.plateNo} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                <span className="material-symbols-outlined text-primary">directions_bus</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{item.plateNo}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {item.driverName || 'No driver'} · {item.distanceKm != null ? `${item.distanceKm} km` : 'No distance'}
                  </p>
                </div>
                <Tag color={item.ignitionOnCount > 0 ? 'green' : 'default'}>
                  {item.ignitionOnCount} starts
                </Tag>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportManagerDashboard;
