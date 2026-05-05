import React, { useEffect } from 'react';
import { Form, Modal, Select } from 'antd';

const TYPE_OPTIONS = [
  { label: 'Revision', value: 'REVISION' },
  { label: 'Exam', value: 'EXAM' },
];

export default function EditTimetableModal({
  open,
  onCancel,
  onSave,
  subjects,
  teachers,
  value,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      subjectId: value?.subjectId,
      teacherId: value?.teacherId,
      type: value?.type || 'REVISION',
    });
  }, [open, value, form]);

  return (
    <Modal
      open={open}
      title="Edit Timetable Slot"
      onCancel={onCancel}
      onOk={async () => {
        const values = await form.validateFields();
        onSave(values);
      }}
      okText="Save"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="subjectId" label="Subject" rules={[{ required: true, message: 'Select subject' }]}>
          <Select
            placeholder="Select subject"
            options={subjects.map((subject) => ({
              label: subject.name,
              value: subject.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="teacherId" label="Teacher" rules={[{ required: true, message: 'Select teacher' }]}>
          <Select
            placeholder="Select teacher"
            options={teachers.map((teacher) => ({
              label: teacher.name,
              value: teacher.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Select type' }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
