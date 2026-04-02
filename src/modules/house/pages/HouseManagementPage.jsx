import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";
import React, { useState, useEffect, useMemo } from "react";
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, ColorPicker, Statistic, Row, Col, Tooltip, Badge,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined,
  UserSwitchOutlined, TeamOutlined, CrownOutlined,
} from "@ant-design/icons";
import {
  getAllHouses, createHouse, updateHouse, deleteHouse,
  autoAllocateHouses, assignStudentToHouse, removeStudentFromHouse,
} from "../house.service";

const STANDARDS = [
  "LKG","UKG","STD_1","STD_2","STD_3","STD_4","STD_5",
  "STD_6","STD_7","STD_8","STD_9","STD_10","STD_11","STD_12",
];

const formatStd = (s) => s?.replace("STD_", "Std ") || s;

export default function HouseManagementPage() {
  const { hasPermission } = usePermissionHelpers();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [assignModal, setAssignModal] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [allocateStd, setAllocateStd] = useState(undefined);
  const [allocateYear, setAllocateYear] = useState(undefined);
  const [form] = Form.useForm();

  const loadHouses = async () => {
    setLoading(true);
    try {
      const res = await getAllHouses();
      setHouses(res.data);
    } catch { message.error("Failed to load houses"); }
    setLoading(false);
  };

  const loadStudents = async () => {
    try {
      const res = await axios.get("/students");
      setAllStudents(res.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadHouses(); loadStudents(); }, []);

  const totalStudents = useMemo(() => houses.reduce((s, h) => s + (h.students?.length || 0), 0), [houses]);
  const unassigned = allStudents.filter((s) => !s.houseId).length;

  const handleCreate = () => {
    setEditingHouse(null);
    form.resetFields();
    setFormModal(true);
  };

  const handleEdit = (house) => {
    setEditingHouse(house);
    form.setFieldsValue({
      name: house.name,
      colorCode: house.colorCode || "#1890ff",
      motto: house.motto,
    });
    setFormModal(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const color = typeof values.colorCode === "string" ? values.colorCode : values.colorCode?.toHexString?.() || values.colorCode;
      const payload = { ...values, colorCode: color };
      if (editingHouse) {
        await updateHouse(editingHouse.id, payload);
        message.success("House updated");
      } else {
        await createHouse(payload);
        message.success("House created");
      }
      setFormModal(false);
      loadHouses();
    } catch (e) {
      if (e.response?.data?.message) message.error(e.response.data.message);
    }
  };

  

  const handleDelete = async (id) => {
    try {
      await deleteHouse(id);
      message.success("House deleted");
      loadHouses();
    } catch (e) {
      message.error(e.response?.data?.message || "Delete failed");
    }
  };

  const handleAutoAllocate = async () => {
    try {
      const params = {};
      if (allocateStd) params.standard = allocateStd;
      if (allocateYear) params.academicYear = allocateYear;
      const res = await autoAllocateHouses(params);
      message.success(res.data.message);
      loadHouses();
      loadStudents();
    } catch (e) {
      message.error(e.response?.data?.message || "Auto-allocate failed");
    }
  };

  const handleAssignCaptain = async (houseId, field, studentId) => {
    try {
      await updateHouse(houseId, { [field]: studentId || null });
      message.success("Updated");
      loadHouses();
    } catch (e) {
      message.error(e.response?.data?.message || "Failed");
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await removeStudentFromHouse(studentId);
      message.success("Student removed from house");
      loadHouses();
      loadStudents();
    } catch (e) {
      message.error("Failed to remove");
    }
  };

  const handleManualAssign = async (studentId, houseId) => {
    try {
      await assignStudentToHouse(studentId, houseId);
      message.success("Student assigned");
      loadHouses();
      loadStudents();
      setAssignModal(false);
    } catch (e) {
      message.error(e.response?.data?.message || "Failed");
    }
  };

  const columns = [
    {
      title: "House", dataIndex: "name", key: "name",
      render: (name, r) => (
        <Space>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: r.colorCode || "#ccc" }} />
          <span className="font-semibold">{name}</span>
        </Space>
      ),
    },
    { title: "Motto", dataIndex: "motto", key: "motto", render: (v) => v || "—" },
    {
      title: "Captain", key: "captain",
      render: (_, r) => (
        <Select
          allowClear size="small" style={{ width: 160 }}
          placeholder="Select captain"
          value={r.captain?.id || undefined}
          onChange={(v) => handleAssignCaptain(r.id, "captainId", v)}
          options={(r.students || []).map((s) => ({ label: s.name, value: s.id }))}
        />
      ),
    },
    {
      title: "Vice Captain", key: "viceCaptain",
      render: (_, r) => (
        <Select
          allowClear size="small" style={{ width: 160 }}
          placeholder="Select vice captain"
          value={r.viceCaptain?.id || undefined}
          onChange={(v) => handleAssignCaptain(r.id, "viceCaptainId", v)}
          options={(r.students || []).map((s) => ({ label: s.name, value: s.id }))}
        />
      ),
    },
    {
      title: "Band Captain", key: "bandCaptain",
      render: (_, r) => (
        <Select
          allowClear size="small" style={{ width: 160 }}
          placeholder="Select band captain"
          value={r.bandCaptain?.id || undefined}
          onChange={(v) => handleAssignCaptain(r.id, "bandCaptainId", v)}
          options={(r.students || []).map((s) => ({ label: s.name, value: s.id }))}
        />
      ),
    },
    {
      title: "Students", key: "count",
      render: (_, r) => (
        <Button type="link" onClick={() => setDetailModal(r)}>
          <Badge count={r.students?.length || 0} showZero color={r.colorCode || "#1890ff"} />
        </Button>
      ),
    },
    {
      title: "Actions", key: "actions",
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit"><Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(r)} /></Tooltip>
          <Popconfirm title="Delete this house?" onConfirm={() => handleDelete(r.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="Total Houses" value={houses.length} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Assigned Students" value={totalStudents} prefix={<UserSwitchOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Unassigned Students" value={unassigned} valueStyle={{ color: unassigned > 0 ? "#cf1322" : "#3f8600" }} /></Card></Col>
        <Col span={6}>
          <Card className="flex items-center justify-center h-full">
            <Space direction="vertical" size="small" className="w-full">
              <Select placeholder="Standard" allowClear size="small" className="w-full"
                options={STANDARDS.map((s) => ({ label: formatStd(s), value: s }))}
                value={allocateStd} onChange={setAllocateStd} />
              <Button type="primary" icon={<ThunderboltOutlined />} block onClick={handleAutoAllocate}>
                Auto Allocate
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Main table */}
      <Card
        title={<span className="font-semibold text-lg">House Management</span>}
        extra={
          <Space>
            <Button icon={<UserSwitchOutlined />} onClick={() => setAssignModal(true)}>Manual Assign</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add House</Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={houses} rowKey="id" loading={loading} pagination={false} />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={formModal} title={editingHouse ? "Edit House" : "Create House"}
        onCancel={() => setFormModal(false)} onOk={handleSave} okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="House Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Red House" />
          </Form.Item>
          <Form.Item name="colorCode" label="Color">
            <ColorPicker />
          </Form.Item>
          <Form.Item name="motto" label="Motto">
            <Input placeholder="e.g. Unity is strength" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal — Students in a house */}
      <Modal
        open={!!detailModal} title={`${detailModal?.name} — Students`}
        onCancel={() => setDetailModal(null)} footer={null} width={600}
      >
        <Table
          size="small" pagination={{ pageSize: 10 }}
          dataSource={detailModal?.students || []} rowKey="id"
          columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Standard", dataIndex: "standard", render: formatStd },
            { title: "Section", dataIndex: "section", render: (v) => v || "—" },
            {
              title: "", key: "action",
              render: (_, r) => (
                <Popconfirm title="Remove from house?" onConfirm={() => handleRemoveStudent(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>

      {/* Manual Assign Modal */}
      <Modal
        open={assignModal} title="Assign Student to House"
        onCancel={() => setAssignModal(false)} footer={null}
      >
        <AssignStudentForm
          students={allStudents.filter((s) => !s.houseId)}
          houses={houses}
          onAssign={handleManualAssign}
        />
      </Modal>
    </div>
  );
}

function AssignStudentForm({ students, houses, onAssign }) {
  const [studentId, setStudentId] = useState(null);
  const [houseId, setHouseId] = useState(null);

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Select
        showSearch placeholder="Select Student" className="w-full"
        filterOption={(input, opt) => opt.label?.toLowerCase().includes(input.toLowerCase())}
        options={students.map((s) => ({ label: `${s.name} (${formatStd(s.standard)})`, value: s.id }))}
        value={studentId} onChange={setStudentId}
      />
      <Select
        placeholder="Select House" className="w-full"
        options={houses.map((h) => ({ label: h.name, value: h.id }))}
        value={houseId} onChange={setHouseId}
      />
      <Button type="primary" block disabled={!studentId || !houseId}
        onClick={() => { onAssign(studentId, houseId); setStudentId(null); setHouseId(null); }}>
        Assign
      </Button>
    </Space>
  );
}

const formatStd2 = (s) => s?.replace("STD_", "Std ") || s;
