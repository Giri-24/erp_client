import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Popconfirm,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import {
  getAllStaff,
  getNextEmployeeId,
  createStaff,
  updateStaff,
  deleteStaff,
  linkChildToStaff,
  unlinkChildFromStaff,
} from "../staff.service";
import instance from "../../../utils/axios";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;

const formatStandardLabel = (standard) => {
  if (!standard) return "-";
  if (!String(standard).startsWith("STD_")) return standard;
  const value = Number(String(standard).replace("STD_", ""));
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix} Standard`;
};

const StaffManagementPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [linkModal, setLinkModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [linkStaffId, setLinkStaffId] = useState(null);
  const [form] = Form.useForm();
  const canCreateStaff = hasPermission(PERMISSIONS.STAFF_CREATE);
  const canUpdateStaff = hasPermission(PERMISSIONS.STAFF_UPDATE);
  const canDeleteStaff = hasPermission(PERMISSIONS.STAFF_DELETE);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await getAllStaff();
      setStaff(data);
    } catch {
      message.error("Failed to load staff");
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    try {
      const res = await instance.get("/admissions");
      setStudents(res.data.filter((s) => s.users?.isActive !== false));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreate = async () => {
    if (!canCreateStaff) {
      message.error("You are not authorized to create staff");
      return;
    }
    setEditingStaff(null);
    form.resetFields();
    try {
      const response = await getNextEmployeeId();
      form.setFieldsValue({ employeeId: response?.employeeId || "" });
    } catch {
      form.setFieldsValue({ employeeId: "" });
    }
    setModalOpen(true);
  };

  const openEdit = (record) => {
    if (!canUpdateStaff) {
      message.error("You are not authorized to update staff");
      return;
    }
    setEditingStaff(record);
    form.setFieldsValue({
      ...record,
      joiningDate: record.joiningDate ? dayjs(record.joiningDate) : null,
    });
    setModalOpen(true);
  };

  const openDetail = (record) => {
    setSelectedStaff(record);
    setDetailModal(true);
  };

  const openLinkChild = (staffId) => {
    if (!canUpdateStaff) {
      message.error("You are not authorized to update staff");
      return;
    }
    setLinkStaffId(staffId);
    fetchStudents();
    setLinkModal(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        ...(values.employeeId ? { employeeId: values.employeeId } : {}),
        joiningDate: values.joiningDate
          ? values.joiningDate.toISOString()
          : null,
      };

      if (editingStaff) {
        if (!canUpdateStaff) {
          message.error("You are not authorized to update staff");
          return;
        }
        await updateStaff(editingStaff.id, payload);
        message.success("Staff updated");
      } else {
        if (!canCreateStaff) {
          message.error("You are not authorized to create staff");
          return;
        }
        await createStaff(payload);
        message.success("Staff created");
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save staff");
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteStaff) {
      message.error("You are not authorized to deactivate staff");
      return;
    }
    try {
      await deleteStaff(id);
      message.success("Staff deactivated");
      fetchStaff();
    } catch {
      message.error("Failed to delete");
    }
  };

  const handleLinkChild = async (studentId) => {
    if (!canUpdateStaff) {
      message.error("You are not authorized to update staff");
      return;
    }
    try {
      await linkChildToStaff(linkStaffId, studentId);
      message.success("Child linked to staff");
      setLinkModal(false);
      fetchStaff();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to link child");
    }
  };

  const handleUnlinkChild = async (studentId) => {
    if (!canUpdateStaff) {
      message.error("You are not authorized to update staff");
      return;
    }
    try {
      await unlinkChildFromStaff(studentId);
      message.success("Child unlinked");
      fetchStaff();
    } catch {
      message.error("Failed to unlink");
    }
  };

  const columns = [
    { title: "Employee ID", dataIndex: "employeeId", width: 120 },
    { title: "Name", dataIndex: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Designation", dataIndex: "designation" },
    { title: "Department", dataIndex: "department", render: (v) => v || "-" },
    { title: "Phone", dataIndex: "phone", render: (v) => v || "-" },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "Children",
      dataIndex: "children",
      render: (children) =>
        children?.length > 0
          ? children.map((c) => (
              <Tag key={c.id} color="blue" style={{ marginBottom: 2 }}>
                {c.name} ({c.standard})
              </Tag>
            ))
          : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => openDetail(record)} />
          {canUpdateStaff && (
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          )}
          {canUpdateStaff && (
            <Button icon={<LinkOutlined />} size="small" onClick={() => openLinkChild(record.id)} title="Link Child" />
          )}
          {canDeleteStaff && (
            <Popconfirm title="Deactivate this staff?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
          {!canUpdateStaff && !canDeleteStaff && "-"}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Editorial page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>Staff</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: '#00152a', fontWeight: 700 }}>Directory</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Staff Management
          </h2>
          <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Manage staff records, roles, and linked children.
          </p>
        </div>
        {canCreateStaff && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Staff
          </Button>
        )}
      </div>

      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
          <Table
            columns={columns}
            dataSource={staff}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 20 }}
          />
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        title={editingStaff ? "Edit Staff" : "Add Staff"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Space size="large" wrap style={{ width: "100%" }}>
            <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}>
              <Input placeholder="Auto-generated employee ID" disabled={!editingStaff} />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="Full name" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
              <Input placeholder="email@school.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label={editingStaff ? "New Password (optional)" : "Password"}
              rules={editingStaff ? [{ min: 6, message: "Minimum 6 characters" }] : [
                { required: true, message: "Password is required" },
                { min: 6, message: "Minimum 6 characters" },
              ]}
            >
              <Input.Password placeholder={editingStaff ? "Leave empty to keep current password" : "Set login password"} />
            </Form.Item>
          </Space>
          <Space size="large" wrap style={{ width: "100%" }}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone number" />
            </Form.Item>
            <Form.Item name="designation" label="Designation" rules={[{ required: true }]}>
              <Select placeholder="Select role" style={{ width: 200 }}>
                <Option value="Teacher">Teacher</Option>
                <Option value="HOD">HOD</Option>
                <Option value="Principal">Principal</Option>
                <Option value="Vice Principal">Vice Principal</Option>
                <Option value="Clerk">Clerk</Option>
                <Option value="Lab Assistant">Lab Assistant</Option>
                <Option value="Librarian">Librarian</Option>
                <Option value="Peon">Peon</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item name="department" label="Department">
              <Select placeholder="Select department" allowClear style={{ width: 200 }}>
                <Option value="Mathematics">Mathematics</Option>
                <Option value="Science">Science</Option>
                <Option value="English">English</Option>
                <Option value="Tamil">Tamil</Option>
                <Option value="Social Science">Social Science</Option>
                <Option value="Computer Science">Computer Science</Option>
                <Option value="Commerce">Commerce</Option>
                <Option value="Physical Education">Physical Education</Option>
                <Option value="Administration">Administration</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </Space>
          <Space size="large" wrap style={{ width: "100%" }}>
            <Form.Item name="qualification" label="Qualification">
              <Input placeholder="e.g. M.Sc., B.Ed." />
            </Form.Item>
            <Form.Item name="joiningDate" label="Joining Date">
              <DatePicker />
            </Form.Item>
            <Form.Item name="salary" label="Salary">
              <InputNumber min={0} prefix="₹" style={{ width: 150 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={`Staff Details — ${selectedStaff?.name || ""}`}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={600}
      >
        {selectedStaff && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Employee ID">{selectedStaff.employeeId}</Descriptions.Item>
              <Descriptions.Item label="Name">{selectedStaff.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedStaff.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedStaff.phone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Designation">{selectedStaff.designation}</Descriptions.Item>
              <Descriptions.Item label="Department">{selectedStaff.department || "-"}</Descriptions.Item>
              <Descriptions.Item label="Qualification">{selectedStaff.qualification || "-"}</Descriptions.Item>
              <Descriptions.Item label="Joining Date">
                {selectedStaff.joiningDate ? new Date(selectedStaff.joiningDate).toLocaleDateString() : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Salary">
                {selectedStaff.salary ? `₹${selectedStaff.salary.toLocaleString()}` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedStaff.isActive ? "green" : "red"}>
                  {selectedStaff.isActive ? "Active" : "Inactive"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            {selectedStaff.children?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Children (Students):</strong>
                <Table
                  dataSource={selectedStaff.children}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  style={{ marginTop: 8 }}
                  columns={[
                    { title: "Name", dataIndex: "name" },
                    { title: "Standard", dataIndex: "standard" },
                    {
                      title: "",
                      key: "action",
                      render: (_, child) => (
                        canUpdateStaff ? (
                          <Popconfirm title="Unlink this child?" onConfirm={() => { handleUnlinkChild(child.id); setDetailModal(false); }}>
                            <Button size="small" danger>Unlink</Button>
                          </Popconfirm>
                        ) : null
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Link Child Modal */}
      <Modal
        title="Link Student as Child"
        open={linkModal}
        onCancel={() => setLinkModal(false)}
        footer={null}
        width={500}
      >
        <Select
          showSearch
          placeholder="Search student to link"
          style={{ width: "100%" }}
          onChange={(studentId) => handleLinkChild(studentId)}
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {students.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.name} — {formatStandardLabel(s.standard)}
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default StaffManagementPage;
