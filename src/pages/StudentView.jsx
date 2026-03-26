import React, { useEffect, useState } from "react";
import { Table, Select, Input, Space } from "antd";
import instance from "../utils/axios";

const StudentView = () => {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [classFilter, setClassFilter] = useState();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    instance.get("/admissions").then((res) => {
      setStudents(res.data);
      setFiltered(res.data);
    });
  }, []);

  // Get unique standards/classes
  const classOptions = Array.from(
    new Set(students.map((s) => s.standard || s.admission?.standard).filter(Boolean))
  ).map((std) => ({ label: std, value: std }));

  // Filter logic
  useEffect(() => {
    let data = students;
    if (classFilter) {
      data = data.filter(
        (s) => (s.standard || s.admission?.standard) === classFilter
      );
    }
    if (searchText) {
      data = data.filter((s) =>
        Object.values(s)
          .join(" ")
          .toLowerCase()
          .includes(searchText.toLowerCase())
      );
    }
    setFiltered(data);
  }, [classFilter, searchText, students]);

  const columns = [
    { title: "Admission No", dataIndex: ["admission", "admissionNo"] },
    { title: "Name", dataIndex: "name" },
    { title: "Standard", dataIndex: "standard" },
    { title: "Gender", dataIndex: "gender" },
    { title: "DOB", dataIndex: "dob" },
    { title: "Father Name", dataIndex: ["family", "fatherName"] },
    { title: "Mother Name", dataIndex: ["family", "motherName"] },
  ];

  return (
    <div style={{ padding: 30 }}>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Filter by Class"
          style={{ width: 180 }}
          value={classFilter}
          onChange={setClassFilter}
          options={classOptions}
        />
        <Input
          placeholder="Search students"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey={(r) => r.id}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default StudentView;
