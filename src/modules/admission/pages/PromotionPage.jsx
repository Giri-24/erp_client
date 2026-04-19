import React, { useState, useEffect } from 'react';
import { Form, Button, message, Table, Row, Col, Input, Modal, Alert, Space } from 'antd';
import { SwapOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { promoteStudents, demoteStudents, getAdmissionDashboardSummary } from '../admission.service';

const { confirm } = Modal;

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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('promote');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [newAcademicYear, setNewAcademicYear] = useState('2026-2027');
  const [summary, setSummary] = useState(null);

  const loadSummary = async () => {
    try {
      const data = await getAdmissionDashboardSummary(academicYear);
      setSummary(data);
    } catch {}
  };

  useEffect(() => {
    loadSummary();
  }, [academicYear]);

  useEffect(() => {
    setNewAcademicYear(getNextAcademicYear(academicYear));
  }, [academicYear]);

  const onPromote = async () => {
    const isDemotion = mode === 'demote';

    confirm({
      title: `Confirm ${isDemotion ? 'Demotion' : 'Promotion'}`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to {isDemotion ? 'demote' : 'promote'} ALL students?</p>
          <p>Academic Year: <strong>{academicYear}</strong></p>
          <Alert type="warning" message="This will update ALL students across all standards." />
          <p style={{ marginTop: 8 }}>
            New Academic Year: <strong>{newAcademicYear}</strong>
          </p>
        </div>
      ),
      onOk: async () => {
        try {
          setLoading(true);

          const payload = {
            academicYear,
            newAcademicYear,
          };

          const res = isDemotion
            ? await demoteStudents(payload)
            : await promoteStudents(payload);

          setResult(res);
          message.success(`All students ${isDemotion ? 'demoted' : 'promoted'} successfully!`);
          await loadSummary();
        } catch (err) {
          message.error('Operation failed');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const byStandard = summary?.byStandard || [];

  return (
    <div>
      <h2 style={{ fontWeight: 800 }}>Student Promotion</h2>
      <p>Promote all students to next standard automatically</p>

      <Row gutter={24}>
        <Col span={14}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12 }}>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <Button
                type={mode === 'promote' ? 'primary' : 'default'}
                onClick={() => setMode('promote')}
              >
                Promote Mode
              </Button>
              <Button
                type={mode === 'demote' ? 'primary' : 'default'}
                danger
                onClick={() => setMode('demote')}
              >
                Demote Mode
              </Button>
            </div>

            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Academic Year">
                    <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item label="New Academic Year">
                    <Input value={newAcademicYear} onChange={(e) => setNewAcademicYear(e.target.value)} />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="primary"
                icon={<SwapOutlined />}
                onClick={onPromote}
                loading={loading}
                size="large"
              >
                {mode === 'demote' ? 'Demote All Students' : 'Promote All Students'}
              </Button>
            </Form>

            {result && (
              <div style={{ marginTop: 20 }}>
                <Space direction="vertical">
                  <strong>Updated Students: {result.updatedCount}</strong>
                  <span>New Academic Year: {result.newAcademicYear}</span>
                </Space>
              </div>
            )}
          </div>
        </Col>

        <Col span={10}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12 }}>
            <h4>Current Count by Standard</h4>
            <Table
              size="small"
              dataSource={byStandard}
              pagination={false}
              columns={[
                { title: 'Standard', dataIndex: 'standard' },
                { title: 'Count', dataIndex: 'count' },
              ]}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default PromotionPage;