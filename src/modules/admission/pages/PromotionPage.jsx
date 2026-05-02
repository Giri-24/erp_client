import React, { useState, useEffect } from 'react';
import { Form, Button, message, Table, Row, Col, Input, Modal, Alert, Space, Tag, Select } from 'antd';
import { SwapOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { promoteStudents, demoteStudents, getAdmissionDashboardSummary } from '../admission.service';
import { getAcademicYears } from '../../fees/fees.service';

const { confirm } = Modal;

const DEMOTION_ROLLBACK_OPTIONS = {
  rollbackPromotion: true,
  restorePreviousStandardData: true,
  restorePrePromotionFees: true,
  feeRestoreStrategy: 'PRE_PROMOTION_SNAPSHOT',
};

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
  const [academicYear, setAcademicYear] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [summary, setSummary] = useState(null);
  const [blockingError, setBlockingError] = useState(null);

  const loadSummary = async () => {
    try {
      const data = await getAdmissionDashboardSummary(academicYear);
      setSummary(data);
    } catch {}
  };

  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const years = await getAcademicYears();
        const normalizedYears = Array.isArray(years) ? years.filter(Boolean) : [];
        setAvailableYears(normalizedYears);
        if (!academicYear && normalizedYears.length > 0) {
          setAcademicYear(normalizedYears[0]);
        }
      } catch {
        setAvailableYears([]);
      }
    };

    loadAcademicYears();
  }, [academicYear]);

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
          {isDemotion && (
            <Alert
              style={{ marginTop: 8 }}
              type="info"
              message="Demotion will revert students to pre-promotion data and restore fees from before promotion."
            />
          )}
          {!isDemotion && (
            <Alert
              style={{ marginTop: 8 }}
              type="info"
              message="Class 12 students will be archived after completion (no Class 13 promotion)."
            />
          )}
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
            ...(isDemotion
              ? DEMOTION_ROLLBACK_OPTIONS
              : {}),
          };

          const res = isDemotion
            ? await demoteStudents(payload)
            : await promoteStudents(payload);

          setResult(res);
          setBlockingError(null);
          message.success(
            isDemotion
              ? 'All students demoted and restored to pre-promotion data successfully!'
              : 'All students promoted successfully!'
          );
          await loadSummary();
        } catch (err) {
          const apiMessage = err?.response?.data?.message || 'Operation failed';
          const missingFeeStructures = err?.response?.data?.missingFeeStructures || [];
          if (missingFeeStructures.length > 0) {
            setBlockingError({
              message: apiMessage,
              missingFeeStructures,
            });
          } else {
            setBlockingError(null);
          }
          message.error(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage);
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
      <p style={{ marginTop: -8, color: '#595959' }}>
        Demotion mode restores students to pre-promotion class data and old fee assignments.
      </p>

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
                    <Select
                      value={academicYear || undefined}
                      placeholder="Select academic year"
                      options={availableYears.map((year) => ({ value: year, label: year }))}
                      onChange={(value) => setAcademicYear(value || '')}
                    />
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

            {blockingError && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  type="error"
                  showIcon
                  message="Promotion blocked"
                  description={
                    <div>
                      <p style={{ marginBottom: 8 }}>{blockingError.message}</p>
                      <p style={{ marginBottom: 6 }}>Missing fee structures for:</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {blockingError.missingFeeStructures.map((standard) => (
                          <li key={standard}>{standard}</li>
                        ))}
                      </ul>
                    </div>
                  }
                />
              </div>
            )}

            {result && (
              <div style={{ marginTop: 20 }}>
                <Space direction="vertical">
                  <strong>Updated Students: {result.updatedCount}</strong>
                  <span>New Academic Year: {result.newAcademicYear}</span>
                  {typeof result.archivedCount === 'number' && (
                    <span>Archived (completed Class 12): {result.archivedCount}</span>
                  )}
                  {typeof result.revertedCount === 'number' && (
                    <span>Reverted to previous class data: {result.revertedCount}</span>
                  )}
                  {typeof result.restoredFeeCount === 'number' && (
                    <span>Fee records restored (pre-promotion): {result.restoredFeeCount}</span>
                  )}
                  {typeof result.autoFeeAssignedCount === 'number' && (
                    <span>Fee assigned automatically: {result.autoFeeAssignedCount}</span>
                  )}
                  {typeof result.studentsWithPreviousYearPendingCount === 'number' && (
                    <span>Students with previous-year pending: {result.studentsWithPreviousYearPendingCount}</span>
                  )}
                </Space>

                <div style={{ marginTop: 16 }}>
                  {Array.isArray(result.studentsWithPreviousYearPending) && result.studentsWithPreviousYearPending.length > 0 ? (
                    <>
                      <Alert
                        type="warning"
                        showIcon
                        message={`${result.studentsWithPreviousYearPending.length} student(s) have unpaid dues from ${academicYear}`}
                        description="These students were promoted, but they still have pending dues for the previous academic year. Collect previous-year dues and current-year dues as needed."
                      />
                      <Table
                        style={{ marginTop: 12 }}
                        size="small"
                        rowKey={(row) => row.studentId}
                        pagination={{ pageSize: 10 }}
                        dataSource={result.studentsWithPreviousYearPending}
                        columns={[
                          { title: 'Student', dataIndex: 'name', render: (v) => v || '—' },
                          { title: 'Admission No', dataIndex: 'admissionNo', render: (v) => v || '—' },
                          { title: 'From Standard', dataIndex: 'currentStandard', render: (v) => v || '—' },
                          { title: 'Promoted To', dataIndex: 'promotedToStandard', render: (v) => v || '—' },
                          { title: 'Prev. Year', dataIndex: 'previousAcademicYear' },
                          {
                            title: 'Pending Amount',
                            dataIndex: 'pendingAmount',
                            render: (v, row) => (
                              <span>
                                <span style={{ color: '#cf1322', fontWeight: 600 }}>
                                  ₹{Number(v || 0).toLocaleString('en-IN')}
                                </span>
                                {row.feeNotAssigned && (
                                  <Tag color="orange" style={{ marginLeft: 6, fontSize: 10 }}>Fee Not Assigned</Tag>
                                )}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <Alert
                      type="success"
                      showIcon
                      message="No pending dues found"
                      description={`All promoted students have no unpaid dues for ${academicYear}.`}
                    />
                  )}
                </div>
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