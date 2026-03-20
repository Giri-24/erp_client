import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, message, Popconfirm, Collapse, Form, DatePicker } from "antd";
import { SearchOutlined, EditOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "../utils/axios";

const AdmissionView = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState(null);

  useEffect(() => {
    // Fetch admissions from backend
    axios.get("/admissions").then((res) => {
      setData(res.data);
      setFilteredData(res.data);
    });
  }, []);

  // Search filter
  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = data.filter((item) =>
      Object.values(item).some((v) =>
        String(v).toLowerCase().includes(value.toLowerCase())
      )
    );
    setFilteredData(filtered);
  };

  // Sort
  const handleSort = (field) => {
    const order = sortOrder === "ascend" ? "descend" : "ascend";
    setSortOrder(order);
    const sorted = [...filteredData].sort((a, b) => {
      if (order === "ascend") return String(a[field]).localeCompare(String(b[field]));
      else return String(b[field]).localeCompare(String(a[field]));
    });
    setFilteredData(sorted);
  };

  // Export CSV
  const exportCSV = () => {
    const rows = filteredData.map((row) =>
      Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [Object.keys(filteredData[0] || {}).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [editingKey, setEditingKey] = useState(null);
  const [editForm] = Form.useForm();

  const handleEdit = (record) => {
    setEditingKey(record.admissionNo);
    editForm.setFieldsValue({
      ...record,
      dob: record.dob ? window.moment(record.dob) : null,
      admissionDate: record.admissionDate ? window.moment(record.admissionDate) : null,
    });
  };

  const handleDelete = async (admissionNo) => {
    try {
      await axios.delete(`/admissions/${admissionNo}`);
      setData(data.filter((item) => item.admissionNo !== admissionNo));
      setFilteredData(filteredData.filter((item) => item.admissionNo !== admissionNo));
      message.success("Deleted successfully");
    } catch {
      message.error("Delete failed");
    }
  };

  const saveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = {
        ...values,
        dob: values.dob ? values.dob.format("YYYY-MM-DD") : undefined,
        admissionDate: values.admissionDate ? values.admissionDate.format("YYYY-MM-DD") : undefined,
      };
      await axios.put(`/admissions/${editingKey}`, payload);
      message.success("Updated successfully");
      setEditingKey(null);
      // Refresh data
      axios.get("/admissions").then((res) => {
        setData(res.data);
        setFilteredData(res.data);
      });
    } catch {
      message.error("Update failed");
    }
  };

  const columns = [
    { title: "Admission No", dataIndex: "admissionNo", sorter: true, onHeaderCell: () => ({ onClick: () => handleSort("admissionNo") }) },
    { title: "Student Name", dataIndex: "name", sorter: true, onHeaderCell: () => ({ onClick: () => handleSort("name") }) },
    { title: "Gender", dataIndex: "gender" },
    { title: "DOB", dataIndex: "dob" },
    { title: "Community", dataIndex: "community" },
    { title: "Father Name", dataIndex: "fatherName" },
    { title: "Mother Name", dataIndex: "motherName" },
    { title: "Admission Date", dataIndex: "admissionDate" },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this admission?" onConfirm={() => handleDelete(record.admissionNo)}>
            <Button icon={<DeleteOutlined />} danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 30 }}>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search admissions"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
        />
        <Button icon={<DownloadOutlined />} onClick={exportCSV}>Export CSV</Button>
      </Space>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="admissionNo"
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (record) =>
            editingKey === record.admissionNo ? (
              <Form form={editForm} layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item name="name" label="Student Name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="gender" label="Gender" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="dob" label="DOB" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="community" label="Community" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="fatherName" label="Father Name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="motherName" label="Mother Name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="admissionDate" label="Admission Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
                <Space>
                  <Button type="primary" onClick={saveEdit}>Save</Button>
                  <Button onClick={() => setEditingKey(null)}>Cancel</Button>
                </Space>
              </Form>
            ) : null,
          rowExpandable: (record) => true,
          expandedRowKeys: editingKey ? [editingKey] : [],
          onExpand: (expanded, record) => {
            if (!expanded) setEditingKey(null);
          },
        }}
      />
    </div>
  );
};

export default AdmissionView;
