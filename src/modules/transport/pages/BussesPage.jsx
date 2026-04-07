import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { getAllBuses, createBus, updateBus, deleteBus } from '../transport.service';

const BussesPage = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [form] = Form.useForm();

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const data = await getAllBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error('Failed to fetch buses: ' + (err?.message || ''));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const handleAdd = () => {
    setEditingBus(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (bus) => {
    setEditingBus(bus);
    form.setFieldsValue({
      number: bus.number || '',
      capacity: Number(bus.capacity) || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (busId) => {
    setLoading(true);
    try {
      await deleteBus(busId);
      message.success('Bus deleted');
      fetchBuses();
    } catch (err) {
      message.error('Failed to delete bus: ' + (err?.message || ''));
    }
    setLoading(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // Build payload matching backend DTO exactly: { number: string, capacity: number }
      const payload = {
        number: String(values.number),
        capacity: Number(values.capacity),
      };
      setLoading(true);
      if (editingBus) {
        await updateBus(editingBus.id || editingBus._id, payload);
        message.success('Bus updated');
      } else {
        await createBus(payload);
        message.success('Bus created');
      }
      setModalVisible(false);
      fetchBuses();
    } catch (err) {
      if (err?.errorFields) return; // Ant Design inline validation — already shown
      message.error('Error: ' + (err?.response?.data?.message || err?.message || 'API error'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Bus Number', dataIndex: 'number', key: 'number' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, bus) => (
        <>
          <Button onClick={() => handleEdit(bus)} type="link">Edit</Button>
          <Button onClick={() => handleDelete(bus.id || bus._id)} type="link" danger>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <h2>Bus Management</h2>
      <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16 }}>Add Bus</Button>
      <Table
        dataSource={buses}
        columns={columns}
        rowKey={record => record.id || record._id}
        loading={loading}
      />
      <Modal
        title={editingBus ? 'Edit Bus' : 'Add Bus'}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="number"
            label="Bus Number"
            rules={[{ required: true, message: 'Bus number is required' }]}
          >
            <Input placeholder="e.g. BUS-01" />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="Capacity"
            rules={[{ required: true, type: 'number', min: 1, message: 'Capacity must be at least 1' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 40" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BussesPage;
