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
  Descriptions,
  Popconfirm,
  Progress,
  Alert,
} from "antd";
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  applyPermission,
  getPermissions,
  getLeavePermissionPolicy,
  approvePermission,
  rejectPermission,
  getPermissionSummary,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS, getCurrentUser } from "../../../utils/permissions";

const { Option } = Select;
const { TextArea } = Input;

const DEFAULT_PERMISSION_HOURS = 4;

const PERM_STATUS_COLORS = {
  PENDING: "gold",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "default",
};

const normalizePermissionStatus = (status) => String(status || "").toUpperCase();

const PermissionPage = ({ selfOnly: selfOnlyProp } = {}) => {
  const [permissions, setPermissions] = useState([]);
  const [myPermissions, setMyPermissions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyModal, setApplyModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedPerm, setSelectedPerm] = useState(null);
  const [filterMonth, setFilterMonth] = useState(dayjs());
  const [permissionLimit, setPermissionLimit] = useState(DEFAULT_PERMISSION_HOURS);
  const [form] = Form.useForm();

  const canManagePerm = hasPermission(PERMISSIONS.HR_PERMISSION_MANAGE);
  const canApprovePerm = hasPermission(PERMISSIONS.HR_PERMISSION_APPROVE);
  const currentUser = getCurrentUser();
  const isSelfOnly = selfOnlyProp || (!canManagePerm && !canApprovePerm && !hasPermission(PERMISSIONS.HR_DASHBOARD));
  const [activeTab, setActiveTab] = useState(isSelfOnly ? "my" : "all");

  const fetchPolicy = async () => {
    try {
      const policy = await getLeavePermissionPolicy(currentUser?.staffId);
      setPermissionLimit(
        Number(policy?.effective?.permissionHoursLimit || DEFAULT_PERMISSION_HOURS),
      );
    } catch {
      setPermissionLimit(DEFAULT_PERMISSION_HOURS);
    }
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const data = await getPermissions({ month: filterMonth.format("YYYY-MM") });
      setPermissions(data);
    } catch {
      setPermissions([]);
    }
    setLoading(false);
  };

  const fetchMyPermissions = async () => {
    setLoading(true);
    try {
      const staffId = currentUser?.staffId;
      const data = await getPermissions({ staffId, month: filterMonth.format("YYYY-MM") });
      const list = Array.isArray(data) ? data : data?.data || [];
      setMyPermissions(staffId ? list.filter(p => p.staffId === staffId) : list);
    } catch {
      setMyPermissions([]);
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const data = await getPermissionSummary({ month: filterMonth.format("YYYY-MM") });
      setSummary(data);
    } catch {
      setSummary([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchPolicy();
    if (!isSelfOnly) fetchStaff();
  }, []);

  useEffect(() => {
    if (!isSelfOnly) {
      fetchPermissions();
      fetchSummary();
    }
    fetchMyPermissions();
  }, [filterMonth]);

  const calcHours = (from, to) => {
    if (!from || !to) return 0;
    const diff = to.diff(from, "minute");
    return Math.round((diff / 60) * 100) / 100;
  };

  const handleApply = async () => {
    try {
      const values = await form.validateFields();
      let effectiveLimit = permissionLimit;
      const selectedStaffId = values.staffId || currentUser?.staffId;
      if (selectedStaffId) {
        try {
          const policy = await getLeavePermissionPolicy(selectedStaffId);
          effectiveLimit = Number(policy?.effective?.permissionHoursLimit || effectiveLimit);
        } catch {
          // fallback to already loaded limit
        }
      }
      const hours = calcHours(values.fromTime, values.toTime);
      if (hours <= 0) {
        message.error("To time must be after From time");
        return;
      }
      if (hours > effectiveLimit) {
        message.error(`Single permission cannot exceed ${effectiveLimit} hours`);
        return;
      }
      const staffId = values.staffId || currentUser?.staffId;
      if (!staffId) {
        message.error("Staff ID not found. Please logout and login again.");
        return;
      }
      await applyPermission({
        staffId,
        date: values.date.format("YYYY-MM-DD"),
        fromTime: values.fromTime.format("HH:mm"),
        toTime: values.toTime.format("HH:mm"),
        hours,
        reason: values.reason,
      });
      message.success("Permission applied successfully");
      setApplyModal(false);
      form.resetFields();
      fetchPermissions();
      fetchMyPermissions();
      fetchSummary();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to apply permission");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approvePermission(id, { approvedBy: currentUser?.id });
      message.success("Permission approved");
      fetchPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectPermission(id, { rejectedBy: currentUser?.id, reason: "Not approved" });
      message.success("Permission rejected");
      fetchPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  // Compute my used hours this month from approved permissions
  const myUsedHours = myPermissions
    .filter((p) => normalizePermissionStatus(p.status) === "APPROVED")
    .reduce((sum, p) => sum + (p.hours || 0), 0);
  const myRemainingHours = Math.max(0, permissionLimit - myUsedHours);
  const usedPercent = permissionLimit > 0 ? Math.round((myUsedHours / permissionLimit) * 100) : 0;

  const columns = [
    { title: "Emp ID", dataIndex: ["staff", "employeeId"], width: 100 },
    { title: "Name", dataIndex: ["staff", "name"], sorter: (a, b) => (a.staff?.name || "").localeCompare(b.staff?.name || "") },
    {
      title: "Date",
      dataIndex: "date",
      render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-",
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    { title: "From", dataIndex: "fromTime" },
    { title: "To", dataIndex: "toTime" },
    { title: "Hours", dataIndex: "hours", render: (v) => `${v}h` },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <Tag color={PERM_STATUS_COLORS[normalizePermissionStatus(v)] || "default"}>{normalizePermissionStatus(v)}</Tag>,
    },
    { title: "Reason", dataIndex: "reason", ellipsis: true },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => { setSelectedPerm(record); setDetailModal(true); }} />
          {canApprovePerm && normalizePermissionStatus(record.status) === "PENDING" && (
            <>
              <Popconfirm title="Approve?" onConfirm={() => handleApprove(record.id)}>
                <Button icon={<CheckOutlined />} size="small" type="primary" />
              </Popconfirm>
              <Popconfirm title="Reject?" onConfirm={() => handleReject(record.id)}>
                <Button icon={<CloseOutlined />} size="small" danger />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const summaryColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    {
      title: "Used Hours",
      dataIndex: "usedHours",
      render: (v, record) => {
        const limit = Number(record?.limit || permissionLimit || 1);
        return (
          <Space>
            <span>{v || 0}h / {limit}h</span>
            <Progress
              percent={Math.round((((v || 0) / limit) * 100))}
              size="small"
              style={{ width: 80 }}
              status={((v || 0) >= limit) ? "exception" : "active"}
            />
          </Space>
        );
      },
    },
    {
      title: "Remaining",
      dataIndex: "usedHours",
      render: (v, record) => {
        const rem = Math.max(0, Number(record?.limit || permissionLimit) - (v || 0));
        return <Tag color={rem <= 0 ? "red" : rem <= 1 ? "orange" : "green"}>{rem}h</Tag>;
      },
    },
    {
      title: "Excess (LOP)",
      dataIndex: "usedHours",
      render: (v, record) => {
        const excess = Math.max(0, (v || 0) - Number(record?.limit || permissionLimit));
        return excess > 0 ? <Tag color="red">{excess}h → LOP</Tag> : <Tag color="green">None</Tag>;
      },
    },
    { title: "Requests", dataIndex: "totalRequests" },
    { title: "Approved", dataIndex: "approvedCount" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>Permissions</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {isSelfOnly ? "My Permissions" : "Permission Management"}
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Short leave / permission — max {permissionLimit} hours per month.{!isSelfOnly ? " Excess converts to LOP." : ""}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setApplyModal(true); }}>
          Apply Permission
        </Button>
      </div>

      {/* My Permission Balance */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Used This Month" value={myUsedHours} suffix={`/ ${permissionLimit}h`} valueStyle={{ color: myUsedHours >= permissionLimit ? "#ff4d4f" : "#1890ff" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Remaining" value={myRemainingHours} suffix="h" valueStyle={{ color: myRemainingHours <= 0 ? "#ff4d4f" : "#52c41a" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ marginBottom: 4, fontSize: 12, color: "#666" }}>Usage</div>
            <Progress percent={usedPercent} status={usedPercent >= 100 ? "exception" : "active"} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            {myUsedHours > permissionLimit ? (
              <Alert type="error" message={`Excess ${(myUsedHours - permissionLimit).toFixed(1)}h → LOP deduction`} showIcon icon={<WarningOutlined />} />
            ) : (
              <Alert type="success" message="Within limit" showIcon />
            )}
          </Card>
        </Col>
      </Row>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <DatePicker
          picker="month"
          value={filterMonth}
          onChange={(d) => d && setFilterMonth(d)}
          allowClear={false}
        />
        {!isSelfOnly && (
          <Select value={activeTab} onChange={setActiveTab} style={{ width: 200 }}>
            <Option value="all">All Permissions</Option>
            <Option value="pending">Pending Approvals</Option>
            <Option value="my">My Permissions</Option>
            <Option value="summary">Monthly Summary</Option>
          </Select>
        )}
      </div>

      <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
          {activeTab === "summary" && !isSelfOnly ? (
            <Table columns={summaryColumns} dataSource={summary} rowKey="staffId" loading={loading} scroll={{ x: 900 }} pagination={{ pageSize: 50 }} />
          ) : (
            <Table
              columns={columns}
              dataSource={
                isSelfOnly
                  ? myPermissions
                  : activeTab === "pending"
                  ? permissions.filter((p) => normalizePermissionStatus(p.status) === "PENDING")
                  : activeTab === "my"
                  ? myPermissions
                  : permissions
              }
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 20 }}
            />
          )}
        </div>
      </div>

      {/* Apply Permission Modal */}
      <Modal title="Apply Permission" open={applyModal} onCancel={() => setApplyModal(false)} onOk={handleApply} width={480}>
        <Form form={form} layout="vertical">
          {canManagePerm && !isSelfOnly && (
            <Form.Item name="staffId" label="Staff Member">
              <Select placeholder="Select staff (empty for self)" allowClear showSearch optionFilterProp="children">
                {staff.map((s) => (
                  <Option key={s.id} value={s.id}>{s.name} ({s.employeeId})</Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="fromTime" label="From Time" rules={[{ required: true }]}>
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="toTime" label="To Time" rules={[{ required: true }]}>
              <TimePicker format="HH:mm" />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Reason for permission" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title="Permission Details" open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={500}>
        {selectedPerm && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Staff">{selectedPerm.staff?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Emp ID">{selectedPerm.staff?.employeeId || "-"}</Descriptions.Item>
            <Descriptions.Item label="Date">{selectedPerm.date ? dayjs(selectedPerm.date).format("DD MMM YYYY") : "-"}</Descriptions.Item>
            <Descriptions.Item label="Hours">{selectedPerm.hours}h</Descriptions.Item>
            <Descriptions.Item label="Time">{selectedPerm.fromTime} – {selectedPerm.toTime}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={PERM_STATUS_COLORS[normalizePermissionStatus(selectedPerm.status)]}>{normalizePermissionStatus(selectedPerm.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Reason" span={2}>{selectedPerm.reason || "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PermissionPage;
