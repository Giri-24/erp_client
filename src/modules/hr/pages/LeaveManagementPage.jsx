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
  Descriptions,
  Popconfirm,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  getLeaveTypes,
  getLeavePermissionPolicy,
  getLeaveApplications,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getAllLeaveBalances,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS, getCurrentUser } from "../../../utils/permissions";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const LEAVE_STATUS_COLORS = {
  PENDING: "gold",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "default",
};

const normalizeLeaveStatus = (status) => String(status || "").toUpperCase();

const resolveApproverId = (user) => {
  const candidate = [user?.staffId, user?.id, user?.employeeId, user?.username, user?.email]
    .find((value) => value !== null && value !== undefined && String(value).trim().length > 0);
  return String(candidate || "").trim();
};

const LeaveManagementPage = ({ selfOnly: selfOnlyProp } = {}) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [myBalance, setMyBalance] = useState([]);
  const [leavePolicy, setLeavePolicy] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyModal, setApplyModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [filterMonth, setFilterMonth] = useState(dayjs());
  const [form] = Form.useForm();

  const canManageLeave = hasPermission(PERMISSIONS.HR_LEAVE_MANAGE);
  const canApproveLeave = hasPermission(PERMISSIONS.HR_LEAVE_APPROVE);
  const currentUser = getCurrentUser();
  const isSelfOnly = selfOnlyProp || (!canManageLeave && !canApproveLeave && !hasPermission(PERMISSIONS.HR_DASHBOARD));
  const [activeTab, setActiveTab] = useState(isSelfOnly ? "my-leaves" : "all");

  const defaultLeaveTypes = [
    { id: "CL", name: "Casual Leave", code: "CL", maxPerYear: 12, carryForward: false },
    { id: "SL", name: "Sick Leave", code: "SL", maxPerYear: 12, carryForward: false },
    { id: "EL", name: "Earned Leave", code: "EL", maxPerYear: 15, carryForward: true },
    { id: "ML", name: "Maternity Leave", code: "ML", maxPerYear: 180, carryForward: false },
    { id: "PL", name: "Paternity Leave", code: "PL", maxPerYear: 15, carryForward: false },
    { id: "LOP", name: "Loss of Pay", code: "LOP", maxPerYear: 999, carryForward: false },
  ];

  const fetchLeaveTypes = async () => {
    try {
      const data = await getLeaveTypes();
      setLeaveTypes(data?.length ? data : defaultLeaveTypes);
    } catch {
      setLeaveTypes(defaultLeaveTypes);
    }
  };

  const fetchLeavePolicy = async () => {
    try {
      const policy = await getLeavePermissionPolicy(currentUser?.staffId);
      setLeavePolicy(policy?.effective || null);
    } catch {
      setLeavePolicy(null);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await getLeaveApplications({ month: filterMonth.format("YYYY-MM") });
      setApplications(data);
    } catch {
      setApplications([]);
    }
    setLoading(false);
  };

  const fetchMyLeaves = async () => {
    setLoading(true);
    try {
      if (!currentUser?.staffId) {
        console.warn('Cannot fetch my leaves: missing staff ID', { staffId: currentUser?.staffId });
        setMyLeaves([]);
        setLoading(false);
        return;
      }
      const staffId = String(currentUser.staffId);
      const data = await getLeaveApplications({ staffId, year: filterMonth.format("YYYY") });
      const list = Array.isArray(data) ? data : data?.data || [];
      setMyLeaves(list.filter(l => l.staffId === staffId));
    } catch (err) {
      console.error('Failed to fetch my leaves:', err);
      setMyLeaves([]);
    }
    setLoading(false);
  };

  const fetchBalances = async () => {
    try {
      const data = await getAllLeaveBalances({ year: filterMonth.format("YYYY") });
      setBalances(data);
    } catch {
      setBalances([]);
    }
  };

  const fetchMyBalance = async () => {
    if (!currentUser?.id || !currentUser?.staffId) {
      console.warn('Cannot fetch my balance: missing user ID or staff ID', { userId: currentUser?.id, staffId: currentUser?.staffId });
      setMyBalance([]);
      return;
    }
    try {
      const data = await getAllLeaveBalances({ staffId: currentUser.staffId, year: filterMonth.format("YYYY") });
      setMyBalance(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Failed to fetch my leave balance:', err);
      setMyBalance([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchLeavePolicy();
    if (!isSelfOnly) fetchStaff();
  }, []);

  useEffect(() => {
    if (!isSelfOnly && (activeTab === "all" || activeTab === "approvals")) {
      fetchApplications();
      fetchBalances();
    } else {
      fetchMyLeaves();
      fetchMyBalance();
    }
  }, [activeTab, filterMonth]);

  const handleApply = async () => {
    try {
      const values = await form.validateFields();
      const staffId = values.staffId || currentUser?.staffId;
      if (!staffId) {
        message.error("Staff ID not found. Please logout and login again.");
        return;
      }
      const [fromDate, toDate] = values.dateRange;
      const diffDays = toDate.diff(fromDate, "day") + 1;
      await applyLeave({
        leaveTypeId: values.leaveTypeId,
        fromDate: fromDate.format("YYYY-MM-DD"),
        toDate: toDate.format("YYYY-MM-DD"),
        days: values.halfDay ? diffDays * 0.5 : diffDays,
        halfDay: values.halfDay || false,
        reason: values.reason,
        staffId,
      });
      message.success("Leave applied successfully");
      setApplyModal(false);
      form.resetFields();
      fetchApplications();
      fetchMyLeaves();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to apply leave");
    }
  };

  const handleApprove = async (id) => {
    try {
      const approvedBy = resolveApproverId(currentUser);
      if (!approvedBy) {
        message.error("Approver identity missing. Please login again.");
        return;
      }
      await approveLeave(id, { approvedBy });
      message.success("Leave approved");
      fetchApplications();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await rejectLeave(id, { rejectedBy: currentUser?.staffId, reason });
      message.success("Leave rejected");
      fetchApplications();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelLeave(id);
      message.success("Leave cancelled");
      fetchMyLeaves();
      fetchApplications();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to cancel");
    }
  };

  const openDetail = (record) => {
    setSelectedLeave(record);
    setDetailModal(true);
  };

  const appColumns = [
    { title: "Emp ID", dataIndex: ["staff", "employeeId"], width: 100 },
    { title: "Name", dataIndex: ["staff", "name"], sorter: (a, b) => (a.staff?.name || "").localeCompare(b.staff?.name || "") },
    { title: "Leave Type", dataIndex: ["leaveType", "name"], render: (v, r) => v || r.leaveTypeId },
    {
      title: "From",
      dataIndex: "fromDate",
      render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-",
    },
    {
      title: "To",
      dataIndex: "toDate",
      render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-",
    },
    { title: "Days", dataIndex: "days" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <Tag color={LEAVE_STATUS_COLORS[normalizeLeaveStatus(v)] || "default"}>{normalizeLeaveStatus(v)}</Tag>,
      filters: Object.keys(LEAVE_STATUS_COLORS).map((k) => ({ text: k, value: k })),
      onFilter: (value, record) => normalizeLeaveStatus(record.status) === value,
    },
    {
      title: "Applied On",
      dataIndex: "createdAt",
      render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => openDetail(record)} />
          {canApproveLeave && normalizeLeaveStatus(record.status) === "PENDING" && (
            <>
              <Popconfirm title="Approve this leave?" onConfirm={() => handleApprove(record.id)}>
                <Button icon={<CheckOutlined />} size="small" type="primary" />
              </Popconfirm>
              <Popconfirm title="Reject this leave?" onConfirm={() => handleReject(record.id, "Rejected by admin")}>
                <Button icon={<CloseOutlined />} size="small" danger />
              </Popconfirm>
            </>
          )}
          {normalizeLeaveStatus(record.status) === "PENDING" && record.staffId === currentUser?.staffId && (
            <Popconfirm title="Cancel this leave?" onConfirm={() => handleCancel(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const balanceColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    { title: "CL", dataIndex: "CL", render: (v) => `${v?.used || 0} / ${v?.total || 12}` },
    { title: "SL", dataIndex: "SL", render: (v) => `${v?.used || 0} / ${v?.total || 12}` },
    { title: "EL", dataIndex: "EL", render: (v) => `${v?.used || 0} / ${v?.total || 15}` },
    { title: "LOP", dataIndex: "LOP", render: (v) => <Tag color="red">{v?.used || 0}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>Leave Management</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {isSelfOnly ? "My Leaves" : "Leave Management"}
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            {isSelfOnly ? "Apply for leave, track your leave balance and application status." : "CL, SL, EL, Maternity/Paternity — apply, approve, and track leave balances."}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setApplyModal(true); }}>
          Apply Leave
        </Button>
      </div>

      {/* My Leave Balance Cards */}
      {myBalance?.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {myBalance.map((b) => (
            <Col span={4} key={b.leaveType}>
              <Card size="small">
                <Statistic
                  title={b.leaveType}
                  value={b.used || 0}
                  suffix={`/ ${b.total || 0}`}
                  valueStyle={{ color: b.used >= b.total ? "#ff4d4f" : "#52c41a" }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        ...(!isSelfOnly ? [{ key: "all", label: "All Applications" }] : []),
        ...(!isSelfOnly ? [{ key: "approvals", label: canApproveLeave ? "Pending Approvals" : "Pending" }] : []),
        { key: "my-leaves", label: "My Leaves" },
        ...(!isSelfOnly ? [{ key: "balances", label: "Leave Balances" }] : []),
      ]} />

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <DatePicker
          picker="month"
          value={filterMonth}
          onChange={(d) => d && setFilterMonth(d)}
          allowClear={false}
        />
      </div>

      <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
          {activeTab === "balances" ? (
            <Table columns={balanceColumns} dataSource={balances} rowKey="staffId" loading={loading} scroll={{ x: 800 }} pagination={{ pageSize: 50 }} />
          ) : (
            <Table
              columns={appColumns}
              dataSource={
                activeTab === "approvals"
                  ? applications.filter((a) => normalizeLeaveStatus(a.status) === "PENDING")
                  : activeTab === "my-leaves"
                  ? myLeaves
                  : applications
              }
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 20 }}
            />
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal title="Apply Leave" open={applyModal} onCancel={() => setApplyModal(false)} onOk={handleApply} width={520}>
        <Form form={form} layout="vertical">
          {canManageLeave && !isSelfOnly && (
            <Form.Item name="staffId" label="Staff Member">
              <Select placeholder="Select staff (leave empty for self)" allowClear showSearch optionFilterProp="children">
                {staff.map((s) => (
                  <Option key={s.id} value={s.id}>{s.name} ({s.employeeId})</Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="leaveTypeId" label="Leave Type" rules={[{ required: true, message: "Select leave type" }]}>
            <Select placeholder="Select leave type">
              {(leaveTypes || []).map((lt) => (
                <Option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.code})
                  {Number.isFinite(leavePolicy?.leaveEntitlements?.[lt.code] ?? lt.maxPerYear)
                    ? ` - Max ${(leavePolicy?.leaveEntitlements?.[lt.code] ?? lt.maxPerYear)}`
                    : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="Date Range" rules={[{ required: true, message: "Select date range" }]}>
            <RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="halfDay" label="Half Day">
            <Select defaultValue={false}>
              <Option value={false}>Full Day</Option>
              <Option value={true}>Half Day</Option>
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Provide reason" }]}>
            <TextArea rows={3} placeholder="Reason for leave" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Leave Detail Modal */}
      <Modal title="Leave Details" open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={550}>
        {selectedLeave && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Staff">{selectedLeave.staff?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Emp ID">{selectedLeave.staff?.employeeId || "-"}</Descriptions.Item>
            <Descriptions.Item label="Leave Type">{selectedLeave.leaveType?.name || selectedLeave.leaveTypeId}</Descriptions.Item>
            <Descriptions.Item label="Days">{selectedLeave.days}</Descriptions.Item>
            <Descriptions.Item label="From">{selectedLeave.fromDate ? dayjs(selectedLeave.fromDate).format("DD MMM YYYY") : "-"}</Descriptions.Item>
            <Descriptions.Item label="To">{selectedLeave.toDate ? dayjs(selectedLeave.toDate).format("DD MMM YYYY") : "-"}</Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={LEAVE_STATUS_COLORS[normalizeLeaveStatus(selectedLeave.status)]}>{normalizeLeaveStatus(selectedLeave.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Reason" span={2}>{selectedLeave.reason || "-"}</Descriptions.Item>
            <Descriptions.Item label="Applied On">{selectedLeave.createdAt ? dayjs(selectedLeave.createdAt).format("DD MMM YYYY") : "-"}</Descriptions.Item>
            <Descriptions.Item label="Approved By">{selectedLeave.approvedBy || "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default LeaveManagementPage;
