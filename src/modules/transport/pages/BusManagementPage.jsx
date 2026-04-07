import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message } from 'antd';
import { getAllBuses, createBus, updateBus, deleteBus, getAllTransportRoutes } from '../transport.service';

const BusManagementPage = () => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [form] = Form.useForm();

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const data = await getAllBuses();
      setBuses(data);
    } catch (err) {
      message.error('Failed to fetch buses');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBuses();
    // Fetch routes for dropdown
    getAllTransportRoutes().then(setRoutes).catch(() => setRoutes([]));
  }, []);

  const handleAdd = () => {
    setEditingBus(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (bus) => {
    setEditingBus(bus);
    form.setFieldsValue({
      ...bus,
      route: bus.route?.id || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (busId) => {
    setLoading(true);
    try {
      await deleteBus(busId);
      message.success('Bus deleted');
      fetchBuses();
    } catch {
      message.error('Failed to delete bus');
    }
    setLoading(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      // Only send relevant fields
      const payload = {
        number: values.busNo,
        plateNo: values.plateNo,
        capacity: values.capacity,
        route: values.route || null,
      };
      if (editingBus) {
        await updateBus(editingBus.id, payload);
        message.success('Bus updated');
      } else {
        await createBus(payload);
        message.success('Bus created');
      }
      setModalVisible(false);
      fetchBuses();
    } catch (err) {
      // validation or API error
    }
    setLoading(false);
  };

  const columns = [
    { title: 'Bus Number', dataIndex: 'number', key: 'number' },
    { title: 'Plate No', dataIndex: 'plateNo', key: 'plateNo' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    {
      title: 'Route',
      dataIndex: 'route',
      key: 'route',
      render: (route) => route ? `${route.routeName || ''} (${route.routeNo || ''})` : '—',
    },
    { title: 'Actions', key: 'actions', render: (_, bus) => (
      <>
        <Button onClick={() => handleEdit(bus)} type="link">Edit</Button>
        <Button onClick={() => handleDelete(bus.id)} type="link" danger>Delete</Button>
      </>
    )},
  ];

  return (
    <div>
      <h2>Bus Management</h2>
      <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16 }}>Add Bus</Button>
      <Table dataSource={buses} columns={columns} rowKey="id" loading={loading} />
      <Modal
        title={editingBus ? 'Edit Bus' : 'Add Bus'}
        visible={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="busNo" label="Bus Number" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="plateNo" label="Plate No" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="capacity" label="Capacity" rules={[{ required: true, type: 'number', min: 1 }]}> <Input type="number" /> </Form.Item>
          <Form.Item name="route" label="Route">
            <Select allowClear placeholder="Select route">
              {routes.map((route) => (
                <Select.Option key={route.id} value={route.id}>
                  {route.routeName} ({route.routeNo})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BusManagementPage;
