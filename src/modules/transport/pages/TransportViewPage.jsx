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
  getTransportAcademicYears,
  assignStudentTransport,
} from "../transport.service";

const TransportViewPage = () => {
  const [editForm] = Form.useForm();
  const [assignments, setAssignments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [search, setSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState(undefined);
  const [sectionFilter, setSectionFilter] = useState(undefined);
  const [fatherNameFilter, setFatherNameFilter] = useState("");
  const [siblingFilter, setSiblingFilter] = useState(undefined);
  const [areaFilter, setAreaFilter] = useState("");
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
    if (academicYear) {
      fetchData();
    }
  }, [academicYear]);

  useEffect(() => {
    Promise.all([getAllTransportRoutes(), getTransportAcademicYears()])
      .then(([routeData, years]) => {
        setRoutes(routeData || []);
        setAvailableYears(years || []);
        setAcademicYear((current) => current || years?.[0] || "2026-2027");
      })
      .catch(() => {
        setRoutes([]);
        setAvailableYears([]);
      });
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
    const matchesSearch =
      (a.student?.name || "").toLowerCase().includes(q) ||
      (a.student?.standardLabel || a.student?.standard || "").toLowerCase().includes(q) ||
      (a.route?.routeName || "").toLowerCase().includes(q) ||
      (a.route?.routeNo || "").toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (standardFilter && (a.student?.standardLabel || a.student?.standard) !== standardFilter) return false;
    if (sectionFilter && a.student?.section !== sectionFilter) return false;
    if (fatherNameFilter && !(a.student?.family?.fatherName || "").toLowerCase().includes(fatherNameFilter.toLowerCase())) return false;
    if (siblingFilter === "has" && !a.student?.siblingGroupId) return false;
    if (siblingFilter === "none" && a.student?.siblingGroupId) return false;
    if (areaFilter) {
      const addr = a.student?.address;
      const areaStr = [addr?.line1, addr?.line2, addr?.line3, addr?.pin].filter(Boolean).join(" ").toLowerCase();
      if (!areaStr.includes(areaFilter.toLowerCase())) return false;
    }
    return true;
  });

  const standardOptions = Array.from(new Set(assignments.map((a) => a.student?.standardLabel || a.student?.standard).filter(Boolean))).sort();
  const sectionOptions = Array.from(new Set(assignments.map((a) => a.student?.section).filter(Boolean))).sort();

  const columns = [
    {
      title: "Student",
      render: (_, r) => r.student?.name || "-",
      sorter: (a, b) => (a.student?.name || "").localeCompare(b.student?.name || ""),
    },
    {
      title: "Standard",
      render: (_, r) => r.student?.standardLabel || r.student?.standard || "-",
    },
    {
      title: "Section",
      render: (_, r) => r.student?.section || "-",
    },
    {
      title: "Father Name",
      render: (_, r) => r.student?.family?.fatherName || "-",
    },
    {
      title: "Sibling",
      render: (_, r) => r.student?.siblingGroupId ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>,
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
      title: "Spl Class Days",
      render: (_, r) => {
        if (!r.isSplClass) return "—";
        if (r.splClassDaysUsed != null && r.totalWorkingDays != null)
          return <span>{r.splClassDaysUsed}/{r.totalWorkingDays} days</span>;
        if (r.splClassStartDate)
          return <span className="text-xs">Started {new Date(r.splClassStartDate).toLocaleDateString("en-IN")}</span>;
        return "—";
      },
    },
    {
      title: "Base Fee",
      render: (_, r) => `₹${r.route?.baseFee?.toLocaleString() || 0}`,
    },
    {
      title: "Total Fee",
      render: (_, r) => {
        const base = r.stop?.fee ?? r.route?.baseFee ?? 0;
        const splFull = r.isSplClass ? (r.route?.splClassFee || 0) : 0;
        let splActual = splFull;
        if (r.isSplClass && r.splClassDaysUsed != null && r.totalWorkingDays > 0) {
          splActual = Math.round((splFull * r.splClassDaysUsed) / r.totalWorkingDays);
        }
        const total = base + splActual;
        return (
          <span>
            <Tag color="blue">₹{total.toLocaleString()}</Tag>
            {splActual !== splFull && splFull > 0 && (
              <span className="text-[10px] text-gray-400 ml-1">(pro-rata)</span>
            )}
          </span>
        );
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
        <Space wrap>
          <Select
            value={academicYear || undefined}
            onChange={setAcademicYear}
            options={availableYears.map((year) => ({ label: year, value: year }))}
            style={{ width: 150 }}
            placeholder="Academic Year"
          />
          <Select
            allowClear
            placeholder="Standard"
            style={{ width: 140 }}
            value={standardFilter}
            onChange={setStandardFilter}
            options={standardOptions.map((s) => ({ label: s, value: s }))}
          />
          <Select
            allowClear
            placeholder="Section"
            style={{ width: 110 }}
            value={sectionFilter}
            onChange={setSectionFilter}
            options={sectionOptions.map((s) => ({ label: s, value: s }))}
          />
          <Input
            allowClear
            placeholder="Father name"
            value={fatherNameFilter}
            onChange={(e) => setFatherNameFilter(e.target.value)}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder="Sibling"
            style={{ width: 130 }}
            value={siblingFilter}
            onChange={setSiblingFilter}
            options={[
              { label: "Has Sibling", value: "has" },
              { label: "No Sibling", value: "none" },
            ]}
          />
          <Input
            placeholder="Area / Pin"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            style={{ width: 160 }}
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
            <Select options={availableYears.map((year) => ({ label: year, value: year }))} />
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
