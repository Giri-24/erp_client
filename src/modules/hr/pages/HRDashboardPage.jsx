import React, { useEffect, useState } from "react";
import {
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Table,
  DatePicker,
  Space,
  Progress,
  message,
} from "antd";
import {
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  DesktopOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { getHRDashboard } from "../hr.service";
import dayjs from "dayjs";

const HRDashboardPage = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getHRDashboard({ month: selectedMonth.format("YYYY-MM") });
      setData(res);
    } catch {
      // Use placeholder data on error
      setData({
        totalStaff: 0,
        presentToday: 0,
        absentToday: 0,
        onLeaveToday: 0,
        lateToday: 0,
        attendancePercent: 0,
        pendingLeaves: 0,
        pendingPermissions: 0,
        totalLopDays: 0,
        totalPayroll: 0,
        pfContribution: 0,
        esiContribution: 0,
        devicesOnline: 0,
        devicesTotal: 0,
        recentActivity: [],
        departmentWise: [],
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth]);

  if (!data) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>Dashboard</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            HR Dashboard
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Overview of attendance, leaves, payroll, and statutory compliance.
          </p>
        </div>
        <DatePicker picker="month" value={selectedMonth} onChange={(d) => d && setSelectedMonth(d)} allowClear={false} />
      </div>

      {/* Today's Attendance */}
      <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, marginBottom: 12, color: "#00152a" }}>
        Today's Attendance
      </h3>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-attendance")}>
            <Statistic title="Total Staff" value={data.totalStaff} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-attendance")}>
            <Statistic title="Present" value={data.presentToday} valueStyle={{ color: "#52c41a" }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Absent" value={data.absentToday} valueStyle={{ color: "#ff4d4f" }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="On Leave" value={data.onLeaveToday} valueStyle={{ color: "#1890ff" }} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Late" value={data.lateToday} valueStyle={{ color: "#faad14" }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <div style={{ marginBottom: 4, fontSize: 12, color: "#666" }}>Attendance Rate</div>
            <Progress type="circle" percent={data.attendancePercent || 0} size={60} strokeColor={data.attendancePercent >= 90 ? "#52c41a" : data.attendancePercent >= 75 ? "#faad14" : "#ff4d4f"} />
          </Card>
        </Col>
      </Row>

      {/* Pending Actions & Payroll */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-leaves")}>
            <Statistic title="Pending Leave Requests" value={data.pendingLeaves} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-permission")}>
            <Statistic title="Pending Permissions" value={data.pendingPermissions} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-payroll")}>
            <Statistic title="Monthly Payroll" prefix="₹" value={data.totalPayroll} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total LOP Days" value={data.totalLopDays} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
      </Row>

      {/* Statutory & Devices */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-pf-esi")}>
            <Statistic title="PF Contribution" prefix={<SafetyCertificateOutlined />} value={data.pfContribution} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-pf-esi")}>
            <Statistic title="ESI Contribution" prefix="₹" value={data.esiContribution} valueStyle={{ color: "#13c2c2" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable onClick={() => onNavigate?.("hr-essl")}>
            <Statistic title="Devices Online" value={`${data.devicesOnline} / ${data.devicesTotal}`} prefix={<DesktopOutlined />} valueStyle={{ color: data.devicesOnline === data.devicesTotal ? "#52c41a" : "#faad14" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Quick Actions</div>
            <Space wrap>
              <Tag color="blue" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("hr-attendance")}>Mark Attendance</Tag>
              <Tag color="green" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("hr-payroll")}>Payroll</Tag>
              <Tag color="cyan" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("hr-essl")}>Sync ESSL</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Department-wise Breakdown */}
      {data.departmentWise?.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, marginBottom: 12, color: "#00152a" }}>
            Department-wise Attendance
          </h3>
          <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4, marginBottom: 24 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
              <Table
                dataSource={data.departmentWise}
                rowKey="department"
                pagination={false}
                size="small"
                columns={[
                  { title: "Department", dataIndex: "department" },
                  { title: "Total", dataIndex: "total" },
                  { title: "Present", dataIndex: "present", render: (v) => <Tag color="green">{v}</Tag> },
                  { title: "Absent", dataIndex: "absent", render: (v) => <Tag color="red">{v}</Tag> },
                  { title: "On Leave", dataIndex: "onLeave", render: (v) => <Tag color="blue">{v}</Tag> },
                  {
                    title: "Rate",
                    key: "rate",
                    render: (_, r) => {
                      const pct = r.total ? Math.round((r.present / r.total) * 100) : 0;
                      return <Progress percent={pct} size="small" style={{ width: 100 }} />;
                    },
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}

      {/* Recent Activity */}
      {data.recentActivity?.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, marginBottom: 12, color: "#00152a" }}>
            Recent Activity
          </h3>
          <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
              <Table
                dataSource={data.recentActivity}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: "Activity", dataIndex: "description" },
                  { title: "Staff", dataIndex: "staffName" },
                  {
                    title: "Type",
                    dataIndex: "type",
                    render: (v) => <Tag>{v}</Tag>,
                  },
                  {
                    title: "Time",
                    dataIndex: "timestamp",
                    render: (v) => v ? dayjs(v).format("DD MMM HH:mm") : "-",
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HRDashboardPage;
