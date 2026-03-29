import React, { useState, useEffect } from 'react';
import { Form, Select, Button, message, Table, Row, Col, Input, Modal, Alert, Space } from 'antd';
import { SwapOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { promoteStudents, getAdmissionDashboardSummary } from '../admission.service';

const { confirm } = Modal;

const STANDARDS = [
  { value: 'LKG', label: 'LKG' },
  { value: 'UKG', label: 'UKG' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `STD_${i + 1}`,
    label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Standard`,
  })),
];

const PromotionPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [summary, setSummary] = useState(null);

  const loadSummary = async () => {
    try {
      const data = await getAdmissionDashboardSummary(academicYear);
      setSummary(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSummary();
  }, [academicYear]);

  const onPromote = async () => {
    try {
      const values = await form.validateFields();
      const fromLabel = STANDARDS.find(s => s.value === values.fromStandard)?.label;
      const toLabel = STANDARDS.find(s => s.value === values.toStandard)?.label;

      confirm({
        title: 'Confirm Promotion',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>Are you sure you want to promote all approved students from <strong>{fromLabel}</strong> to <strong>{toLabel}</strong>?</p>
            <p>Academic Year: <strong>{academicYear}</strong></p>
            <Alert type="warning" message="This action cannot be easily undone." style={{ marginTop: 8 }} />
          </div>
        ),
        okText: 'Yes, Promote',
        okType: 'primary',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setLoading(true);
            const res = await promoteStudents({
              fromStandard: values.fromStandard,
              toStandard: values.toStandard,
              academicYear,
            });
            setResult(res);
            message.success(`${res.updatedCount} students promoted successfully!`);
            await loadSummary();
          } catch (err) {
            message.error(err?.response?.data?.message || 'Promotion failed');
          } finally {
            setLoading(false);
          }
        },
      });
    } catch {
      message.error('Please select both standards');
    }
  };

  const byStandard = summary?.byStandard || [];

  return (
    <div>
      {/* Editorial page header */}
      <div style={{ marginBottom: 28 }}>
        <div className="page-breadcrumb">
          <span>Admissions</span>
          <span style={{ fontSize: 14 }}>›</span>
          <span style={{ color: '#00152a', fontWeight: 700 }}>Promotion</span>
        </div>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Student Promotion
        </h2>
        <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
          Promote approved students from one standard to the next.
        </p>
      </div>

      <Row gutter={24}>
        <Col span={14}>
          {/* Promote Form */}
          <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Promote Students</h4>
              </div>
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label={<span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#43474d' }}>Academic Year</span>}>
                      <Input
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="2025-26"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="fromStandard" label={<span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#43474d' }}>From Standard</span>} rules={[{ required: true }]}>
                      <Select options={STANDARDS} placeholder="Select" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="toStandard" label={<span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#43474d' }}>To Standard</span>} rules={[{ required: true }]}>
                      <Select options={STANDARDS} placeholder="Select" />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" icon={<SwapOutlined />} onClick={onPromote} loading={loading} size="large">
                  Promote Students
                </Button>
              </Form>

              {result && (
                <div style={{ marginTop: 24, padding: 20, background: '#f6fafe', borderRadius: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#00152a', fontSize: 15 }}>Promotion Result</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'rgba(0, 21, 42, 0.08)', color: '#00152a', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>{result.fromStandard}</span>
                      <SwapOutlined style={{ color: '#43474d' }} />
                      <span style={{ background: 'rgba(68, 221, 193, 0.12)', color: '#005145', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>{result.toStandard}</span>
                    </div>
                    <span style={{ color: '#171c1f', fontSize: 14 }}>Students promoted: <strong>{result.updatedCount}</strong></span>
                    {result.promotedStudents?.length > 0 && (
                      <Table
                        size="small"
                        dataSource={result.promotedStudents}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          { title: 'Student Name', dataIndex: 'name' },
                          { title: 'Student ID', dataIndex: 'id', ellipsis: true },
                        ]}
                      />
                    )}
                  </Space>
                </div>
              )}
            </div>
          </div>
        </Col>

        <Col span={10}>
          {/* Student Count by Standard */}
          <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ width: 3, height: 28, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Current Count by Standard</h4>
              </div>
              <Table
                size="small"
                dataSource={byStandard.map((item, idx) => ({ ...item, key: idx }))}
                columns={[
                  { title: 'Standard', dataIndex: 'standard', render: (v) => <span style={{ fontWeight: 700, color: '#00152a', fontFamily: "'Manrope', sans-serif" }}>{v}</span> },
                  { title: 'Count', dataIndex: 'count', render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
                ]}
                pagination={false}
              />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default PromotionPage;
