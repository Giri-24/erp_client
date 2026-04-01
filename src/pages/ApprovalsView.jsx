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
    if (statusFilter === "all") return rows;
    if (statusFilter === "approved") return rows.filter((r) => Boolean(r.admission?.isApproved));
    return rows.filter((r) => !Boolean(r.admission?.isApproved));
  }, [rows, statusFilter]);

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
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "all", label: "All" },
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