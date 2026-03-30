import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Tag,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Descriptions,
  Switch,
  Tabs,
  DatePicker,
  Divider,
  Alert,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  SettingOutlined,
  DownloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  getPFESISettings,
  updatePFESISettings,
  getAllStaffPFESI,
  updateStaffPFESI,
  calculatePFESI,
  generatePFReport,
  generateESIReport,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;

// Default PF & ESI rates as per Indian statutory norms
const DEFAULT_SETTINGS = {
  pf: {
    enabled: true,
    employeeRate: 12, // % of basic
    employerRate: 12,
    wageLimit: 15000,  // PF applicable if basic <= 15000 (mandatory), optional above
    adminCharges: 0.5,
    edliCharges: 0.5,
  },
  esi: {
    enabled: true,
    employeeRate: 0.75, // %
    employerRate: 3.25,  // %
    wageLimit: 21000,    // ESI applicable if gross <= 21000
  },
  pt: {
    enabled: false, // Professional Tax
    amount: 200,
  },
};

const PFESIPage = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [staffPFESI, setStaffPFESI] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("staff");
  const [reportMonth, setReportMonth] = useState(dayjs());
  const [pfReport, setPfReport] = useState([]);
  const [esiReport, setEsiReport] = useState([]);
  const [settingsForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const canManage = hasPermission(PERMISSIONS.HR_STATUTORY_MANAGE);

  const fetchSettings = async () => {
    try {
      const data = await getPFESISettings();
      if (data) {
        // Normalize flat API response to nested structure
        setSettings({
          pf: {
            enabled: data.pf?.enabled ?? data.pfEnabled ?? DEFAULT_SETTINGS.pf.enabled,
            employeeRate: data.pf?.employeeRate ?? data.pfEmployeeRate ?? DEFAULT_SETTINGS.pf.employeeRate,
            employerRate: data.pf?.employerRate ?? data.pfEmployerRate ?? DEFAULT_SETTINGS.pf.employerRate,
            wageLimit: data.pf?.wageLimit ?? data.pfWageLimit ?? DEFAULT_SETTINGS.pf.wageLimit,
            adminCharges: data.pf?.adminCharges ?? data.pfAdminCharges ?? DEFAULT_SETTINGS.pf.adminCharges,
            edliCharges: data.pf?.edliCharges ?? data.pfEdliCharges ?? DEFAULT_SETTINGS.pf.edliCharges,
          },
          esi: {
            enabled: data.esi?.enabled ?? data.esiEnabled ?? DEFAULT_SETTINGS.esi.enabled,
            employeeRate: data.esi?.employeeRate ?? data.esiEmployeeRate ?? DEFAULT_SETTINGS.esi.employeeRate,
            employerRate: data.esi?.employerRate ?? data.esiEmployerRate ?? DEFAULT_SETTINGS.esi.employerRate,
            wageLimit: data.esi?.wageLimit ?? data.esiWageLimit ?? DEFAULT_SETTINGS.esi.wageLimit,
          },
          pt: {
            enabled: data.pt?.enabled ?? data.ptEnabled ?? DEFAULT_SETTINGS.pt.enabled,
            amount: data.pt?.amount ?? data.ptAmount ?? DEFAULT_SETTINGS.pt.amount,
          },
        });
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const fetchStaffPFESI = async () => {
    setLoading(true);
    try {
      const data = await getAllStaffPFESI();
      // Normalize: flatten nested staff relation into top-level fields
      const normalized = (data || []).map((item) => ({
        ...item,
        staffId: item.staffId || item.staff?.id,
        staffName: item.staffName || item.staff?.name,
        employeeId: item.employeeId || item.staff?.employeeId,
        department: item.department || item.staff?.department,
        basicSalary: item.basicSalary ?? item.staff?.salary,
        grossSalary: item.grossSalary ?? item.basicSalary ?? item.staff?.salary,
      }));
      setStaffPFESI(normalized);
    } catch {
      setStaffPFESI([]);
    }
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch { /* ignore */ }
  };

  const fetchPFReport = async () => {
    setLoading(true);
    try {
      const data = await generatePFReport({ month: reportMonth.format("YYYY-MM") });
      setPfReport(data);
    } catch {
      setPfReport([]);
    }
    setLoading(false);
  };

  const fetchESIReport = async () => {
    setLoading(true);
    try {
      const data = await generateESIReport({ month: reportMonth.format("YYYY-MM") });
      setEsiReport(data);
    } catch {
      setEsiReport([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    fetchStaff();
    fetchStaffPFESI();
  }, []);

  useEffect(() => {
    if (activeTab === "pf-report") fetchPFReport();
    if (activeTab === "esi-report") fetchESIReport();
  }, [activeTab, reportMonth]);

  const handleSettingsSave = async () => {
    try {
      const values = await settingsForm.validateFields();
      // Send flat structure matching backend StatutorySettings model
      await updatePFESISettings({
        pfEnabled: values.pfEnabled,
        pfEmployeeRate: values.pfEmployeeRate,
        pfEmployerRate: values.pfEmployerRate,
        pfWageLimit: values.pfWageLimit,
        pfAdminCharges: values.pfAdminCharges,
        pfEdliCharges: values.pfEdliCharges,
        esiEnabled: values.esiEnabled,
        esiEmployeeRate: values.esiEmployeeRate,
        esiEmployerRate: values.esiEmployerRate,
        esiWageLimit: values.esiWageLimit,
        ptEnabled: values.ptEnabled,
        ptAmount: values.ptAmount,
      });
      // Update local nested state
      setSettings({
        pf: {
          enabled: values.pfEnabled,
          employeeRate: values.pfEmployeeRate,
          employerRate: values.pfEmployerRate,
          wageLimit: values.pfWageLimit,
          adminCharges: values.pfAdminCharges,
          edliCharges: values.pfEdliCharges,
        },
        esi: {
          enabled: values.esiEnabled,
          employeeRate: values.esiEmployeeRate,
          employerRate: values.esiEmployerRate,
          wageLimit: values.esiWageLimit,
        },
        pt: {
          enabled: values.ptEnabled,
          amount: values.ptAmount,
        },
      });
      message.success("Settings updated");
      setSettingsModal(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update settings");
    }
  };

  const openSettings = () => {
    settingsForm.setFieldsValue({
      pfEnabled: settings.pf.enabled,
      pfEmployeeRate: settings.pf.employeeRate,
      pfEmployerRate: settings.pf.employerRate,
      pfWageLimit: settings.pf.wageLimit,
      pfAdminCharges: settings.pf.adminCharges,
      pfEdliCharges: settings.pf.edliCharges,
      esiEnabled: settings.esi.enabled,
      esiEmployeeRate: settings.esi.employeeRate,
      esiEmployerRate: settings.esi.employerRate,
      esiWageLimit: settings.esi.wageLimit,
      ptEnabled: settings.pt?.enabled,
      ptAmount: settings.pt?.amount,
    });
    setSettingsModal(true);
  };

  const openEdit = (record) => {
    setEditingStaff(record);
    editForm.setFieldsValue({
      pfNumber: record.pfNumber,
      esiNumber: record.esiNumber,
      uanNumber: record.uanNumber,
      pfEnabled: record.pfEnabled !== false,
      esiEnabled: record.esiEnabled !== false,
      basicSalary: record.basicSalary,
      grossSalary: record.grossSalary,
    });
    setEditModal(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      await updateStaffPFESI(editingStaff.staffId, values);
      message.success("Staff statutory info updated");
      setEditModal(false);
      fetchStaffPFESI();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update");
    }
  };

  // Client-side PF/ESI calculation helper
  const calcPF = (basic) => {
    if (!settings.pf.enabled || !basic) return { employee: 0, employer: 0, total: 0 };
    const employee = Math.round((basic * settings.pf.employeeRate) / 100);
    const employer = Math.round((basic * settings.pf.employerRate) / 100);
    return { employee, employer, total: employee + employer };
  };

  const calcESI = (gross) => {
    if (!settings.esi.enabled || !gross || gross > settings.esi.wageLimit) return { employee: 0, employer: 0, total: 0 };
    const employee = Math.round((gross * settings.esi.employeeRate) / 100);
    const employer = Math.round((gross * settings.esi.employerRate) / 100);
    return { employee, employer, total: employee + employer };
  };

  const staffColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName", sorter: (a, b) => (a.staffName || "").localeCompare(b.staffName || "") },
    { title: "Basic", dataIndex: "basicSalary", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    { title: "Gross", dataIndex: "grossSalary", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    { title: "PF No", dataIndex: "pfNumber", render: (v) => v || "-" },
    { title: "UAN", dataIndex: "uanNumber", render: (v) => v || "-" },
    { title: "ESI No", dataIndex: "esiNumber", render: (v) => v || "-" },
    {
      title: "PF",
      key: "pfCalc",
      render: (_, r) => {
        if (!r.pfEnabled) return <Tag color="default">Disabled</Tag>;
        const pf = calcPF(r.basicSalary);
        return <Tag color="blue">₹{pf.employee} + ₹{pf.employer}</Tag>;
      },
    },
    {
      title: "ESI",
      key: "esiCalc",
      render: (_, r) => {
        if (!r.esiEnabled) return <Tag color="default">N/A</Tag>;
        const esi = calcESI(r.grossSalary);
        if (esi.total === 0) return <Tag color="default">Above limit</Tag>;
        return <Tag color="cyan">₹{esi.employee} + ₹{esi.employer}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => { setSelectedRecord(record); setDetailModal(true); }} />
          {canManage && (
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          )}
        </Space>
      ),
    },
  ];

  const pfReportColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    { title: "UAN", dataIndex: "uanNumber" },
    { title: "PF No", dataIndex: "pfNumber" },
    { title: "Basic", dataIndex: "basicSalary", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Employee PF", dataIndex: "employeePF", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Employer PF", dataIndex: "employerPF", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Admin", dataIndex: "adminCharges", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "EDLI", dataIndex: "edliCharges", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Total", dataIndex: "totalPF", render: (v) => <Tag color="blue">₹{(v || 0).toLocaleString()}</Tag> },
  ];

  const esiReportColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    { title: "ESI No", dataIndex: "esiNumber" },
    { title: "Gross", dataIndex: "grossSalary", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Employee ESI", dataIndex: "employeeESI", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Employer ESI", dataIndex: "employerESI", render: (v) => `₹${(v || 0).toLocaleString()}` },
    { title: "Total", dataIndex: "totalESI", render: (v) => <Tag color="cyan">₹{(v || 0).toLocaleString()}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>PF & ESI</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            PF & ESI Management
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Provident Fund, ESI statutory compliance — rates, staff mapping, and monthly reports.
          </p>
        </div>
        {canManage && (
          <Button icon={<SettingOutlined />} onClick={openSettings}>
            Configure Rates
          </Button>
        )}
      </div>

      {/* Rate Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="PF Employee" value={settings.pf.employeeRate} suffix="%" valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="PF Employer" value={settings.pf.employerRate} suffix="%" valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="PF Wage Limit" prefix="₹" value={settings.pf.wageLimit} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="ESI Employee" value={settings.esi.employeeRate} suffix="%" valueStyle={{ color: "#13c2c2" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="ESI Employer" value={settings.esi.employerRate} suffix="%" valueStyle={{ color: "#13c2c2" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="ESI Wage Limit" prefix="₹" value={settings.esi.wageLimit} />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "staff", label: "Staff PF/ESI" },
        { key: "pf-report", label: "PF Report" },
        { key: "esi-report", label: "ESI Report" },
      ]} />

      {(activeTab === "pf-report" || activeTab === "esi-report") && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
          <DatePicker picker="month" value={reportMonth} onChange={(d) => d && setReportMonth(d)} allowClear={false} />
          <Button icon={<DownloadOutlined />}>Export</Button>
        </div>
      )}

      <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
          {activeTab === "staff" && (
            <Table columns={staffColumns} dataSource={staffPFESI} rowKey="staffId" loading={loading} scroll={{ x: 1200 }} pagination={{ pageSize: 50 }} />
          )}
          {activeTab === "pf-report" && (
            <Table columns={pfReportColumns} dataSource={pfReport} rowKey="staffId" loading={loading} scroll={{ x: 1100 }} pagination={{ pageSize: 50 }} />
          )}
          {activeTab === "esi-report" && (
            <Table columns={esiReportColumns} dataSource={esiReport} rowKey="staffId" loading={loading} scroll={{ x: 900 }} pagination={{ pageSize: 50 }} />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <Modal title="PF & ESI Rate Configuration" open={settingsModal} onCancel={() => setSettingsModal(false)} onOk={handleSettingsSave} width={600} okText="Save Settings">
        <Form form={settingsForm} layout="vertical">
          <Divider orientation="left">Provident Fund (PF)</Divider>
          <Form.Item name="pfEnabled" label="PF Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="pfEmployeeRate" label="Employee Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item name="pfEmployerRate" label="Employer Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item name="pfWageLimit" label="Wage Limit (₹)">
              <InputNumber min={0} step={1000} />
            </Form.Item>
            <Form.Item name="pfAdminCharges" label="Admin Charges (%)">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="pfEdliCharges" label="EDLI Charges (%)">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
          </Space>

          <Divider orientation="left">ESI</Divider>
          <Form.Item name="esiEnabled" label="ESI Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="esiEmployeeRate" label="Employee Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.25} />
            </Form.Item>
            <Form.Item name="esiEmployerRate" label="Employer Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.25} />
            </Form.Item>
            <Form.Item name="esiWageLimit" label="Wage Limit (₹)">
              <InputNumber min={0} step={1000} />
            </Form.Item>
          </Space>

          <Divider orientation="left">Professional Tax</Divider>
          <Form.Item name="ptEnabled" label="PT Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="ptAmount" label="PT Amount (₹/month)">
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Staff PF/ESI Modal */}
      <Modal title="Edit Staff Statutory Info" open={editModal} onCancel={() => setEditModal(false)} onOk={handleEditSave} width={500}>
        <Form form={editForm} layout="vertical">
          <Space size="large" wrap style={{ width: "100%" }}>
            <Form.Item name="pfNumber" label="PF Account Number">
              <Input placeholder="e.g. TN/CHE/12345/678" />
            </Form.Item>
            <Form.Item name="uanNumber" label="UAN Number">
              <Input placeholder="12-digit UAN" />
            </Form.Item>
            <Form.Item name="esiNumber" label="ESI Number">
              <Input placeholder="ESI IP number" />
            </Form.Item>
            <Form.Item name="basicSalary" label="Basic Salary (₹)">
              <InputNumber min={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="grossSalary" label="Gross Salary (₹)">
              <InputNumber min={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="pfEnabled" label="PF Applicable" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="esiEnabled" label="ESI Applicable" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title="PF & ESI Details" open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={550}>
        {selectedRecord && (() => {
          const pf = calcPF(selectedRecord.basicSalary);
          const esi = calcESI(selectedRecord.grossSalary);
          return (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Name">{selectedRecord.staffName}</Descriptions.Item>
              <Descriptions.Item label="Emp ID">{selectedRecord.employeeId}</Descriptions.Item>
              <Descriptions.Item label="Basic Salary">₹{(selectedRecord.basicSalary || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Gross Salary">₹{(selectedRecord.grossSalary || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="PF Number">{selectedRecord.pfNumber || "-"}</Descriptions.Item>
              <Descriptions.Item label="UAN">{selectedRecord.uanNumber || "-"}</Descriptions.Item>
              <Descriptions.Item label="ESI Number">{selectedRecord.esiNumber || "-"}</Descriptions.Item>
              <Descriptions.Item label="PF Status">
                <Tag color={selectedRecord.pfEnabled ? "green" : "red"}>{selectedRecord.pfEnabled ? "Active" : "Disabled"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="PF (Employee)">₹{pf.employee.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="PF (Employer)">₹{pf.employer.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="ESI (Employee)">₹{esi.employee.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="ESI (Employer)">₹{esi.employer.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Total Deductions" span={2}>
                <Tag color="red">₹{(pf.employee + esi.employee + (settings.pt?.enabled ? settings.pt.amount : 0)).toLocaleString()}</Tag>
              </Descriptions.Item>
            </Descriptions>
          );
        })()}
      </Modal>
    </div>
  );
};

export default PFESIPage;
