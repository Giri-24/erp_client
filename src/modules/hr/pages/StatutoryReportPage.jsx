import React, { useState, useEffect } from 'react';
import { Table, Button, DatePicker, Spin, message, Tabs, Card, Row, Col, Statistic, Space } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import axios from '../../../utils/axios';

const StatutoryReportPage = () => {
  const [pfReport, setPfReport] = useState([]);
  const [nonPfReport, setNonPfReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (month = null) => {
    try {
      setLoading(true);
      const monthStr = month ? month.format('YYYY-MM') : selectedMonth.format('YYYY-MM');

      const [pfRes, nonPfRes] = await Promise.all([
        axios.get(`/hr/report/pf-staff?month=${monthStr}`),
        axios.get(`/hr/report/non-pf-staff?month=${monthStr}`),
      ]);

      setPfReport(pfRes.data);
      setNonPfReport(nonPfRes.data);
    } catch (error) {
      message.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (date) => {
    setSelectedMonth(date);
    fetchReports(date);
  };

  const exportToExcel = (data, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const pfColumns = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 120,
    },
    {
      title: 'Staff Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 130,
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      width: 130,
    },
    {
      title: 'Gross Salary',
      dataIndex: 'grossSalary',
      key: 'grossSalary',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 120,
    },
    {
      title: 'PF Base',
      dataIndex: 'pfBase',
      key: 'pfBase',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 100,
    },
    {
      title: 'PF Deduction',
      dataIndex: 'pfDeduction',
      key: 'pfDeduction',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 120,
    },
    {
      title: 'PF Number',
      dataIndex: 'pfNumber',
      key: 'pfNumber',
      width: 130,
    },
    {
      title: 'UAN Number',
      dataIndex: 'uanNumber',
      key: 'uanNumber',
      width: 130,
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
  ];

  const nonPfColumns = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 120,
    },
    {
      title: 'Staff Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 130,
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      width: 130,
    },
    {
      title: 'Gross Salary',
      dataIndex: 'grossSalary',
      key: 'grossSalary',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 120,
    },
    {
      title: 'PF Base',
      dataIndex: 'pfBase',
      key: 'pfBase',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 100,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
  ];

  const calculatePfTotals = () => {
    return {
      staffCount: pfReport.length,
      totalSalary: pfReport.reduce((sum, r) => sum + (r.grossSalary || 0), 0),
      totalPfDeduction: pfReport.reduce((sum, r) => sum + (r.pfDeduction || 0), 0),
    };
  };

  const calculateNonPfTotals = () => {
    return {
      staffCount: nonPfReport.length,
      totalSalary: nonPfReport.reduce((sum, r) => sum + (r.grossSalary || 0), 0),
    };
  };

  const pfTotals = calculatePfTotals();
  const nonPfTotals = calculateNonPfTotals();

  return (
    <div style={{ padding: '24px' }}>
      <h2>Statutory Reports - PF & Non-PF Staff</h2>

      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <span>
            <strong>Select Month:</strong>
          </span>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={handleMonthChange}
          />
          <Button
            type="primary"
            loading={loading}
            onClick={() => fetchReports()}
            icon={<DownloadOutlined />}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Tabs
          items={[
            {
              label: `PF Contributing Staff (${pfReport.length})`,
              key: 'pf',
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={8}>
                      <Statistic
                        title="Total Staff"
                        value={pfTotals.staffCount}
                        prefix="👥"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total Gross Salary"
                        value={pfTotals.totalSalary}
                        prefix="₹"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total PF Deduction"
                        value={pfTotals.totalPfDeduction}
                        prefix="₹"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  </Row>

                  <Space style={{ marginBottom: '16px' }}>
                    <Button
                      type="primary"
                      icon={<FileExcelOutlined />}
                      onClick={() => {
                        const data = pfReport.map((r) => ({
                          'Employee ID': r.employeeId,
                          'Staff Name': r.name,
                          Department: r.department,
                          Designation: r.designation,
                          'Gross Salary': r.grossSalary,
                          'PF Base': r.pfBase,
                          'PF Deduction': r.pfDeduction,
                          'PF Number': r.pfNumber,
                          'UAN Number': r.uanNumber,
                          Month: r.month,
                        }));
                        exportToExcel(data, `PF_Staff_Report_${selectedMonth.format('YYYY-MM')}`);
                        message.success('Report downloaded successfully');
                      }}
                    >
                      Export to Excel
                    </Button>
                  </Space>

                  <Table
                    columns={pfColumns}
                    dataSource={pfReport}
                    rowKey="employeeId"
                    pagination={{ pageSize: 15 }}
                    scroll={{ x: 1200 }}
                  />
                </div>
              ),
            },
            {
              label: `Non-PF Staff (${nonPfReport.length})`,
              key: 'nonpf',
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={12}>
                      <Statistic
                        title="Total Non-PF Staff"
                        value={nonPfTotals.staffCount}
                        prefix="👥"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Total Gross Salary"
                        value={nonPfTotals.totalSalary}
                        prefix="₹"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                  </Row>

                  <Space style={{ marginBottom: '16px' }}>
                    <Button
                      type="primary"
                      icon={<FileExcelOutlined />}
                      onClick={() => {
                        const data = nonPfReport.map((r) => ({
                          'Employee ID': r.employeeId,
                          'Staff Name': r.name,
                          Department: r.department,
                          Designation: r.designation,
                          'Gross Salary': r.grossSalary,
                          'PF Base': r.pfBase,
                          Reason: r.reason,
                          Month: r.month,
                        }));
                        exportToExcel(data, `NonPF_Staff_Report_${selectedMonth.format('YYYY-MM')}`);
                        message.success('Report downloaded successfully');
                      }}
                    >
                      Export to Excel
                    </Button>
                  </Space>

                  <Table
                    columns={nonPfColumns}
                    dataSource={nonPfReport}
                    rowKey="employeeId"
                    pagination={{ pageSize: 15 }}
                    scroll={{ x: 1000 }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default StatutoryReportPage;
