import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Input,
  TimePicker,
  Tabs,
  Badge,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  SyncOutlined,
  DownloadOutlined,
  EyeOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  SearchOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import {
  getAttendance,
  getAttendanceByStaff,
  bulkMarkAttendance,
  updateAttendance,
  getAttendanceSummary,
  getMonthlyAttendanceReport,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS, getCurrentUser } from "../../../utils/permissions";

const { Option } = Select;
const { RangePicker } = DatePicker;

const STATUS_CONFIG = {
  present: { color: "#10b981", label: "Present", bg: "#ecfdf5" },
  absent: { color: "#ef4444", label: "Absent", bg: "#fef2f2" },
  half_day: { color: "#8b5cf6", label: "Half Day", bg: "#f5f3ff" },
  late: { color: "#f59e0b", label: "Late", bg: "#fffbeb" },
  on_leave: { color: "#3b82f6", label: "On Leave", bg: "#eff6ff" },
  holiday: { color: "#ec4899", label: "Holiday", bg: "#fdf2f8" },
  week_off: { color: "#64748b", label: "Week Off", bg: "#f8fafc" },
};

const StatCard = ({ title, value, icon, color, suffix = "", loading = false }) => (
  <Card 
    className="erp-stat-card" 
    loading={loading}
    style={{ 
      height: '100%', 
      borderRadius: '24px',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid var(--surface-container-high)',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ 
          width: 42, 
          height: 42, 
          borderRadius: 12, 
          backgroundColor: `${color}15`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: color,
          fontSize: 20
        }}>
          {icon}
        </div>
        <Badge status="processing" color={color} />
      </div>
      <div style={{ marginTop: 20 }}>
        <p style={{ 
          margin: 0, 
          color: 'var(--on-surface-variant)', 
          fontSize: 12, 
          fontWeight: 600, 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em',
          opacity: 0.8
        }}>
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <h3 style={{ margin: 0, fontSize: 32, fontWeight: '800', color: 'var(--primary)' }}>{value}</h3>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface-variant)' }}>{suffix}</span>
        </div>
      </div>
    </div>
  </Card>
);

const AttendancePage = ({ selfOnly: selfOnlyProp } = {}) => {
  const [attendance, setAttendance] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyDetailLoading, setMonthlyDetailLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkEntries, setBulkEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [activeTab, setActiveTab] = useState("daily");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(undefined);
  const [monthlyStaffId, setMonthlyStaffId] = useState(undefined);
  const [monthlyStaffLabel, setMonthlyStaffLabel] = useState("");
  const [monthlyStaffAttendance, setMonthlyStaffAttendance] = useState([]);
  const [detailDateRange, setDetailDateRange] = useState(null);
  const [fullRecordModalOpen, setFullRecordModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const canManageAttendance = hasPermission(PERMISSIONS.HR_ATTENDANCE_MANAGE);
  const currentUser = getCurrentUser();
  const isSelfOnly = selfOnlyProp || (!canManageAttendance && !hasPermission(PERMISSIONS.HR_DASHBOARD));

  const normalizeStatus = (value) => String(value || "").toLowerCase();

  const departmentOptions = [...new Set(staff.map((s) => s.department).filter(Boolean))].sort();

  const matchesSearch = (empId, name) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return String(empId || "").toLowerCase().includes(q) || String(name || "").toLowerCase().includes(q);
  };

  const filteredAttendance = attendance.filter((row) => {
    const empId = row?.staff?.employeeId;
    const name = row?.staff?.name;
    const department = row?.staff?.department;
    const deptOk = !departmentFilter || department === departmentFilter;
    return deptOk && matchesSearch(empId, name);
  });

  const filteredMonthlyReport = monthlyReport.filter((row) => {
    const deptOk = !departmentFilter || row?.department === departmentFilter;
    return deptOk && matchesSearch(row?.employeeId, row?.staffName);
  });

  const filteredMonthlyStaffAttendance = monthlyStaffAttendance.filter((row) => {
    if (!detailDateRange || detailDateRange.length !== 2) return true;
    const rowDate = dayjs(row?.date);
    if (!rowDate.isValid()) return false;
    const [start, end] = detailDateRange;
    return rowDate.isSame(start, "day") || rowDate.isSame(end, "day") || (rowDate.isAfter(start, "day") && rowDate.isBefore(end, "day"));
  });

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch {
      message.error("Failed to load staff");
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let data;
      if (isSelfOnly && currentUser?.staffId) {
        const res = await getAttendanceByStaff(currentUser.staffId, {
          date: selectedDate.format("YYYY-MM-DD"),
        });
        data = res?.records || res || [];
      } else {
        data = await getAttendance({
          date: selectedDate.format("YYYY-MM-DD"),
        });
      }
      setAttendance(Array.isArray(data) ? data : data?.records || data?.data || []);
    } catch {
      setAttendance([]);
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const data = await getAttendanceSummary({
        month: selectedMonth.format("YYYY-MM"),
      });
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const params = { month: selectedMonth.format("YYYY-MM") };
      if (isSelfOnly && currentUser?.staffId) params.staffId = currentUser.staffId;
      const data = await getMonthlyAttendanceReport(params);
      const list = Array.isArray(data) ? data : data?.data || [];
      setMonthlyReport(isSelfOnly && currentUser?.staffId ? list.filter(r => r.staffId === currentUser.staffId) : list);
    } catch {
      setMonthlyReport([]);
    }
    setLoading(false);
  };

  const fetchMonthlyStaffAttendance = async (staffId) => {
    if (!staffId) {
      setMonthlyStaffAttendance([]);
      return;
    }
    setMonthlyDetailLoading(true);
    try {
      const data = await getAttendance({
        month: selectedMonth.format("YYYY-MM"),
        staffId,
      });
      const list = Array.isArray(data) ? data : data?.records || data?.data || [];
      setMonthlyStaffAttendance(list);
    } catch {
      setMonthlyStaffAttendance([]);
      message.error("Failed to load selected staff monthly attendance");
    }
    setMonthlyDetailLoading(false);
  };

  const openMonthlyFullRecord = async (staffId, label) => {
    if (!staffId) return;
    setMonthlyStaffId(staffId);
    setMonthlyStaffLabel(label || "");
    setDetailDateRange(null);
    setFullRecordModalOpen(true);
    await fetchMonthlyStaffAttendance(staffId);
  };

  useEffect(() => {
    if (!isSelfOnly) fetchStaff();
  }, []);

  useEffect(() => {
    if (activeTab === "daily") fetchAttendance();
    else {
      fetchMonthlyReport();
      fetchSummary();
      if (monthlyStaffId) {
        fetchMonthlyStaffAttendance(monthlyStaffId);
      }
    }
  }, [selectedDate, selectedMonth, activeTab]);

  useEffect(() => {
    if (activeTab === "monthly" && isSelfOnly && currentUser?.staffId && !fullRecordModalOpen) {
      const selfStaff = staff.find((s) => s.id === currentUser.staffId);
      const label = selfStaff ? `${selfStaff.name} (${selfStaff.employeeId})` : "My Record";
      openMonthlyFullRecord(currentUser.staffId, label);
    }
  }, [activeTab, isSelfOnly, currentUser?.staffId, staff]);

  const openBulkMark = () => {
    const entries = staff.map((s) => ({
      staffId: s.id,
      staffName: s.name,
      employeeId: s.employeeId,
      status: "present",
      checkIn: null,
      checkOut: null,
    }));
    setBulkEntries(entries);
    setBulkModalOpen(true);
  };

  const handleBulkStatusChange = (idx, val) => {
    setBulkEntries((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: val };
      return updated;
    });
  };

  const handleBulkSubmit = async () => {
    try {
      await bulkMarkAttendance({
        date: selectedDate.format("YYYY-MM-DD"),
        entries: bulkEntries.map((e) => ({
          staffId: e.staffId,
          status: e.status,
          checkIn: e.checkIn,
          checkOut: e.checkOut,
        })),
      });
      message.success("Attendance marked successfully");
      setBulkModalOpen(false);
      fetchAttendance();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to mark attendance");
    }
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      status: record.status,
      checkIn: record.checkIn ? dayjs(record.checkIn, "HH:mm") : null,
      checkOut: record.checkOut ? dayjs(record.checkOut, "HH:mm") : null,
      remarks: record.remarks,
    });
    setEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateAttendance(editingRecord.id, {
        status: values.status,
        checkIn: values.checkIn ? values.checkIn.format("HH:mm") : null,
        checkOut: values.checkOut ? values.checkOut.format("HH:mm") : null,
        remarks: values.remarks,
      });
      message.success("Attendance updated");
      setEditModal(false);
      fetchAttendance();
    } catch (err) {
      message.error(err?.response?.data?.message || "Update failed");
    }
  };

  const renderStatus = (v) => {
    const status = normalizeStatus(v);
    const config = STATUS_CONFIG[status] || { color: "#64748b", label: String(v || "").toUpperCase(), bg: "#f1f5f9" };
    return (
      <Tag 
        style={{ 
          backgroundColor: config.bg, 
          color: config.color, 
          borderColor: 'transparent',
          borderRadius: '8px', 
          fontWeight: 700,
          fontSize: '11px',
          textTransform: 'uppercase',
          padding: '2px 10px'
        }}
      >
        {config.label}
      </Tag>
    );
  };

  const dailyColumns = [
    { 
      title: "Employee", 
      key: "employee",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>{record.staff?.name}</span>
          <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.7 }}>{record.staff?.employeeId}</span>
        </Space>
      ),
      width: 220,
    },
    { title: "Department", dataIndex: ["staff", "department"], render: (v) => v || "-", width: 140 },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => renderStatus(v),
      filters: Object.keys(STATUS_CONFIG).map((k) => ({ text: STATUS_CONFIG[k].label, value: k })),
      onFilter: (value, record) => normalizeStatus(record.status) === value,
      width: 120,
    },
    {
      title: "Time Log",
      key: "time_log",
      render: (_, record) => (
        <Space size={12}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>In</span>
            <span style={{ fontWeight: 600 }}>{record.checkIn || "--:--"}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Out</span>
            <span style={{ fontWeight: 600 }}>{record.checkOut || "--:--"}</span>
          </div>
        </Space>
      ),
      width: 160,
    },
    {
      title: "Method",
      dataIndex: "punchMethod",
      render: (v) => (
        v ? <Tag 
          style={{ 
            borderRadius: '6px', 
            border: '1px solid var(--surface-container-high)',
            backgroundColor: 'var(--surface-container-low)',
            color: 'var(--primary)',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          {v === "fingerprint" ? "🖐️ Biometric" : v === "face" ? "😊 Facial" : v}
        </Tag> : "-"
      ),
      width: 120,
    },
    {
      title: "Duration",
      dataIndex: "workingHours",
      render: (v) => v ? (
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
          {v}<small style={{ marginLeft: 2, opacity: 0.6 }}>h</small>
        </div>
      ) : "-",
      width: 100,
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      render: (v) => (
        <div style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7, fontSize: 12 }}>
          {v || "-"}
        </div>
      ),
    },
    ...(canManageAttendance
      ? [
          {
            title: "Actions",
            key: "actions",
            fixed: 'right',
            width: 80,
            render: (_, record) => (
              <Tooltip title="Edit Record">
                <Button 
                  type="text" 
                  size="middle" 
                  icon={<EditOutlined style={{ color: 'var(--primary)' }} />} 
                  onClick={() => openEdit(record)} 
                  style={{ borderRadius: '8px' }}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  const monthlyColumns = [
    { 
      title: "Employee", 
      key: "employee",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{record.staffName}</span>
          <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{record.employeeId}</span>
        </Space>
      ),
      width: 220,
    },
    {
      title: "Attendance Summary",
      key: "summary",
      render: (_, record) => (
        <Space size={8} wrap>
          <Tooltip title="Present">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', cursor: 'default' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ color: '#065f46', fontWeight: 700, fontSize: 12 }}>{record.presentDays || 0}</span>
            </div>
          </Tooltip>
          <Tooltip title="Absent">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', padding: '2px 8px', borderRadius: '6px', cursor: 'default' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ color: '#991b1b', fontWeight: 700, fontSize: 12 }}>{record.absentDays || 0}</span>
            </div>
          </Tooltip>
          <Tooltip title="Late">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fffbeb', padding: '2px 8px', borderRadius: '6px', cursor: 'default' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span style={{ color: '#92400e', fontWeight: 700, fontSize: 12 }}>{record.lateDays || 0}</span>
            </div>
          </Tooltip>
        </Space>
      ),
      width: 250,
    },
    { title: "Half Day", dataIndex: "halfDays", render: (v) => <span style={{ fontWeight: 600 }}>{v || 0}</span>, width: 80 },
    { title: "Leaves", dataIndex: "leaveDays", render: (v) => <span style={{ fontWeight: 600 }}>{v || 0}</span>, width: 80 },
    { title: "LOP", dataIndex: "lopDays", render: (v) => <span style={{ fontWeight: 600, color: '#ef4444' }}>{v || 0}</span>, width: 70 },
    { 
      title: "Avg Hrs", 
      dataIndex: "avgWorkingHours", 
      render: (v) => v ? <span style={{ fontWeight: 800 }}>{v}<small style={{ opacity: 0.6 }}>h</small></span> : "-",
      width: 90
    },
    {
      title: "Action",
      key: "action",
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          className="ghost-btn"
          onClick={() => {
            openMonthlyFullRecord(
              record.staffId,
              `${record.staffName || "Staff"} (${record.employeeId || "-"})`,
            );
          }}
          style={{ height: 32 }}
        >
          Details
        </Button>
      ),
    },
  ];

  const monthlyDetailColumns = [
    {
      title: "Date",
      dataIndex: "date",
      render: (v) => (
        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
          {v ? dayjs(v).format("DD MMM") : "-"}
          <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 6, opacity: 0.6 }}>{v ? dayjs(v).format("ddd") : ""}</span>
        </div>
      ),
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => renderStatus(v),
      width: 120,
    },
    { 
      title: "Punch", 
      key: "punch",
      render: (_, record) => (
        <span style={{ fontWeight: 600, fontSize: 12 }}>
          {record.checkIn || "--:--"} <span style={{ opacity: 0.3, margin: '0 4px' }}>|</span> {record.checkOut || "--:--"}
        </span>
      )
    },
    { title: "Work Hrs", dataIndex: "workingHours", render: (v) => (v ? <span style={{ fontWeight: 700 }}>{v}h</span> : "-"), width: 100 },
    { title: "Remarks", dataIndex: "remarks", render: (v) => <span style={{ fontSize: 12, opacity: 0.7 }}>{v || "-"}</span> },
  ];

  const tabItems = [
    { 
      key: "daily", 
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined /> Daily Pulse
        </span>
      ) 
    },
    { 
      key: "monthly", 
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChartOutlined /> Analytics Report
        </span>
      ) 
    },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="page-breadcrumb">
            <span>Human Resources</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>●</span>
            <span>Workforce</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>●</span>
            <span style={{ color: "var(--primary)", fontWeight: 800 }}>Attendance</span>
          </div>
          <h2 style={{ fontSize: 36, letterSpacing: "-0.04em", margin: "8px 0 4px" }}>
            {isSelfOnly ? "My Attendance" : "Attendance Monitor"}
          </h2>
          <p style={{ color: "var(--on-surface-variant)", maxWidth: 500 }}>
            {isSelfOnly 
              ? "Track your work hours, punch-in logs, and monthly availability metrics." 
              : "Comprehensive oversight of workplace attendance, biometric synchronization, and staff performance metrics."}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {canManageAttendance && activeTab === "daily" && (
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />} 
              onClick={openBulkMark}
              className="gradient-btn"
            >
              Manual Entry
            </Button>
          )}
          <Button 
            icon={<SyncOutlined />} 
            onClick={activeTab === "daily" ? fetchAttendance : fetchMonthlyReport}
            className="ghost-btn"
            style={{ width: 44, padding: 0 }}
          />
          {activeTab === "monthly" && (
            <Button icon={<ExportOutlined />} className="ghost-btn">
              Report
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Design */}
      <div style={{ marginBottom: 32 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          className="attendance-tabs"
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Filters & Actions Bento Grid */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 20, 
          background: 'var(--surface-container-low)', 
          border: 'none',
          padding: 8
        }}
        bodyStyle={{ padding: 12 }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="filter-item">
              <span className="filter-label">PERIOD</span>
              {activeTab === "daily" ? (
                <DatePicker
                  value={selectedDate}
                  onChange={(d) => d && setSelectedDate(d)}
                  allowClear={false}
                  suffixIcon={<CalendarOutlined style={{ color: 'var(--primary)' }} />}
                  style={{ width: 160 }}
                />
              ) : (
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={(d) => d && setSelectedMonth(d)}
                  allowClear={false}
                  suffixIcon={<CalendarOutlined style={{ color: 'var(--primary)' }} />}
                  style={{ width: 160 }}
                />
              )}
            </div>

            <div className="filter-item">
              <span className="filter-label">SEARCH</span>
              <Input
                placeholder="Name or Employee ID"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                style={{ width: 240 }}
                prefix={<SearchOutlined style={{ opacity: 0.4 }} />}
                allowClear
              />
            </div>

            {!isSelfOnly && (
              <div className="filter-item">
                <span className="filter-label">DEPARTMENT</span>
                <Select
                  placeholder="All Departments"
                  value={departmentFilter}
                  onChange={(val) => setDepartmentFilter(val)}
                  allowClear
                  style={{ width: 200 }}
                  suffixIcon={<FilterOutlined />}
                >
                  {departmentOptions.map((dept) => (
                    <Option key={dept} value={dept}>{dept}</Option>
                  ))}
                </Select>
              </div>
            )}

            {!isSelfOnly && activeTab === "monthly" && (
              <div className="filter-item">
                <span className="filter-label">SELECT STAFF</span>
                <Select
                  placeholder="Deep-dive into individual data"
                  value={monthlyStaffId}
                  onChange={(val) => {
                    const selected = staff.find((s) => s.id === val);
                    openMonthlyFullRecord(
                      val,
                      selected ? `${selected.name} (${selected.employeeId})` : "",
                    );
                  }}
                  allowClear
                  style={{ width: 260 }}
                  showSearch
                  optionFilterProp="children"
                  suffixIcon={<UserOutlined />}
                >
                  {staff.map((s) => (
                    <Option key={s.id} value={s.id}>{s.name} ({s.employeeId})</Option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Summary Stats Grid */}
      {summary && (
        <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
          {activeTab === "daily" ? (
            <>
              <Col xs={24} sm={12} lg={4}>
                <StatCard title="Present" value={summary.present || 0} icon={<CheckCircleOutlined />} color="#10b981" />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <StatCard title="Absent" value={summary.absent || 0} icon={<UserOutlined />} color="#ef4444" />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <StatCard title="Late" value={summary.late || 0} icon={<ClockCircleOutlined />} color="#f59e0b" />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <StatCard title="On Leave" value={summary.onLeave || 0} icon={<ExportOutlined />} color="#3b82f6" />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <StatCard title="Half Day" value={summary.halfDay || 0} icon={<PieChartOutlined />} color="#8b5cf6" />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <StatCard title="Force" value={summary.total || staff.length} icon={<UsersIconOutlined />} color="var(--primary)" />
              </Col>
            </>
          ) : (
            <>
              <Col xs={24} sm={12} lg={6}>
                <StatCard title="Work Days" value={summary.totalWorkingDays || 0} icon={<CalendarOutlined />} color="var(--primary)" suffix="Days" />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <StatCard title="Avg Attendance" value={summary.avgAttendancePercent || 0} icon={<PieChartOutlined />} color="#10b981" suffix="%" />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <StatCard title="Total LOP" value={summary.totalLopDays || 0} icon={<FileTextOutlined />} color="#ef4444" suffix="Units" />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <StatCard title="Staff Count" value={summary.staffCount || 0} icon={<UserOutlined />} color="#3b82f6" />
              </Col>
            </>
          )}
        </Row>
      )}

      {/* Main Table Content */}
      <div style={{ 
        background: "#fff", 
        borderRadius: 24, 
        padding: "24px",
        boxShadow: 'var(--shadow-ambient-sm)',
        border: '1px solid var(--surface-container-high)',
        minHeight: 500
      }}>
        <Table
          columns={activeTab === "daily" ? dailyColumns : monthlyColumns}
          dataSource={activeTab === "daily" ? filteredAttendance : filteredMonthlyReport}
          rowKey={(r) => activeTab === "daily" ? r.id : r.staffId}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{ 
            pageSize: 50,
            showSizeChanger: true,
            className: "custom-pagination"
          }}
          className="premium-table"
        />
      </div>

      {/* Styles for the page */}
      <style>{`
        .attendance-tabs .ant-tabs-nav::before {
          border-bottom: none !important;
        }
        .attendance-tabs .ant-tabs-tab {
          padding: 8px 0 !important;
          margin-right: 32px !important;
        }
        .attendance-tabs .ant-tabs-tab-btn {
          font-family: 'Manrope', sans-serif !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          color: var(--on-surface-variant) !important;
          transition: all 0.3s ease !important;
        }
        .attendance-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: var(--primary) !important;
          font-size: 18px !important;
        }
        .attendance-tabs .ant-tabs-ink-bar {
          height: 4px !important;
          border-radius: 4px 4px 0 0 !important;
          background: var(--primary) !important;
        }
        
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--on-surface-variant);
          letter-spacing: 0.1em;
          opacity: 0.6;
          margin-left: 12px;
        }
        
        .premium-table .ant-table {
          background: transparent !important;
        }
        .premium-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-bottom: 2px solid #f1f5f9 !important;
          padding: 16px 20px !important;
        }
        .premium-table .ant-table-tbody > tr > td {
          padding: 16px 20px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          transition: all 0.2s ease;
        }
        .premium-table .ant-table-tbody > tr:hover > td {
          background: #f8fbff !important;
        }
        
        .custom-pagination {
          margin-top: 24px !important;
        }
      `}</style>

      {/* Bulk Mark Attendance Modal */}
      <Modal
        title={
          <div style={{ padding: '8px 0' }}>
            <h3 style={{ margin: 0, fontSize: 20 }}>Bulk Attendance Protocol</h3>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>Date: {selectedDate.format("DD MMMM, YYYY")}</p>
          </div>
        }
        open={bulkModalOpen}
        onCancel={() => setBulkModalOpen(false)}
        onOk={handleBulkSubmit}
        width={900}
        okText="Commit Changes"
        cancelText="Discard"
        className="glass-modal"
        okButtonProps={{ className: 'gradient-btn', style: { height: 40 } }}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
           <Space>
             <span style={{ fontSize: 12, fontWeight: 600 }}>Set all to:</span>
             <Select 
               size="small" 
               style={{ width: 120 }} 
               placeholder="Mass Action"
               onChange={(val) => {
                 setBulkEntries(prev => prev.map(e => ({ ...e, status: val })));
               }}
             >
               <Option value="present">Present</Option>
               <Option value="absent">Absent</Option>
               <Option value="on_leave">Leave</Option>
             </Select>
           </Space>
        </div>
        <Table
          dataSource={bulkEntries}
          rowKey="staffId"
          pagination={false}
          scroll={{ y: 500 }}
          size="middle"
          className="premium-table"
          columns={[
            { 
              title: "Personnel", 
              key: "staff",
              render: (_, record) => (
                <Space>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    <UserOutlined />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700 }}>{record.staffName}</span>
                    <span style={{ fontSize: 11, opacity: 0.5 }}>{record.employeeId}</span>
                  </div>
                </Space>
              )
            },
            {
              title: "Attendance Status",
              key: "status",
              width: 180,
              render: (_, record, idx) => (
                <Select
                  value={record.status}
                  onChange={(val) => handleBulkStatusChange(idx, val)}
                  style={{ width: '100%' }}
                >
                  <Option value="present"><Badge status="success" text="Present" /></Option>
                  <Option value="absent"><Badge status="error" text="Absent" /></Option>
                  <Option value="half_day"><Badge color="#8b5cf6" text="Half Day" /></Option>
                  <Option value="late"><Badge status="warning" text="Late" /></Option>
                  <Option value="on_leave"><Badge status="processing" text="On Leave" /></Option>
                  <Option value="week_off"><Badge color="#64748b" text="Week Off" /></Option>
                  <Option value="holiday"><Badge color="#ec4899" text="Holiday" /></Option>
                </Select>
              ),
            },
          ]}
        />
      </Modal>

      {/* Edit Attendance Modal */}
      <Modal
        title={<span style={{ fontSize: 20, fontWeight: 800 }}>Record Calibration</span>}
        open={editModal}
        onCancel={() => setEditModal(false)}
        onOk={handleEditSubmit}
        okText="Update Entry"
        okButtonProps={{ className: 'gradient-btn', style: { height: 40 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="status" label={<span style={{ fontWeight: 700, fontSize: 12 }}>REVISED STATUS</span>} rules={[{ required: true }]}>
            <Select size="large">
              <Option value="present">Present</Option>
              <Option value="absent">Absent</Option>
              <Option value="half_day">Half Day</Option>
              <Option value="late">Late</Option>
              <Option value="on_leave">On Leave</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="checkIn" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PUNCH IN</span>}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="checkOut" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PUNCH OUT</span>}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label={<span style={{ fontWeight: 700, fontSize: 12 }}>REASONING / REMARKS</span>}>
            <Input.TextArea rows={3} placeholder="Provide context for this correction..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Details Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileTextOutlined />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 20 }}>Activity Dossier</h3>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>{monthlyStaffLabel}</p>
            </div>
          </div>
        }
        open={fullRecordModalOpen}
        onCancel={() => setFullRecordModalOpen(false)}
        footer={null}
        width={1100}
        className="glass-modal"
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, padding: '16px', background: 'var(--surface-container-low)', borderRadius: '16px', alignItems: 'center' }}>
          <Space size="middle">
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--on-surface-variant)', opacity: 0.6 }}>FILTER RANGE:</span>
            <RangePicker
              value={detailDateRange}
              onChange={(value) => setDetailDateRange(value)}
              allowClear
              size="middle"
            />
          </Space>
          <Button icon={<DownloadOutlined />} className="ghost-btn">Export PDF</Button>
        </div>
        <Table
          columns={monthlyDetailColumns}
          dataSource={filteredMonthlyStaffAttendance}
          rowKey="id"
          loading={monthlyDetailLoading}
          pagination={{ pageSize: 31, hideOnSinglePage: true }}
          scroll={{ x: 900, y: 500 }}
          className="premium-table"
        />
      </Modal>
    </div>
  );
};

// Internal icon component for cleaner code
const UsersIconOutlined = () => <UsersIcon size={20} />;
const UsersIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default AttendancePage;
