import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Select, Space, Table, Tag } from 'antd';
import { generateExamRollNumbers, getExamRollNumbers, getExams } from '../exam.service';

const STANDARD_OPTIONS = [
  'LKG', 'UKG', 'STD_1', 'STD_2', 'STD_3', 'STD_4', 'STD_5',
  'STD_6', 'STD_7', 'STD_8', 'STD_9', 'STD_10', 'STD_11', 'STD_12',
].map((v) => ({ label: v, value: v }));

const STREAM_OPTIONS = [
  { label: 'BIO_MATHS', value: 'BIO_MATHS' },
  { label: 'CS_MATHS', value: 'CS_MATHS' },
  { label: 'BIO_CS', value: 'BIO_CS' },
  { label: 'COMMERCE', value: 'COMMERCE' },
];

export default function RollGenerationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rollLoading, setRollLoading] = useState(false);
  const [examId, setExamId] = useState();
  const [exams, setExams] = useState([]);
  const [rolls, setRolls] = useState([]);

  const loadExams = async () => {
    try {
      const rows = await getExams();
      setExams(rows || []);
      if (!examId && rows?.length) setExamId(rows[0].id);
    } catch {
      message.error('Failed to load exams');
    }
  };

  const loadRolls = async (id) => {
    if (!id) return;
    setRollLoading(true);
    try {
      const rows = await getExamRollNumbers(id);
      setRolls(rows || []);
    } catch {
      message.error('Failed to load roll numbers');
    }
    setRollLoading(false);
  };

  useEffect(() => { loadExams(); }, []);
  useEffect(() => { loadRolls(examId); }, [examId]);

  const onGenerate = async () => {
    if (!examId) return message.warning('Select exam first');
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await generateExamRollNumbers(examId, values);
      message.success(res?.message || 'Roll numbers generated');
      await loadRolls(examId);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Generation failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Auto Roll Generation"
        extra={
          <Select
            style={{ width: 320 }}
            placeholder="Select Exam"
            value={examId}
            onChange={setExamId}
            options={exams.map((e) => ({ label: `${e.name} (${e.code})`, value: e.id }))}
          />
        }
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Form.Item name="standard" label="Standard" rules={[{ required: true }]}>
              <Select options={STANDARD_OPTIONS} />
            </Form.Item>
            <Form.Item name="section" label="Section">
              <Input placeholder="A" />
            </Form.Item>
            <Form.Item name="stream" label="Stream">
              <Select allowClear options={STREAM_OPTIONS} />
            </Form.Item>
            <Form.Item name="academicYear" label="Academic Year">
              <Input placeholder="2026-2027" />
            </Form.Item>
          </div>
          <Space>
            <Button type="primary" loading={loading} onClick={onGenerate}>Generate Rolls</Button>
            <Button onClick={() => loadRolls(examId)}>Refresh</Button>
          </Space>
        </Form>
      </Card>

      <Card title="Generated Roll Numbers">
        <Table
          rowKey="id"
          loading={rollLoading}
          dataSource={rolls}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Roll Number', dataIndex: 'rollNumber' },
            { title: 'Student', key: 'student', render: (_, r) => r.student?.name || '-' },
            { title: 'Standard', key: 'std', render: (_, r) => <Tag>{r.standard}</Tag> },
            { title: 'Section', dataIndex: 'section', render: (v) => v || '-' },
            { title: 'Academic Year', dataIndex: 'academicYear' },
          ]}
        />
      </Card>
    </div>
  );
}
