import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, message, Popconfirm, Collapse, Form, DatePicker } from "antd";
import { SearchOutlined, EditOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import instance from "../utils/axios";
import dayjs from "dayjs";
import AdmissionStepper from "../components/AdmissionStepper";

const AdmissionView = ({ onEdit }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState(null);
  useEffect(() => {
    // Fetch admissions from backend
    instance.get("/admissions").then((res) => {
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
      // deeply resolve fields
      const resolvePath = (obj, path) => path.split('.').reduce((o, p) => (o ? o[p] : ""), obj);
      const valA = String(resolvePath(a, field));
      const valB = String(resolvePath(b, field));
      if (order === "ascend") return valA.localeCompare(valB);
      else return valB.localeCompare(valA);
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

  const handleEdit = (record) => {
    if (onEdit) onEdit(record);
  };

  const handleDelete = async (id) => {
    try {
      await instance.delete(`/admission/${id}`);
      setData(data.filter((item) => item.id !== id));
      setFilteredData(filteredData.filter((item) => item.id !== id));
      message.success("Deleted successfully");
    } catch {
      message.error("Delete failed");
    }
  };

  const renderBool = (val) => (val ? "Yes" : "No");
  const renderDate = (date) => (date ? dayjs(date).format("YYYY-MM-DD") : "");

  const columns = [
    // LEFT FIXED ACTIONS
    { title: "Admission No", dataIndex: ["admission", "admissionNo"], sorter: true, fixed: "left", width: 150, onHeaderCell: () => ({ onClick: () => handleSort("admission.admissionNo") }) },
    { title: "Student Name", dataIndex: "name", sorter: true, fixed: "left", width: 200, onHeaderCell: () => ({ onClick: () => handleSort("name") }) },
    { title: "Standard", dataIndex: "standard", fixed: "left", width: 100 },
    
    // STUDENT FIELDS
    { title: "Gender", dataIndex: "gender" },
    { title: "DOB", dataIndex: "dob", render: renderDate },
    { title: "Religion", dataIndex: "religion" },
    { title: "Community", dataIndex: "community" },
    { title: "Caste", dataIndex: "caste" },
    { title: "Mother Tongue", dataIndex: "motherTongue" },
    { title: "Aadhar No", dataIndex: "aadharNo" },
    { title: "Blood Group", dataIndex: "bloodGroup" },
    { title: "Identification 1", dataIndex: "identification1" },
    { title: "Identification 2", dataIndex: "identification2" },
    { title: "Previous School", dataIndex: "previousSchool" },
    { title: "Transport Mode", dataIndex: "transportMode" },
    { title: "RTE", dataIndex: "rte", render: renderBool },
    { title: "App Approved", dataIndex: "isApproved", render: renderBool },
    { title: "Created At", dataIndex: "createdAt", render: renderDate },

    // FAMILY FIELDS
    { title: "Father Name", dataIndex: ["family", "fatherName"] },
    { title: "Father Phone", dataIndex: ["family", "fatherPhone"] },
    { title: "Father WhatsApp", dataIndex: ["family", "fatherWhatsapp"] },
    { title: "Father Aadhar", dataIndex: ["family", "fatherAadhar"] },
    { title: "Father Occupation", dataIndex: ["family", "fatherOccupation"] },
    
    { title: "Mother Name", dataIndex: ["family", "motherName"] },
    { title: "Mother Phone", dataIndex: ["family", "motherPhone"] },
    { title: "Mother WhatsApp", dataIndex: ["family", "motherWhatsapp"] },
    { title: "Mother Aadhar", dataIndex: ["family", "motherAadhar"] },
    { title: "Mother Occupation", dataIndex: ["family", "motherOccupation"] },

    { title: "Other WhatsApp", dataIndex: ["family", "otherWhatsapp"] },
    { title: "Family Income", dataIndex: ["family", "familyIncome"] },
    { title: "Siblings", dataIndex: ["family", "siblings"] },
    { title: "Hostel Required", dataIndex: ["family", "hostelRequired"], render: renderBool },

    // ADDRESS FIELDS
    { title: "Address Line 1", dataIndex: ["address", "line1"] },
    { title: "Address Line 2", dataIndex: ["address", "line2"] },
    { title: "Address Line 3", dataIndex: ["address", "line3"] },
    { title: "PIN Code", dataIndex: ["address", "pin"] },

    // ADMISSION INFO
    { title: "Admission Date", dataIndex: ["admission", "admissionDate"], render: renderDate },
    { title: "Adm Standard", dataIndex: ["admission", "standard"] },
    { title: "Staff Signature", dataIndex: ["admission", "staffSignature"] },
    { title: "Principal Signature", dataIndex: ["admission", "principalSignature"] },
    { title: "Adm Approved", dataIndex: ["admission", "isApproved"], render: renderBool },

    // RIGHT FIXED ACTIONS
    {
      title: "Actions",
      fixed: "right",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this admission?" onConfirm={() => handleDelete(record.id)}>
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
            rowKey="id"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 10 }}
          />
    </div>
  );
};

export default AdmissionView;
