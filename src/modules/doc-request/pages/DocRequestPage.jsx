import React, { useEffect, useState, useMemo } from "react";
import {
  Table, Tag, Input, Select, Button, Space, message, Modal, Form,
  DatePicker, Switch, Descriptions, Popconfirm, Card, Statistic, Badge,
} from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined, PrinterOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, DeleteOutlined,
  FileTextOutlined, FileDoneOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  getDocRequests, createDocRequest, reviewDocRequest, issueDocRequest,
  getDocIssueData, deleteDocRequest, getDocRequestStats,
  DOC_REQUEST_TYPES, DOC_STATUS_OPTIONS,
} from "../doc-request.service";
import instance from "../../../utils/axios";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

// ── helpers ──────────────────────────────────────────────────────────────
const formatStd = (val) => {
  if (!val) return "";
  const s = String(val).replace(/^STD_/, "");
  if (s === "LKG" || s === "UKG") return s;
  const n = Number(s);
  if (!isNaN(n)) {
    if (n === 1) return "1st Std";
    if (n === 2) return "2nd Std";
    if (n === 3) return "3rd Std";
    return `${n}th Std`;
  }
  return val;
};

const statusColor = (s) =>
  DOC_STATUS_OPTIONS.find((o) => o.value === s)?.color || "default";

const typeLabel = (t) =>
  DOC_REQUEST_TYPES.find((o) => o.value === t)?.label || t;

// ── PDF generators ───────────────────────────────────────────────────────
const generateBonafidePDF = (data) => {
  const { request: req, school } = data;
  const st = req.student;
  const adm = st.admission;
  const fam = st.family;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(10);
  doc.text(`Ref : ${school.schoolCode || "PSF"}/…../${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 14, y);
  y += 6;
  doc.text(`(Reg No: ${school.regNo || "017-M-0068-0518"})`, 14, y);
  y += 20;

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("BONAFIDE CERTIFICATE", w / 2, y, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 25;

  // Body
  doc.setFontSize(12);
  const fatherName = fam?.fatherName || "________________";
  const motherName = fam?.motherName || "________________";
  const parentRef = fatherName !== "________________" ? `S/O or D/O of ${fatherName}` : `S/O or D/O of ________________`;
  const dobStr = st.dob ? dayjs(st.dob).format("DD-MM-YYYY") : "________________";
  const admNo = adm?.admissionNo || "________________";
  const fromStd = formatStd(adm?.standard) || "________";
  const toStd = formatStd(st.standard) || "________";
  const acYear = st.academicYear || adm?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const bodyText = `This is to certify that ${st.name} , ${parentRef} ,  DOB ${dobStr} , Admin no ${admNo} was a bonafide student of this school from ${fromStd} to ${toStd} std during the academic years ${acYear}.`;

  const lines = doc.splitTextToSize(bodyText, w - 28);
  doc.text(lines, 14, y, { lineHeightFactor: 1.8 });
  y += lines.length * 10 + 60;

  // Signature
  doc.text("………………………………….", w - 60, y);
  y += 7;
  doc.setFont(undefined, "italic");
  doc.text("Signature of the Principal", w - 64, y);
  y += 7;
  doc.text(`(Date: ${dayjs().format("DD-MM-YYYY")})`, w - 52, y);

  doc.save(`Bonafide_${st.name}_${req.ticketNo}.pdf`);
};

const generateTCPDF = (data) => {
  const { request: req, school } = data;
  const st = req.student;
  const adm = st.admission;
  const fam = st.family;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(school.schoolName || "PSF School", w / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`(Reg No: ${school.regNo || "017-M-0068-0518"})`, w / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("TRANSFER CERTIFICATE", w / 2, y, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 5;
  doc.setLineWidth(0.5);
  doc.line(60, y, w - 60, y);
  y += 12;

  // TC Number & Date
  doc.setFontSize(11);
  doc.text(`TC No: ${req.tcNo || "________"}`, 14, y);
  doc.text(`Date: ${req.tcDate ? dayjs(req.tcDate).format("DD-MM-YYYY") : dayjs().format("DD-MM-YYYY")}`, w - 70, y);
  y += 10;

  // Details table
  const rows = [
    ["1. Name of the Student", st.name || ""],
    ["2. Father's Name", fam?.fatherName || ""],
    ["3. Mother's Name", fam?.motherName || ""],
    ["4. Date of Birth", st.dob ? dayjs(st.dob).format("DD-MM-YYYY") : ""],
    ["5. Gender", st.gender || ""],
    ["6. Community / Caste", `${st.community || ""} / ${st.caste || ""}`],
    ["7. Religion", st.religion || ""],
    ["8. Admission No", adm?.admissionNo || ""],
    ["9. Date of Admission", adm?.admissionDate ? dayjs(adm.admissionDate).format("DD-MM-YYYY") : ""],
    ["10. Class at time of Admission", formatStd(adm?.standard)],
    ["11. Class at time of Leaving", formatStd(st.standard)],
    ["12. Academic Year", st.academicYear || ""],
    ["13. Date of Leaving", req.dateOfLeaving ? dayjs(req.dateOfLeaving).format("DD-MM-YYYY") : ""],
    ["14. Last Date of Attendance", req.lastAttendedDate ? dayjs(req.lastAttendedDate).format("DD-MM-YYYY") : ""],
    ["15. Reason for Leaving", req.leavingReason || ""],
    ["16. Qualified for Promotion", req.qualifiedForPromotion ? "Yes" : "No"],
    ["17. Conduct & Character", req.conductRemark || "Good"],
    ["18. Aadhar No", st.aadharNo || ""],
  ];

  doc.autoTable({
    startY: y,
    body: rows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { cellWidth: 100 },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 20;

  // Signatures
  doc.setFontSize(11);
  doc.text("Class Teacher", 20, y);
  doc.text("Principal", w - 50, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("(Signature & Seal)", 16, y);
  doc.text("(Signature & Seal)", w - 54, y);

  doc.save(`TC_${st.name}_${req.ticketNo}.pdf`);
};

const generateGenericCertPDF = (data, certTitle) => {
  const { request: req, school } = data;
  const st = req.student;
  const adm = st.admission;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(school.schoolName || "PSF School", w / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`(Reg No: ${school.regNo || "017-M-0068-0518"})`, w / 2, y, { align: "center" });
  y += 15;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(certTitle, w / 2, y, { align: "center" });
  doc.setFont(undefined, "normal");
  y += 20;

  doc.setFontSize(12);
  const text = `This is to certify that ${st.name}, Admission No. ${adm?.admissionNo || "____"}, was/is a student of ${formatStd(st.standard)} in this institution during the academic year ${st.academicYear || "________"}.`;
  const lines = doc.splitTextToSize(text, w - 28);
  doc.text(lines, 14, y, { lineHeightFactor: 1.8 });
  y += lines.length * 10 + 50;

  doc.text("………………………………….", w - 60, y);
  y += 7;
  doc.setFont(undefined, "italic");
  doc.text("Signature of the Principal", w - 64, y);
  y += 7;
  doc.text(`(Date: ${dayjs().format("DD-MM-YYYY")})`, w - 52, y);

  doc.save(`${certTitle.replace(/\s/g, "_")}_${st.name}_${req.ticketNo}.pdf`);
};

// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════
const DocRequestPage = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [filterType, setFilterType] = useState(undefined);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [students, setStudents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [studentSearching, setStudentSearching] = useState(false);

  // Detail/review modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Issue modal
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm] = Form.useForm();
  const [issuing, setIssuing] = useState(false);

  // Permissions
  const canCreate = hasPermission(PERMISSIONS.DOC_REQUEST_CREATE);
  const canReview = hasPermission(PERMISSIONS.DOC_REQUEST_REVIEW);
  const canIssue = hasPermission(PERMISSIONS.DOC_REQUEST_ISSUE);
  const canDelete = hasPermission(PERMISSIONS.DOC_REQUEST_DELETE);

  // ── fetch ──────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([getDocRequests(), getDocRequestStats()]);
      setData(list || []);
      setStats(s || {});
    } catch {
      message.error("Failed to load document requests");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── student search ─────────────────────────────────────────────────────
  const searchStudents = async (q) => {
    if (!q || q.length < 2) return;
    setStudentSearching(true);
    try {
      const res = await instance.get("/admissions");
      const all = res.data || [];
      const matches = all.filter((s) =>
        (s.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (s.admission?.admissionNo || "").toLowerCase().includes(q.toLowerCase())
      );
      setStudents(matches.slice(0, 50));
    } catch { /* silent */ }
    setStudentSearching(false);
  };

  // ── create ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await createDocRequest(values);
      message.success("Document request created");
      setCreateOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err) {
      if (!err?.errorFields) message.error(err?.response?.data?.message || "Failed to create request");
    }
    setCreating(false);
  };

  // ── review ─────────────────────────────────────────────────────────────
  const handleReview = async (id, status, extra = {}) => {
    try {
      await reviewDocRequest(id, { status, ...extra });
      message.success(`Ticket ${status.toLowerCase()}`);
      fetchData();
      setDetailOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Review failed");
    }
  };

  // ── issue ──────────────────────────────────────────────────────────────
  const openIssueModal = (record) => {
    setSelected(record);
    issueForm.setFieldsValue({
      conductRemark: record.conductRemark || "Good",
      qualifiedForPromotion: record.qualifiedForPromotion ?? true,
    });
    setIssueOpen(true);
  };

  const handleIssue = async () => {
    try {
      const values = await issueForm.validateFields();
      setIssuing(true);
      const issued = await issueDocRequest(selected.id, {
        ...values,
        tcDate: values.tcDate ? values.tcDate.toISOString() : undefined,
        dateOfLeaving: values.dateOfLeaving ? values.dateOfLeaving.toISOString() : undefined,
        lastAttendedDate: values.lastAttendedDate ? values.lastAttendedDate.toISOString() : undefined,
      });
      message.success("Document issued successfully");
      setIssueOpen(false);
      issueForm.resetFields();
      fetchData();

      // Auto-generate PDF
      const issueData = await getDocIssueData(issued.id);
      generatePDF(issueData);
    } catch (err) {
      if (!err?.errorFields) message.error(err?.response?.data?.message || "Issue failed");
    }
    setIssuing(false);
  };

  // ── PDF ────────────────────────────────────────────────────────────────
  const generatePDF = async (issueData) => {
    const type = issueData.request.type;
    if (type === "TRANSFER_CERTIFICATE") generateTCPDF(issueData);
    else if (type === "BONAFIDE_CERTIFICATE") generateBonafidePDF(issueData);
    else if (type === "CONDUCT_CERTIFICATE") generateGenericCertPDF(issueData, "CONDUCT CERTIFICATE");
    else if (type === "STUDY_CERTIFICATE") generateGenericCertPDF(issueData, "STUDY CERTIFICATE");
    else if (type === "FEE_CERTIFICATE") generateGenericCertPDF(issueData, "FEE CERTIFICATE");
    else generateGenericCertPDF(issueData, "CERTIFICATE");
  };

  const handlePrintPDF = async (record) => {
    try {
      const issueData = await getDocIssueData(record.id);
      generatePDF(issueData);
    } catch {
      message.error("Failed to generate PDF");
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteDocRequest(id);
      message.success("Request deleted");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Delete failed");
    }
  };

  // ── filter ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterType && r.type !== filterType) return false;
      if (q) {
        const match =
          (r.ticketNo || "").toLowerCase().includes(q) ||
          (r.student?.name || "").toLowerCase().includes(q) ||
          (r.student?.admission?.admissionNo || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [data, search, filterStatus, filterType]);

  // ── table columns ──────────────────────────────────────────────────────
  const columns = [
    {
      title: "Ticket No",
      dataIndex: "ticketNo",
      width: 160,
      render: (t) => <span style={{ fontWeight: 700, fontFamily: "'Manrope', sans-serif", fontSize: 13 }}>{t}</span>,
    },
    {
      title: "Student",
      width: 180,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.student?.name || "-"}</div>
          <div style={{ fontSize: 11, color: "#666" }}>{r.student?.admission?.admissionNo}</div>
        </div>
      ),
    },
    {
      title: "Standard",
      width: 110,
      render: (_, r) => formatStd(r.student?.standard),
    },
    {
      title: "Document Type",
      width: 180,
      render: (_, r) => <Tag>{typeLabel(r.type)}</Tag>,
    },
    {
      title: "Status",
      width: 120,
      render: (_, r) => <Tag color={statusColor(r.status)}>{r.status.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Requested",
      width: 130,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{dayjs(r.requestedAt).format("DD-MMM-YYYY")}</div>
          <div style={{ fontSize: 10, color: "#888" }}>{r.requestedBy?.name}</div>
        </div>
      ),
    },
    {
      title: "Issued",
      width: 130,
      render: (_, r) =>
        r.issuedAt ? (
          <div>
            <div style={{ fontSize: 12 }}>{dayjs(r.issuedAt).format("DD-MMM-YYYY")}</div>
            <div style={{ fontSize: 10, color: "#888" }}>{r.issuedBy?.name}</div>
          </div>
        ) : (
          <span style={{ color: "#aaa" }}>—</span>
        ),
    },
    {
      title: "Actions",
      width: 260,
      fixed: "right",
      render: (_, record) => (
        <Space size={4} wrap>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => { setSelected(record); setDetailOpen(true); }}
            style={{ borderRadius: 8, fontSize: 12 }}
          >
            View
          </Button>
          {record.status === "ISSUED" && (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintPDF(record)}
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              PDF
            </Button>
          )}
          {canReview && ["REQUESTED", "IN_REVIEW"].includes(record.status) && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReview(record.id, "APPROVED")}
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              Approve
            </Button>
          )}
          {canIssue && record.status === "APPROVED" && (
            <Button
              size="small"
              type="primary"
              icon={<FileDoneOutlined />}
              onClick={() => openIssueModal(record)}
              style={{ borderRadius: 8, fontSize: 12, background: "#16a085" }}
            >
              Issue
            </Button>
          )}
          {canDelete && record.status !== "ISSUED" && (
            <Popconfirm title="Delete this request?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8, fontSize: 12 }} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-on-primary-container mb-2 uppercase tracking-wide">
            <span>Documents</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">Issue Desk</span>
          </nav>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Document Issue Desk
          </h2>
          <p className="text-on-surface-variant font-medium mt-1 text-sm">
            TC, Bonafide & certificate requests — ticket-based workflow
          </p>
        </div>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setCreateOpen(true)}
            style={{ borderRadius: 12, fontWeight: 700, height: 44 }}
          >
            New Request
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Requested", value: stats.requested, icon: <FileTextOutlined />, color: "#1677ff" },
          { label: "In Review", value: stats.inReview, icon: <ClockCircleOutlined />, color: "#fa8c16" },
          { label: "Approved", value: stats.approved, icon: <CheckCircleOutlined />, color: "#13c2c2" },
          { label: "Issued", value: stats.issued, icon: <FileDoneOutlined />, color: "#52c41a" },
          { label: "Rejected", value: stats.rejected, icon: <ExclamationCircleOutlined />, color: "#f5222d" },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} size="small" style={{ borderRadius: 16 }} bodyStyle={{ padding: "16px 20px" }}>
            <Statistic
              title={<span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>}
              value={value || 0}
              prefix={React.cloneElement(icon, { style: { color } })}
              valueStyle={{ fontWeight: 800, fontSize: 24, color }}
            />
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search ticket / student / admission no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280, borderRadius: 9999, border: "none", background: "#f0f4f8" }}
          prefix={<SearchOutlined style={{ color: "#43474d" }} />}
          allowClear
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 140 }}
          value={filterStatus}
          onChange={setFilterStatus}
          options={DOC_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
        />
        <Select
          allowClear
          placeholder="Document Type"
          style={{ width: 200 }}
          value={filterType}
          onChange={setFilterType}
          options={DOC_REQUEST_TYPES}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#666", fontWeight: 600 }}>
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filtered}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 15, showSizeChanger: true }}
      />

      {/* ── CREATE MODAL ── */}
      <Modal
        open={createOpen}
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined style={{ color: "#1677ff" }} />
            <span className="font-bold">New Document Request</span>
          </div>
        }
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Submit Request"
        width={520}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="studentId"
            label="Student"
            rules={[{ required: true, message: "Select a student" }]}
          >
            <Select
              showSearch
              placeholder="Search by name or admission no..."
              filterOption={false}
              onSearch={searchStudents}
              loading={studentSearching}
              options={students.map((s) => ({
                label: `${s.name} — ${s.admission?.admissionNo || "N/A"} (${formatStd(s.standard)})`,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="Document Type"
            rules={[{ required: true, message: "Select document type" }]}
          >
            <Select options={DOC_REQUEST_TYPES} placeholder="Select type" />
          </Form.Item>
          <Form.Item name="reason" label="Reason / Purpose">
            <Input.TextArea rows={3} placeholder="Why is this document needed?" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal
        open={detailOpen}
        title={
          <div className="flex items-center gap-2">
            <Badge color={statusColor(selected?.status)} />
            <span className="font-bold">{selected?.ticketNo}</span>
            <Tag color={statusColor(selected?.status)}>{selected?.status?.replace(/_/g, " ")}</Tag>
          </div>
        }
        onCancel={() => setDetailOpen(false)}
        footer={
          <Space>
            {canReview && selected?.status === "REQUESTED" && (
              <Button onClick={() => handleReview(selected.id, "IN_REVIEW")} icon={<ClockCircleOutlined />}>
                Mark In Review
              </Button>
            )}
            {canReview && ["REQUESTED", "IN_REVIEW"].includes(selected?.status) && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleReview(selected.id, "APPROVED")}
                >
                  Approve
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: "Reject Request",
                      content: (
                        <Input.TextArea
                          id="reject-reason-input"
                          rows={3}
                          placeholder="Reason for rejection..."
                        />
                      ),
                      okText: "Reject",
                      okButtonProps: { danger: true },
                      onOk: () => {
                        const reason = document.getElementById("reject-reason-input")?.value;
                        return handleReview(selected.id, "REJECTED", { rejectionReason: reason });
                      },
                    });
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            {canIssue && selected?.status === "APPROVED" && (
              <Button
                type="primary"
                icon={<FileDoneOutlined />}
                style={{ background: "#16a085" }}
                onClick={() => { setDetailOpen(false); openIssueModal(selected); }}
              >
                Issue Document
              </Button>
            )}
            {selected?.status === "ISSUED" && (
              <Button icon={<PrinterOutlined />} onClick={() => handlePrintPDF(selected)}>
                Download PDF
              </Button>
            )}
          </Space>
        }
        width={700}
      >
        {selected && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Ticket No">{selected.ticketNo}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColor(selected.status)}>{selected.status.replace(/_/g, " ")}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Student">{selected.student?.name}</Descriptions.Item>
            <Descriptions.Item label="Admission No">{selected.student?.admission?.admissionNo}</Descriptions.Item>
            <Descriptions.Item label="Standard">{formatStd(selected.student?.standard)}</Descriptions.Item>
            <Descriptions.Item label="Section">{selected.student?.section || "—"}</Descriptions.Item>
            <Descriptions.Item label="Document Type" span={2}>
              <Tag>{typeLabel(selected.type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Reason" span={2}>{selected.reason || "—"}</Descriptions.Item>
            <Descriptions.Item label="Requested By">{selected.requestedBy?.name} ({selected.requestedBy?.role})</Descriptions.Item>
            <Descriptions.Item label="Requested At">{dayjs(selected.requestedAt).format("DD-MMM-YYYY HH:mm")}</Descriptions.Item>
            {selected.reviewedBy && (
              <>
                <Descriptions.Item label="Reviewed By">{selected.reviewedBy?.name}</Descriptions.Item>
                <Descriptions.Item label="Reviewed At">{dayjs(selected.reviewedAt).format("DD-MMM-YYYY HH:mm")}</Descriptions.Item>
              </>
            )}
            {selected.remarks && (
              <Descriptions.Item label="Remarks" span={2}>{selected.remarks}</Descriptions.Item>
            )}
            {selected.rejectionReason && (
              <Descriptions.Item label="Rejection Reason" span={2}>
                <span style={{ color: "#f5222d" }}>{selected.rejectionReason}</span>
              </Descriptions.Item>
            )}
            {selected.issuedAt && (
              <>
                <Descriptions.Item label="Issued By">{selected.issuedBy?.name}</Descriptions.Item>
                <Descriptions.Item label="Issued At">{dayjs(selected.issuedAt).format("DD-MMM-YYYY HH:mm")}</Descriptions.Item>
              </>
            )}
            {selected.type === "TRANSFER_CERTIFICATE" && selected.status === "ISSUED" && (
              <>
                <Descriptions.Item label="TC No">{selected.tcNo || "—"}</Descriptions.Item>
                <Descriptions.Item label="TC Date">{selected.tcDate ? dayjs(selected.tcDate).format("DD-MMM-YYYY") : "—"}</Descriptions.Item>
                <Descriptions.Item label="Leaving Reason">{selected.leavingReason || "—"}</Descriptions.Item>
                <Descriptions.Item label="Conduct">{selected.conductRemark || "—"}</Descriptions.Item>
              </>
            )}
            {/* Father / Mother */}
            <Descriptions.Item label="Father">{selected.student?.family?.fatherName || "—"}</Descriptions.Item>
            <Descriptions.Item label="Mother">{selected.student?.family?.motherName || "—"}</Descriptions.Item>
            <Descriptions.Item label="DOB">{selected.student?.dob ? dayjs(selected.student.dob).format("DD-MMM-YYYY") : "—"}</Descriptions.Item>
            <Descriptions.Item label="Gender">{selected.student?.gender || "—"}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* ── ISSUE MODAL (TC fields) ── */}
      <Modal
        open={issueOpen}
        title={
          <div className="flex items-center gap-2">
            <FileDoneOutlined style={{ color: "#16a085" }} />
            <span className="font-bold">Issue Document — {selected?.ticketNo}</span>
          </div>
        }
        onCancel={() => { setIssueOpen(false); issueForm.resetFields(); }}
        onOk={handleIssue}
        confirmLoading={issuing}
        okText="Issue & Generate PDF"
        width={600}
      >
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f6ffed", borderRadius: 8, fontSize: 13 }}>
          <strong>{selected?.student?.name}</strong> — {typeLabel(selected?.type)} — {formatStd(selected?.student?.standard)}
        </div>
        <Form form={issueForm} layout="vertical">
          {selected?.type === "TRANSFER_CERTIFICATE" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="tcNo" label="TC Serial Number">
                  <Input placeholder="e.g. TC/2026/001" />
                </Form.Item>
                <Form.Item name="tcDate" label="TC Date">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </div>
              <Form.Item name="leavingReason" label="Reason for Leaving">
                <Input.TextArea rows={2} placeholder="e.g. Family relocation, personal reasons" />
              </Form.Item>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="dateOfLeaving" label="Date of Leaving">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="lastAttendedDate" label="Last Attended Date">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="conductRemark" label="Conduct / Character">
                  <Select
                    options={[
                      { label: "Good", value: "Good" },
                      { label: "Very Good", value: "Very Good" },
                      { label: "Excellent", value: "Excellent" },
                      { label: "Satisfactory", value: "Satisfactory" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="qualifiedForPromotion" label="Qualified for Promotion" valuePropName="checked">
                  <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
              </div>
            </>
          )}
          {selected?.type !== "TRANSFER_CERTIFICATE" && (
            <p style={{ color: "#666", fontSize: 13 }}>
              Click "Issue & Generate PDF" to mark as issued and download the {typeLabel(selected?.type)}.
            </p>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DocRequestPage;
