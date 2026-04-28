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
    dailyWageThreshold: 176,
  },
  psf: {
    enabled: false,
    employeeRate: 0,
    wageLimit: 0,
  },
  pt: {
    enabled: false, // Professional Tax
    amount: 200,
  },
  salaryStructure: {
    basicRate: 50,
    hraRate: 30,
    travelAllowanceRate: 0,
    otherAllowanceRate: 0,
  },
  clLapseMonths: 3,
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
            dailyWageThreshold: data.esi?.dailyWageThreshold
              ?? data.esiDailyWageThreshold
              ?? DEFAULT_SETTINGS.esi.dailyWageThreshold,
          },
          psf: {
            enabled: data.psf?.enabled ?? data.psfEnabled ?? DEFAULT_SETTINGS.psf.enabled,
            employeeRate: data.psf?.employeeRate ?? data.psfEmployeeRate ?? DEFAULT_SETTINGS.psf.employeeRate,
            wageLimit: data.psf?.wageLimit ?? data.psfWageLimit ?? DEFAULT_SETTINGS.psf.wageLimit,
          },
          pt: {
            enabled: data.pt?.enabled ?? data.ptEnabled ?? DEFAULT_SETTINGS.pt.enabled,
            amount: data.pt?.amount ?? data.ptAmount ?? DEFAULT_SETTINGS.pt.amount,
          },
          salaryStructure: {
            basicRate: data.salaryStructure?.basicRate ?? data.basicRate ?? DEFAULT_SETTINGS.salaryStructure.basicRate,
            hraRate: data.salaryStructure?.hraRate ?? data.hraRate ?? DEFAULT_SETTINGS.salaryStructure.hraRate,
            travelAllowanceRate: data.salaryStructure?.travelAllowanceRate
              ?? data.travelAllowanceRate
              ?? DEFAULT_SETTINGS.salaryStructure.travelAllowanceRate,
            otherAllowanceRate: data.salaryStructure?.otherAllowanceRate
              ?? data.otherAllowanceRate
              ?? DEFAULT_SETTINGS.salaryStructure.otherAllowanceRate,
          },
          clLapseMonths: data.clLapseMonths ?? DEFAULT_SETTINGS.clLapseMonths,
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
        esiDailyWageThreshold: values.esiDailyWageThreshold,
        psfEnabled: values.psfEnabled,
        psfEmployeeRate: values.psfEmployeeRate,
        psfWageLimit: values.psfWageLimit,
        ptEnabled: values.ptEnabled,
        ptAmount: values.ptAmount,
        basicRate: values.basicRate,
        hraRate: values.hraRate,
        travelAllowanceRate: values.travelAllowanceRate,
        otherAllowanceRate: values.otherAllowanceRate,
        clLapseMonths: values.clLapseMonths,
      });
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
          dailyWageThreshold: values.esiDailyWageThreshold,
        },
        psf: {
          enabled: values.psfEnabled,
          employeeRate: values.psfEmployeeRate,
          wageLimit: values.psfWageLimit,
        },
        pt: {
          enabled: values.ptEnabled,
          amount: values.ptAmount,
        },
        salaryStructure: {
          basicRate: values.basicRate,
          hraRate: values.hraRate,
          travelAllowanceRate: values.travelAllowanceRate,
          otherAllowanceRate: values.otherAllowanceRate,
        },
        clLapseMonths: values.clLapseMonths,
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
      esiDailyWageThreshold: settings.esi.dailyWageThreshold ?? 176,
      psfEnabled: settings.psf?.enabled ?? false,
      psfEmployeeRate: settings.psf?.employeeRate ?? 0,
      psfWageLimit: settings.psf?.wageLimit ?? 0,
      ptEnabled: settings.pt?.enabled,
      ptAmount: settings.pt?.amount,
      basicRate: settings.salaryStructure?.basicRate ?? 50,
      hraRate: settings.salaryStructure?.hraRate ?? 30,
      travelAllowanceRate: settings.salaryStructure?.travelAllowanceRate ?? 0,
      otherAllowanceRate: settings.salaryStructure?.otherAllowanceRate ?? 0,
      clLapseMonths: settings.clLapseMonths ?? 3,
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
      psfEnabled: record.psfEnabled !== false,
      basicSalary: record.basicSalary,
      grossSalary: record.grossSalary,
      isStipend: record.isStipend || false,
      dailyRate: record.dailyRate,
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

  // Client-side PF/ESI calculation helpers using new rules
  const basicRate = settings.salaryStructure?.basicRate ?? 50;
  const hraRate = settings.salaryStructure?.hraRate ?? 30;
  const esiDailyThreshold = settings.esi?.dailyWageThreshold ?? 176;

  const calcPF = (gross, isStipend = false) => {
    if (!settings.pf.enabled || !gross || isStipend) return { employee: 0, employer: 0, total: 0, base: 0 };
    const base = Math.round(gross * basicRate / 100); // 50% of gross
    const wage = Math.min(base, settings.pf.wageLimit);
    const employee = Math.round((wage * settings.pf.employeeRate) / 100);
    const employer = Math.round((wage * settings.pf.employerRate) / 100);
    return { employee, employer, total: employee + employer, base };
  };

  const calcESI = (gross) => {
    if (!settings.esi.enabled || !gross) return { employee: 0, employer: 0, total: 0, base: 0, dailyWage: 0, applicable: false };
    const base = Math.round(gross * (basicRate + hraRate) / 100); // ~80% of gross
    const dailyWage = Math.round(base / 30);
    if (dailyWage < esiDailyThreshold || base > settings.esi.wageLimit) {
      return { employee: 0, employer: 0, total: 0, base, dailyWage, applicable: false };
    }
    const employee = Math.round((base * settings.esi.employeeRate) / 100);
    const employer = Math.round((base * settings.esi.employerRate) / 100);
    return { employee, employer, total: employee + employer, base, dailyWage, applicable: true };
  };

  const staffColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName", sorter: (a, b) => (a.staffName || "").localeCompare(b.staffName || "") },
    { title: "Gross", dataIndex: "grossSalary", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    {
      title: "Basic (50%)",
      dataIndex: "grossSalary",
      key: "basicCalc",
      render: (v) => v ? `₹${Math.round(v * basicRate / 100).toLocaleString()}` : "-",
    },
    { title: "PF No", dataIndex: "pfNumber", render: (v) => v || "-" },
    { title: "UAN", dataIndex: "uanNumber", render: (v) => v || "-" },
    { title: "ESI No", dataIndex: "esiNumber", render: (v) => v || "-" },
    {
      title: "Type",
      key: "type",
      render: (_, r) => r.isStipend ? <Tag color="orange">Stipend</Tag> : <Tag color="blue">Regular</Tag>,
    },
    {
      title: "PF (Emp + Employer)",
      key: "pfCalc",
      render: (_, r) => {
        if (r.isStipend || !r.pfEnabled) return <Tag color="default">N/A (Stipend/Disabled)</Tag>;
        const pf = calcPF(r.grossSalary, r.isStipend);
        return <Tag color="blue">₹{pf.employee} + ₹{pf.employer}<br/><small>on Basic ₹{pf.base?.toLocaleString()}</small></Tag>;
      },
    },
    {
      title: "ESI (Emp + Employer)",
      key: "esiCalc",
      render: (_, r) => {
        if (!r.esiEnabled) return <Tag color="default">N/A</Tag>;
        const esi = calcESI(r.grossSalary);
        if (!esi.applicable) return <Tag color="red">Below threshold (daily ₹{esi.dailyWage} &lt; ₹{esiDailyThreshold})</Tag>;
        return <Tag color="cyan">₹{esi.employee} + ₹{esi.employer}<br/><small>on ₹{esi.base?.toLocaleString()} (daily ₹{esi.dailyWage})</small></Tag>;
      },
    },
    {
      title: "Daily Rate",
      key: "dailyRate",
      render: (_, r) => r.dailyRate ? <Tag color="purple">₹{r.dailyRate}/day</Tag> : "-",
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
    { title: "PF Base (50%)", dataIndex: "pfBase", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
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
    { title: "ESI Base (80%)", dataIndex: "esiBase", render: (v) => v ? `₹${v.toLocaleString()}` : "-" },
    {
      title: "Daily Wage",
      dataIndex: "dailyEsiWage",
      render: (v) => v ? (v < (settings.esi?.dailyWageThreshold ?? 176)
        ? <Tag color="red">₹{v} (below ₹{settings.esi?.dailyWageThreshold ?? 176})</Tag>
        : <Tag color="green">₹{v}</Tag>) : "-",
    },
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
        <Col span={4}>
          <Card size="small">
            <Statistic title="PSF Employee" value={settings.psf?.employeeRate ?? 0} suffix="%" valueStyle={{ color: "#7cb305" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="PSF Wage Limit" prefix="₹" value={settings.psf?.wageLimit ?? 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Basic Rate" value={settings.salaryStructure?.basicRate ?? 50} suffix="%" valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="HRA Rate" value={settings.salaryStructure?.hraRate ?? 30} suffix="%" valueStyle={{ color: "#eb2f96" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="ESI Daily Threshold" prefix="₹" value={settings.esi?.dailyWageThreshold ?? 176} />
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
            <Form.Item name="esiDailyWageThreshold" label="Daily Wage Threshold (₹)">
              <InputNumber min={0} step={1} />
            </Form.Item>
          </Space>

          <Divider orientation="left">PSF (Professional Services Fund)</Divider>
          <Form.Item name="psfEnabled" label="PSF Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="psfEmployeeRate" label="Employee Rate (%)">
              <InputNumber min={0} max={100} step={0.25} />
            </Form.Item>
            <Form.Item name="psfWageLimit" label="Wage Limit (₹)">
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

          <Divider orientation="left">Salary Structure</Divider>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Gross = Basic + HRA + Travel + Other. PF on Basic, ESI on Basic + HRA."
          />
          <Space size="large" wrap>
            <Form.Item name="basicRate" label="Basic Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item name="hraRate" label="HRA Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item name="travelAllowanceRate" label="Travel Allowance Rate (%)">
              <InputNumber min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item name="otherAllowanceRate" label="Other Allowance Rate (%)">
              <InputNumber min={0} max={100} step={0.5} />
            </Form.Item>
          </Space>

          <Divider orientation="left">Casual Leave (CL) Settings</Divider>
          <Form.Item name="clLapseMonths" label="CL Lapse Months">
            <InputNumber min={0} step={1} style={{ width: 200 }} />
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
            <Form.Item name="psfEnabled" label="PSF Applicable" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isStipend" label="Stipend (No PF)" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="dailyRate" label="Daily Rate (₹) - Security/Sports">
              <InputNumber min={0} style={{ width: 180 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title="PF & ESI Details" open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={550}>
        {selectedRecord && (() => {
          const pf = calcPF(selectedRecord.grossSalary, selectedRecord.isStipend);
          const esi = calcESI(selectedRecord.grossSalary);
          return (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Name">{selectedRecord.staffName}</Descriptions.Item>
              <Descriptions.Item label="Emp ID">{selectedRecord.employeeId}</Descriptions.Item>
              <Descriptions.Item label="Type">{selectedRecord.isStipend ? <Tag color="orange">Stipend</Tag> : <Tag color="blue">Regular</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Daily Rate">{selectedRecord.dailyRate ? `₹${selectedRecord.dailyRate}/day` : "-"}</Descriptions.Item>
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
              <Descriptions.Item label="PF Base">₹{(pf.base || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="ESI Daily Wage">₹{(esi.dailyWage || 0).toLocaleString()}</Descriptions.Item>
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
