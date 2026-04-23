import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, message, Space, Switch, Table, Tag } from 'antd';
import { createExamHall, getExamHalls } from '../exam.service';

export default function HallCreationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [halls, setHalls] = useState([]);

  const loadHalls = async () => {
    setTableLoading(true);
    try {
      const rows = await getExamHalls();
      setHalls(rows || []);
    } catch {
      message.error('Failed to load halls');
    }
    setTableLoading(false);
  };

  useEffect(() => { loadHalls(); }, []);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await createExamHall(values);
      message.success('Hall created');
      form.resetFields();
      await loadHalls();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Unable to create hall');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card title="Hall Creation">
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Form.Item name="name" label="Hall Name" rules={[{ required: true }]}>
              <Input placeholder="Hall A" />
            </Form.Item>
            <Form.Item name="building" label="Building">
              <Input placeholder="Main Block" />
            </Form.Item>
            <Form.Item name="floor" label="Floor">
              <Input placeholder="1" />
            </Form.Item>
            <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
              <InputNumber min={1} max={500} className="w-full" />
            </Form.Item>
          </div>
          <Space>
            <Button type="primary" loading={loading} onClick={onSubmit}>Create Hall</Button>
            <Button onClick={() => form.resetFields()}>Clear</Button>
          </Space>
        </Form>
      </Card>

      <Card title="Exam Halls">
        <Table
          rowKey="id"
          loading={tableLoading}
          dataSource={halls}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Hall', dataIndex: 'name' },
            { title: 'Building', dataIndex: 'building', render: (v) => v || '-' },
            { title: 'Floor', dataIndex: 'floor', render: (v) => v || '-' },
            { title: 'Capacity', dataIndex: 'capacity' },
            { title: 'Status', dataIndex: 'isActive', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
          ]}
        />
      </Card>
    </div>
  );
}
