import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Input,
  Space,
  Button,
  message,
  Popconfirm,
  Modal,
  Form,
  Select,
  Switch,
} from "antd";
import { DeleteOutlined, SearchOutlined, EditOutlined } from "@ant-design/icons";
import {
  getAllTransportAssignments,
  removeStudentTransport,
  getAllTransportRoutes,
  assignStudentTransport,
} from "../transport.service";

const TransportViewPage = () => {
  const [editForm] = Form.useForm();
  const [assignments, setAssignments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllTransportAssignments(academicYear);
      setAssignments(data);
    } catch {
      message.error("Failed to load transport assignments");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  useEffect(() => {
    getAllTransportRoutes().then(setRoutes).catch(() => setRoutes([]));
  }, []);

  const openEdit = (record) => {
    setEditing(record);
    editForm.setFieldsValue({
      routeId: record.routeId,
      stopId: record.stopId || undefined,
      isSplClass: !!record.isSplClass,
      academicYear: record.academicYear || academicYear,
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const values = await editForm.validateFields();
      setSavingEdit(true);
      await assignStudentTransport({
        studentId: editing.studentId,
        routeId: values.routeId,
        stopId: values.stopId,
        isSplClass: values.isSplClass,
        academicYear: values.academicYear,
      });
      message.success("Transport assignment updated");
      setEditing(null);
      await fetchData();
    } catch (err) {
      if (!err?.errorFields) {
        message.error(err?.response?.data?.message || "Failed to update assignment");
      }
    }
    setSavingEdit(false);
  };

  const handleRemove = async (studentId) => {
    try {
      await removeStudentTransport(studentId);
      message.success("Assignment removed");
      fetchData();
    } catch {
      message.error("Failed to remove assignment");
    }
  };

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.student?.name || "").toLowerCase().includes(q) ||
      (a.student?.standard || "").toLowerCase().includes(q) ||
      (a.route?.routeName || "").toLowerCase().includes(q) ||
      (a.route?.routeNo || "").toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      title: "Student",
      render: (_, r) => r.student?.name || "-",
      sorter: (a, b) => (a.student?.name || "").localeCompare(b.student?.name || ""),
    },
    {
      title: "Standard",
      render: (_, r) => r.student?.standard || "-",
    },
    {
      title: "Route",
      render: (_, r) => r.route?.routeName || "-",
      sorter: (a, b) => (a.route?.routeName || "").localeCompare(b.route?.routeName || ""),
    },
    {
      title: "Route No",
      render: (_, r) => r.route?.routeNo || "-",
    },
    {
      title: "Stop",
      render: (_, r) => r.stop?.stopName || "-",
    },
    {
      title: "Spl Class",
      dataIndex: "isSplClass",
      render: (v) =>
        v ? <Tag color="orange">Yes</Tag> : <Tag color="default">No</Tag>,
      filters: [
        { text: "Yes", value: true },
        { text: "No", value: false },
      ],
      onFilter: (value, record) => record.isSplClass === value,
    },
    {
      title: "Base Fee",
      render: (_, r) => `₹${r.route?.baseFee?.toLocaleString() || 0}`,
    },
    {
      title: "Total Fee",
      render: (_, r) => {
        const base = r.stop?.fee ?? r.route?.baseFee ?? 0;
        const spl = r.isSplClass ? (r.route?.splClassFee || 0) : 0;
        return <Tag color="blue">₹{(base + spl).toLocaleString()}</Tag>;
      },
    },
    {
      title: "",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Remove this transport assignment?"
            onConfirm={() => handleRemove(record.studentId)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="All Transport Assignments"
      extra={
        <Space>
          <Input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{ width: 110 }}
            onPressEnter={fetchData}
            placeholder="Year"
          />
          <Button onClick={fetchData}>Load</Button>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search student / standard / route"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={!!editing}
        title="Edit Transport Assignment"
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={savingEdit}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="academicYear" label="Academic Year" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="routeId" label="Route" rules={[{ required: true }]}>
            <Select
              options={routes.map((r) => ({
                label: `${r.routeName} ${r.routeNo ? `(${r.routeNo})` : ""}`,
                value: r.id,
              }))}
            />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const routeId = getFieldValue("routeId");
              const selectedRoute = routes.find((r) => r.id === routeId);
              if (!selectedRoute?.stops?.length) return null;
              return (
                <Form.Item name="stopId" label="Stop">
                  <Select
                    allowClear
                    options={[...selectedRoute.stops]
                      .sort((a, b) => a.stopOrder - b.stopOrder)
                      .map((s) => ({
                        label: `${s.stopOrder}. ${s.stopName}${s.fee ? ` (₹${s.fee})` : ""}`,
                        value: s.id,
                      }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="isSplClass" label="Special Class" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TransportViewPage;
