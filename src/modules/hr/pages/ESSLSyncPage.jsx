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
  Tabs,
  DatePicker,
  Alert,
  Popconfirm,
  Badge,
  Timeline,
} from "antd";
import {
  SyncOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  DesktopOutlined,
} from "@ant-design/icons";
import {
  syncESSL,
  getESSLDevices,
  addESSLDevice,
  updateESSLDevice,
  deleteESSLDevice,
  getESSLPunchLogs,
  getESSLSyncHistory,
  mapStaffToESSL,
  getStaffESSLMappings,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;

const PUNCH_METHOD_COLORS = {
  fingerprint: "blue",
  face: "cyan",
  card: "gold",
  pin: "default",
};

const ESSLSyncPage = () => {
  const [devices, setDevices] = useState([]);
  const [punchLogs, setPunchLogs] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [staffMappings, setStaffMappings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deviceModal, setDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [mapModal, setMapModal] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");
  const [filterDate, setFilterDate] = useState(dayjs());
  const [deviceForm] = Form.useForm();
  const [mapForm] = Form.useForm();

  const canManage = hasPermission(PERMISSIONS.HR_ESSL_MANAGE);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await getESSLDevices();
      setDevices(data);
    } catch {
      setDevices([]);
    }
    setLoading(false);
  };

  const fetchPunchLogs = async () => {
    setLoading(true);
    try {
      const data = await getESSLPunchLogs({ date: filterDate.format("YYYY-MM-DD") });
      setPunchLogs(data);
    } catch {
      setPunchLogs([]);
    }
    setLoading(false);
  };

  const fetchSyncHistory = async () => {
    setLoading(true);
    try {
      const data = await getESSLSyncHistory({ limit: 50 });
      setSyncHistory(data);
    } catch {
      setSyncHistory([]);
    }
    setLoading(false);
  };

  const fetchStaffMappings = async () => {
    try {
      const data = await getStaffESSLMappings();
      setStaffMappings(data);
    } catch {
      setStaffMappings([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaff(data.filter((s) => s.isActive));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchDevices();
    fetchStaff();
    fetchStaffMappings();
  }, []);

  useEffect(() => {
    if (activeTab === "punch-logs") fetchPunchLogs();
    if (activeTab === "sync-history") fetchSyncHistory();
  }, [activeTab, filterDate]);

  const handleSync = async (deviceId) => {
    setSyncing(true);
    try {
      const result = await syncESSL({ deviceId, date: filterDate.format("YYYY-MM-DD") });
      message.success(`Synced ${result?.recordsCount || 0} records from device`);
      fetchPunchLogs();
      fetchSyncHistory();
    } catch (err) {
      message.error(err?.response?.data?.message || "Sync failed — check device connectivity");
    }
    setSyncing(false);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const result = await syncESSL({ date: filterDate.format("YYYY-MM-DD") });
      message.success(`Synced ${result?.recordsCount || 0} records from all devices`);
      fetchPunchLogs();
      fetchSyncHistory();
    } catch (err) {
      message.error(err?.response?.data?.message || "Sync failed");
    }
    setSyncing(false);
  };

  const handleDeviceSave = async () => {
    try {
      const values = await deviceForm.validateFields();
      if (editingDevice) {
        await updateESSLDevice(editingDevice.id, values);
        message.success("Device updated");
      } else {
        await addESSLDevice(values);
        message.success("Device added");
      }
      setDeviceModal(false);
      fetchDevices();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save device");
    }
  };

  const handleDeviceDelete = async (id) => {
    try {
      await deleteESSLDevice(id);
      message.success("Device removed");
      fetchDevices();
    } catch {
      message.error("Failed to delete device");
    }
  };

  const handleMapStaff = async () => {
    try {
      const values = await mapForm.validateFields();
      await mapStaffToESSL(values);
      message.success("Staff mapped to device");
      setMapModal(false);
      fetchStaffMappings();
    } catch (err) {
      message.error(err?.response?.data?.message || "Mapping failed");
    }
  };

  const openAddDevice = () => {
    setEditingDevice(null);
    deviceForm.resetFields();
    setDeviceModal(true);
  };

  const openEditDevice = (record) => {
    setEditingDevice(record);
    deviceForm.setFieldsValue(record);
    setDeviceModal(true);
  };

  const deviceColumns = [
    { title: "Device Name", dataIndex: "name" },
    { title: "IP Address", dataIndex: "ipAddress" },
    { title: "Port", dataIndex: "port", render: (v) => v || 4370 },
    { title: "Serial No", dataIndex: "serialNumber", render: (v) => v || "-" },
    { title: "Location", dataIndex: "location", render: (v) => v || "-" },
    {
      title: "Type",
      dataIndex: "deviceType",
      render: (v) => (
        <Tag color={v === "fingerprint" ? "blue" : v === "face" ? "cyan" : v === "multi" ? "purple" : "default"}>
          {v === "fingerprint" ? "🖐️ Fingerprint" : v === "face" ? "😊 Face ID" : v === "multi" ? "🔄 Multi" : v || "Unknown"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "isOnline",
      render: (v) => (
        <Badge status={v ? "success" : "error"} text={v ? "Online" : "Offline"} />
      ),
    },
    {
      title: "Last Sync",
      dataIndex: "lastSyncAt",
      render: (v) => v ? dayjs(v).format("DD MMM YYYY HH:mm") : "Never",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<SyncOutlined spin={syncing} />} onClick={() => handleSync(record.id)} loading={syncing}>
            Sync
          </Button>
          {canManage && (
            <>
              <Button icon={<EditOutlined />} size="small" onClick={() => openEditDevice(record)} />
              <Popconfirm title="Remove this device?" onConfirm={() => handleDeviceDelete(record.id)}>
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const punchLogColumns = [
    { title: "Emp ID", dataIndex: "employeeId", width: 100 },
    { title: "Name", dataIndex: "staffName" },
    { title: "Device", dataIndex: "deviceName" },
    {
      title: "Punch Time",
      dataIndex: "punchTime",
      render: (v) => v ? dayjs(v).format("DD MMM YYYY HH:mm:ss") : "-",
      sorter: (a, b) => dayjs(a.punchTime).unix() - dayjs(b.punchTime).unix(),
    },
    {
      title: "Type",
      dataIndex: "punchType",
      render: (v) => <Tag color={v === "IN" ? "green" : v === "OUT" ? "orange" : "default"}>{v || "-"}</Tag>,
    },
    {
      title: "Method",
      dataIndex: "punchMethod",
      render: (v) => (
        <Tag color={PUNCH_METHOD_COLORS[v] || "default"}>
          {v === "fingerprint" ? "🖐️ Finger" : v === "face" ? "😊 Face" : v === "card" ? "💳 Card" : v || "-"}
        </Tag>
      ),
    },
    {
      title: "Verified",
      dataIndex: "verified",
      render: (v) => v ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> : <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
    },
  ];

  const mappingColumns = [
    { title: "Emp ID", dataIndex: "employeeId" },
    { title: "Staff Name", dataIndex: "staffName" },
    { title: "Device User ID", dataIndex: "deviceUserId" },
    { title: "Device", dataIndex: "deviceName" },
    {
      title: "Enrolled Methods",
      dataIndex: "enrolledMethods",
      render: (v) => (v || []).map((m) => (
        <Tag key={m} color={PUNCH_METHOD_COLORS[m] || "default"}>
          {m === "fingerprint" ? "🖐️ Finger" : m === "face" ? "😊 Face" : m}
        </Tag>
      )),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>HR</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: "#00152a", fontWeight: 700 }}>ESSL Biometric</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: "#00152a", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            ESSL Biometric Sync
          </h2>
          <p style={{ color: "#43474d", fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Manage biometric devices, sync fingerprint/face punch data, and map staff to device IDs.
          </p>
        </div>
        <Space>
          <Button type="primary" icon={<SyncOutlined spin={syncing} />} onClick={handleSyncAll} loading={syncing}>
            Sync All Devices
          </Button>
          {canManage && (
            <Button icon={<PlusOutlined />} onClick={openAddDevice}>
              Add Device
            </Button>
          )}
        </Space>
      </div>

      {/* Device Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Devices" value={devices.length} prefix={<DesktopOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Online" value={devices.filter((d) => d.isOnline).length} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Offline" value={devices.filter((d) => !d.isOnline).length} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Today's Punches" value={punchLogs.length} prefix={<ApiOutlined />} />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "devices", label: "Devices" },
        { key: "punch-logs", label: "Punch Logs" },
        { key: "mappings", label: "Staff Mapping" },
        { key: "sync-history", label: "Sync History" },
      ]} />

      {activeTab === "punch-logs" && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <DatePicker value={filterDate} onChange={(d) => d && setFilterDate(d)} allowClear={false} />
          <Button icon={<SyncOutlined />} onClick={fetchPunchLogs}>Refresh</Button>
        </div>
      )}

      <div style={{ background: "#f0f4f8", borderRadius: 16, padding: 4 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
          {activeTab === "devices" && (
            <Table columns={deviceColumns} dataSource={devices} rowKey="id" loading={loading} scroll={{ x: 1100 }} pagination={false} />
          )}
          {activeTab === "punch-logs" && (
            <Table columns={punchLogColumns} dataSource={punchLogs} rowKey="id" loading={loading} scroll={{ x: 1000 }} pagination={{ pageSize: 50 }} />
          )}
          {activeTab === "mappings" && (
            <>
              {canManage && (
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => { mapForm.resetFields(); setMapModal(true); }} style={{ marginBottom: 16 }}>
                  Map Staff to Device
                </Button>
              )}
              <Table columns={mappingColumns} dataSource={staffMappings} rowKey="id" loading={loading} scroll={{ x: 800 }} pagination={{ pageSize: 50 }} />
            </>
          )}
          {activeTab === "sync-history" && (
            <Timeline
              items={(syncHistory || []).map((h) => ({
                color: h.status === "success" ? "green" : h.status === "failed" ? "red" : "blue",
                children: (
                  <div>
                    <strong>{h.deviceName || "All Devices"}</strong> — {h.status === "success" ? `✅ ${h.recordsCount} records synced` : `❌ ${h.error || "Failed"}`}
                    <br />
                    <small style={{ color: "#999" }}>{h.syncedAt ? dayjs(h.syncedAt).format("DD MMM YYYY HH:mm:ss") : ""}</small>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Device Modal */}
      <Modal title={editingDevice ? "Edit Device" : "Add ESSL Device"} open={deviceModal} onCancel={() => setDeviceModal(false)} onOk={handleDeviceSave} width={500}>
        <Form form={deviceForm} layout="vertical">
          <Form.Item name="name" label="Device Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Main Gate Biometric" />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="ipAddress" label="IP Address" rules={[{ required: true }]}>
              <Input placeholder="192.168.1.100" />
            </Form.Item>
            <Form.Item name="port" label="Port">
              <InputNumber min={1} max={65535} placeholder="4370" style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="serialNumber" label="Serial Number">
            <Input placeholder="Device serial number" />
          </Form.Item>
          <Form.Item name="deviceType" label="Device Type" rules={[{ required: true }]}>
            <Select placeholder="Select device type">
              <Option value="fingerprint">Fingerprint</Option>
              <Option value="face">Face Recognition</Option>
              <Option value="multi">Multi (Finger + Face)</Option>
              <Option value="card">Card</Option>
            </Select>
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="e.g. Main Entrance" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Map Staff Modal */}
      <Modal title="Map Staff to Device" open={mapModal} onCancel={() => setMapModal(false)} onOk={handleMapStaff} width={450}>
        <Form form={mapForm} layout="vertical">
          <Form.Item name="staffId" label="Staff Member" rules={[{ required: true }]}>
            <Select placeholder="Select staff" showSearch optionFilterProp="children">
              {staff.map((s) => (
                <Option key={s.id} value={s.id}>{s.name} ({s.employeeId})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="deviceId" label="Device" rules={[{ required: true }]}>
            <Select placeholder="Select device">
              {devices.map((d) => (
                <Option key={d.id} value={d.id}>{d.name} ({d.ipAddress})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="deviceUserId" label="Device User ID" rules={[{ required: true }]}>
            <Input placeholder="User ID on the biometric device" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ESSLSyncPage;
