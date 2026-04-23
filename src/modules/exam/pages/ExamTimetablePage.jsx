import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, message, Select, Space, Table, Tag } from 'antd';
import { createExamTimetable, getExamHalls, getExams, getExamSubjects, getExamTimetable } from '../exam.service';

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

const toIso = (date, time) => {
  if (!date || !time) return undefined;
  return new Date(`${date}T${time}:00`).toISOString();
};

export default function ExamTimetablePage() {
  const [form] = Form.useForm();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [halls, setHalls] = useState([]);
  const [examId, setExamId] = useState();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const loadExams = async () => {
    try {
      const examRows = await getExams();
      setExams(examRows || []);
      if (!examId && examRows?.length) setExamId(examRows[0].id);
    } catch {
      message.error('Failed to load exams');
    }
  };

  const loadPrerequisites = async (id) => {
    if (!id) return;
    try {
      const [subjectRows, hallRows, tableRows] = await Promise.all([
        getExamSubjects(id),
        getExamHalls(),
        getExamTimetable(id),
      ]);
      setSubjects(subjectRows || []);
      setHalls(hallRows || []);
      setRows(tableRows || []);
    } catch {
      message.error('Failed to load timetable data');
    }
  };

  useEffect(() => { loadExams(); }, []);
  useEffect(() => { loadPrerequisites(examId); }, [examId]);

  const onSubmit = async () => {
    if (!examId) return message.warning('Select exam first');
    try {
      const values = await form.validateFields();
      setLoading(true);
      await createExamTimetable({
        examId,
        subjectId: values.subjectId,
        standard: values.standard,
        section: values.section || undefined,
        stream: values.stream || undefined,
        examDate: toIso(values.examDate, '00:00'),
        startsAt: toIso(values.examDate, values.startsAt),
        endsAt: toIso(values.examDate, values.endsAt),
        session: values.session,
        hallIds: values.hallIds,
      });
      message.success('Timetable entry created');
      form.resetFields();
      await loadPrerequisites(examId);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Unable to create timetable entry');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Exam Timetable Creation"
        extra={
          <Select
            style={{ width: 320 }}
            value={examId}
            onChange={setExamId}
            options={exams.map((e) => ({ label: `${e.name} (${e.code})`, value: e.id }))}
            placeholder="Select Exam"
          />
        }
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Form.Item name="subjectId" label="Subject" rules={[{ required: true }]}>
              <Select
                showSearch
                options={subjects.map((s) => ({ label: `${s.code} - ${s.name}`, value: s.id }))}
              />
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
            <Form.Item name="examDate" label="Exam Date" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="startsAt" label="Start Time" rules={[{ required: true }]}>
              <Input type="time" />
            </Form.Item>
            <Form.Item name="endsAt" label="End Time" rules={[{ required: true }]}>
              <Input type="time" />
            </Form.Item>
            <Form.Item name="session" label="Session" rules={[{ required: true }]}>
              <Select options={[{ label: 'FN', value: 'FN' }, { label: 'AN', value: 'AN' }]} />
            </Form.Item>
            <Form.Item name="hallIds" label="Halls" rules={[{ required: true }]} className="md:col-span-2">
              <Select mode="multiple" options={halls.map((h) => ({ label: `${h.name} (Cap ${h.capacity})`, value: h.id }))} />
            </Form.Item>
          </div>
          <Button type="primary" loading={loading} onClick={onSubmit}>Create Timetable Slot</Button>
        </Form>
      </Card>

      <Card title="Timetable Entries">
        <Table
          rowKey="id"
          loading={tableLoading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Date', dataIndex: 'examDate', render: (v) => new Date(v).toLocaleDateString() },
            { title: 'Subject', key: 'subject', render: (_, r) => `${r.subject?.code || '-'} - ${r.subject?.name || '-'}` },
            { title: 'Class', key: 'class', render: (_, r) => `${r.standard}${r.section ? `-${r.section}` : ''}` },
            { title: 'Time', key: 'time', render: (_, r) => `${new Date(r.startsAt).toLocaleTimeString()} - ${new Date(r.endsAt).toLocaleTimeString()}` },
            { title: 'Session', dataIndex: 'session', render: (v) => <Tag>{v}</Tag> },
            { title: 'Halls', key: 'halls', render: (_, r) => (r.halls || []).map((x) => x.hall?.name).filter(Boolean).join(', ') || '-' },
          ]}
        />
      </Card>
    </div>
  );
}
