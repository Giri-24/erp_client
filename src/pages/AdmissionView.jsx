import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, message, Popconfirm, Collapse, Form, DatePicker, Tag, Select } from "antd";
import { SearchOutlined, EditOutlined, DownloadOutlined, DeleteOutlined, PrinterOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
  // Print PDF for a single admission
  const handlePrintPDF = (record) => {
    const doc = new jsPDF();
    // Add logo if available
    const logoImg = new Image();
    logoImg.src = "/images/logo.png";
    logoImg.onload = () => {
      doc.addImage(logoImg, "PNG", 80, 10, 50, 25);
      addContent();
    };
    logoImg.onerror = () => {
      addContent();
    };
    function addContent() {
      let y = 40;
      doc.setFontSize(18);
      doc.text("Admission Form", 105, y, { align: "center" });
      y += 10;
      doc.setFontSize(12);
      // Student Info Table
      const fields = [
        ["Admission No", record.admission?.admissionNo || ""],
        ["Student Name", record.name || ""],
        ["Standard", record.standard || ""],
        ["Gender", record.gender || ""],
        ["DOB", record.dob ? dayjs(record.dob).format("YYYY-MM-DD") : ""],
        ["Religion", record.religion || ""],
        ["Community", record.community || ""],
        ["Caste", record.caste || ""],
        ["Mother Tongue", record.motherTongue || ""],
        ["Aadhar No", record.aadharNo || ""],
        ["Blood Group", record.bloodGroup || ""],
        ["Identification 1", record.identification1 || ""],
        ["Identification 2", record.identification2 || ""],
        ["Previous School", record.previousSchool || ""],
        ["Transport Mode", record.transportMode || ""],
        ["RTE", record.rte ? "Yes" : "No"],
        ["App Approved", record.isApproved ? "Yes" : "No"],
        ["Admission Date", record.admission?.admissionDate ? dayjs(record.admission.admissionDate).format("YYYY-MM-DD") : ""],
        ["Admission From", record.admission?.admissionFrom ? dayjs(record.admission.admissionFrom).format("YYYY-MM-DD") : ""],
        ["Admission To", record.admission?.admissionTo ? dayjs(record.admission.admissionTo).format("YYYY-MM-DD") : ""],
        ["Admission Status", (record.users?.isActive ?? 1) ? "Active" : "Inactive"],
      ];
      autoTable(doc, {
        startY: y + 5,
        head: [["Field", "Value"]],
        body: fields,
        theme: "grid",
        headStyles: { fillColor: [22, 160, 133] },
        styles: { fontSize: 10 },
      });
      doc.save(`admission_${record.admission?.admissionNo || record.id}.pdf`);
    }
  };
import instance from "../utils/axios";
import dayjs from "dayjs";
import AdmissionStepper from "../components/AdmissionStepper";

const AdmissionView = ({ onEdit }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState(null);
  // Filter states
  const [filterStandard, setFilterStandard] = useState(undefined);
  const [filterGender, setFilterGender] = useState(undefined);
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [filterDate, setFilterDate] = useState([]);

  useEffect(() => {
    // Fetch admissions from backend
    instance.get("/admissions").then((res) => {
      setData(res.data);
      setFilteredData(res.data);
    });
  }, []);

  // Helper to get unique values for dropdowns
  const getUnique = (arr, key) => {
    const values = arr.map(item => {
      if (typeof key === 'string') return item[key];
      // for nested keys like ['admission','standard']
      if (Array.isArray(key)) return key.reduce((o, k) => (o ? o[k] : undefined), item);
      return undefined;
    });
    return Array.from(new Set(values.filter(Boolean)));
  };


  // Combined filter
  const applyFilters = (searchVal, std, gender, status, dateRange) => {
    let filtered = data.filter((item) => {
      // Search
      let matchesSearch = true;
      if (searchVal) {
        matchesSearch = Object.values(item).some((v) =>
          String(v).toLowerCase().includes(searchVal.toLowerCase())
        );
      }
      // Standard
      let matchesStd = true;
      if (std) {
        matchesStd = item.admission && item.admission.standard === std;
      }
      // Gender
      let matchesGender = true;
      if (gender) {
        matchesGender = item.gender === gender;
      }
      // Status
      let matchesStatus = true;
      if (status !== undefined) {
        const isActive = item.users?.isActive ?? 1;
        matchesStatus = (status === 'active' && isActive) || (status === 'inactive' && !isActive);
      }
      // Admission Date
      let matchesDate = true;
      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const admDate = item.admission?.admissionDate;
        if (admDate) {
          const d = dayjs(admDate);
          matchesDate = d.isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) && d.isBefore(dateRange[1].endOf('day').add(1, 'ms'));
        }
      }
      return matchesSearch && matchesStd && matchesGender && matchesStatus && matchesDate;
    });
    setFilteredData(filtered);
  };

  // Handlers
  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, filterStandard, filterGender, filterStatus, filterDate);
  };
  const handleStandard = (value) => {
    setFilterStandard(value);
    applyFilters(searchText, value, filterGender, filterStatus, filterDate);
  };
  const handleGender = (value) => {
    setFilterGender(value);
    applyFilters(searchText, filterStandard, value, filterStatus, filterDate);
  };
  const handleStatus = (value) => {
    setFilterStatus(value);
    applyFilters(searchText, filterStandard, filterGender, value, filterDate);
  };
  const handleDate = (dates) => {
    setFilterDate(dates);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, dates);
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

  // Helper to flatten nested objects
  const flattenObject = (obj, prefix = "") => {
    let result = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    return result;
  };

  // Export CSV with expanded nested objects
  const exportCSV = () => {
    if (!filteredData.length) return;
    // Flatten all rows
    const flatRows = filteredData.map(row => flattenObject(row));
    // Collect all unique keys for columns
    const allKeys = Array.from(new Set(flatRows.flatMap(row => Object.keys(row))));
    // Build CSV rows
    const csvRows = [
      allKeys.join(","),
      ...flatRows.map(row =>
        allKeys.map(k => {
          let v = row[k];
          if (v === undefined || v === null) return "";
          v = String(v).replace(/"/g, '""');
          return `"${v}"`;
        }).join(",")
      )
    ];
    const csv = csvRows.join("\n");
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
      console.log("Deleting ID:", id);
      await instance.delete(`/users/${id}`);
      console.log("Deleted ID:", id);
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
    { title: "Profile", 
      render: (_, record) => {
        let photoPath = null;
        if (Array.isArray(record.documents) && record.documents.length > 0) {
          photoPath = record.documents[0].photoPath;
        } else if (record.documents && record.documents.photoPath) {
          photoPath = record.documents.photoPath;
        }
        return photoPath ? (
          <img src={`http://localhost:3000/${photoPath.replace(/\\/g, '/')}`} alt="student" style={{ width: 50, height: 60, objectFit: "cover" }} />
        ) : "No Photo";
      }
    },
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

    // PHOTO COLUMN (supports documents as array)
   

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
    { title: "Admission From", dataIndex: ["admission", "admissionFrom"], render: renderDate },
    { title: "Admission To", dataIndex: ["admission", "admissionTo"], render: renderDate },
    { title: "Adm Standard", dataIndex: ["admission", "standard"] },
    { title: "Staff Signature", dataIndex: ["admission", "staffSignature"] },
    { title: "Principal Signature", dataIndex: ["admission", "principalSignature"] },
    { title: "Adm Approved", dataIndex: ["admission", "isApproved"], render: renderBool },
 {
  title: "Admission Status",
  dataIndex: ["users", "isActive"],
  render: (status) => {
    console.log("Rendering status:", status);

    const isActive = status ?? 1; // default to active if null/undefined
    const color = isActive ? "green" : "red";

    return (
      <Tag color={color}>
      {isActive ? "Active" : "Inactive"}
      </Tag>
    );
  },
 },
    // RIGHT FIXED ACTIONS
    {
      title: "Actions",
      fixed: "right",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this admission?" onConfirm={() => handleDelete(record?.users?.id)}>
            <Button icon={<DeleteOutlined />} danger>
              Delete
            </Button>
          </Popconfirm>
          <Button icon={<PrinterOutlined />} onClick={() => handlePrintPDF(record)}>
            Print PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 30 }}>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search admissions"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
        />
        <Select
          allowClear
          placeholder="Standard"
          style={{ width: 140 }}
          value={filterStandard}
          onChange={handleStandard}
          options={getUnique(data, ["admission", "standard"]).map((v) => ({ label: v, value: v }))}
        />
        <Select
          allowClear
          placeholder="Gender"
          style={{ width: 120 }}
          value={filterGender}
          onChange={handleGender}
          options={getUnique(data, "gender").map((v) => ({ label: v, value: v }))}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 120 }}
          value={filterStatus}
          onChange={handleStatus}
          options={[
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ]}
        />
        <DatePicker.RangePicker
          style={{ width: 240 }}
          value={filterDate}
          onChange={handleDate}
          placeholder={["Admission Date From", "To"]}
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
