import React, { useState, useEffect, useMemo } from 'react';
import { Form, Button, message, Table, Row, Col, Input, Modal, Alert, Space, Tag, Select, Typography, Divider, Card, Result } from 'antd';
import { SwapOutlined, ExclamationCircleOutlined, CalendarOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { promoteStudents, getAdmissionDashboardSummary } from '../admission.service';
import { getAcademicYears, createAcademicYear } from '../../fees/fees.service';
import { usePermissionHelpers, PERMISSIONS } from '../../../utils/permissions';

const { Title, Text } = Typography;
const { confirm } = Modal;

const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;
const normalizeYear = (value) => String(value || "").trim();

const getNextAcademicYear = (academicYear) => {
  const match = String(academicYear || '').match(/(\d{4})\s*[-/]\s*(\d{2,4})/);
  if (!match) return '';
  const startYear = Number(match[1]);
  let endYear = Number(match[2]);
  if (endYear < 100) {
    endYear = Math.floor(startYear / 100) * 100 + endYear;
  }
  return `${endYear}-${endYear + 1}`;
};

const PromotionPage = () => {
  const [promoteForm] = Form.useForm();
  const [createYearForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [summary, setSummary] = useState(null);
  const [academicYear, setAcademicYear] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [result, setResult] = useState(null);
  const [blockingError, setBlockingError] = useState(null);

  const { hasPermission } = usePermissionHelpers();
  // Strictly only allow for Super Admin or specific high-level permission
  const isSuperAdmin = hasPermission(PERMISSIONS.ADMIN_SETTINGS_UPDATE) || hasPermission(PERMISSIONS.SETTINGS_UPDATE); 

  const loadYears = async () => {
    setYearsLoading(true);
    try {
      const data = await getAcademicYears();
      const normalizedYears = Array.isArray(data) ? data : [];
      setYears(normalizedYears);
      if (!academicYear && normalizedYears.length > 0) {
        setAcademicYear(normalizedYears[0]);
      }
    } catch (err) {
      message.error("Failed to load academic years");
    } finally {
      setYearsLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!academicYear) return;
    try {
      const data = await getAdmissionDashboardSummary(academicYear);
      setSummary(data);
    } catch {}
  };

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    loadSummary();
    setNewAcademicYear(getNextAcademicYear(academicYear));
  }, [academicYear]);

  const validateAcademicYear = (_, value) => {
    const year = normalizeYear(value);
    if (!year) return Promise.reject(new Error("Please enter academic year"));
    if (!ACADEMIC_YEAR_PATTERN.test(year)) return Promise.reject(new Error("Use format YYYY-YYYY"));
    const [startYear, endYear] = year.split("-").map(Number);
    if (endYear !== startYear + 1) return Promise.reject(new Error("End year must be start year + 1"));
    return Promise.resolve();
  };

  const handleCreateYear = async (values) => {
    setLoading(true);
    try {
      await createAcademicYear(normalizeYear(values.academicYear));
      message.success("Academic year created successfully");
      createYearForm.resetFields();
      await loadYears();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create academic year");
    } finally {
      setLoading(false);
    }
  };

  const onPromote = async () => {
    confirm({
      title: 'CRITICAL ACTION: Promote All Students',
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      width: 500,
      content: (
        <div style={{ marginTop: 12 }}>
          <Alert 
            type="warning" 
            showIcon 
            message="Irreversible Operation" 
            description="This will update EVERY student record in the school to the next standard. Please ensure all marks and dues are finalized."
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical" size="small">
            <Text>Current Year: <Tag color="blue">{academicYear}</Tag></Text>
            <Text>Target Year: <Tag color="green">{newAcademicYear}</Tag></Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Note: Class 12 students will be moved to alumni/archived status.
            </Text>
          </Space>
        </div>
      ),
      okText: 'Confirm School-Wide Promotion',
      okButtonProps: { danger: true, size: 'large' },
      onOk: async () => {
        setLoading(true);
        try {
          const res = await promoteStudents({ academicYear, newAcademicYear });
          setResult(res);
          setBlockingError(null);
          message.success('All students promoted successfully!');
          await loadSummary();
        } catch (err) {
          const apiMessage = err?.response?.data?.message || 'Operation failed';
          const missingFeeStructures = err?.response?.data?.missingFeeStructures || [];
          setBlockingError(missingFeeStructures.length > 0 ? { message: apiMessage, missingFeeStructures } : null);
          message.error(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Result
          status="403"
          title="Access Restricted"
          subTitle="Only Super Administrators can access the Year-End Promotion tools."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>
          <CalendarOutlined style={{ marginRight: 12 }} />
          Institutional Year-End Dashboard
        </Title>
        <Text type="secondary">Manage academic cycles and school-wide student promotions for the new session.</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Column: Academic Years */}
        <Col span={24} lg={8}>
          <Card title={<Space><CalendarOutlined /> Academic Year Management</Space>} className="shadow-sm">
            <Form form={createYearForm} layout="vertical" onFinish={handleCreateYear}>
              <Form.Item 
                label="New Academic Year" 
                name="academicYear" 
                rules={[{ validator: validateAcademicYear }]}
                extra="Format: YYYY-YYYY (e.g., 2026-2027)"
              >
                <Input placeholder="Enter year range" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Create Year
              </Button>
            </Form>
            
            <Divider />
            
            <Title level={5}>Active Cycles</Title>
            <Table
              size="small"
              dataSource={years.map(y => ({ key: y, year: y }))}
              loading={yearsLoading}
              columns={[{ title: 'Year', dataIndex: 'year', render: (y) => <Tag color="blue">{y}</Tag> }]}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>

        {/* Right Column: Promotion */}
        <Col span={24} lg={16}>
          <Card 
            title={<Space><SwapOutlined /> School-Wide Student Promotion</Space>} 
            extra={<Tag color="gold"><SafetyCertificateOutlined /> SUPER ADMIN ONLY</Tag>}
            className="shadow-sm"
          >
            <Alert 
              type="info" 
              message="Promotion Workflow" 
              description="Bulk Demotion has been removed for safety. Demotions must be handled individually via the Student Profile. Use this tool only to move the entire school to the next session."
              className="mb-6"
              showIcon
            />

            <Form layout="vertical" style={{ marginTop: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Source Academic Year">
                    <Select
                      value={academicYear || undefined}
                      options={years.map((y) => ({ value: y, label: y }))}
                      onChange={setAcademicYear}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Target Academic Year">
                    <Input value={newAcademicYear} disabled style={{ color: '#0d9488', fontWeight: 800 }} />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <Title level={5} style={{ marginTop: 0 }}>Review Promotion Summary</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">Total Students in {academicYear}:</Text>
                    <Title level={3} style={{ margin: 0 }}>{summary?.total || 0}</Title>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Students Eligible for {newAcademicYear}:</Text>
                    <Title level={3} style={{ margin: 0, color: '#0d9488' }}>{summary?.total || 0}</Title>
                  </Col>
                </Row>
              </div>

              <Button 
                type="primary" 
                size="large" 
                icon={<SwapOutlined />} 
                onClick={onPromote} 
                loading={loading}
                block
                style={{ height: '56px', fontSize: '18px', fontWeight: 700 }}
              >
                Promote Entire School to {newAcademicYear}
              </Button>
            </Form>

            {blockingError && (
              <Alert
                style={{ marginTop: 24 }}
                type="error"
                showIcon
                message="Promotion Blocked"
                description={
                  <div>
                    <p>{blockingError.message}</p>
                    <ul style={{ paddingLeft: 16 }}>
                      {blockingError.missingFeeStructures.map(s => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                }
              />
            )}

            {result && (
              <Alert
                style={{ marginTop: 24 }}
                type="success"
                showIcon
                message="Promotion Successful"
                description={`Successfully updated ${result.updatedCount} students to ${newAcademicYear}.`}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PromotionPage;