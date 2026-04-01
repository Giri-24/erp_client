import React, { useEffect, useState, useRef } from "react";
import {
  Row,
  Col,
  Table,
  Select,
  DatePicker,
  Space,
  Button,
  message,
  Modal,
} from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { getFeesDashboard, getDailyCollection, getAcademicYears } from "../fees.service";
import dayjs from "dayjs";

const FeesDashboardPage = () => {
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printPayment, setPrintPayment] = useState(null);
  const printRef = useRef(null);

  const fetchAcademicYears = async () => {
    try {
      const years = await getAcademicYears();
      setAcademicYearOptions(years);
      if (years.length > 0 && !years.includes(academicYear)) {
        setAcademicYear(years[0]);
      }
    } catch {
      // silent
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await getFeesDashboard(academicYear);
      setDashboard(data);
    } catch {
      message.error("Failed to load dashboard");
    }
    setLoading(false);
  };

  const fetchDaily = async (date) => {
    try {
      const dateStr = date ? date.format("YYYY-MM-DD") : undefined;
      const data = await getDailyCollection(dateStr);
      setDailyData(data);
    } catch {
      message.error("Failed to load daily collection");
    }
  };

  useEffect(() => {
    fetchAcademicYears();
    fetchDaily();
  }, []);

  useEffect(() => {
    if (academicYear) fetchDashboard();
  }, [academicYear]);

  const exportByStandardCSV = () => {
    if (!dashboard?.byStandard) return;
    const headers = ["Standard", "Students", "Assigned", "Collected", "Pending"];
    const rows = Object.entries(dashboard.byStandard).map(([standard, vals]) => [
      standard,
      vals.count,
      vals.assigned,
      vals.collected,
      vals.pending,
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fees_by_standard_${academicYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDailyCSV = () => {
    if (!dailyData?.payments) return;
    const headers = ["Student", "Admission No", "Standard", "Amount", "Mode", "Receipt", "Time"];
    const rows = dailyData.payments.map(p => [
      p.studentFee?.student?.name || "-",
      p.studentFee?.student?.admissions?.[0]?.admissionNo || "-",
      p.studentFee?.student?.standard || "-",
      p.amount,
      p.paymentMode,
      p.receiptNo || "-",
      new Date(p.paymentDate).toLocaleTimeString(),
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `daily_collection_${dailyData.date}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const standardColumns = [
    { title: "Standard", dataIndex: "standard", key: "standard", render: (v) => <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#00152a' }}>{v}</span> },
    { title: "Students", dataIndex: "count", key: "count" },
    {
      title: "Assigned",
      dataIndex: "assigned",
      render: (v) => `₹${v?.toLocaleString()}`,
    },
    {
      title: "Collected",
      dataIndex: "collected",
      render: (v) => (
        <span style={{ color: '#005145', fontWeight: 600 }}>₹{v?.toLocaleString()}</span>
      ),
    },
    {
      title: "Pending",
      dataIndex: "pending",
      render: (v) => (
        <span style={{ color: v > 0 ? '#ba1a1a' : '#005145', fontWeight: 600 }}>₹{v?.toLocaleString()}</span>
      ),
    },
  ];

  const byStandardData = dashboard?.byStandard
    ? Object.entries(dashboard.byStandard).map(([standard, vals]) => ({
        key: standard,
        standard,
        ...vals,
      }))
    : [];

  const handlePrintReceipt = (payment) => {
    setPrintPayment(payment);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .receipt { max-width: 700px; margin: 0 auto; border: 2px solid #333; padding: 24px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
            .header h2 { margin: 0 0 4px 0; font-size: 22px; }
            .header p { margin: 0; color: #555; font-size: 13px; }
            .receipt-no { text-align: right; font-weight: bold; font-size: 16px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f5f5f5; }
            .footer { margin-top: 24px; display: flex; justify-content: space-between; }
            .sign-line { border-top: 1px solid #333; width: 150px; margin-top: 40px; padding-top: 4px; font-size: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
        <script>window.print(); window.close();</script>
      </html>
    `);
    win.document.close();
  };

  const dailyPaymentColumns = [
    {
      title: "Student",
      render: (_, r) => r.studentFee?.student?.name || "-",
    },
    {
      title: "Admission No",
      render: (_, r) => r.studentFee?.student?.admissions?.[0]?.admissionNo || "-",
    },
    {
      title: "Standard",
      render: (_, r) => r.studentFee?.student?.standard || "-",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (v) => `₹${v?.toLocaleString()}`,
    },
    { title: "Mode", dataIndex: "paymentMode" },
    { title: "Receipt", dataIndex: "receiptNo", render: (v) => v || "-" },
    {
      title: "Time",
      dataIndex: "paymentDate",
      render: (d) => new Date(d).toLocaleTimeString(),
    },
    {
      title: "Action",
      render: (_, record) => (
        <Button
          type="link"
          icon={<PrinterOutlined />}
          onClick={() => handlePrintReceipt(record)}
        >
          Print
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Editorial page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div className="page-breadcrumb">
            <span>Fees</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: '#00152a', fontWeight: 700 }}>Dashboard</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Fees Overview
          </h2>
          <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Track collections, pending dues, and daily revenue.
          </p>
        </div>
        <Select
          value={academicYear}
          onChange={(v) => setAcademicYear(v)}
          style={{ width: 140, borderRadius: 9999 }}
          showSearch
          placeholder="Academic Year"
          options={academicYearOptions.map((y) => ({ value: y, label: y }))}
        />
      </div>

      {dashboard && (
        <>
          {/* Metric Cards — Bento style */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 9999, padding: '28px 32px', boxShadow: '0 20px 40px rgba(1,29,53,0.04)', minHeight: 120 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#43474d', fontFamily: "'Public Sans',sans-serif", marginBottom: 4 }}>Total Students</p>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 36, fontWeight: 800, color: '#00152a', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>{dashboard.totalStudents}</h3>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 9999, padding: '28px 32px', boxShadow: '0 20px 40px rgba(1,29,53,0.04)', minHeight: 120 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#43474d', fontFamily: "'Public Sans',sans-serif", marginBottom: 4 }}>Total Assigned</p>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 36, fontWeight: 800, color: '#00152a', margin: 0, lineHeight: 1 }}>₹{Number(dashboard.totalAssigned).toLocaleString()}</h3>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#fff', borderRadius: 9999, padding: '28px 32px', boxShadow: '0 20px 40px rgba(1,29,53,0.04)', minHeight: 120 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#43474d', fontFamily: "'Public Sans',sans-serif", marginBottom: 4 }}>Total Collected</p>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 36, fontWeight: 800, color: '#005145', margin: 0, lineHeight: 1 }}>₹{Number(dashboard.totalCollected).toLocaleString()}</h3>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: '#00152a', borderRadius: 9999, padding: '28px 32px', boxShadow: '0 20px 40px rgba(1,29,53,0.15)', minHeight: 120, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #102a43, #00152a)', opacity: 0.5 }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: "'Public Sans',sans-serif", marginBottom: 4 }}>Total Pending</p>
                  <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>₹{Number(dashboard.totalPending).toLocaleString()}</h3>
                </div>
              </div>
            </Col>
          </Row>

          {/* By Standard Table */}
          <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
                  <h4 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Fee Collection by Standard</h4>
                </div>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={exportByStandardCSV}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  Export CSV
                </Button>
              </div>
              <Table
                columns={standardColumns}
                dataSource={byStandardData}
                pagination={false}
                size="small"
                loading={loading}
              />
            </div>
          </div>
        </>
      )}

      {/* Daily Collection */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 3, height: 28, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <h4 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Daily Collection</h4>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={exportDailyCSV}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Export CSV
              </Button>
              <DatePicker defaultValue={dayjs()} onChange={(date) => fetchDaily(date)} />
            </div>
          </div>
          {dailyData && (
            <>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#43474d', fontFamily: "'Public Sans',sans-serif", marginBottom: 4 }}>Collection on {dailyData.date}</p>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a' }}>₹{Number(dailyData.totalCollection).toLocaleString()}</span>
              </div>
              <Table
                columns={dailyPaymentColumns}
                dataSource={dailyData.payments}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                size="small"
              />
            </>
          )}
        </div>
      </div>

      {/* Print Receipt Modal */}
      <Modal
        open={!!printPayment}
        title="Fee Receipt Preview"
        onCancel={() => setPrintPayment(null)}
        width={750}
        footer={[
          <Button key="close" onClick={() => setPrintPayment(null)}>
            Close
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Receipt
          </Button>,
        ]}
      >
        {printPayment && (
          <div ref={printRef}>
            <div className="receipt">
              <div className="header">
                <h2>School ERP</h2>
                <p>Fee Payment Receipt</p>
              </div>
              <div className="receipt-no">
                Receipt No: {printPayment.receiptNo || "N/A"}
              </div>
              <table>
                <tbody>
                  <tr>
                    <th width="35%">Student Name</th>
                    <td>{printPayment.studentFee?.student?.name || "-"}</td>
                  </tr>
                  <tr>
                    <th>Standard / Class</th>
                    <td>{printPayment.studentFee?.student?.standard || "-"}</td>
                  </tr>
                  <tr>
                    <th>Payment Date</th>
                    <td>{new Date(printPayment.paymentDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <th>Payment Mode</th>
                    <td>{printPayment.paymentMode}</td>
                  </tr>
                  {printPayment.termNumber && (
                    <tr>
                      <th>Term</th>
                      <td>Term {printPayment.termNumber}</td>
                    </tr>
                  )}
                  <tr>
                    <th>Amount Paid</th>
                    <td style={{fontSize: '16px', fontWeight: 'bold'}}>
                      ₹{printPayment.amount?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
              {printPayment.remarks && (
                <p><strong>Remarks:</strong> {printPayment.remarks}</p>
              )}
              <div className="footer">
                <div>
                  <div className="sign-line">Student / Parent</div>
                </div>
                <div>
                  <div className="sign-line">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeesDashboardPage;
