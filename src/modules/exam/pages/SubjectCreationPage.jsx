import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Space, Table, Tag } from 'antd';
import { createExam, createExamSubject, getExams, getExamSubjects } from '../exam.service';

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

export default function SubjectCreationPage() {
  const [loading, setLoading] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState();
  const [subjects, setSubjects] = useState([]);
  const [createExamOpen, setCreateExamOpen] = useState(false);
  const [examForm] = Form.useForm();
  const [subjectForm] = Form.useForm();

  const loadExams = async () => {
    setExamLoading(true);
    try {
      const rows = await getExams();
      setExams(rows || []);
      if (!examId && rows?.length) setExamId(rows[0].id);
    } catch {
      message.error('Failed to load exams');
    }
    setExamLoading(false);
  };

  const loadSubjects = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const rows = await getExamSubjects(id);
      setSubjects(rows || []);
    } catch {
      message.error('Failed to load subjects');
    }
    setLoading(false);
  };

  useEffect(() => { loadExams(); }, []);
  useEffect(() => { loadSubjects(examId); }, [examId]);

  const submitExam = async () => {
    try {
      const values = await examForm.validateFields();
      await createExam(values);
      message.success('Exam created');
      setCreateExamOpen(false);
      examForm.resetFields();
      await loadExams();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Unable to create exam');
    }
  };

  const submitSubject = async () => {
    try {
      const values = await subjectForm.validateFields();
      await createExamSubject({ ...values, examId });
      message.success('Subject created');
      subjectForm.resetFields();
      await loadSubjects(examId);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Unable to create subject');
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code' },
    { title: 'Subject', dataIndex: 'name' },
    { title: 'Standard', dataIndex: 'standard', render: (v) => <Tag>{v}</Tag> },
    { title: 'Section', dataIndex: 'section', render: (v) => v || '-' },
    { title: 'Stream', dataIndex: 'stream', render: (v) => v || '-' },
    { title: 'Marks', key: 'marks', render: (_, r) => `${r.passMarks}/${r.maxMarks}` },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Subject Creation"
        extra={
          <Space>
            <Select
              loading={examLoading}
              style={{ width: 320 }}
              placeholder="Select Exam"
              value={examId}
              onChange={setExamId}
              options={exams.map((e) => ({ label: `${e.name} (${e.code})`, value: e.id }))}
            />
            <Button type="primary" onClick={() => setCreateExamOpen(true)}>Create Exam</Button>
          </Space>
        }
      >
        <Form form={subjectForm} layout="vertical" onFinish={submitSubject}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Form.Item name="name" label="Subject Name" rules={[{ required: true }]}>
              <Input placeholder="Mathematics" />
            </Form.Item>
            <Form.Item name="code" label="Subject Code" rules={[{ required: true }]}>
              <Input placeholder="MATH-10" />
            </Form.Item>
            <Form.Item name="standard" label="Standard" rules={[{ required: true }]}>
              <Select options={STANDARD_OPTIONS} />
            </Form.Item>
            <Form.Item name="section" label="Section">
              <Input placeholder="A" />
            </Form.Item>
            <Form.Item name="stream" label="Stream">
              <Select allowClear options={STREAM_OPTIONS} />
            </Form.Item>
            <Form.Item name="maxMarks" label="Max Marks" initialValue={100}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
            <Form.Item name="passMarks" label="Pass Marks" initialValue={35}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" disabled={!examId}>Add Subject</Button>
        </Form>
      </Card>

      <Card title="Subjects List">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={subjects} pagination={{ pageSize: 8 }} />
      </Card>

      <Modal
        open={createExamOpen}
        title="Create Exam"
        onCancel={() => setCreateExamOpen(false)}
        onOk={submitExam}
        okText="Create"
      >
        <Form form={examForm} layout="vertical">
          <Form.Item name="name" label="Exam Name" rules={[{ required: true }]}>
            <Input placeholder="Annual Examination 2026-2027" />
          </Form.Item>
          <Form.Item name="code" label="Exam Code" rules={[{ required: true }]}>
            <Input placeholder="ANNUAL-26-27" />
          </Form.Item>
          <Form.Item name="academicYear" label="Academic Year" rules={[{ required: true }]}>
            <Input placeholder="2026-2027" />
          </Form.Item>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
