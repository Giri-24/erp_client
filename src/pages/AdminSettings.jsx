import React, { useEffect, useState } from 'react';
import { Form, Input, Switch, Button, message, Row, Col, Checkbox, Typography, Select, Table, Space, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getAdminSettings,
  updateAdminSettings,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissions,
  getFeeReceiptFields,
  updateFeeReceiptFields,
} from '../modules/settings/settings.service';

const AdminSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsConfig, setPermissionsConfig] = useState({
    roles: [],
    permissions: [],
    rolePermissions: {},
  });
  const [userPermissionsLoading, setUserPermissionsLoading] = useState(false);
  const [userPermissionsSaving, setUserPermissionsSaving] = useState(false);
  const [userPermissionsConfig, setUserPermissionsConfig] = useState({
    users: [],
    permissions: [],
    userPermissionOverrides: {},
  });
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [feeReceiptFields, setFeeReceiptFields] = useState({});
  const [feeReceiptLoading, setFeeReceiptLoading] = useState(false);
  const [feeReceiptSaving, setFeeReceiptSaving] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAdminSettings();
      form.setFieldsValue(data);
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const data = await getRolePermissions();
      setPermissionsConfig({
        roles: data.roles || [],
        permissions: data.permissions || [],
        rolePermissions: data.rolePermissions || {},
      });
    } catch {
      message.error('Failed to load role permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      setUserPermissionsLoading(true);
      const data = await getUserPermissions();
      setUserPermissionsConfig({
        users: data.users || [],
        permissions: data.permissions || [],
        userPermissionOverrides: data.userPermissionOverrides || {},
      });
      if (!selectedUserId && data.users?.length > 0) {
        setSelectedUserId(String(data.users[0].id));
      }
    } catch {
      message.error('Failed to load user permission overrides');
    } finally {
      setUserPermissionsLoading(false);
    }
  };

  const loadFeeReceiptFields = async () => {
    try {
      setFeeReceiptLoading(true);
      const data = await getFeeReceiptFields();
      setFeeReceiptFields(data || {});
    } catch {
      message.error('Failed to load fee receipt fields');
    } finally {
      setFeeReceiptLoading(false);
    }
  };

  const onSaveFeeReceiptFields = async () => {
    try {
      setFeeReceiptSaving(true);
      await updateFeeReceiptFields(feeReceiptFields);
      message.success('Fee receipt fields updated');
    } catch {
      message.error('Failed to save fee receipt fields');
    } finally {
      setFeeReceiptSaving(false);
    }
  };

  const handleToggleFeeField = (key, enabled) => {
    setFeeReceiptFields(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }));
  };

  const handleFeeFieldLabelChange = (key, label) => {
    setFeeReceiptFields(prev => ({
      ...prev,
      [key]: { ...prev[key], label },
    }));
  };

  const handleAddCustomFeeField = () => {
    if (!newFieldName || !newFieldLabel) {
      message.error('Please enter field name and label');
      return;
    }
    const key = newFieldName.replace(/\s+/g, '').toLowerCase() + 'Fee';
    if (feeReceiptFields[key]) {
      message.error('Field already exists');
      return;
    }
    const maxOrder = Math.max(0, ...Object.values(feeReceiptFields).map(f => f.order || 0));
    setFeeReceiptFields(prev => ({
      ...prev,
      [key]: { label: newFieldLabel, enabled: true, order: maxOrder + 1 },
    }));
    setNewFieldName('');
    setNewFieldLabel('');
  };

  const handleRemoveFeeField = (key) => {
    setFeeReceiptFields(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  useEffect(() => {
    loadSettings();
    loadPermissions();
    loadUserPermissions();
    loadFeeReceiptFields();
  }, []);

  const onFinish = async (values) => {
    try {
      setSaving(true);
      await updateAdminSettings(values);
      message.success('Settings updated');
      await loadSettings();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const onRolePermissionChange = (role, checkedPermissions) => {
    setPermissionsConfig((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [role]: checkedPermissions,
      },
    }));
  };

  const onSavePermissions = async () => {
    try {
      setPermissionsSaving(true);
      await updateRolePermissions({ rolePermissions: permissionsConfig.rolePermissions });
      message.success('Role permissions updated');
      await loadPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update role permissions');
    } finally {
      setPermissionsSaving(false);
    }
  };

  const selectedUserOverride = selectedUserId
    ? userPermissionsConfig.userPermissionOverrides?.[selectedUserId] || { grants: [], revokes: [] }
    : { grants: [], revokes: [] };

  const onUserOverrideChange = (key, values) => {
    if (!selectedUserId) return;
    setUserPermissionsConfig((prev) => ({
      ...prev,
      userPermissionOverrides: {
        ...prev.userPermissionOverrides,
        [selectedUserId]: {
          grants: key === 'grants' ? values : prev.userPermissionOverrides?.[selectedUserId]?.grants || [],
          revokes: key === 'revokes' ? values : prev.userPermissionOverrides?.[selectedUserId]?.revokes || [],
        },
      },
    }));
  };

  const onSaveUserPermissions = async () => {
    if (!selectedUserId) {
      message.error('Select a user');
      return;
    }
    try {
      setUserPermissionsSaving(true);
      const override = userPermissionsConfig.userPermissionOverrides?.[selectedUserId] || {
        grants: [],
        revokes: [],
      };
      await updateUserPermissions(selectedUserId, override);
      message.success('User permission override updated');
      await loadUserPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update user permissions');
    } finally {
      setUserPermissionsSaving(false);
    }
  };

  return (
    <div>
      {/* Editorial page header */}
      <div style={{ marginBottom: 32 }}>
        <div className="page-breadcrumb">
          <span>System</span>
          <span style={{ fontSize: 14 }}>›</span>
          <span style={{ color: '#00152a', fontWeight: 700 }}>Settings</span>
        </div>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Admin Settings
        </h2>
        <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
          Configure school details, modules, permissions, and fee receipts.
        </p>
      </div>

      {/* School Settings Section */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>School Configuration</h4>
          </div>
          <Spin spinning={loading}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="schoolName" label="School Name" rules={[{ required: true, message: 'Required' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="schoolCode" label="School Code" rules={[{ required: true, message: 'Required' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="academicYear" label="Academic Year" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="2026-2027" />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
              <span style={{ width: 3, height: 20, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#43474d' }}>Admissions</span>
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="requireApprovalForAdmission" label="Require Approval For Admission" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="allowAdmissionEditAfterApproval" label="Allow Edit After Approval" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="admissionNoAutoGenerate" label="Auto-Generate Admission No" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
              <span style={{ width: 3, height: 20, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#43474d' }}>Modules</span>
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="enableFeesModule" label="Enable Fees Module" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="enableTransportModule" label="Enable Transport Module" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="enableStaffModule" label="Enable Staff Module" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" htmlType="submit" loading={saving}>
              Save Settings
            </Button>
          </Form>
          </Spin>
        </div>
      </div>

      {/* Role Permissions Section */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Role Permissions</h4>
          </div>
          <p style={{ color: '#43474d', fontSize: 13, marginBottom: 20, fontFamily: "'Public Sans', sans-serif" }}>
            Configure predefined permissions per role. Changes apply to future authorization checks and new logins.
          </p>

          <Spin spinning={permissionsLoading}>
          {permissionsConfig.roles.map((role) => (
            <div key={role} style={{ marginBottom: 20, padding: 16, background: '#f6fafe', borderRadius: 12 }}>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#00152a', fontSize: 14 }}>{role}</span>
              <div style={{ marginTop: 10 }}>
                <Checkbox.Group
                  value={permissionsConfig.rolePermissions?.[role] || []}
                  onChange={(checked) => onRolePermissionChange(role, checked)}
                >
                  <Row gutter={[12, 8]}>
                    {permissionsConfig.permissions.map((permission) => (
                      <Col key={`${role}-${permission}`} xs={24} sm={12} md={8} lg={6}>
                        <Checkbox value={permission}>{permission}</Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </div>
            </div>
          ))}
          <Button type="primary" onClick={onSavePermissions} loading={permissionsSaving}>
            Save Role Permissions
          </Button>
          </Spin>
        </div>
      </div>

      {/* User Permission Overrides */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>User Permission Overrides</h4>
          </div>
          <p style={{ color: '#43474d', fontSize: 13, marginBottom: 20, fontFamily: "'Public Sans', sans-serif" }}>
            Apply extra grants or revokes for specific users without changing their role defaults.
          </p>

          <Spin spinning={userPermissionsLoading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Typography.Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#43474d' }}>User</Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={selectedUserId}
                onChange={(value) => setSelectedUserId(String(value))}
                placeholder="Select user"
                options={userPermissionsConfig.users.map((u) => ({
                  value: String(u.id),
                  label: `${u.name} (${u.email}) - ${u.role}${u.isActive ? '' : ' [Inactive]'}`,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Typography.Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#43474d' }}>Extra Grants</Typography.Text>
              <Select
                mode="multiple"
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Select permissions"
                value={selectedUserOverride.grants}
                onChange={(values) => onUserOverrideChange('grants', values)}
                options={userPermissionsConfig.permissions.map((p) => ({ value: p, label: p }))}
              />
            </Col>
            <Col span={12}>
              <Typography.Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#43474d' }}>Revoked Permissions</Typography.Text>
              <Select
                mode="multiple"
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Select permissions to revoke"
                value={selectedUserOverride.revokes}
                onChange={(values) => onUserOverrideChange('revokes', values)}
                options={userPermissionsConfig.permissions.map((p) => ({ value: p, label: p }))}
              />
            </Col>
          </Row>

          <Button style={{ marginTop: 16 }} type="primary" onClick={onSaveUserPermissions} loading={userPermissionsSaving}>
            Save User Overrides
          </Button>
          </Spin>
        </div>
      </div>

      {/* Fee Receipt Field Configuration */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Fee Receipt Fields</h4>
          </div>
          <p style={{ color: '#43474d', fontSize: 13, marginBottom: 20, fontFamily: "'Public Sans', sans-serif" }}>
            Select which fee fields appear on receipts shown to parents.
          </p>

          <Spin spinning={feeReceiptLoading}>
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            dataSource={Object.entries(feeReceiptFields)
              .map(([key, val]) => ({ key, ...val }))
              .sort((a, b) => (a.order || 0) - (b.order || 0))}
            columns={[
              {
                title: 'Order',
                dataIndex: 'order',
                width: 70,
                render: (val) => val || '-',
              },
              {
                title: 'Field Key',
                dataIndex: 'key',
                width: 160,
              },
              {
                title: 'Display Label',
                dataIndex: 'label',
                render: (val, record) => (
                  <Input
                    size="small"
                    value={val}
                    onChange={(e) => handleFeeFieldLabelChange(record.key, e.target.value)}
                    style={{ width: 200 }}
                  />
                ),
              },
              {
                title: 'Show on Receipt',
                dataIndex: 'enabled',
                width: 130,
                render: (val, record) => (
                  <Switch
                    checked={val}
                    onChange={(checked) => handleToggleFeeField(record.key, checked)}
                  />
                ),
              },
              {
                title: '',
                width: 60,
                render: (_, record) => (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleRemoveFeeField(record.key)}
                  />
                ),
              },
            ]}
          />

          <Row gutter={12} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Input
                placeholder="Field name (e.g. Lab)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
            </Col>
            <Col span={6}>
              <Input
                placeholder="Label (e.g. Lab Fee)"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
              />
            </Col>
            <Col>
              <Button icon={<PlusOutlined />} onClick={handleAddCustomFeeField}>
                Add Custom Field
              </Button>
            </Col>
          </Row>

          <Button style={{ marginTop: 16 }} type="primary" onClick={onSaveFeeReceiptFields} loading={feeReceiptSaving}>
            Save Fee Receipt Fields
          </Button>
          </Spin>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
