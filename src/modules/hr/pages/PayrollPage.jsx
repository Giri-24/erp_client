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
  Descriptions,
  Tabs,
  Alert,
  Popconfirm,
  Divider,
  InputNumber,
  Typography,
} from "antd";
import {
  DollarOutlined,
  CheckOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalculatorOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import {
  generatePayroll,
  getPayroll,
  getPayslip,
  approvePayroll,
  bulkApprovePayroll,
  getLOPReport,
  getPFESISettings,
  cancelPayrollLOP,
  updatePayrollManual,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS, getCurrentUser } from "../../../utils/permissions";

const { Option } = Select;
const { Text } = Typography;

const PAY_STATUS_COLORS = {
  draft: "default",
  generated: "gold",
  approved: "green",
  paid: "blue",
  cancelled: "red",
};

const PERMISSION_HOURS_LIMIT = 4; // 4 hrs/month

const CATEGORY_LABELS = {
  TEACHING_REGULAR: "Teaching Regular",
  TEACHING_TRAINEE: "Teaching Trainee",
  TEACHING_PART_TIME: "Part-Time Teacher",
  NON_TEACHING_REGULAR: "Non-Teaching Regular",
  NON_TEACHING_TRAINEE: "Non-Teaching Trainee",
  NON_TEACHING_SECURITY: "Security (Daily Rate)",
  NON_TEACHING_SPORTS: "Sports Staff (Daily Rate)",
};

const PayrollPage = ({ selfOnly: selfOnlyProp } = {}) => {
  const [payrollData, setPayrollData] = useState([]);
  const [lopReport, setLopReport] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [payslipModal, setPayslipModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [bonusModal, setBonusModal] = useState(false);
  const [bonusRecord, setBonusRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("payroll");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedRows, setSelectedRows] = useState([]);
  const [generateForm] = Form.useForm();
  const [bonusForm] = Form.useForm();

  const canManagePayroll = hasPermission(PERMISSIONS.HR_PAYROLL_MANAGE);
  const canApprovePayroll = hasPermission(PERMISSIONS.HR_PAYROLL_APPROVE);
  const currentUser = getCurrentUser();
  const isSelfOnly = selfOnlyProp || (!canManagePayroll && !canApprovePayroll);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const params = { month: selectedMonth.format("YYYY-MM") };
      if (isSelfOnly && currentUser?.staffId) params.staffId = currentUser.staffId;
      const data = await getPayroll(params);
      const mapped = data.map((p) => ({
        ...p,
        staffName: p.staff?.name || p.staffName,
        employeeId: p.staff?.employeeId || p.employeeId,
        department: p.staff?.department || p.department,
        designation: p.staff?.designation || p.designation,
        category: p.staff?.category || p.category,
        paymentMode: p.staff?.paymentMode || p.paymentMode,
      }));
      setPayrollData(isSelfOnly && currentUser?.staffId ? mapped.filter(p => p.staffId === currentUser.staffId) : mapped);
    } catch {
      setPayrollData([]);
    }
    setLoading(false);
  };

  const fetchLOPReport = async () => {
    setLoading(true);
    try {
      const data = await getLOPReport({ month: selectedMonth.format("YYYY-MM") });
      setLopReport(data.map((p) => ({
        ...p,
        staffName: p.staff?.name || p.staffName,
        employeeId: p.staff?.employeeId || p.employeeId,
      })));
    } catch {
      setLopReport([]);
    }
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch { /* ignore */ }
  };

  const fetchSettings = async () => {
    try {
      const data = await getPFESISettings();
      setSettings(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!isSelfOnly) {
      fetchStaff();
      fetchSettings();
    }
  }, []);

  useEffect(() => {
    if (activeTab === "payroll") fetchPayroll();
    if (activeTab === "lop" && !isSelfOnly) fetchLOPReport();
  }, [activeTab, selectedMonth]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const values = await generateForm.validateFields();
      await generatePayroll({
        month: values.month.format("YYYY-MM"),
        staffIds: values.staffIds?.length ? values.staffIds : undefined,
      });
      message.success("Payroll generated successfully");
      setGenerateModal(false);
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to generate payroll");
    }
    setGenerating(false);
  };

  const handleApprove = async (id) => {
    try {
      await approvePayroll(id);
      message.success("Payroll approved");
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedRows.length) {
      message.warning("Select payroll records to approve");
      return;
    }
    try {
      await bulkApprovePayroll({ ids: selectedRows });
      message.success(`${selectedRows.length} payroll records approved`);
      setSelectedRows([]);
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Bulk approve failed");
    }
  };

  const handleCancelLOP = async (record) => {
    try {
      await cancelPayrollLOP(record.id);
      message.success("LOP cancelled — full salary will be paid");
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to cancel LOP");
    }
  };

  const openBonusModal = (record) => {
    setBonusRecord(record);
    bonusForm.setFieldsValue({ bonusIncentive: record.bonusIncentive || 0, extraAllowance: record.extraAllowance || 0 });
    setBonusModal(true);
  };

  const handleBonusSave = async () => {
    try {
      const values = await bonusForm.validateFields();
      await updatePayrollManual(bonusRecord.id, values);
      message.success("Bonus/Incentive updated");
      setBonusModal(false);
      fetchPayroll();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update");
    }
  };

  const openPayslip = async (record) => {
    try {
      const data = await getPayslip(record.id);
      setSelectedPayslip(data || record);
      setPayslipModal(true);
    } catch {
      setSelectedPayslip(record);
      setPayslipModal(true);
    }
  };

  // Summary calculations
  const totalGross = payrollData.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const totalDeductions = payrollData.reduce((s, p) => s + (p.totalDeductions || 0), 0);
  const totalNet = payrollData.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalLOP = payrollData.reduce((s, p) => s + (p.lopDeduction || 0), 0);
  const totalCTC = payrollData.reduce((s, p) => s + (p.ctc || p.grossSalary || 0), 0);

  const payrollColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName", sorter: (a, b) => (a.staffName || "").localeCompare(b.staffName || "") },
    {
      title: "Category",
      dataIndex: "category",
      render: (v) => {
        const short = { TEACHING_REGULAR: "T", TEACHING_TRAINEE: "T-Tr", TEACHING_PART_TIME: "T-PT", NON_TEACHING_REGULAR: "NT", NON_TEACHING_TRAINEE: "NT-Tr", NON_TEACHING_SECURITY: "Security", NON_TEACHING_SPORTS: "Sports" };
        return short[v] || v || "-";
      },
      width: 80,
    },
    {
      title: "Pay Mode",
      dataIndex: "paymentMode",
      render: (v) => v === "BANK_TRANSFER" ? "BT" : v === "CASH" ? "Cash" : "-",
      width: 70,
    },
    {
      title: "Basic (50%)",
      dataIndex: "basicSalary",
      render: (v) => `₹${(v || 0).toLocaleString()}`,
    },
    { title: "Gross", dataIndex: "grossSalary", render: (v) => `₹${(v || 0).toLocaleString()}` },
    {
      title: "LOP Days",
      dataIndex: "lopDays",
      render: (v, r) => r.lopCancelled
        ? <Tag color="green">Cancelled</Tag>
        : v ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag>,
    },
    {
      title: "LOP Ded.",
      dataIndex: "lopDeduction",
      render: (v) => v ? <Tag color="red">₹{v.toLocaleString()}</Tag> : "₹0",
    },
    { title: "PF (Emp)", dataIndex: "pfDeduction", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "ESI (Emp)", dataIndex: "esiDeduction", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Fixed Adv.", dataIndex: "fixedAdvanceDeduction", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    { title: "Sal. Adv.", dataIndex: "salaryAdvanceDeduction", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    { title: "Other Adv.", dataIndex: "otherAdvanceDeduction", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    {
      title: "Total Ded.",
      dataIndex: "totalDeductions",
      render: (v) => <Tag color="red">₹{(v || 0).toLocaleString()}</Tag>,
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      render: (v) => <Tag color="green">₹{(v || 0).toLocaleString()}</Tag>,
    },
    {
      title: "Bonus",
      dataIndex: "bonusIncentive",
      render: (v) => v ? <Tag color="gold">₹{v.toLocaleString()}</Tag> : "-",
    },
    {
      title: "CTC",
      dataIndex: "ctc",
      render: (v) => v ? `₹${v.toLocaleString()}` : "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <Tag color={PAY_STATUS_COLORS[v] || "default"}>{(v || "").toUpperCase()}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => openPayslip(record)} />
          {canManagePayroll && !record.lopCancelled && (record.lopDays > 0 || record.permissionLopDays > 0) && (
            <Popconfirm title="Cancel LOP and pay full salary?" onConfirm={() => handleCancelLOP(record)}>
              <Button icon={<CloseCircleOutlined />} size="small" danger title="Cancel LOP" />
            </Popconfirm>
          )}
          {canManagePayroll && (
            <Button icon={<GiftOutlined />} size="small" onClick={() => openBonusModal(record)} title="Add Bonus/Incentive" />
          )}
          {canApprovePayroll && record.status === "generated" && (
            <Popconfirm title="Approve this payroll?" onConfirm={() => handleApprove(record.id)}>
              <Button icon={<CheckOutlined />} size="small" type="primary" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const lopColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    { title: "Working Days", dataIndex: "totalWorkingDays" },
    { title: "Present", dataIndex: "presentDays" },
    {
      title: "Absent (LOP)",
      dataIndex: "absentLopDays",
      render: (v) => <Tag color={v > 0 ? "red" : "green"}>{v || 0}</Tag>,
    },
    {
      title: "Permission Hrs",
      dataIndex: "permissionHoursUsed",
      render: (v) => {
        const excess = Math.max(0, (v || 0) - PERMISSION_HOURS_LIMIT);
        return (
          <Space>
            <span>{v || 0}h / {PERMISSION_HOURS_LIMIT}h</span>
            {excess > 0 && <Tag color="red">+{excess}h LOP</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Permission LOP Days",
      dataIndex: "permissionLopDays",
      render: (v) => v ? <Tag color="orange">{v}</Tag> : "0",
    },
    {
      title: "Total LOP Days",
      dataIndex: "totalLopDays",
      render: (v) => <Tag color={v > 0 ? "red" : "green"}>{v || 0}</Tag>,
    },
    {
      title: "Per Day Salary",
      dataIndex: "perDaySalary",
      render: (v) => v ? `₹${v.toLocaleString()}` : "-",
    },
    {
      title: "LOP Deduction",
      dataIndex: "totalLopDeduction",
      render: (v) => v ? <Tag color="red">₹{v.toLocaleString()}</Tag> : "₹0",
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>Payroll</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {isSelfOnly ? "My Payslip" : "Payroll & LOP Calculations"}
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            {isSelfOnly ? "View your monthly payslip and salary breakup." : "Generate monthly payroll with PF, ESI, permission LOP, and attendance-based deductions."}
          </p>
        </div>
        {canManagePayroll && (
          <Space>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={() => {
                generateForm.setFieldsValue({ month: selectedMonth });
                setGenerateModal(true);
              }}
            >
              Generate Payroll
            </Button>
            {selectedRows.length > 0 && canApprovePayroll && (
              <Button icon={<CheckOutlined />} onClick={handleBulkApprove}>
                Approve Selected ({selectedRows.length})
              </Button>
            )}
          </Space>
        )}
      </div>

      {/* Summary Cards */}
      {!isSelfOnly && (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Total Gross" prefix="₹" value={totalGross} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Total Deductions" prefix="₹" value={totalDeductions} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Net Payable" prefix="₹" value={totalNet} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Total LOP" prefix="₹" value={totalLOP} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title="Total CTC" prefix="₹" value={totalCTC} valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
      </Row>
      )}

      {!isSelfOnly && (
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "payroll", label: "Payroll" },
        { key: "lop", label: "LOP Report" },
      ]} />
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <DatePicker picker="month" value={selectedMonth} onChange={(d) => d && setSelectedMonth(d)} allowClear={false} />
        <Button icon={<DownloadOutlined />}>Export</Button>
      </div>

      <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
          {activeTab === "payroll" ? (
            <Table
              columns={payrollColumns}
              dataSource={payrollData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1400 }}
              pagination={{ pageSize: 50 }}
              rowSelection={
                canApprovePayroll
                  ? {
                      selectedRowKeys: selectedRows,
                      onChange: setSelectedRows,
                      getCheckboxProps: (r) => ({ disabled: r.status !== "generated" }),
                    }
                  : undefined
              }
            />
          ) : (
            <Table
              columns={lopColumns}
              dataSource={lopReport}
              rowKey="staffId"
              loading={loading}
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 50 }}
            />
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        title="Generate Monthly Payroll"
        open={generateModal}
        onCancel={() => setGenerateModal(false)}
        onOk={handleGenerate}
        confirmLoading={generating}
        okText="Generate"
      >
        <Alert
          message="Payroll Calculation Includes"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li><strong>Gross = Basic (50%) + HRA (30%) + Travel + Other Allowances</strong></li>
              <li>PF: {settings?.pfEmployeeRate || 12}% employee on <em>Basic (50% of Gross)</em> + {settings?.pfEmployerRate || 12}% employer</li>
              <li>ESI: {settings?.esiEmployeeRate || 0.75}% employee on <em>Basic+HRA (80% of Gross)</em> — skipped if daily wage &lt; ₹{settings?.esiDailyWageThreshold || 176}</li>
              <li>LOP deduction: absent days × (Gross ÷ working days) — <em>skipped for part-time teachers</em></li>
              <li>Security staff: present days × daily rate (default ₹400)</li>
              <li>Sports staff: present days × daily rate (default ₹1500)</li>
              <li>Professional Tax (if enabled)</li>
              <li>Advance deductions: Fixed / Salary / Other (auto-deducted)</li>
              <li><strong>Net = Gross − LOP − Employee PF − Employee ESI − Advances</strong></li>
              <li><strong>CTC = Gross + Employer PF + Employer ESI</strong></li>
              <li>Bonus/Incentive added separately after Net (via the gift icon)</li>
            </ul>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form form={generateForm} layout="vertical">
          <Form.Item name="month" label="Month" rules={[{ required: true }]}>
            <DatePicker picker="month" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="staffIds" label="Staff (leave empty for all)">
            <Select mode="multiple" placeholder="All staff" allowClear showSearch optionFilterProp="children">
              {staff.map((s) => (
                <Option key={s.id} value={s.id}>{s.name} ({s.employeeId})</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Payslip Modal */}
      <Modal title="Payslip" open={payslipModal} onCancel={() => setPayslipModal(false)} footer={[
        <Button key="close" onClick={() => setPayslipModal(false)}>Close</Button>,
        <Button key="print" type="primary" icon={<DownloadOutlined />} onClick={() => window.print()}>Print</Button>,
      ]} width={680}>
        {selectedPayslip && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h3>Monthly Payslip — {selectedPayslip.month || selectedMonth.format("MMMM YYYY")}</h3>
            </div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Employee">{selectedPayslip.staffName}</Descriptions.Item>
              <Descriptions.Item label="Emp ID">{selectedPayslip.employeeId}</Descriptions.Item>
              <Descriptions.Item label="Department">{selectedPayslip.department || "-"}</Descriptions.Item>
              <Descriptions.Item label="Designation">{selectedPayslip.designation || "-"}</Descriptions.Item>
              <Descriptions.Item label="Category">{CATEGORY_LABELS[selectedPayslip.category] || selectedPayslip.category || "-"}</Descriptions.Item>
              <Descriptions.Item label="Pay Mode">{selectedPayslip.paymentMode === "BANK_TRANSFER" ? "Bank Transfer" : selectedPayslip.paymentMode === "CASH" ? "Cash" : "-"}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Earnings</Divider>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Basic Salary (50% of Gross)">₹{(selectedPayslip.basicSalary || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="HRA (30% of Gross)">₹{(selectedPayslip.hra || 0).toLocaleString()}</Descriptions.Item>
              {(selectedPayslip.travelAllowance > 0) && (
                <Descriptions.Item label="Travel Allowance">₹{(selectedPayslip.travelAllowance || 0).toLocaleString()}</Descriptions.Item>
              )}
              {(selectedPayslip.otherAllowances > 0) && (
                <Descriptions.Item label="Other Allowances">₹{(selectedPayslip.otherAllowances || 0).toLocaleString()}</Descriptions.Item>
              )}
              {(selectedPayslip.extraAllowance > 0) && (
                <Descriptions.Item label="Extra Allowance">₹{(selectedPayslip.extraAllowance || 0).toLocaleString()}</Descriptions.Item>
              )}
              <Descriptions.Item label="Gross Salary" span={2}>
                <Tag color="blue">₹{(selectedPayslip.grossSalary || 0).toLocaleString()}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Deductions</Divider>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="LOP Days">
                {selectedPayslip.lopCancelled
                  ? <Tag color="green">Cancelled (Full Salary)</Tag>
                  : (selectedPayslip.lopDays || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="LOP Deduction">₹{(selectedPayslip.lopDeduction || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Permission Excess LOP">₹{(selectedPayslip.permissionLopDeduction || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label={`PF Employee (on Basic ₹${(selectedPayslip.pfBase || selectedPayslip.basicSalary || 0).toLocaleString()})`}>
                ₹{(selectedPayslip.pfDeduction || 0).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label={`ESI Employee (on ₹${(selectedPayslip.esiBase || 0).toLocaleString()}, daily ₹${selectedPayslip.esiBase ? Math.round(selectedPayslip.esiBase / 30) : 0})`}>
                ₹{(selectedPayslip.esiDeduction || 0).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Professional Tax">₹{(selectedPayslip.ptDeduction || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Fixed Advance">₹{(selectedPayslip.fixedAdvanceDeduction || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Salary Advance">₹{(selectedPayslip.salaryAdvanceDeduction || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Other Advance">₹{(selectedPayslip.otherAdvanceDeduction || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Total Deductions" span={2}>
                <Tag color="red">₹{(selectedPayslip.totalDeductions || 0).toLocaleString()}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            <div style={{ textAlign: "right", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Net / Take-Home: <Tag color="green" style={{ fontSize: 16 }}>₹{(selectedPayslip.netSalary || 0).toLocaleString()}</Tag>
            </div>

            {(selectedPayslip.bonusIncentive > 0) && (
              <div style={{ textAlign: "right", fontSize: 15, color: "#fa8c16", marginBottom: 8 }}>
                Bonus / Incentive: <strong>₹{(selectedPayslip.bonusIncentive || 0).toLocaleString()}</strong>
              </div>
            )}

            <Divider orientation="left">Employer Contributions</Divider>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Employer PF">₹{(selectedPayslip.employerPfContribution || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Employer ESI">₹{(selectedPayslip.employerEsiContribution || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="CTC (Gross + Employer PF + ESI)" span={2}>
                <Tag color="purple">₹{(selectedPayslip.ctc || selectedPayslip.grossSalary || 0).toLocaleString()}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Bonus / Incentive Modal */}
      <Modal
        title="Add Bonus / Incentive"
        open={bonusModal}
        onCancel={() => setBonusModal(false)}
        onOk={handleBonusSave}
        okText="Save"
      >
        <Alert
          message="Bonus/Incentive is added as a separate line item and does not affect Net Salary calculation. It is displayed on the payslip below the Net."
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form form={bonusForm} layout="vertical">
          <Form.Item name="bonusIncentive" label="Bonus / Incentive Amount (₹)">
            <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="extraAllowance" label="Extra Allowance (₹) — added to Gross">
            <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollPage;
