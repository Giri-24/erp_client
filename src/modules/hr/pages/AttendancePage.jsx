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
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import {
  getAttendance,
  bulkMarkAttendance,
  updateAttendance,
  getAttendanceSummary,
  getMonthlyAttendanceReport,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;
const { RangePicker } = DatePicker;

const STATUS_COLORS = {
  present: "green",
  absent: "red",
  half_day: "orange",
  late: "gold",
  on_leave: "blue",
  holiday: "purple",
  week_off: "default",
};

const AttendancePage = () => {
  const [attendance, setAttendance] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkEntries, setBulkEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [activeTab, setActiveTab] = useState("daily");
  const [editModal, setEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const canManageAttendance = hasPermission(PERMISSIONS.HR_ATTENDANCE_MANAGE);

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
      const data = await getAttendance({ date: selectedDate.format("YYYY-MM-DD") });
      setAttendance(data);
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
      const data = await getMonthlyAttendanceReport({
        month: selectedMonth.format("YYYY-MM"),
      });
      setMonthlyReport(data);
    } catch {
      setMonthlyReport([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (activeTab === "daily") fetchAttendance();
    else {
      fetchMonthlyReport();
      fetchSummary();
    }
  }, [selectedDate, selectedMonth, activeTab]);

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

  const dailyColumns = [
    { title: "Emp ID", dataIndex: ["staff", "employeeId"], width: 100 },
    { title: "Name", dataIndex: ["staff", "name"], sorter: (a, b) => (a.staff?.name || "").localeCompare(b.staff?.name || "") },
    { title: "Department", dataIndex: ["staff", "department"], render: (v) => v || "-" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => (
        <Tag color={STATUS_COLORS[v] || "default"}>{(v || "").replace("_", " ").toUpperCase()}</Tag>
      ),
      filters: Object.keys(STATUS_COLORS).map((k) => ({ text: k.replace("_", " ").toUpperCase(), value: k })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Punch In",
      dataIndex: "checkIn",
      render: (v) => v || "-",
    },
    {
      title: "Punch Out",
      dataIndex: "checkOut",
      render: (v) => v || "-",
    },
    {
      title: "Punch Method",
      dataIndex: "punchMethod",
      render: (v) => (
        v ? <Tag color={v === "fingerprint" ? "blue" : v === "face" ? "cyan" : "default"}>
          {v === "fingerprint" ? "🖐️ Finger" : v === "face" ? "😊 Face" : v}
        </Tag> : "-"
      ),
    },
    {
      title: "Working Hrs",
      dataIndex: "workingHours",
      render: (v) => v ? `${v}h` : "-",
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      render: (v) => v || "-",
    },
    ...(canManageAttendance
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
              <Button size="small" onClick={() => openEdit(record)}>
                Edit
              </Button>
            ),
          },
        ]
      : []),
  ];

  const monthlyColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName", sorter: (a, b) => (a.staffName || "").localeCompare(b.staffName || "") },
    { title: "Present", dataIndex: "presentDays", render: (v) => <Tag color="green">{v || 0}</Tag> },
    { title: "Absent", dataIndex: "absentDays", render: (v) => <Tag color="red">{v || 0}</Tag> },
    { title: "Half Day", dataIndex: "halfDays", render: (v) => <Tag color="orange">{v || 0}</Tag> },
    { title: "Late", dataIndex: "lateDays", render: (v) => <Tag color="gold">{v || 0}</Tag> },
    { title: "Leaves", dataIndex: "leaveDays", render: (v) => <Tag color="blue">{v || 0}</Tag> },
    { title: "LOP Days", dataIndex: "lopDays", render: (v) => <Tag color="red">{v || 0}</Tag> },
    { title: "Working Days", dataIndex: "workingDays" },
    { title: "Avg Hrs", dataIndex: "avgWorkingHours", render: (v) => v ? `${v}h` : "-" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>Attendance</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Attendance Management
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Track daily attendance, biometric punch logs, and monthly reports.
          </p>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "daily", label: "Daily Attendance" },
        { key: "monthly", label: "Monthly Report" },
      ]} />

      {activeTab === "daily" ? (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <DatePicker
              value={selectedDate}
              onChange={(d) => d && setSelectedDate(d)}
              allowClear={false}
            />
            <Button icon={<SyncOutlined />} onClick={fetchAttendance}>
              Refresh
            </Button>
            {canManageAttendance && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={openBulkMark}>
                Mark Attendance
              </Button>
            )}
          </div>

          {summary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card size="small"><Statistic title="Present" value={summary.present || 0} valueStyle={{ color: "#52c41a" }} /></Card></Col>
              <Col span={4}><Card size="small"><Statistic title="Absent" value={summary.absent || 0} valueStyle={{ color: "#ff4d4f" }} /></Card></Col>
              <Col span={4}><Card size="small"><Statistic title="Late" value={summary.late || 0} valueStyle={{ color: "#faad14" }} /></Card></Col>
              <Col span={4}><Card size="small"><Statistic title="Half Day" value={summary.halfDay || 0} valueStyle={{ color: "#fa8c16" }} /></Card></Col>
              <Col span={4}><Card size="small"><Statistic title="On Leave" value={summary.onLeave || 0} valueStyle={{ color: "#1890ff" }} /></Card></Col>
              <Col span={4}><Card size="small"><Statistic title="Total Staff" value={summary.total || staff.length} /></Card></Col>
            </Row>
          )}

          <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
              <Table
                columns={dailyColumns}
                dataSource={attendance}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 50 }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(d) => d && setSelectedMonth(d)}
              allowClear={false}
            />
            <Button icon={<SyncOutlined />} onClick={fetchMonthlyReport}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />}>Export</Button>
          </div>

          {summary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="Total Working Days" value={summary.totalWorkingDays || 0} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Avg Attendance %" value={summary.avgAttendancePercent || 0} suffix="%" valueStyle={{ color: "#52c41a" }} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Total LOP Days" value={summary.totalLopDays || 0} valueStyle={{ color: "#ff4d4f" }} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Staff Count" value={summary.staffCount || 0} /></Card></Col>
            </Row>
          )}

          <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
              <Table
                columns={monthlyColumns}
                dataSource={monthlyReport}
                rowKey="staffId"
                loading={loading}
                scroll={{ x: 1000 }}
                pagination={{ pageSize: 50 }}
              />
            </div>
          </div>
        </>
      )}

      {/* Bulk Mark Attendance Modal */}
      <Modal
        title={`Mark Attendance — ${selectedDate.format("DD MMM YYYY")}`}
        open={bulkModalOpen}
        onCancel={() => setBulkModalOpen(false)}
        onOk={handleBulkSubmit}
        width={800}
        okText="Submit Attendance"
      >
        <Table
          dataSource={bulkEntries}
          rowKey="staffId"
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
          columns={[
            { title: "Emp ID", dataIndex: "employeeId", width: 100 },
            { title: "Name", dataIndex: "staffName" },
            {
              title: "Status",
              key: "status",
              width: 160,
              render: (_, record, idx) => (
                <Select
                  value={record.status}
                  onChange={(val) => handleBulkStatusChange(idx, val)}
                  size="small"
                  style={{ width: 140 }}
                >
                  <Option value="present">Present</Option>
                  <Option value="absent">Absent</Option>
                  <Option value="half_day">Half Day</Option>
                  <Option value="late">Late</Option>
                  <Option value="on_leave">On Leave</Option>
                  <Option value="week_off">Week Off</Option>
                  <Option value="holiday">Holiday</Option>
                </Select>
              ),
            },
          ]}
        />
      </Modal>

      {/* Edit Attendance Modal */}
      <Modal
        title="Edit Attendance"
        open={editModal}
        onCancel={() => setEditModal(false)}
        onOk={handleEditSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Option value="present">Present</Option>
              <Option value="absent">Absent</Option>
              <Option value="half_day">Half Day</Option>
              <Option value="late">Late</Option>
              <Option value="on_leave">On Leave</Option>
            </Select>
          </Form.Item>
          <Space size="large">
            <Form.Item name="checkIn" label="Check In">
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="checkOut" label="Check Out">
              <TimePicker format="HH:mm" />
            </Form.Item>
          </Space>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
