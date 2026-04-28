import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, Tabs, Spin, message, Card, Row, Col, Calendar, Badge } from 'antd';
import { DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from '../../../utils/axios';

const LoanManagementPage = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [preCloseModalVisible, setPreCloseModalVisible] = useState(false);
  const [skipEMIModalVisible, setSkipEMIModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form] = Form.useForm();
  const [preCloseForm] = Form.useForm();
  const [skipForm] = Form.useForm();
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('ACTIVE');

  useEffect(() => {
    fetchLoans();
    fetchStaff();
  }, []);

  const fetchLoans = async (status = 'ACTIVE') => {
    try {
      setLoading(true);
      const response = await axios.get(`/hr/loan-by-status/${status}`);
      setLoans(response.data);
    } catch (error) {
      message.error('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/hr/staff-list');
      setStaffList(response.data);
    } catch (error) {
      console.error('Failed to fetch staff list');
    }
  };

  const handleCreateLoan = async (values) => {
    try {
      await axios.post('/hr/loan', {
        staffId: values.staffId,
        loanAmount: values.loanAmount,
        emiAmount: values.emiAmount,
        emiFrequency: values.emiFrequency || 'MONTHLY',
        startMonth: values.startMonth.format('YYYY-MM'),
        reason: values.reason,
      });
      message.success('Loan created successfully');
      setCreateModalVisible(false);
      form.resetFields();
      fetchLoans(activeTab);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create loan');
    }
  };

  const handleSkipEMI = async (values) => {
    try {
      await axios.put(`/hr/loan/${selectedLoan.id}/skip-emi`, {
        month: values.month.format('YYYY-MM'),
        reason: values.reason,
      });
      message.success('EMI month skipped successfully');
      setSkipEMIModalVisible(false);
      skipForm.resetFields();
      fetchLoans(activeTab);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to skip EMI');
    }
  };

  const handleResumeEMI = async (month) => {
    try {
      await axios.put(`/hr/loan/${selectedLoan.id}/resume-emi`, { month });
      message.success('EMI resumed successfully');
      fetchLoans(activeTab);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to resume EMI');
    }
  };

  const handlePreClose = async (values) => {
    try {
      await axios.put(`/hr/loan/${selectedLoan.id}/pre-close`, {
        partialAmount: values.partialAmount ? parseFloat(values.partialAmount) : undefined,
        reason: values.reason,
      });
      message.success('Loan pre-closed successfully');
      setPreCloseModalVisible(false);
      preCloseForm.resetFields();
      fetchLoans(activeTab);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to pre-close loan');
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    fetchLoans(key);
  };

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: ['staff', 'employeeId'],
      key: 'employeeId',
      width: 120,
    },
    {
      title: 'Staff Name',
      dataIndex: ['staff', 'name'],
      key: 'name',
      width: 150,
    },
    {
      title: 'Loan Amount',
      dataIndex: 'loanAmount',
      key: 'loanAmount',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 120,
    },
    {
      title: 'EMI Amount',
      dataIndex: 'emiAmount',
      key: 'emiAmount',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 110,
    },
    {
      title: 'Total Paid',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 110,
    },
    {
      title: 'Balance',
      dataIndex: 'balanceRemaining',
      key: 'balanceRemaining',
      render: (val) => (
        <span style={{ color: val > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
          ₹{val?.toLocaleString('en-IN') || 0}
        </span>
      ),
      width: 110,
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => `${record.startMonth} to ${record.endMonth}`,
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { ACTIVE: 'green', PAUSED: 'orange', PRE_CLOSED: 'blue', CLOSED: 'gray', REJECTED: 'red' };
        return <Badge status={{ ACTIVE: 'success', PAUSED: 'warning', PRE_CLOSED: 'processing', CLOSED: 'default', REJECTED: 'error' }[status] || 'default'} text={status} />;
      },
      width: 110,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {record.status === 'ACTIVE' && (
            <>
              <Button
                size="small"
                onClick={() => {
                  setSelectedLoan(record);
                  setSkipEMIModalVisible(true);
                }}
                icon={<PauseCircleOutlined />}
              >
                Skip EMI
              </Button>
              <Button
                size="small"
                danger
                onClick={() => {
                  setSelectedLoan(record);
                  setPreCloseModalVisible(true);
                }}
                icon={<DollarOutlined />}
              >
                Pre-Close
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const renderSkippedMonths = (loan) => {
    const skipped = JSON.parse(loan.skipMonths || '[]');
    return (
      <div style={{ marginTop: '12px' }}>
        <strong>Skipped Months:</strong>
        {skipped.length === 0 ? (
          <p>None</p>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {skipped.map((month) => (
              <Badge key={month} color="orange" text={month} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>Staff Loan Management</h2>
      <Button
        type="primary"
        onClick={() => setCreateModalVisible(true)}
        style={{ marginBottom: '16px' }}
        icon={<DollarOutlined />}
      >
        Create New Loan
      </Button>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { label: 'Active', key: 'ACTIVE' },
          { label: 'Paused', key: 'PAUSED' },
          { label: 'Pre-Closed', key: 'PRE_CLOSED' },
          { label: 'Closed', key: 'CLOSED' },
          { label: 'Rejected', key: 'REJECTED' },
        ]}
      />

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={loans}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          style={{ marginTop: '16px' }}
          expandable={{
            expandedRowRender: (record) => (
              <div>
                <Row gutter={16} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <p>
                      <strong>Loan ID:</strong> {record.id}
                    </p>
                    <p>
                      <strong>EMI Frequency:</strong> {record.emiFrequency}
                    </p>
                  </Col>
                  <Col span={12}>
                    <p>
                      <strong>Reason:</strong> {record.reason || 'N/A'}
                    </p>
                  </Col>
                </Row>
                {renderSkippedMonths(record)}
                {record.emiTransactions && record.emiTransactions.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong>EMI Schedule:</strong>
                    <Table
                      columns={[
                        { title: 'Month', dataIndex: 'month', width: 100 },
                        { title: 'EMI Due', dataIndex: 'emiDue', render: (val) => `₹${val}` },
                        { title: 'Paid', dataIndex: 'emiPaid', render: (val) => `₹${val}` },
                        { title: 'Status', dataIndex: 'status', render: (status) => <Badge color={status === 'PAID' ? 'green' : status === 'SKIPPED' ? 'orange' : 'red'} text={status} /> },
                      ]}
                      dataSource={record.emiTransactions}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </div>
                )}
              </div>
            ),
          }}
        />
      </Spin>

      {/* Create Loan Modal */}
      <Modal
        title="Create Staff Loan"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateLoan}>
          <Form.Item
            label="Staff Member"
            name="staffId"
            rules={[{ required: true, message: 'Please select a staff member' }]}
          >
            <Select placeholder="Select staff">
              {staffList.map((staff) => (
                <Select.Option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.employeeId})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Total Loan Amount"
            name="loanAmount"
            rules={[{ required: true, message: 'Please enter loan amount' }]}
          >
            <Input type="number" placeholder="₹0" min="1000" />
          </Form.Item>

          <Form.Item
            label="Monthly EMI Amount"
            name="emiAmount"
            rules={[{ required: true, message: 'Please enter EMI amount' }]}
          >
            <Input type="number" placeholder="₹0" min="100" />
          </Form.Item>

          <Form.Item
            label="EMI Frequency"
            name="emiFrequency"
            initialValue="MONTHLY"
          >
            <Select>
              <Select.Option value="MONTHLY">Monthly</Select.Option>
              <Select.Option value="BI_WEEKLY">Bi-Weekly</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Start Month"
            name="startMonth"
            rules={[{ required: true, message: 'Please select start month' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Reason" name="reason">
            <Input.TextArea rows={3} placeholder="Reason for loan" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create Loan
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Skip EMI Modal */}
      <Modal
        title="Skip EMI for a Month"
        open={skipEMIModalVisible}
        onCancel={() => {
          setSkipEMIModalVisible(false);
          skipForm.resetFields();
        }}
        footer={null}
      >
        <Form form={skipForm} layout="vertical" onFinish={handleSkipEMI}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            <strong>Loan:</strong> ₹{selectedLoan?.loanAmount} | <strong>EMI:</strong> ₹{selectedLoan?.emiAmount}
          </p>

          <Form.Item
            label="Select Month to Skip"
            name="month"
            rules={[{ required: true, message: 'Please select a month' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Reason" name="reason">
            <Input.TextArea rows={3} placeholder="Reason for skipping EMI" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Skip EMI
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Pre-Close Modal */}
      <Modal
        title="Pre-Close Loan"
        open={preCloseModalVisible}
        onCancel={() => {
          setPreCloseModalVisible(false);
          preCloseForm.resetFields();
        }}
        footer={null}
      >
        <Form form={preCloseForm} layout="vertical" onFinish={handlePreClose}>
          <Card style={{ marginBottom: '16px', backgroundColor: '#f5f5f5' }}>
            <Row gutter={16}>
              <Col span={12}>
                <p>
                  <strong>Total Loan:</strong>
                  <br />₹{selectedLoan?.loanAmount?.toLocaleString('en-IN')}
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>Balance Remaining:</strong>
                  <br />₹{selectedLoan?.balanceRemaining?.toLocaleString('en-IN')}
                </p>
              </Col>
            </Row>
          </Card>

          <Form.Item label="Amount to Pay (Leave empty to pay full balance)" name="partialAmount">
            <Input
              type="number"
              placeholder={`₹${selectedLoan?.balanceRemaining?.toLocaleString('en-IN') || 0}`}
              min="0"
              max={selectedLoan?.balanceRemaining}
            />
          </Form.Item>

          <Form.Item label="Reason for Pre-Closure" name="reason">
            <Input.TextArea rows={3} placeholder="Reason for early closure" />
          </Form.Item>

          <Form.Item>
            <Button danger htmlType="submit" block>
              Pre-Close Loan
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoanManagementPage;
