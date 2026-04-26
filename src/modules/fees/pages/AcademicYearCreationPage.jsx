import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Input, Modal, Space, Table, Tag, Typography, message } from "antd";
import { createAcademicYear, getAcademicYears, updateAcademicYear } from "../fees.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

const normalizeYear = (value) => String(value || "").trim();

const AcademicYearCreationPage = () => {
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [years, setYears] = useState([]);
  const [editingYear, setEditingYear] = useState(null);

  const { hasPermission } = usePermissionHelpers();
  const canCreate = hasPermission(PERMISSIONS.FEES_STRUCTURE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.FEES_STRUCTURE_UPDATE);

  const loadYears = async () => {
    setLoading(true);
    try {
      const data = await getAcademicYears();
      setYears(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load academic years");
      setYears([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadYears();
  }, []);

  const validateAcademicYear = (_, value) => {
    const year = normalizeYear(value);
    if (!year) return Promise.reject(new Error("Please enter academic year"));
    if (!ACADEMIC_YEAR_PATTERN.test(year)) {
      return Promise.reject(new Error("Use format YYYY-YYYY"));
    }

    const [startYear, endYear] = year.split("-").map(Number);
    if (endYear !== startYear + 1) {
      return Promise.reject(new Error("End year must be start year + 1"));
    }
    return Promise.resolve();
  };

  const yearRows = useMemo(
    () => years.map((year) => ({ key: year, academicYear: year })),
    [years]
  );

  const handleSubmit = async (values) => {
    if (!canCreate) return;
    setSaving(true);
    try {
      await createAcademicYear(normalizeYear(values.academicYear));
      message.success("Academic year created successfully");
      createForm.resetFields();
      await loadYears();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create academic year");
    }
    setSaving(false);
  };

  const openEdit = (year) => {
    setEditingYear(year);
    editForm.setFieldsValue({ academicYear: year });
  };

  const closeEdit = () => {
    setEditingYear(null);
    editForm.resetFields();
  };

  const handleUpdate = async (values) => {
    if (!editingYear || !canUpdate) return;
    setSaving(true);
    try {
      await updateAcademicYear(editingYear, normalizeYear(values.academicYear));
      message.success("Academic year updated successfully");
      closeEdit();
      await loadYears();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update academic year");
    }
    setSaving(false);
  };

  const columns = [
    {
      title: "Academic Year",
      dataIndex: "academicYear",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Button type="link" onClick={() => openEdit(record.academicYear)} disabled={!canUpdate}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Academic Year Management
          </Typography.Title>
          <Typography.Text type="secondary">
            Create and rename academic years used across fee structures, assignment, collection, and reports.
          </Typography.Text>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        message="Backend requirement"
        description="Editing needs PUT /fees/academic-years/:academicYearId. Until that backend API is available, create and list will work, but rename will return the backend error response."
      />

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <Typography.Title level={4}>Create Academic Year</Typography.Title>
          <Form form={createForm} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Academic Year"
              name="academicYear"
              rules={[{ validator: validateAcademicYear }]}
            >
              <Input placeholder="2026-2027" maxLength={9} disabled={!canCreate} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block disabled={!canCreate}>
              Create Academic Year
            </Button>
          </Form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                Existing Academic Years
              </Typography.Title>
              <Typography.Text type="secondary">
                These values feed the academic year selectors in fees pages.
              </Typography.Text>
            </div>
            <Button onClick={loadYears} loading={loading}>
              Refresh
            </Button>
          </div>

          <Table
            rowKey="academicYear"
            dataSource={yearRows}
            columns={columns}
            loading={loading}
            pagination={false}
            locale={{ emptyText: "No academic years found" }}
          />
        </div>
      </div>

      <Modal
        open={Boolean(editingYear)}
        title="Edit Academic Year"
        onCancel={closeEdit}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="Current Academic Year">
            <Input value={editingYear || ""} disabled />
          </Form.Item>
          <Form.Item
            label="New Academic Year"
            name="academicYear"
            rules={[{ validator: validateAcademicYear }]}
          >
            <Input placeholder="2026-2027" maxLength={9} disabled={!canUpdate} />
          </Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={closeEdit}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving} disabled={!canUpdate}>
              Update Year
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default AcademicYearCreationPage;
