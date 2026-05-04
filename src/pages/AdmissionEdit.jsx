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
        fatherName: data.family?.fatherName || data.fatherName,
        motherName: data.family?.motherName || data.motherName,
        doorNo: data.address?.doorNo || data.address?.line1 || data.doorNo || data.line1,
        street: data.address?.street || data.address?.village || data.address?.line2 || data.street || data.line2,
        taluk: data.address?.taluk || data.address?.landmark || data.taluk || data.landmark,
        district: data.address?.district || data.address?.city || data.district || data.city,
        state: data.address?.state || data.state,
        pin: data.address?.pin || data.pin,
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
        line1: values.doorNo,
        line2: values.street,
        landmark: values.taluk,
        city: values.district,
        address: {
          line1: values.doorNo,
          line2: values.street,
          landmark: values.taluk,
          city: values.district,
          state: values.state,
          pin: values.pin,
        },
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

          <Form.Item name="doorNo" label="Door No / House No" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="street" label="Street / Village" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="taluk" label="Taluk">
            <Input />
          </Form.Item>

          <Form.Item name="district" label="District" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="state" label="State" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="pin"
            label="Pincode"
            rules={[
              { required: true },
              { pattern: /^\d{6}$/, message: "Pincode must be 6 digits" },
            ]}
          >
            <Input maxLength={6} />
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