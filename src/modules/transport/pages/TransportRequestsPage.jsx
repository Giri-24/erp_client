import React, { useEffect, useState } from "react";
import { Table, Button, Select, Space, message, Tag } from "antd";
import instance from "../../../utils/axios";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

const TransportRequestsPage = ({ onAssign }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const { hasPermission } = usePermissionHelpers();
  const canAssign = hasPermission(PERMISSIONS.TRANSPORT_ASSIGN);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await instance.get("/admissions");
      // Filter for students who opted for 'Van' transport during admission
      const vanRequests = (resp.data || []).filter(
        (item) => item.transportMode === "Van"
      );
      setData(vanRequests);
    } catch {
      message.error("Failed to load transport requests");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter options
  const academicYears = Array.from(new Set(data.map(i => i.academicYear).filter(Boolean))).sort();
  const standards = Array.from(new Set(data.map(i => i.standard).filter(Boolean))).sort();
  const sections = Array.from(new Set(data.map(i => i.section).filter(Boolean))).sort();

  const filteredData = data.filter(item => {
    if (selectedYear && item.academicYear !== selectedYear) return false;
    if (selectedStandard && item.standard !== selectedStandard) return false;
    if (selectedSection && item.section !== selectedSection) return false;
    return true;
  });

  const columns = [
    {
      title: "Admission No",
      dataIndex: ["admission", "admissionNo"],
      key: "admissionNo",
      render: (val) => <Tag color="blue" className="font-bold">{val || "N/A"}</Tag>
    },
    {
      title: "Student Name",
      dataIndex: "name",
      key: "name",
      render: (val) => <span className="font-bold text-primary">{val}</span>
    },
    {
      title: "Standard",
      dataIndex: "standard",
      key: "standard",
    },
    {
      title: "Section",
      dataIndex: "section",
      key: "section",
      render: (val) => val || "—"
    },
    {
      title: "Academic Year",
      dataIndex: "academicYear",
      key: "academicYear",
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, record) => (
        <div className="text-xs">
          <p className="m-0 font-medium">{record.family?.fatherName || "Parent"}</p>
          <p className="m-0 text-on-surface-variant font-bold">{record.family?.fatherPhone || "N/A"}</p>
        </div>
      )
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button 
          type="primary" 
          disabled={!canAssign}
          onClick={() => onAssign(record.id)}
          className="bg-primary hover:bg-primary/90 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">transfer_within_a_station</span>
          Assign Transport
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          <span>Transport</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-primary-fixed-dim">Van Requests</span>
        </nav>
        <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight">Van Transport Requested</h2>
        <p className="text-on-surface-variant mt-1 max-w-lg text-sm">
          List of students who opted for school van service during the admission process. Use the filters to narrow down the list.
        </p>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] border border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">Academic Year</label>
            <Select 
              className="w-full" 
              placeholder="All Years"
              value={selectedYear || undefined}
              onChange={setSelectedYear}
              allowClear
              options={academicYears.map(y => ({ label: y, value: y }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">Standard</label>
            <Select 
              className="w-full" 
              placeholder="All Standards"
              value={selectedStandard || undefined}
              onChange={setSelectedStandard}
              allowClear
              options={standards.map(s => ({ label: s, value: s }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">Section</label>
            <Select 
              className="w-full" 
              placeholder="All Sections"
              value={selectedSection || undefined}
              onChange={setSelectedSection}
              allowClear
              options={sections.map(s => ({ label: s, value: s }))}
            />
          </div>
          <Button 
            onClick={() => { setSelectedYear(""); setSelectedStandard(""); setSelectedSection(""); }}
            className="h-8 flex items-center gap-2 text-xs"
          >
            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden border border-outline-variant/10">
        <Table 
          columns={columns} 
          dataSource={filteredData} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          className="custom-table"
        />
      </div>
    </div>
  );
};

export default TransportRequestsPage;
