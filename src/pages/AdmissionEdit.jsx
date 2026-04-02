import React, { useEffect, useState } from "react";
import { Form, Input, Button, DatePicker, message, Card, Select } from "antd";
import axios from "../utils/axios";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

const { Option } = Select;

const AdmissionEdit = () => {
  const { admissionNo } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`/admission/${admissionNo}`).then((res) => {
      const data = res.data;
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
      const payload = {
        ...values,
        dob: values.dob ? values.dob.format("YYYY-MM-DD") : undefined,
        admissionDate: values.admissionDate
          ? values.admissionDate.format("YYYY-MM-DD")
          : undefined,
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
          
          <Form.Item name="name" label="Student Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="dob" label="DOB" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          {/* ✅ UPDATED COMMUNITY DROPDOWN */}
          <Form.Item
            name="community"
            label="Community"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select Community">
              <Option value="SC">SC</Option>
              <Option value="ST">ST</Option>
              <Option value="SCA">SCA</Option>
              <Option value="MBC">MBC</Option>
              <Option value="BC">BC</Option>
              <Option value="BCM">BCM</Option> {/* added */}
              <Option value="OBC">OBC</Option>
              <Option value="OTHERS">Others</Option>
            </Select>
          </Form.Item>

          {/* OPTIONAL: show input if Others */}
          <Form.Item shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue("community") === "OTHERS" ? (
                <Form.Item name="customCommunity" label="Specify Community">
                  <Input placeholder="Enter community" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="fatherName" label="Father Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="motherName" label="Mother Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="admissionDate" label="Admission Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            Update
          </Button>

        </Form>
      </Card>
    </div>
  );
};

export default AdmissionEdit;