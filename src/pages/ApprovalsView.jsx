import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Space, Tag, Button, Input, Modal, message, Select } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import instance from "../utils/axios";
import { setAdmissionApproval } from "../modules/admission/admission.service";
import { hasPermission, PERMISSIONS } from "../utils/permissions";

const normalizeStandardValue = (value) => {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  const lower = raw.toLowerCase();

  if (lower === "lkg") return "LKG";
  if (lower === "ukg") return "UKG";

  const stdCodeMatch = lower.match(/^std[_\-\s]?(\d{1,2})$/);
  if (stdCodeMatch) return stdCodeMatch[1];

  const numberMatch = lower.match(/^(\d{1,2})(st|nd|rd|th)?(\s*standard)?$/);
  if (numberMatch) return numberMatch[1];

  return raw;
};

const formatStandardLabel = (value) => {
  const normalized = normalizeStandardValue(value);
  if (normalized === "LKG" || normalized === "UKG") return normalized;

  const num = Number(normalized);
  if (!Number.isNaN(num) && normalized !== "") {
    if (num === 1) return "1st Standard";
    if (num === 2) return "2nd Standard";
    if (num === 3) return "3rd Standard";
    return `${num}th Standard`;
  }

  return value || "";
};

const ApprovalsView = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState({});
  const [statusFilter, setStatusFilter] = useState("pending");
  const [standardFilter, setStandardFilter] = useState(undefined);
  const [sectionFilter, setSectionFilter] = useState(undefined);
  const [academicYearFilter, setAcademicYearFilter] = useState(undefined);
  const [fatherNameFilter, setFatherNameFilter] = useState("");
  const [siblingFilter, setSiblingFilter] = useState(undefined);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectRecord, setRejectRecord] = useState(null);

  const canApprove = hasPermission(PERMISSIONS.ADMISSION_APPROVE);

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const res = await instance.get("/admissions");
      setRows(res.data || []);
    } catch {
      message.error("Failed to load approvals queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter === "approved") result = result.filter((r) => Boolean(r.admission?.isApproved));
    else if (statusFilter === "pending") result = result.filter((r) => !Boolean(r.admission?.isApproved));
    if (standardFilter) result = result.filter((r) => normalizeStandardValue(r.standard || r.admission?.standard) === normalizeStandardValue(standardFilter));
    if (sectionFilter) result = result.filter((r) => r.section === sectionFilter);
    if (academicYearFilter) result = result.filter((r) => r.academicYear === academicYearFilter);
    if (fatherNameFilter) {
      const q = fatherNameFilter.toLowerCase();
      result = result.filter((r) => (r.family?.fatherName || "").toLowerCase().includes(q));
    }
    if (siblingFilter === "has") result = result.filter((r) => !!r.siblingGroupId);
    else if (siblingFilter === "none") result = result.filter((r) => !r.siblingGroupId);
    return result;
  }, [rows, statusFilter, standardFilter, sectionFilter, academicYearFilter, fatherNameFilter, siblingFilter]);

  const standardOptions = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.standard || r.admission?.standard).filter(Boolean))).sort(),
    [rows]
  );
  const sectionOptions = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.section).filter(Boolean))).sort(),
    [rows]
  );
  const academicYearOptions = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.academicYear).filter(Boolean))).sort(),
    [rows]
  );

  const handleApprove = async (record) => {
    try {
      setApprovalLoading((prev) => ({ ...prev, [record.id]: true }));
      await setAdmissionApproval(record.id, true);
      message.success("Admission approved");
      await fetchAdmissions();
    } catch (err) {
      message.error(err?.response?.data?.message || "Approval failed");
    } finally {
      setApprovalLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const handleOpenRejectModal = (record) => {
    setRejectRecord(record);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectRecord) return;

    try {
      setApprovalLoading((prev) => ({ ...prev, [rejectRecord.id]: true }));
      await setAdmissionApproval(rejectRecord.id, false, rejectReason || "Marked pending by authority");
      message.success("Admission marked pending with note");
      setRejectModalOpen(false);
      setRejectRecord(null);
      setRejectReason("");
      await fetchAdmissions();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      if (rejectRecord?.id) {
        setApprovalLoading((prev) => ({ ...prev, [rejectRecord.id]: false }));
      }
    }
  };

  const columns = [
    {
      title: "Admission No",
      dataIndex: ["admission", "admissionNo"],
      width: 140,
      render: (v) => <strong>{v || "-"}</strong>,
    },
    {
      title: "Student",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "Standard",
      width: 120,
      render: (_, record) => formatStandardLabel(record.standard || record.admission?.standard),
    },
    {
      title: "Section",
      width: 90,
      render: (_, record) => record.section || "—",
    },
    {
      title: "Academic Year",
      width: 130,
      render: (_, record) => record.academicYear || "—",
    },
    {
      title: "Father Name",
      width: 150,
      render: (_, record) => record.family?.fatherName || "—",
    },
    {
      title: "Sibling",
      width: 90,
      render: (_, record) => record.siblingGroupId ? <Tag color="blue">Yes</Tag> : "No",
    },
    {
      title: "Gender",
      dataIndex: "gender",
      width: 100,
    },
    {
      title: "Admission Date",
      dataIndex: ["admission", "admissionDate"],
      width: 140,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "Approval Status",
      width: 140,
      render: (_, record) => (
        <Tag color={record.admission?.isApproved ? "green" : "orange"}>
          {record.admission?.isApproved ? "Approved" : "Pending"}
        </Tag>
      ),
    },
    {
      title: "Approved By",
      width: 120,
      render: (_, record) => record.admission?.approvedByRole || "-",
    },
    {
      title: "Note",
      dataIndex: ["admission", "approvalNote"],
      width: 200,
      render: (v) => v || "-",
    },
    {
      title: "Actions",
      width: 240,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={!canApprove || Boolean(record.admission?.isApproved)}
            loading={approvalLoading[record.id]}
            onClick={() => handleApprove(record)}
          >
            Approve
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            disabled={!canApprove}
            loading={approvalLoading[record.id]}
            onClick={() => handleOpenRejectModal(record)}
          >
            Mark Pending
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Admission Approvals"
        extra={(
          <Space wrap>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "all", label: "All" },
              ]}
            />
            <Select
              allowClear
              placeholder="Standard"
              style={{ width: 130 }}
              value={standardFilter}
              onChange={setStandardFilter}
              options={standardOptions.map((v) => ({ label: formatStandardLabel(v), value: v }))}
            />
            <Select
              allowClear
              placeholder="Section"
              style={{ width: 100 }}
              value={sectionFilter}
              onChange={setSectionFilter}
              options={sectionOptions.map((v) => ({ label: v, value: v }))}
            />
            <Select
              allowClear
              placeholder="Academic Year"
              style={{ width: 130 }}
              value={academicYearFilter}
              onChange={setAcademicYearFilter}
              options={academicYearOptions.map((v) => ({ label: v, value: v }))}
            />
            <Input
              allowClear
              placeholder="Father name..."
              style={{ width: 150 }}
              value={fatherNameFilter}
              onChange={(e) => setFatherNameFilter(e.target.value)}
            />
            <Select
              allowClear
              placeholder="Sibling"
              style={{ width: 120 }}
              value={siblingFilter}
              onChange={setSiblingFilter}
              options={[
                { label: "Has Sibling", value: "has" },
                { label: "No Sibling", value: "none" },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchAdmissions}>
              Refresh
            </Button>
          </Space>
        )}
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          // scroll={{ x: 1200 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Reason (Optional)"
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectRecord(null);
          setRejectReason("");
        }}
        onOk={handleReject}
        okText="Save"
      >
        <Input.TextArea
          rows={4}
          placeholder="Why is this marked pending/rejected?"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default ApprovalsView;