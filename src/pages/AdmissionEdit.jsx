import React, { useEffect, useState } from "react";
import { Form, Input, Button, DatePicker, message, Card } from "antd";
import axios from "../utils/axios";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

const AdmissionEdit = () => {
  const { admissionNo } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch admission details
    axios.get(`/admission/${admissionNo}`).then((res) => {
      const data = res.data;
      // Convert date fields to dayjs
      form.setFieldsValue({
        ...data,
        dob: data.dob ? dayjs(data.dob) : null,
        admissionDate: data.admissionDate ? dayjs(data.admissionDate) : null,
      });
    });
  }, [admissionNo, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Prepare payload
      const payload = {
        ...values,
        dob: values.dob ? values.dob.format("YYYY-MM-DD") : undefined,
        admissionDate: values.admissionDate ? values.admissionDate.format("YYYY-MM-DD") : undefined,
      };
      await axios.put(`/admission/${admissionNo}`, payload);
      message.success("Admission updated successfully");
    } catch (err) {
      message.error("Update failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 30 }}>
      <Card title={`Edit Admission #${admissionNo}`}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Student Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="gender" label="Gender" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dob" label="DOB" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="community" label="Community" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="fatherName" label="Father Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="motherName" label="Mother Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="admissionDate" label="Admission Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Update</Button>
        </Form>
      </Card>
    </div>
  );
};

export default AdmissionEdit;
