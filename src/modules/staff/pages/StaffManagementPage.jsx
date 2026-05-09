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
  Upload,
  Divider,
  Typography,
  Switch,
  Row,
  Col,
  Avatar,
  Badge,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  BankOutlined,
  IdcardOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  getAllStaff,
  getNextEmployeeId,
  createStaff,
  getStaff,
  getStaffDocuments,
  updateStaff,
  deleteStaff,
  linkChildToStaff,
  unlinkChildFromStaff,
  uploadStaffDocument,
  deleteStaffDocument,
} from "../staff.service";
import instance from "../../../utils/axios";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;
const { Text } = Typography;

const STAFF_DOCUMENT_TYPES = [
  "EXPERIENCE_CERTIFICATE",
  "RELIEVING_LETTER",
  "APPOINTMENT_LETTER",
  "SALARY_SLIP",
  "EDUCATION_CERTIFICATE",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "MEDICAL_CERTIFICATE",
  "OTHER",
];

const formatDocumentType = (value) =>
  String(value || "OTHER")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const resolveDocumentUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const cleaned = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutUploads = cleaned.startsWith("uploads/")
    ? cleaned.slice("uploads/".length)
    : cleaned;

  const base = (import.meta.env.VITE_API_URL || "/erp/api").replace(/\/+$/, "");
  return `${base}/uploads/${withoutUploads}`;
};

const formatStandardLabel = (standard) => {
  if (!standard) return "-";
  if (!String(standard).startsWith("STD_")) return standard;
  const value = Number(String(standard).replace("STD_", ""));
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix} Standard`;
};

const StatCard = ({ title, value, icon, color }) => (
  <Card 
    className="erp-stat-card" 
    style={{ 
      borderRadius: '24px',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid var(--surface-container-high)',
      height: '100%'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ 
        width: 52, 
        height: 52, 
        borderRadius: 14, 
        backgroundColor: `${color}15`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: color,
        fontSize: 24
      }}>
        {icon}
      </div>
      <div>
        <p style={{ 
          margin: 0, 
          color: 'var(--on-surface-variant)', 
          fontSize: 11, 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em',
          opacity: 0.6
        }}>
          {title}
        </p>
        <h3 style={{ margin: 0, fontSize: 32, fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
          {value}
        </h3>
      </div>
    </div>
  </Card>
);

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
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  
  const [form] = Form.useForm();
  const [docForm] = Form.useForm();
  const canCreateStaff = hasPermission(PERMISSIONS.STAFF_CREATE);
  const canUpdateStaff = hasPermission(PERMISSIONS.STAFF_UPDATE);
  const canDeleteStaff = hasPermission(PERMISSIONS.STAFF_DELETE);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await getAllStaff();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load staff");
    }
    setLoading(false);
  };

  const fetchStudents = async (staffId = null) => {
    try {
      const res = await instance.get("/students");
      const rows = Array.isArray(res.data) ? res.data : [];
      // Only show active students and exclude already-linked children of another staff.
      const available = rows.filter(
        (s) => s?.users?.isActive !== false && (!s.staffParentId || s.staffParentId === staffId),
      );
      setStudents(available);
    } catch {
      setStudents([]);
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
      doorNo: record.doorno,
      taluk: record.taluk || record.taluk || record.taluk || "",
      district: record.district || record.district || "",
      joiningDate: record.joiningDate ? dayjs(record.joiningDate) : null,
      bankIfsc: record.bankIfsc || "",
      bankBranch: record.bankBranch || "",
    });
    setModalOpen(true);
  };

  const fetchStaffDocuments = async (staffId) => {
    setDocumentsLoading(true);
    try {
      const data = await getStaffDocuments(staffId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      setDocuments([]);
      message.error("Failed to load staff documents");
    }
    setDocumentsLoading(false);
  };

  const openDetail = async (record) => {
    setDocuments([]);
    setDocumentsLoading(true);
    setSelectedStaff(record);
    setDetailModal(true);
    try {
      const detail = await getStaff(record.id);
      setSelectedStaff(detail);
      await fetchStaffDocuments(record.id);
    } catch {
      message.error("Failed to load staff details");
      setDocumentsLoading(false);
    }
  };

  const openLinkChild = (staffId) => {
    if (!canUpdateStaff) {
      message.error("You are not authorized to update staff");
      return;
    }
    setLinkStaffId(staffId);
    fetchStudents(staffId);
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
        taluk: values.taluk || "",
        district: values.district || "",
        bankIfsc: values.bankIfsc || "",
        bankBranch: values.bankBranch || "",
        taluk: values.taluk || undefined,
        district: values.district || undefined,
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
      message.success("Child unlinked successfully");
      await fetchStaff();
      
      // If we are looking at this staff in details, refresh that too
      if (detailStaff?.id) {
        const updated = (await getAllStaff()).find(s => s.id === detailStaff.id);
        if (updated) setDetailStaff(updated);
      }
    } catch {
      message.error("Failed to unlink");
    }
  };

  const openDocumentUpload = () => {
    if (!selectedStaff) return;
    if (!canUpdateStaff) {
      message.error("You are not authorized to upload documents");
      return;
    }
    docForm.resetFields();
    setSelectedDocumentFile(null);
    setDocModalOpen(true);
  };

  const submitDocumentUpload = async () => {
    if (!selectedStaff) return;
    if (!selectedDocumentFile) {
      message.error("Please choose a file");
      return;
    }

    try {
      const values = await docForm.validateFields();
      setDocUploadLoading(true);
      await uploadStaffDocument(selectedStaff.id, {
        ...values,
        file: selectedDocumentFile,
        issuedDate: values.issuedDate ? values.issuedDate.toISOString() : undefined,
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : undefined,
      });
      message.success("Document uploaded");
      setDocModalOpen(false);
      setSelectedDocumentFile(null);
      await fetchStaffDocuments(selectedStaff.id);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to upload document");
    } finally {
      setDocUploadLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };


  const handleDeleteDocument = async (documentId) => {
    if (!selectedStaff) return;
    if (!canUpdateStaff) {
      message.error("You are not authorized to delete documents");
      return;
    }
    try {
      await deleteStaffDocument(selectedStaff.id, documentId);
      message.success("Document deleted");
      await fetchStaffDocuments(selectedStaff.id);
    } catch {
      message.error("Failed to delete document");
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategoryFilter === "all" || s.category?.startsWith(activeCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  const columns = [
    { 
      title: "Personnel Profile", 
      key: "personnel",
      render: (_, record) => (
        <Space size={16}>
          <div style={{ position: 'relative' }}>
            <Avatar 
              size={48} 
              style={{ 
                backgroundColor: 'var(--surface-container-high)', 
                color: 'var(--primary)', 
                fontWeight: 800,
                fontSize: 14,
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              {getInitials(record.name)}
            </Avatar>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              right: -2, 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: record.isActive ? '#10b981' : '#ef4444',
              border: '2px solid #fff'
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13, letterSpacing: '-0.01em' }}>{record.name}</span>
            <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.6, fontWeight: 700 }}>{record.employeeId}</span>
          </div>
        </Space>
      ),
      width: 250,
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    { 
      title: "Function", 
      dataIndex: "designation",
      render: (v) => <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)', fontSize: 13 }}>{v}</span>,
      width: 150
    },
    {
      title: "Classification",
      dataIndex: "category",
      render: (v) => {
        const isTeaching = v?.startsWith("TEACHING");
        return (
          <Tag 
            style={{ 
              backgroundColor: isTeaching ? '#ecfdf5' : '#f5f3ff', 
              color: isTeaching ? '#065f46' : '#5b21b6', 
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '11px',
              padding: '2px 10px'
            }}
          >
            {isTeaching ? "Academic" : "Operations"}
          </Tag>
        );
      },
      width: 140
    },
    { title: "Department", dataIndex: "department", render: (v) => v || "-", width: 140 },
    { 
      title: "Pay Grade", 
      dataIndex: "paymentMode", 
      render: (v) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{v === "BANK_TRANSFER" ? "Bank Wire" : "Cashier"}</span>
          <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 700 }}>REMITTANCE</span>
        </Space>
      ),
      width: 120
    },
    { 
      title: "Contact", 
      dataIndex: "phone", 
      render: (v) => <span style={{ fontSize: 12, opacity: 0.7 }}>{v || "-"}</span>,
      width: 130
    },
    {
      title: "Lineage",
      dataIndex: "children",
      render: (children) => {
        const activeChildren = children?.filter(c => c.isActive !== false && c.users?.isActive !== false);
        return activeChildren?.length > 0
          ? (
            <Tooltip title={activeChildren.map(c => c.name).join(", ")}>
              <Badge count={activeChildren.length} style={{ backgroundColor: 'var(--primary)', fontSize: 10 }}>
                <Avatar icon={<TeamOutlined />} size="small" style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--primary)' }} />
              </Badge>
            </Tooltip>
          )
          : "-";
      },
      width: 100
    },
    {
      title: "Actions",
      key: "actions",
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="View Profile">
            <Button 
              type="text"
              icon={<EyeOutlined style={{ color: 'var(--primary)' }} />} 
              size="middle" 
              onClick={() => openDetail(record)} 
              style={{ borderRadius: '8px' }}
            />
          </Tooltip>
          {canUpdateStaff && (
            <Tooltip title="Map Child">
              <Button
                type="text"
                icon={<LinkOutlined style={{ color: '#10b981' }} />}
                size="middle"
                onClick={() => openLinkChild(record.id)}
                style={{ borderRadius: '8px' }}
              />
            </Tooltip>
          )}
          {canUpdateStaff && (
            <Tooltip title="Modify Record">
              <Button 
                type="text"
                icon={<EditOutlined style={{ color: '#44617d' }} />} 
                size="middle" 
                onClick={() => openEdit(record)} 
                style={{ borderRadius: '8px' }}
              />
            </Tooltip>
          )}
          {canDeleteStaff && (
            <Popconfirm title="Deactivate record?" onConfirm={() => handleDelete(record.id)}>
              <Button 
                type="text" 
                icon={<DeleteOutlined style={{ color: '#ef4444' }} />} 
                size="middle" 
                style={{ borderRadius: '8px' }}
              />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* Header Profile Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="page-breadcrumb">
            <span>Enterprise</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>●</span>
            <span>Human Assets</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>●</span>
            <span style={{ color: "var(--primary)", fontWeight: 800 }}>Personnel Directory</span>
          </div>
          <h2 style={{ fontSize: 36, letterSpacing: "-0.04em", margin: "8px 0 4px" }}>
            Staff Management
          </h2>
          <p style={{ color: "var(--on-surface-variant)", maxWidth: 500 }}>
            Curate and manage your institution's workforce records, academic qualifications, and family linkages.
          </p>
        </div>
        {canCreateStaff && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={openCreate}
            className="gradient-btn"
            style={{ height: 48, padding: '0 28px', fontSize: 15 }}
          >
            Staff Creation
          </Button>
        )}
      </div>

      {/* Summary Stats Bento Grid */}
      <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Total Staff" value={staff.length} icon={<TeamOutlined />} color="var(--primary)" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Academic" value={staff.filter(s => s.category?.startsWith("TEACHING")).length} icon={<EditOutlined />} color="#10b981" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Operations" value={staff.filter(s => s.category?.startsWith("NON_TEACHING")).length} icon={<WalletOutlined />} color="#8b5cf6" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Active Status" value={staff.filter(s => s.isActive).length} icon={<CheckCircleOutlined />} color="#3b82f6" />
        </Col>
      </Row>

      {/* Management Control Bar */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 20, 
          background: 'var(--surface-container-low)', 
          border: 'none',
          padding: 8
        }}
        bodyStyle={{ padding: 12 }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="filter-item">
              <span className="filter-label">SEARCH Staff</span>
              <Input
                placeholder="ID or Personnel Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 280 }}
                prefix={<SearchOutlined style={{ opacity: 0.4 }} />}
                allowClear
              />
            </div>

            <div className="filter-item">
              <span className="filter-label">CATEGORY</span>
              <Select
                value={activeCategoryFilter}
                onChange={setActiveCategoryFilter}
                style={{ width: 180 }}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="all">Global Workforce</Option>
                <Option value="TEACHING">Academic Faculty</Option>
                <Option value="NON_TEACHING">Operations Staff</Option>
              </Select>
            </div>
          </div>

          <Space>
            <Button icon={<DownloadOutlined />} className="ghost-btn">Export Data</Button>
          </Space>
        </div>
      </Card>

      {/* Main Content Table */}
      <div style={{ 
        background: "#fff", 
        borderRadius: 24, 
        padding: "24px",
        boxShadow: 'var(--shadow-ambient-sm)',
        border: '1px solid var(--surface-container-high)',
        minHeight: 500
      }}>
        <Table
          columns={columns}
          dataSource={filteredStaff}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{ 
            pageSize: 20,
            showSizeChanger: true,
            className: "custom-pagination"
          }}
          className="premium-table"
        />
      </div>

      <style>{`
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--on-surface-variant);
          letter-spacing: 0.1em;
          opacity: 0.6;
          margin-left: 12px;
        }
        
        .premium-table .ant-table {
          background: transparent !important;
        }
        .premium-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-bottom: 2px solid #f1f5f9 !important;
          padding: 16px 20px !important;
        }
        .premium-table .ant-table-tbody > tr > td {
          padding: 16px 20px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          transition: all 0.2s ease;
        }
        .premium-table .ant-table-tbody > tr:hover > td {
          background: #f8fbff !important;
        }
        
        .custom-pagination {
          margin-top: 24px !important;
        }
      `}</style>

      {/* Create / Edit Modal */}
      <Modal 
        width={1024}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(0,21,42,0.2)'
            }}>
              {editingStaff ? <EditOutlined /> : <PlusOutlined />}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                {editingStaff ? "Calibration Protocol" : "Staff Creation"}
              </div>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600, opacity: 0.6 }}>
                {editingStaff ? `Updating Master Record for ${editingStaff.name}` : "Establishing new workforce credentials"}
              </div>
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)} className="ghost-btn" style={{ height: 44, padding: '0 24px' }}>
            Discard Changes
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} className="gradient-btn" style={{ height: 44, padding: '0 32px' }}>
            {editingStaff ? "Commit Updates" : "Initialize Account"}
          </Button>
        ]}
        centered
        className="premium-modal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={24}>
            <Col span={14}>
              <div style={{ background: '#f8fafc', padding: 24, borderRadius: 24, border: '1px solid #edf2f7', marginBottom: 24 }}>
                <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined /> BASIC DETAILS
                </h4>
                <Row gutter={16}>
                  <Col span={14}>
                    <Form.Item name="name" label={<span style={{ fontWeight: 700, fontSize: 12 }}>FULL NAME</span>} rules={[{ required: true }]}> 
                      <Input size="large" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} id="staff-name" name="name" autoComplete="name" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="employeeId" label={<span style={{ fontWeight: 700, fontSize: 12 }}>EMPLOYEE ID</span>} rules={[{ required: true }]}>
                      <Input size="large" disabled={!editingStaff} prefix={<IdcardOutlined style={{ color: '#94a3b8' }} />} id="staff-employeeId" name="employeeId" autoComplete="off" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="email" label={<span style={{ fontWeight: 700, fontSize: 12 }}>WORK EMAIL</span>} rules={[{ type: "email" }]}> 
                      <Input size="large" prefix={<MailOutlined style={{ color: '#94a3b8' }} />} id="staff-email" name="email" autoComplete="email" placeholder="Optional" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label={<span style={{ fontWeight: 700, fontSize: 12 }}>CONTACT NUMBER</span>}
                      rules={[
                        { pattern: /^\d{10}$/, message: "Phone must be exactly 10 digits" }
                      ]}
                      getValueFromEvent={(e) => e.target.value.replace(/\D/g, '').slice(0, 10)}
                    >
                      <Input
                        size="large"
                        prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                        id="staff-phone"
                        name="phone"
                        autoComplete="tel"
                        maxLength={10}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                {!editingStaff ? (
                  <Form.Item name="password" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PASSWORD</span>} rules={[{ required: true, min: 6 }]}> 
                    <Input.Password size="large" id="staff-password" name="password" autoComplete="new-password" />
                  </Form.Item>
                ) : (
                  <Form.Item name="password" label={<span style={{ fontWeight: 700, fontSize: 12 }}>UPDATE PASSWORD (OPTIONAL)</span>} rules={[{ min: 6 }]}> 
                    <Input.Password size="large" id="staff-password-update" name="password" autoComplete="new-password" />
                  </Form.Item>
                )}
              </div>

               <div style={{ background: '#fff', padding: 24, borderRadius: 24, border: '1px solid #edf2f7' }}>
                <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HomeOutlined /> ADDRESS DETAILS
                </h4>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item name="doorNo" label={<span style={{ fontWeight: 700, fontSize: 12 }}>DOOR NO</span>}>
                      <Input size="large" id="staff-doorNo" name="doorNo" autoComplete="address-line1" />
                    </Form.Item>
                  </Col>
                  <Col span={18}>
                    <Form.Item name="area" label={<span style={{ fontWeight: 700, fontSize: 12 }}>STREET</span>}>
                      <Input size="large" id="staff-area" name="area" autoComplete="address-line2" />
                    </Form.Item>
                  </Col>
                   </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="taluk" label={<span style={{ fontWeight: 700, fontSize: 12 }}>TALUK</span>}>
                      <Input size="large" id="staff-taluk" name="taluk" autoComplete="address-level3" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="district" label={<span style={{ fontWeight: 700, fontSize: 12 }}>DISTRICT</span>}>
                      <Input size="large" id="staff-district" name="district" autoComplete="address-level2" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="state" label={<span style={{ fontWeight: 700, fontSize: 12 }}>STATE</span>}>
                      <Input size="large" id="staff-state" name="state" autoComplete="address-level1" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="pincode" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PIN CODE</span>}>
                      <Input size="large" maxLength={6} id="staff-pincode" name="pincode" autoComplete="postal-code" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Col>

            <Col span={10}>
              <div style={{ background: '#ffffff', padding: 24, borderRadius: 24, border: '1px solid #edf2f7', height: '100%' }}>
                <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WalletOutlined /> JOB DETAILS
                </h4>
                <Form.Item name="designation" label={<span style={{ fontWeight: 700, fontSize: 12 }}>JOB TITLE</span>} rules={[{ required: true }]}> 
                  <Select size="large" id="staff-designation" name="designation" autoComplete="off" placeholder="Select Job Title">
                    <Option value="Correspondent">Correspondent</Option>
                    <Option value="Secretary">Secretary</Option>
                    <Option value="Principal">Principal</Option>
                    <Option value="Vice Principal">Vice Principal</Option>
                    <Option value="Manager">Manager</Option>
                    <Option value="Accountant">Accountant</Option>
                    <Option value="Clerk">Clerk</Option>
                    <Option value="Receptionist">Receptionist</Option>
                    <Option value="Office Assistant">Office Assistant</Option>
                    <Option value="Teacher">Teacher</Option>
                    <Option value="HOD">HOD</Option>
                    <Option value="Lab Assistant">Lab Assistant</Option>
                    <Option value="Librarian">Librarian</Option>
                    <Option value="Driver">Driver</Option>
                    <Option value="Conductor">Conductor</Option>
                    <Option value="Acting Driver">Acting Driver</Option>
                    <Option value="Peon">Peon</Option>
                    <Option value="Security">Security</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="department" label={<span style={{ fontWeight: 700, fontSize: 12 }}>DEPARTMENT / SPECIALIZATION</span>}>
                  <Select size="large" allowClear id="staff-department" name="department" autoComplete="off">
                    <Option value="Mathematics">Mathematics</Option>
                    <Option value="Science">Science</Option>
                    <Option value="English">English</Option>
                    <Option value="Tamil">Tamil</Option>
                    <Option value="Social Science">Social Science</Option>
                    <Option value="Computer Science">Computer Science</Option>
                    <Option value="Commerce">Commerce</Option>
                    <Option value="Physical Education">Physical Education</Option>
                    <Option value="Administration">Administration</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="category" label={<span style={{ fontWeight: 700, fontSize: 12 }}>CATEGORY / DEPARTMENT</span>} rules={[{ required: true }]}> 
                  <Select size="large" id="staff-category" name="category" autoComplete="off">
                    <Option value="TEACHING_REGULAR">Academic Faculty (Regular)</Option>
                    <Option value="TEACHING_TRAINEE">Academic Faculty (Trainee)</Option>
                    <Option value="NON_TEACHING_REGULAR">Operations (Regular)</Option>
                    <Option value="NON_TEACHING_TRAINEE">Operations (Trainee)</Option>
                    <Option value="NON_TEACHING_ACTING_DRIVER">Operations (Acting Driver - Day Based)</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="salary" label={<span style={{ fontWeight: 700, fontSize: 12 }}>MONTHLY SALARY</span>}>
                  <InputNumber min={0} prefix="₹" size="large" style={{ width: '100%' }} id="staff-salary" name="salary" autoComplete="off" />
                </Form.Item>
                <Form.Item name="joiningDate" label={<span style={{ fontWeight: 700, fontSize: 12 }}>JOINING DATE</span>}>
                  <DatePicker size="large" style={{ width: '100%' }} id="staff-joiningDate" name="joiningDate" autoComplete="off" />
                </Form.Item>
                
                <Divider style={{ margin: '24px 0' }} />

                <h4 style={{ fontWeight: 800, fontSize: 13, color: 'var(--primary)', marginBottom: 16 }}>BANK DETAILS</h4>
                <Form.Item name="paymentMode" label={<span style={{ fontWeight: 700, fontSize: 11 }}>PAYMENT METHOD</span>}>
                  <Select size="middle" id="staff-paymentMode" name="paymentMode" autoComplete="off">
                    <Option value="BANK_TRANSFER">Bank Direct</Option>
                    <Option value="CASH">Liquid Cash</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="bankName" label={<span style={{ fontWeight: 700, fontSize: 11 }}>BANK NAME</span>}>
                  <Input size="middle" prefix={<BankOutlined />} id="staff-bankName" name="bankName" autoComplete="organization" />
                </Form.Item>
                <Form.Item name="bankBranch" label={<span style={{ fontWeight: 700, fontSize: 11 }}>BRANCH NAME</span>}>
                  <Input size="middle" id="staff-bankBranch" name="bankBranch" autoComplete="off" />
                </Form.Item>
                <Form.Item name="bankIfsc" label={<span style={{ fontWeight: 700, fontSize: 11 }}>IFSC CODE</span>}>
                  <Input size="middle" id="staff-bankIfsc" name="bankIfsc" autoComplete="off" />
                </Form.Item>
                <Form.Item name="bankAccountNo" label={<span style={{ fontWeight: 700, fontSize: 11 }}>ACCOUNT NUMBER</span>}>
                  <Input size="middle" id="staff-bankAccountNo" name="bankAccountNo" autoComplete="account-number" />
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={detailModal}
        onCancel={() => {
          setDetailModal(false);
          setDocModalOpen(false);
        }}
        footer={null}
        width={1100}
        centered
        className="premium-modal"
        styles={{ body: { padding: 0 } }}
      >
        {selectedStaff && (
          <div style={{ background: '#fff' }}>
            {/* Header Profile Section */}
            <div style={{
              background: 'linear-gradient(135deg, #00152a 0%, #102a43 100%)',
              padding: '60px 48px',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '0 0 40px 40px'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(68, 221, 193, 0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(150px, -150px)'
              }}></div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 40 }}>
                <Avatar
                  size={120}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '6px solid rgba(255,255,255,0.1)',
                    fontSize: 52,
                    fontWeight: 800,
                    fontFamily: 'Manrope',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  {getInitials(selectedStaff.name)}
                </Avatar>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <h2 style={{ color: '#fff', fontSize: 42, fontWeight: 900, margin: 0, letterSpacing: '-0.04em' }}>
                      {selectedStaff.name}
                    </h2>
                    <Tag 
                      style={{ 
                        margin: 0, 
                        background: selectedStaff.isActive ? '#10b981' : '#ef4444', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 8, 
                        fontWeight: 800,
                        fontSize: 12,
                        padding: '4px 12px'
                      }}
                    >
                      {selectedStaff.isActive ? "ACTIVE PERSONNEL" : "INACTIVE"}
                    </Tag>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 24 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IdcardOutlined style={{ color: '#44ddc1' }} /> {selectedStaff.employeeId}
                    </span>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserOutlined style={{ color: '#44ddc1' }} /> {selectedStaff.designation}
                    </span>
                     <span style={{ opacity: 0.3 }}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WalletOutlined style={{ color: '#44ddc1' }} /> {selectedStaff.department || "No Department"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '48px' }}>
              <Row gutter={48}>
                <Col span={15}>
                  <div style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                      <div style={{ width: 10, height: 32, background: 'var(--primary)', borderRadius: 5 }}></div>
                      <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--primary)' }}>Personnel Documents</span>
                    </div>

                    <div className="grid grid-cols-1 gap-px overflow-hidden border shadow-sm md:grid-cols-2 bg-slate-100 rounded-3xl border-slate-100">
                      {[
                        { label: "Work Email", value: selectedStaff.email, icon: "mail" },
                        { label: "Contact Number", value: selectedStaff.phone || "N/A", icon: "call" },
                        { label: "Department", value: selectedStaff.department || "General", icon: "workspace_premium" },
                        { label: "Password", value: selectedStaff.qualification || "N/A", icon: "history_edu" },
                        { label: "Joining Date", value: selectedStaff.joiningDate ? dayjs(selectedStaff.joiningDate).format('DD MMM YYYY') : "N/A", icon: "calendar_today" },
                        { label: "Monthly Salary", value: selectedStaff.salary ? `₹${selectedStaff.salary.toLocaleString()}` : "N/A", icon: "payments", isPositive: true },
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 p-6 transition-all bg-white hover:bg-slate-50">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">{item.icon}</span>
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
                           </div>
                           <div className={`text-[13px] font-black tracking-tight ${item.isPositive ? 'text-teal-600' : 'text-slate-900'}`}>
                              {item.value}
                           </div>
                        </div>
                      ))}
                      <div className="p-6 transition-all bg-white border-t md:col-span-2 border-slate-50 hover:bg-slate-50">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Address</span>
                         </div>
                         <div className="text-[13px] font-black text-slate-900 tracking-tight">
                           {[
                            selectedStaff.doorno,
                            selectedStaff.area,
                            selectedStaff.city,
                            selectedStaff.taluk,
                            selectedStaff.district || selectedStaff.districk,
                            selectedStaff.state,
                            selectedStaff.pincode,
                           ].filter(Boolean).join(", ") || "No Address on Record"}
                         </div>
                      </div>
                    </div>
                  </div>

                  {selectedStaff.children?.length > 0 && (
                    <div style={{ marginBottom: 40 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ width: 10, height: 32, background: '#10b981', borderRadius: 5 }}></div>
                        <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--primary)' }}>Family Lineage</span>
                        <Tag style={{ marginLeft: 8, borderRadius: 20, fontWeight: 800 }}>{selectedStaff.children.length} SIBLINGS</Tag>
                        {canUpdateStaff && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<LinkOutlined />}
                            onClick={() => openLinkChild(selectedStaff.id)}
                            style={{ marginLeft: 8, borderRadius: 8 }}
                          >
                            Map Child
                          </Button>
                        )}
                      </div>
                      <Table
                        dataSource={selectedStaff.children?.filter(c => c.isActive !== false && c.users?.isActive !== false)}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        className="premium-table-sm"
                        style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #edf2f7' }}
                        columns={[
                          {
                            title: "Student Portfolio",
                            key: "name",
                            render: (_, child) => (
                              <Space>
                                <Avatar size="small" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>{getInitials(child.name)}</Avatar>
                                <span style={{ fontWeight: 700 }}>{child.name}</span>
                              </Space>
                            )
                          },
                          {
                            title: "Cohort",
                            dataIndex: "standard",
                            render: (v) => <Tag style={{ borderRadius: 6, fontWeight: 700, background: '#f0f9ff', color: '#0369a1', border: 'none' }}>{v}</Tag>
                          },
                          {
                            title: "Action",
                            key: "action",
                            align: 'right',
                            render: (_, child) => (
                              canUpdateStaff ? (
                                <Popconfirm title="Unlink family member?" onConfirm={() => { handleUnlinkChild(child.id); setDetailModal(false); }}>
                                  <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ fontWeight: 700 }}>Unlink</Button>
                                </Popconfirm>
                              ) : null
                            ),
                          },
                        ]}
                      />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 10, height: 32, background: '#8b5cf6', borderRadius: 5 }}></div>
                        <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--primary)' }}>Verification Vault</span>
                        <Badge count={documents.length} style={{ backgroundColor: '#8b5cf6' }} overflowCount={99} />
                      </div>
                      {canUpdateStaff && (
                        <Button type="primary" size="middle" icon={<UploadOutlined />} onClick={openDocumentUpload} className="gradient-btn" style={{ borderRadius: 12 }}>
                          Deposit Document
                        </Button>
                      )}
                    </div>

                    <Table
                      dataSource={documents}
                      rowKey="id"
                      loading={documentsLoading}
                      pagination={false}
                      size="middle"
                      scroll={{ x: 500 }}
                      className="premium-table-sm"
                      style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #edf2f7' }}
                      columns={[
                        {
                          title: "Artifact Name",
                          dataIndex: "title",
                          render: (_, row) => (
                            <Space>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <FileTextOutlined />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{row.title}</div>
                                <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 600 }}>{row.originalName}</div>
                              </div>
                            </Space>
                          ),
                        },
                        {
                          title: "Verification Status",
                          key: "status",
                          render: (_, row) => (
                            <Tag 
                              style={{ 
                                borderRadius: 6, 
                                fontWeight: 800, 
                                border: 'none',
                                background: row.isVerified ? '#f0fdf4' : '#fff7ed',
                                color: row.isVerified ? '#166534' : '#9a3412',
                                fontSize: 10
                              }}
                            >
                              {row.isVerified ? "VAULT VERIFIED" : "PENDING AUDIT"}
                            </Tag>
                          ),
                        },
                        {
                          title: "Actions",
                          key: "actions",
                          align: 'right',
                          render: (_, row) => (
                            <Space>
                              <Tooltip title="View Artifact">
                                <Button
                                  size="middle"
                                  type="text"
                                  icon={<DownloadOutlined style={{ color: 'var(--primary)' }} />}
                                  onClick={() => window.open(resolveDocumentUrl(row.filePath), "_blank")}
                                />
                              </Tooltip>
                              {canUpdateStaff && (
                                <Popconfirm
                                  title="Obliterate artifact?"
                                  onConfirm={() => handleDeleteDocument(row.id)}
                                >
                                  <Button size="middle" type="text" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              )}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </div>
                </Col>

                <Col span={9}>
                  <Card style={{ 
                    background: 'var(--surface-container-low)', 
                    padding: 8, 
                    borderRadius: 32, 
                    border: '1px solid var(--surface-container-high)',
                    boxShadow: 'none'
                  }} bodyStyle={{ padding: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <BankOutlined style={{ color: '#0ea5e9' }} /> Payment Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <div style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>Account Number</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{selectedStaff.bankAccountNo || "NOT ASSIGNED"}</div>
                      </div>
                      
                      <div style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>Bank Name</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{selectedStaff.bankName || "UNASSIGNED"}</div>
                      </div>

                      <div style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>IFSC Code</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', letterSpacing: 1 }}>{selectedStaff.bankIfsc || "NOT ASSIGNED"}</div>
                      </div>

                      <div style={{ background: 'var(--primary)', padding: 24, borderRadius: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>Payment Method</div>
                          <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedStaff.paymentMode === "CASH" ? "CASH PAYMENT" : selectedStaff.paymentMode?.replace(/_/g, ' ') || "CASH PAYMENT"}</div>
                        </div>
                        <WalletOutlined style={{ position: 'absolute', bottom: -10, right: -10, fontSize: 80, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                      </div>
                    </div>
                  </Card>

                  <div style={{ marginTop: 32, padding: '0 12px' }}>
                    <Card style={{ borderRadius: 24, border: '1px dashed #ced4da', background: 'transparent' }} bodyStyle={{ padding: 20 }}>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SafetyCertificateOutlined /> RECENT AUDIT
                      </h4>
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                        Record last synchronized on {dayjs().format('DD MMMM, YYYY')}. All verification checks passed.
                      </p>
                    </Card>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>

      {/* Document Upload Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontSize: 20,
              border: '1px solid #edf2f7'
            }}>
              <UploadOutlined />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>
                Vault Deposit
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Certify institutional artifacts for {selectedStaff?.name}
              </div>
            </div>
          </div>
        }
        open={docModalOpen}
        onCancel={() => setDocModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDocModalOpen(false)} className="ghost-btn" style={{ padding: '0 24px', height: 44 }}>
            Abort
          </Button>,
          <Button key="submit" type="primary" onClick={submitDocumentUpload} loading={docUploadLoading} className="gradient-btn" style={{ padding: '0 32px', height: 44 }}>
            Authorize Upload
          </Button>
        ]}
        width={600}
        centered
        className="premium-modal"
      >
        <Form form={docForm} layout="vertical" initialValues={{ type: "OTHER", isVerified: false }} style={{ marginTop: 24 }}>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item
                name="type"
                label={<span style={{ fontWeight: 700, fontSize: 12 }}>ARTIFACT CLASSIFICATION</span>}
                rules={[{ required: true }]}
              >
                <Select size="large">
                  {STAFF_DOCUMENT_TYPES.map((type) => (
                    <Option key={type} value={type}>
                      {formatDocumentType(type)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label={<span style={{ fontWeight: 700, fontSize: 12 }}>CUSTOM NOMENCLATURE</span>}>
                <Input size="large" placeholder="E.g. Q1 Faculty Award" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="documentNumber" label={<span style={{ fontWeight: 700, fontSize: 12 }}>REFERENCE SERIAL / ID</span>}>
            <Input size="large" />
          </Form.Item>

          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="issuedDate" label={<span style={{ fontWeight: 700, fontSize: 12 }}>ISSUANCE EPOCH</span>}>
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label={<span style={{ fontWeight: 700, fontSize: 12 }}>OBSOLESCENCE DATE</span>}>
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<span style={{ fontWeight: 700, fontSize: 12 }}>CONTEXTUAL ANNOTATIONS</span>}>
            <Input.TextArea size="large" rows={4} placeholder="Describe the significance or any observations about this artifact..." />
          </Form.Item>

          <div style={{ background: '#f8fafc', padding: '20px 24px', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, border: '1px solid #edf2f7' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>VERIFICATION CLEARANCE</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Mark as audited and authentic by administrative personnel</div>
            </div>
            <Form.Item name="isVerified" valuePropName="checked" noStyle>
              <Switch size="large" />
            </Form.Item>
          </div>

          <Form.Item label={<span style={{ fontWeight: 800, fontSize: 12 }}>DIGITAL ARTIFACT (PDF/JPG)</span>} required>
            <Upload
              beforeUpload={(file) => {
                const allowed = /\/(jpg|jpeg|png|pdf)$/i.test(file.type || "");
                if (!allowed) {
                  message.error("Invalid format: Institutional vault only accepts PDF, JPG, or PNG.");
                  return Upload.LIST_IGNORE;
                }
                const underLimit = file.size / 1024 / 1024 < 10;
                if (!underLimit) {
                  message.error("Capacity overflow: Artifact must be under 10MB.");
                  return Upload.LIST_IGNORE;
                }
                setSelectedDocumentFile(file);
                return false;
              }}
              maxCount={1}
              onRemove={() => setSelectedDocumentFile(null)}
            >
              <Button icon={<UploadOutlined />} block style={{ height: 80, borderStyle: 'dashed', borderRadius: 20, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {selectedDocumentFile ? (
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{selectedDocumentFile.name} (SELECTED)</span>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>DEPOSIT FILE ARTIFACT</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>DRAG & DROP OR SELECT (MAX 10MB)</span>
                  </>
                )}
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Link Child Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              fontSize: 20,
              border: '1px solid #dcfce7'
            }}>
              <LinkOutlined />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>
                Kinship Linkage
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Establish institutional family relationship bounds
              </div>
            </div>
          </div>
        }
        open={linkModal}
        onCancel={() => setLinkModal(false)}
        footer={null}
        width={560}
        centered
        className="premium-modal"
      >
        <div style={{ marginTop: 28 }}>
          <div style={{ background: '#f8fafc', padding: 20, borderRadius: 20, border: '1px solid #edf2f7', marginBottom: 24 }}>
             <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
               Manage kinship links for staff members to enable tuition benefits and consolidated family auditing.
             </p>
          </div>

          {/* Currently Linked Children Section */}
          <div style={{ marginBottom: 32 }}>
            <span className="filter-label" style={{ display: 'block', marginBottom: 12, marginLeft: 0 }}>CURRENTLY LINKED PROGENY</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staff.find(s => s.id === linkStaffId)?.children?.filter(c => c.isActive !== false && c.users?.isActive !== false).map(child => (
                <div key={child.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'var(--surface-container-low)', 
                  padding: '12px 16px', 
                  borderRadius: 16,
                  border: '1px solid var(--surface-container-high)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size="small" style={{ backgroundColor: '#f0fdf4', color: '#10b981', fontWeight: 800 }}>{getInitials(child.name)}</Avatar>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>{child.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 700, opacity: 0.6 }}>{formatStandardLabel(child.standard)}</div>
                    </div>
                  </div>
                  <Popconfirm title="Dissolve this kinship link?" onConfirm={() => handleUnlinkChild(child.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" style={{ fontWeight: 800, fontSize: 11 }}>UNLINK</Button>
                  </Popconfirm>
                </div>
              ))}
              {(!staff.find(s => s.id === linkStaffId)?.children || staff.find(s => s.id === linkStaffId)?.children?.filter(c => c.isActive !== false && c.users?.isActive !== false).length === 0) && (
                <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: 16, border: '1px dashed #ced4da', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                  No active kinship links established.
                </div>
              )}
            </div>
          </div>

          <Divider style={{ margin: '32px 0', opacity: 0.5 }} />

          <span className="filter-label" style={{ display: 'block', marginBottom: 12, marginLeft: 0 }}>MAP NEW PROGENY</span>
          <Select
            showSearch
            placeholder="Search by student name or cohort ID..."
            style={{ width: "100%", height: 52 }}
            size="large"
            className="premium-select"
            onChange={(studentId) => handleLinkChild(studentId)}
            filterOption={(input, option) =>
              String(option?.children?.[0] || "").toLowerCase().includes(input.toLowerCase())
            }
          >
            {students
              .filter(s => !staff.find(st => st.id === linkStaffId)?.children?.some(c => c.id === s.id))
              .map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name} <span style={{ opacity: 0.4, marginLeft: 8 }}>{formatStandardLabel(s.standard)}</span>
                </Option>
              ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
};

export default StaffManagementPage;
