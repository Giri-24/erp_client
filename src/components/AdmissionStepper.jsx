import React, { useState } from "react";
import {
  Steps,
  Button,
  Form,
  Input,
  Select,
  Upload,
  message,
  Space,
  Card,
  Typography,
  Tag,
  Descriptions,
  Row,
  Col,
  DatePicker,
  Checkbox,
} from "antd";
import {
  UploadOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.svg";
const { Title } = Typography;

const AdmissionStepper = () => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});
  const [community, setCommunity] = useState("");

  // Validation rules
  const requiredRule = { required: true, message: "This field is required" };
  const aadharRule = {
    required: true,
    message: "Aadhar number must be 12 digits",
    pattern: /^\d{12}$/,
  };
  const phoneRule = {
    required: true,
    message: "Phone number must be 10 digits",
    pattern: /^\d{10}$/,
  };
  const pinRule = {
    required: true,
    message: "PIN must be 6 digits",
    pattern: /^\d{6}$/,
  };
  const percentageRule = {
    required: true,
    message: "Enter valid percentage",
    pattern: /^\d{1,3}(\.\d{1,2})?$/,
  };

  const steps = [
    // 🔥 STUDENT
    {
      title: "Student",
      icon: <UserOutlined />,
      fields: ["name", "gender", "dob", "community"],
      content: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item name="name" label="Student Name" rules={[requiredRule]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="gender" label="Gender" rules={[requiredRule]}>
              <Select>
                <Select.Option value="MALE">Male</Select.Option>
                <Select.Option value="FEMALE">Female</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dob" label="DOB" rules={[requiredRule]}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="community" label="Community" rules={[requiredRule]}>
              <Select onChange={(v) => setCommunity(v)}>
                <Select.Option value="BC">BC</Select.Option>
                <Select.Option value="MBC">MBC</Select.Option>
                <Select.Option value="SC">SC</Select.Option>
                <Select.Option value="OTHER">Other</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          {community === "OTHER" && (
            <Col span={12}>
              <Form.Item name="communityOther" label="Custom Community" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>
          )}
          <Col span={12}><Form.Item name="religion" label="Religion" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="caste" label="Caste" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="motherTongue" label="Mother Tongue" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="aadharNo" label="Aadhar No" rules={[aadharRule]}><Input maxLength={12} /></Form.Item></Col>
          <Col span={12}><Form.Item name="bloodGroup" label="Blood Group" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="identityMark1" label="Identity Mark 1" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="identityMark2" label="Identity Mark 2" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="previouslyStudied" label="Previously Studied" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}>
            <Form.Item name="vanNeeded" valuePropName="checked">
              <Checkbox>Transport Needed</Checkbox>
            </Form.Item>
          </Col>
        </Row>
      ),
    },

    // 🔥 FAMILY
    {
      title: "Family",
      icon: <TeamOutlined />,
      fields: [],
      content: (
        <Row gutter={[16, 16]}>
          <Col span={12}><Form.Item name="fatherName" label="Father Name" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="fatherPhone" label="Father Phone" rules={[phoneRule]}><Input maxLength={10} /></Form.Item></Col>
          <Col span={12}><Form.Item name="fatherOccupation" label="Father Occupation" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="fatherAadharNo" label="Father Aadhar" rules={[aadharRule]}><Input maxLength={12} /></Form.Item></Col>
          <Col span={12}><Form.Item name="fatherWhatsAppNo" label="Father WhatsApp" rules={[phoneRule]}><Input maxLength={10} /></Form.Item></Col>

          <Col span={12}><Form.Item name="motherName" label="Mother Name" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="motherPhone" label="Mother Phone" rules={[phoneRule]}><Input maxLength={10} /></Form.Item></Col>
          <Col span={12}><Form.Item name="motherOccupation" label="Mother Occupation" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="motherAadharNo" label="Mother Aadhar" rules={[aadharRule]}><Input maxLength={12} /></Form.Item></Col>
          <Col span={12}><Form.Item name="motherWhatsAppNo" label="Mother WhatsApp" rules={[phoneRule]}><Input maxLength={10} /></Form.Item></Col>

          <Col span={12}><Form.Item name="familyIncome" label="Family Income" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="sibblings" label="Siblings" rules={[requiredRule]}><Input /></Form.Item></Col>
        </Row>
      ),
    },

    // 🔥 ADDRESS
    {
      title: "Address",
      icon: <HomeOutlined />,
      fields: [],
      content: (
        <>
          <Form.Item name="line1" label="Address Line 1" rules={[requiredRule]}><Input /></Form.Item>
          <Form.Item name="line2" label="Address Line 2" rules={[requiredRule]}><Input /></Form.Item>
          <Form.Item name="pin" label="PIN" rules={[pinRule]}><Input maxLength={6} /></Form.Item>
        </>
      ),
    },

    // 🔥 ACADEMIC
    {
      title: "Academic",
      icon: <BookOutlined />,
      fields: [],
      content: (
        <Row gutter={16}>
          <Col span={12}><Form.Item name="examName" label="Exam" rules={[requiredRule]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="totalPercentage" label="Percentage" rules={[percentageRule]}><Input /></Form.Item></Col>
        </Row>
      ),
    },

    // 🔥 DOCUMENTS
    {
      title: "Documents",
      icon: <FileTextOutlined />,
      fields: [],
      content: (
        <>
         <Form.Item
  name="photo"
  label="Photo"
  valuePropName="fileList"
  getValueFromEvent={(e) => e?.fileList}
  rules={[requiredRule]}
>
  <Upload beforeUpload={() => false} listType="picture">
    <Button icon={<UploadOutlined />}>Upload</Button>
  </Upload>
</Form.Item>

          <Form.Item name="documents" label="Documents" rules={[requiredRule]}>
            <Checkbox.Group>
              <Checkbox value="birthCert">Birth Certificate</Checkbox>
              <Checkbox value="communityCert">Community Certificate</Checkbox>
              <Checkbox value="aadharStudent">Aadhar</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        </>
      ),
    },

    // 🔥 ADMISSION
    {
      title: "Admission",
      icon: <CheckCircleOutlined />,
      fields: [],
      content: (
        <>
          <Form.Item name="admissionNo" label="Admission No" rules={[requiredRule]}><Input /></Form.Item>
          <Form.Item name="admissionDate" label="Admission Date" rules={[requiredRule]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </>
      ),
    },

    // 🔥 REVIEW
  {
  title: "Review",
  icon: <CheckCircleOutlined />,
  content: (
    <Card>
      <Descriptions bordered column={2}>
        {Object.entries(formData).map(([k, v]) => {
          
          // 🔥 HANDLE PHOTO SEPARATELY
          if (k === "photo" && v?.length > 0) {
            const url =
              v[0].thumbUrl ||
              URL.createObjectURL(v[0].originFileObj);

            return (
              <Descriptions.Item key={k} label="Photo">
                <img src={url} alt="student" width={100} />
              </Descriptions.Item>
            );
          }

          // 🔥 NORMAL FIELDS
          return (
            <Descriptions.Item key={k} label={k}>
              {typeof v === "object"
                ? v?.format
                  ? v.format("DD-MM-YYYY")
                  : JSON.stringify(v)
                : String(v)}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </Card>
  ),
}
  ];

  const next = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);
      setFormData(values);
      setCurrent(current + 1);
    } catch (err) {
      message.error("Please fill all required fields correctly.");
    }
  };

  const prev = () => setCurrent(current - 1);
const getImageDimensions = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
  });

  
  const svgToPngBase64 = (svgUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = svgUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const pngBase64 = canvas.toDataURL("image/png");
      resolve(pngBase64);
    };

    img.onerror = reject;
  });
const styles = {
  field: {
    display: "inline-block",
    borderBottom: "1px solid black",
    minWidth: "250px",
    marginLeft: 10,
    fontWeight: "bold",
  },

  fieldSmall: {
    display: "inline-block",
    borderBottom: "1px solid black",
    minWidth: "120px",
    marginLeft: 10,
    fontWeight: "bold",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  box: {
    border: "1px solid black",
    minHeight: 50,
    padding: 5,
    marginBottom: 10,
  },
};
const generatePDF = async () => {
  const input = document.getElementById("pdfContent");

  if (!input) {
    console.error("pdfContent not found");
    return;
  }

  const canvas = await html2canvas(input, {
    scale: 2,
  });

  const imgData = canvas.toDataURL("image/png");

  const doc = new jsPDF("p", "mm", "a4");

  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  const safeAdmissionNo = formData.admissionNo
    ? String(formData.admissionNo).replace(/[^a-zA-Z0-9]/g, "_")
    : "admission";

  doc.save(`${safeAdmissionNo}.pdf`);
};
//html


  return (
    <div style={{ padding: 30 }}>
      <Card>
        <Title level={3}>Admission</Title>

        <Steps current={current} items={steps.map((s) => ({ title: s.title }))} />

        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, all) => setFormData(all)}
        >
          <Card style={{ marginTop: 20 }}>{steps[current].content}</Card>
        </Form>

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <Space>
            {current > 0 && <Button onClick={prev}>Prev</Button>}
            {current < steps.length - 1 && <Button onClick={next}>Next</Button>}
            {current === steps.length - 1 && (
              <>
                <Button onClick={generatePDF}>PDF</Button>
                <Button type="primary" onClick={async () => {
                  try {
                    await form.validateFields();
                    // Prepare data for backend
                    const values = form.getFieldsValue(true);
                    // Convert date fields to string
                    const payload = {
                      ...values,
                      dob: values.dob ? values.dob.format("YYYY-MM-DD") : undefined,
                      admissionDate: values.admissionDate ? values.admissionDate.format("YYYY-MM-DD") : undefined,
                    };
                    // TODO: send payload to backend (e.g. axios.post)
                    message.success("Form is ready to send to backend.");
                  } catch (err) {
                    message.error("Please fill all required fields correctly.");
                  }
                }}>Submit</Button>
              </>
            )}
          </Space>
        </div>
      </Card>
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
  <div id="pdfContent">
    {/* your full PDF layout here */}
   <div
  style={{
    padding: 20,
    fontSize: 12,
    // width: "100px",
    border: "1px solid black",
    position: "relative",
    display: "flex",
    justifyContent: "center", // ✅ center horizontally
  }}
>
  <img
    src={logo}
    alt="logo"
    style={{ width: "180px", marginBottom: 20 }}
  />
</div>
    <div id="pdfContent" style={{ width: "800px", padding: 20, fontSize: 12 }}>
       
  <h2 style={{ textAlign: "center", margin: 0 }}>
    MATRIC. HR. SEC. SCHOOL - VADUGAPPATTI
  </h2>
  <p style={{ textAlign: "center", margin: 0 }}>
    SANKARI TALUK, SALEM DISTRICT – 637301
  </p>

  <h3 style={{ textAlign: "center" }}>
    APPLICATION FOR ADMISSION
  </h3>

  {/* PHOTO */}
  <div style={{ position: "absolute", right: 40, top: 40, border: "1px solid black", width: 100, height: 120 }}>
    {formData?.photo?.[0]?.thumbUrl && (
      <img
        src={formData.photo[0].thumbUrl}
        alt="photo"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    )}
  </div>

  {/* STUDENT */}
 <div style={{ fontSize: 15, lineHeight: 2 }}>

  <h4 style={{ marginBottom: 15 }}>I. Student Information</h4>

  {/* 1 */}
  <p>
    1. Name:
    <span style={styles.field}>{formData.name}</span>
  </p>

  {/* 2 */}
  <p>
    2. Sex:
    <span style={styles.fieldSmall}>{formData.gender}</span>
  </p>

  {/* 3 & 4 */}
  <div style={styles.row}>
    <div>
      3. DOB:
      <span style={styles.fieldSmall}>
        {formData.dob?.format?.("DD-MM-YYYY")}
      </span>
    </div>

    <div>
      4. Religion:
      <span style={styles.fieldSmall}>{formData.religion}</span>
    </div>
  </div>

  {/* 5 */}
  <p>
    5. Community:
    <span style={styles.field}>{formData.community}</span>
  </p>

  {/* 6 & 7 */}
  <div style={styles.row}>
    <div>
      6. Caste:
      <span style={styles.fieldSmall}>{formData.caste}</span>
    </div>

    <div>
      7. Mother Tongue:
      <span style={styles.fieldSmall}>{formData.motherTongue}</span>
    </div>
  </div>

  {/* 8 & 9 */}
  <div style={styles.row}>
    <div>
      8. Aadhar No:
      <span style={styles.fieldSmall}>{formData.aadharNo}</span>
    </div>

    <div>
      9. Blood Group:
      <span style={styles.fieldSmall}>{formData.bloodGroup}</span>
    </div>
  </div>

  {/* 10 */}
  <p>10. Identification Marks:</p>
  <div style={styles.box}>
    {formData.identityMark1}
    <br />
    {formData.identityMark2}
  </div>

  {/* 11 */}
  <p>
    11. Previously Studied:
    <span style={styles.field}>{formData.previouslyStudied}</span>
  </p>

  {/* 12 */}
  <p>
    12. Local / Van:
    <span style={styles.fieldSmall}>
      {formData.vanNeeded ? "Van" : "Local"}
    </span>
  </p>


  {/* FAMILY */}
  <h4 style={{ marginTop: 20, marginBottom: 10 }}>
    II. Family Information
  </h4>

</div>
  <table border="1" width="100%" cellPadding="5">
    <tbody>
      <tr>
        <th>Father</th>
        <th>Mother</th>
      </tr>
      <tr>
        <td>Name: {formData.fatherName}</td>
        <td>Name: {formData.motherName}</td>
      </tr>
      <tr>
        <td>Phone: {formData.fatherPhone}</td>
        <td>Phone: {formData.motherPhone}</td>
      </tr>
      <tr>
        <td>Occupation: {formData.fatherOccupation}</td>
        <td>Occupation: {formData.motherOccupation}</td>
      </tr>
    </tbody>
  </table>

  {/* SIGNATURE */}
  <div style={{ marginTop: 50, display: "flex", justifyContent: "space-between" }}>
    <div>
      <b>____</b>
      <br />
      Staff Signature
    </div>

    <div>
      <b>____</b>
      <br />
      Principal Signature
    </div>
  </div>
</div>
  </div>
</div>
    </div>
  );
};

export default AdmissionStepper;