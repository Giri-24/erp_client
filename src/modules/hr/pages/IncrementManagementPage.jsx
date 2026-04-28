import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, Tabs, Spin, message, Popconfirm } from 'antd';
import { EditOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from '../../../utils/axios';
import { exportToCSV } from '../../pos/exportCsv';

const IncrementManagementPage = () => {
  const [increments, setIncrements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedIncrement, setSelectedIncrement] = useState(null);
  const [form] = Form.useForm();
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchIncrements();
    fetchStaff();
  }, []);

  const fetchIncrements = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/hr/increment/all');
      setIncrements(response.data);
    } catch (error) {
      message.error('Failed to fetch increments');
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

  const handleStaffChange = (staffId) => {
    const selectedStaff = staffList.find((staff) => staff.id === staffId);
    form.setFieldsValue({ fromSalary: Number(selectedStaff?.salary || 0) });
  };

  const handleCreateIncrement = async (values) => {
    try {
      await axios.post('/hr/increment', {
        staffId: values.staffId,
        fromSalary: values.fromSalary,
        toSalary: values.toSalary,
        incrementDate: values.incrementDate.format('YYYY-MM-DD'),
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        reason: values.reason,
      });
      message.success('Increment request created successfully');
      setModalVisible(false);
      form.resetFields();
      fetchIncrements();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create increment');
    }
  };

  const handleApprove = async (values) => {
    try {
      await axios.put(`/hr/increment/${selectedIncrement.id}/approve`, {
        approvedBy: values.approvedBy,
        notes: values.notes,
      });
      message.success('Increment approved successfully');
      setApproveModalVisible(false);
      approveForm.resetFields();
      fetchIncrements();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to approve increment');
    }
  };

  const handleReject = async (values) => {
    try {
      await axios.put(`/hr/increment/${selectedIncrement.id}/reject`, {
        rejectedBy: values.rejectedBy,
        rejectionReason: values.rejectionReason,
      });
      message.success('Increment rejected successfully');
      setRejectModalVisible(false);
      rejectForm.resetFields();
      fetchIncrements();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to reject increment');
    }
  };

  const getFilteredIncrements = () => {
    if (activeTab === 'all') return increments;
    return increments.filter((inc) => inc.status === activeTab.toUpperCase());
  };

  const handleExportCsv = () => {
    const filtered = getFilteredIncrements();
    if (!filtered.length) {
      message.warning('No increment records available to export');
      return;
    }

    exportToCSV(
      filtered,
      [
        { key: (row) => row.staff?.employeeId || '', label: 'Employee ID' },
        { key: (row) => row.staff?.name || '', label: 'Staff Name' },
        { key: (row) => row.staff?.department || '', label: 'Department' },
        { key: (row) => row.fromSalary ?? 0, label: 'From Salary' },
        { key: (row) => row.toSalary ?? 0, label: 'To Salary' },
        { key: (row) => row.incrementAmount ?? 0, label: 'Increment Amount' },
        { key: (row) => (row.incrementDate ? dayjs(row.incrementDate).format('YYYY-MM-DD') : ''), label: 'Increment Date' },
        { key: (row) => (row.effectiveDate ? dayjs(row.effectiveDate).format('YYYY-MM-DD') : ''), label: 'Effective Date' },
        { key: (row) => row.status || '', label: 'Status' },
      ],
      `increment_${activeTab}`,
    );
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
      title: 'Department',
      dataIndex: ['staff', 'department'],
      key: 'department',
      width: 130,
    },
    {
      title: 'From Salary',
      dataIndex: 'fromSalary',
      key: 'fromSalary',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 120,
    },
    {
      title: 'To Salary',
      dataIndex: 'toSalary',
      key: 'toSalary',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 120,
    },
    {
      title: 'Increment Amount',
      dataIndex: 'incrementAmount',
      key: 'incrementAmount',
      render: (val) => `₹${val?.toLocaleString('en-IN') || 0}`,
      width: 130,
    },
    {
      title: 'Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (val) => dayjs(val).format('DD-MMM-YYYY'),
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { PENDING: 'blue', APPROVED: 'green', REJECTED: 'red', APPLIED: 'green' };
        return <span style={{ color: colors[status] || 'black' }}>{status}</span>;
      },
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {record.status === 'PENDING' && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  setSelectedIncrement(record);
                  setApproveModalVisible(true);
                }}
                icon={<CheckCircleOutlined />}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                onClick={() => {
                  setSelectedIncrement(record);
                  setRejectModalVisible(true);
                }}
                icon={<CloseCircleOutlined />}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2>Salary Increment Management</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: '16px' }}>
        <Button
          type="primary"
          onClick={() => setModalVisible(true)}
          icon={<EditOutlined />}
        >
          Create New Increment
        </Button>
        <Button
          onClick={handleExportCsv}
          icon={<DownloadOutlined />}
        >
          Export CSV
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { label: 'All', key: 'all' },
          { label: 'Pending', key: 'pending' },
          { label: 'Approved', key: 'approved' },
          { label: 'Applied', key: 'applied' },
          { label: 'Rejected', key: 'rejected' },
        ]}
      />

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={getFilteredIncrements()}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          style={{ marginTop: '16px' }}
        />
      </Spin>

      {/* Create Increment Modal */}
      <Modal
        title="Create Salary Increment"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateIncrement}>
          <Form.Item
            label="Staff Member"
            name="staffId"
            rules={[{ required: true, message: 'Please select a staff member' }]}
          >
            <Select placeholder="Select staff" onChange={handleStaffChange}>
              {staffList.map((staff) => (
                <Select.Option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.employeeId})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Current Salary"
            name="fromSalary"
            rules={[{ required: true, message: 'Please enter current salary' }]}
          >
            <Input type="number" placeholder="Auto-filled from staff salary" disabled />
          </Form.Item>

          <Form.Item
            label="New Salary"
            name="toSalary"
            rules={[{ required: true, message: 'Please enter new salary' }]}
          >
            <Input type="number" placeholder="₹0" />
          </Form.Item>

          <Form.Item
            label="Increment Date"
            name="incrementDate"
            rules={[{ required: true, message: 'Please select increment date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Effective From"
            name="effectiveDate"
            rules={[{ required: true, message: 'Please select effective date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Reason" name="reason">
            <Input.TextArea rows={3} placeholder="Reason for increment" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Submit Request
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Approve Modal */}
      <Modal
        title="Approve Increment"
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false);
          approveForm.resetFields();
        }}
        footer={null}
      >
        <Form form={approveForm} layout="vertical" onFinish={handleApprove}>
          <Form.Item
            label="Approved By (User ID)"
            name="approvedBy"
            rules={[{ required: true, message: 'Please enter approver ID' }]}
          >
            <Input placeholder="User ID / Email" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Approval notes" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Approve
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Increment"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
        }}
        footer={null}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item
            label="Rejected By (User ID)"
            name="rejectedBy"
            rules={[{ required: true, message: 'Please enter rejector ID' }]}
          >
            <Input placeholder="User ID / Email" />
          </Form.Item>

          <Form.Item
            label="Rejection Reason"
            name="rejectionReason"
            rules={[{ required: true, message: 'Please provide rejection reason' }]}
          >
            <Input.TextArea rows={3} placeholder="Reason for rejection" />
          </Form.Item>

          <Form.Item>
            <Button danger htmlType="submit" block>
              Reject
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IncrementManagementPage;
