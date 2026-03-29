import React, { useEffect } from 'react';
import { Form, Input, Button, Avatar, Row, Col, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const ProfileForm = ({ profile, onSave, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (profile) {
      form.setFieldsValue(profile);
    }
  }, [profile, form]);

  const handleFinish = (values) => {
    onSave(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ maxWidth: 500, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px #0001' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar size={80} icon={<UserOutlined />} style={{ background: '#22609f' }} />
      </div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'First name required' }]}> <Input /> </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Last name required' }]}> <Input /> </Form.Item>
        </Col>
      </Row>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}> <Input disabled /> </Form.Item>
      <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Phone required' }]}> <Input /> </Form.Item>
      <Form.Item name="role" label="Role"> <Input disabled /> </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block style={{ borderRadius: 8, fontWeight: 600 }}>Save Changes</Button>
      </Form.Item>
    </Form>
  );
};

export default ProfileForm;
