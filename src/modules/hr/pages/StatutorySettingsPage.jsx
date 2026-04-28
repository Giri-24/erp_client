import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Spin, message, Space, Card, Tag, Divider } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import axios from '../../../utils/axios';

const StatutorySettingsPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/hr/statutory/staff');
      setStaffList(response.data);
    } catch (error) {
      message.error('Failed to fetch staff list');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (staff) => {
    setSelectedStaff(staff);
    form.setFieldsValue({
      pfNumber: staff.pfNumber || '',
      uanNumber: staff.uanNumber || '',
      esiNumber: staff.esiNumber || '',
      basicSalary: staff.basicSalary || '',
      grossSalary: staff.grossSalary || '',
      pfEnabled: staff.pfEnabled !== false,
      esiEnabled: staff.esiEnabled !== false,
      psfEnabled: staff.psfEnabled !== false,
      isStipend: staff.isStipend === true,
      dailyRate: staff.dailyRate || '',
    });
    setEditingStaffId(staff.staffId);
    setEditModalVisible(true);
  };

  const handleUpdateSettings = async (values) => {
    try {
      await axios.put(`/hr/statutory/staff/${editingStaffId}`, {
        pfNumber: values.pfNumber || null,
        uanNumber: values.uanNumber || null,
        esiNumber: values.esiNumber || null,
        basicSalary: values.basicSalary ? parseFloat(values.basicSalary) : null,
        grossSalary: values.grossSalary ? parseFloat(values.grossSalary) : null,
        pfEnabled: values.pfEnabled,
        esiEnabled: values.esiEnabled,
        psfEnabled: values.psfEnabled,
        isStipend: values.isStipend,
        dailyRate: values.dailyRate ? parseFloat(values.dailyRate) : null,
      });
      message.success('Statutory settings updated successfully');
      setEditModalVisible(false);
      form.resetFields();
      fetchStaffList();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update settings');
    }
  };

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: ['staff', 'employeeId'],
      key: 'employeeId',
      width: 120,
      fixed: 'left',
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
      title: 'Designation',
      dataIndex: ['staff', 'designation'],
      key: 'designation',
      width: 120,
    },
    {
      title: 'PF',
      key: 'pf',
      width: 80,
      render: (_, record) => (
        <Tag color={record.pfEnabled ? 'green' : 'red'}>
          {record.pfEnabled ? 'ENABLED' : 'DISABLED'}
        </Tag>
      ),
    },
    {
      title: 'ESI',
      key: 'esi',
      width: 80,
      render: (_, record) => (
        <Tag color={record.esiEnabled ? 'green' : 'red'}>
          {record.esiEnabled ? 'ENABLED' : 'DISABLED'}
        </Tag>
      ),
    },
    {
      title: 'PSF',
      key: 'psf',
      width: 80,
      render: (_, record) => (
        <Tag color={record.psfEnabled ? 'green' : 'red'}>
          {record.psfEnabled ? 'ENABLED' : 'DISABLED'}
        </Tag>
      ),
    },
    {
      title: 'PF Number',
      dataIndex: 'pfNumber',
      key: 'pfNumber',
      width: 130,
    },
    {
      title: 'UAN',
      dataIndex: 'uanNumber',
      key: 'uanNumber',
      width: 130,
    },
    {
      title: 'ESI Number',
      dataIndex: 'esiNumber',
      key: 'esiNumber',
      width: 130,
    },
    {
      title: 'Gross Salary',
      dataIndex: 'grossSalary',
      key: 'grossSalary',
      render: (val) => (val ? `₹${val.toLocaleString('en-IN')}` : '-'),
      width: 120,
    },
    {
      title: 'Stipend',
      dataIndex: 'isStipend',
      key: 'isStipend',
      render: (val) => (
        <Tag color={val ? 'orange' : 'blue'}>
          {val ? 'YES' : 'NO'}
        </Tag>
      ),
      width: 80,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleEditClick(record)}
          icon={<EditOutlined />}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2>Staff Statutory Deduction Settings</h2>
      
      <Card style={{ marginBottom: '24px', backgroundColor: '#f0f5ff' }}>
        <p>
          <strong>Manage individual staff member statutory deductions:</strong>
        </p>
        <ul>
          <li><strong>PF (Provident Fund)</strong> - Enable/Disable PF contribution per staff</li>
          <li><strong>ESI (Employees' State Insurance)</strong> - Enable/Disable ESI per staff</li>
          <li><strong>PSF (Professional Services Fund)</strong> - Enable/Disable PSF deduction per staff</li>
        </ul>
        <p style={{ color: '#666' }}>
          Disabling these options will exclude the staff member from payroll deductions starting next month.
        </p>
      </Card>

      <Space style={{ marginBottom: '16px' }}>
        <Button type="primary" onClick={fetchStaffList} loading={loading}>
          Refresh
        </Button>
      </Space>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={staffList}
          rowKey={(record) => record.staffId}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
        />
      </Spin>

      {/* Edit Modal */}
      <Modal
        title={`Edit Statutory Settings - ${selectedStaff?.staff?.name || ''}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
          setEditingStaffId(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateSettings}>
          <Form.Item>
            <Card style={{ backgroundColor: '#fafafa' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong>Employee ID:</strong> {selectedStaff?.staff?.employeeId}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Name:</strong> {selectedStaff?.staff?.name}
              </div>
              <div>
                <strong>Department:</strong> {selectedStaff?.staff?.department}
              </div>
            </Card>
          </Form.Item>

          <Form.Item
            label={<strong>Statutory Deductions</strong>}
          >
            <div style={{ display: 'flex', gap: '24px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
              <Form.Item label="PF Enabled" name="pfEnabled" valuePropName="checked" noStyle>
                <Switch checkedChildren="✓" unCheckedChildren="✗" />
              </Form.Item>

              <Form.Item label="ESI Enabled" name="esiEnabled" valuePropName="checked" noStyle>
                <Switch checkedChildren="✓" unCheckedChildren="✗" />
              </Form.Item>

              <Form.Item label="PSF Enabled" name="psfEnabled" valuePropName="checked" noStyle>
                <Switch checkedChildren="✓" unCheckedChildren="✗" />
              </Form.Item>
            </div>
          </Form.Item>

          <Divider />

          <h3>Statutory Numbers</h3>
          
          <Form.Item
            label="PF Number"
            name="pfNumber"
          >
            <Input placeholder="PF Account Number" />
          </Form.Item>

          <Form.Item
            label="UAN Number (Universal Account Number)"
            name="uanNumber"
          >
            <Input placeholder="12 digit UAN" />
          </Form.Item>

          <Form.Item
            label="ESI Number"
            name="esiNumber"
          >
            <Input placeholder="ESI Account Number" />
          </Form.Item>

          <Divider />

          <h3>Salary Configuration</h3>

          <Form.Item
            label="Basic Salary"
            name="basicSalary"
          >
            <Input type="number" placeholder="₹0" />
          </Form.Item>

          <Form.Item
            label="Gross Salary"
            name="grossSalary"
          >
            <Input type="number" placeholder="₹0" />
          </Form.Item>

          <Form.Item
            label="Daily Rate (For daily-wage staff)"
            name="dailyRate"
          >
            <Input type="number" placeholder="₹0" />
          </Form.Item>

          <Form.Item
            label="Stipend Staff"
            name="isStipend"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Yes"
              unCheckedChildren="No"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
              >
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StatutorySettingsPage;
