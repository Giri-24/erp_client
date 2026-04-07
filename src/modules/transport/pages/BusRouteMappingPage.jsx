import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Select, message } from "antd";
import { getAllBuses, getAllTransportRoutes, updateBus } from "../transport.service";

// BusRouteMappingPage: Map buses to routes
const BusRouteMappingPage = () => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [busData, routeData] = await Promise.all([
        getAllBuses(),
        getAllTransportRoutes(),
      ]);
      setBuses(Array.isArray(busData) ? busData : []);
      setRoutes(Array.isArray(routeData) ? routeData : []);
    } catch (err) {
      message.error("Failed to load buses or routes");
    }
    setLoading(false);
  };

  const handleMap = (bus) => {
    setSelectedBus(bus);
    form.setFieldsValue({ route: bus.route?.id || undefined });
    setModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await updateBus(selectedBus.id || selectedBus._id, {
        ...selectedBus,
        route: values.route || null,
      });
      message.success("Bus-route mapping updated");
      setModalVisible(false);
      fetchData();
    } catch (err) {
      message.error("Failed to update mapping");
    }
    setLoading(false);
  };

  const columns = [
    { title: "Bus Number", dataIndex: "number", key: "number" },
    { title: "Capacity", dataIndex: "capacity", key: "capacity" },
    {
      title: "Route",
      dataIndex: "route",
      key: "route",
      render: (route) => route ? `${route.routeName} (${route.routeNo})` : "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, bus) => (
        <Button onClick={() => handleMap(bus)} type="link">Map/Change Route</Button>
      ),
    },
  ];

  return (
    <div>
      <h2>Bus & Route Mapping</h2>
      <Table dataSource={buses} columns={columns} rowKey={record => record.id || record._id} loading={loading} />
      <Modal
        title={`Map Bus to Route`}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="route" label="Route" rules={[{ required: true, message: "Please select a route" }]}> 
            <Select placeholder="Select route">
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

export default BusRouteMappingPage;
