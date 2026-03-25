import React, { useEffect, useState } from "react";
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
import logo from "../assets/logo.jpeg";
import { createAdmission, updateAdmission } from "../modules/admission/admission.service";
import dayjs from "dayjs";
const { Title } = Typography;

const AdmissionStepper = ({editData, clearEditData}) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});
  const [community, setCommunity] = useState("");

  const [fileLists, setFileLists] = useState({
    profilePhoto: [],
    birthCert: [],
    communityCert: [],
    aadharStudent: [],
    // ...add more as needed
  });

  useEffect(() => {
    if (editData) {
      const flatData = {
        name: editData.name,
        standard: editData.standard,
        gender: editData.gender,
        dob: editData.dob ? dayjs(editData.dob) : null,
        religion: editData.religion,
        community: editData.community,
        caste: editData.caste,
        motherTongue: editData.motherTongue,
        aadharNo: editData.aadharNo,
        bloodGroup: editData.bloodGroup,
        identityMark1: editData.identification1,
        identityMark2: editData.identification2,
        previouslyStudied: editData.previousSchool,
        vanNeeded: editData.transportMode === "Van" ? true : false,
        
        fatherName: editData.family?.fatherName,
        fatherPhone: editData.family?.fatherPhone,
        fatherAadharNo: editData.family?.fatherAadhar,
        fatherOccupation: editData.family?.fatherOccupation,
        fatherWhatsAppNo: editData.family?.fatherWhatsapp,
        motherName: editData.family?.motherName,
        motherPhone: editData.family?.motherPhone,
        motherAadharNo: editData.family?.motherAadhar,
        motherOccupation: editData.family?.motherOccupation,
        motherWhatsAppNo: editData.family?.motherWhatsapp,
        familyIncome:String(editData.family?.familyIncome),
        sibblings: editData.family?.siblings,
        line1: editData.address?.line1,
        line2: editData.address?.line2,
        pin: editData.address?.pin,
        admissionNo: editData.admission?.admissionNo,
        admissionDate: editData.admission?.admissionDate ? dayjs(editData.admission.admissionDate) : null,
        examName: editData.academics?.[0]?.examName,
        totalPercentage: editData.academics?.[0]?.totalPercentage,
      };

      // Handle documents for checkbox group
      const doc = editData.documents?.[0] || {};
      const docSelection = [];
      if (doc.birthCert) docSelection.push("birthCert");
      if (doc.communityCert) docSelection.push("communityCert");
      if (doc.aadharStudent) docSelection.push("aadharStudent");
      flatData.documents = docSelection;

      // Handle photo structure assuming we are getting a valid image config
      if (doc.photo || doc.photoPath) {
        flatData.profilePhotoChecked = true;
        flatData.profilePhoto = [
          {
            uid: "-1",
            name: "photo.jpg",
            status: "done",
            url: doc.photoPath ? `http://localhost:3000/${doc.photoPath}` : "https://via.placeholder.com/150", 
          },
        ];
      }

      form.setFieldsValue(flatData);
      setFormData(form.getFieldsValue(true));
      setCommunity(editData.community);
    }
  }, [editData, form]);

  const fillRandomData = () => {
    const random10 = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const random12 = () => Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const random6 = () => Math.floor(100000 + Math.random() * 900000).toString();
    const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Diya", "Isha", "Ananya", "Riya", "Kavya"];
    const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Reddy", "Verma", "Rao", "Das", "Nair", "Iyer"];
    const randName = () => firstNames[Math.floor(Math.random() * firstNames.length)] + " " + lastNames[Math.floor(Math.random() * lastNames.length)];
    const randGender = () => Math.random() > 0.5 ? "MALE" : "FEMALE";
    const randCommunity = () => ["BC", "MBC", "SC", "OTHERS"][Math.floor(Math.random() * 4)];
    const randBloodGroup = () => ["A+", "B+", "O+", "AB+", "O-"][Math.floor(Math.random() * 5)];
    const communitySelected = randCommunity();
    setCommunity(communitySelected);

    const randomData = {
      name: randName(),
      gender: randGender(),
      dob: dayjs().subtract(15, 'year'),
      community: communitySelected,
      communityOther: communitySelected === "OTHERS" ? "Kongu" : undefined,
      standard: "10th",
      religion: "Hindu",
      caste: "Vellalar",
      motherTongue: "Tamil",
      aadharNo: random12(),
      bloodGroup: randBloodGroup(),
      identityMark1: "Mole on right cheek",
      identityMark2: "Scar on left hand",
      previouslyStudied: "Govt Hr Sec School",
      vanNeeded: Math.random() > 0.5,
      
      fatherName: randName(),
      fatherPhone: random10(),
      fatherOccupation: "Agriculture",
      fatherAadharNo: random12(),
      fatherWhatsAppNo: random10(),
      
      motherName: randName(),
      motherPhone: random10(),
      motherOccupation: "Home Maker",
      motherAadharNo: random12(),
      motherWhatsAppNo: random10(),
      
      familyIncome: "150000",
      sibblings: "1",
      
      line1: "12, Main Road",
      line2: "Gandhi Nagar",
      pin: random6(),
      
      examName: "10th Standard",
      totalPercentage: "85",
      
      admissionNo: `ADM${Math.floor(1000 + Math.random() * 9000)}`,
      admissionDate: dayjs(),
    };
    
    // Clear out any previous docs/photos just natively
    randomData.documents = [];
    randomData.profilePhoto = [];
    randomData.profilePhotoChecked = false;
    
    form.setFieldsValue(randomData);
    setFormData(randomData);
    message.success("Filled with random Indian standard data!");
  };

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
const documentsChecked = Form.useWatch("documentsChecked", form);
const profilePhotoChecked = Form.useWatch("profilePhotoChecked", form);
useEffect(() => {
  if (editData?.documents?.[0]) {
    const doc = editData.documents[0];

    form.setFieldsValue({
      documentsChecked: [
        doc.birthCert && "birthCert",
        doc.communityCert && "communityCert",
        doc.aadharStudent && "aadharStudent",
      ].filter(Boolean),
    });
  }
}, [editData]);
// helper
const getDefaultFile = (path, name = "file") => {
  if (!path) return [];
  return [
    {
      uid: "-1",
      name,
      status: "done",
      url: `http://localhost:3000/${path}`,
    },
  ];
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
            <Form.Item name="standard" label="Standard" rules={[requiredRule]}>
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
                <Select.Option value="OTHERS">Others</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          {community === "OTHERS" && (
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
    // {
    //   title: "Documents",
    //   icon: <FileTextOutlined />,
    //   fields: [],
    //   content: (
    //     <>
    //       <Form.Item label="Profile Photo" required>
    //         <Form.Item name="profilePhotoChecked" valuePropName="checked" noStyle>
    //           <Checkbox>Upload Profile Photo</Checkbox>
    //         </Form.Item>
    //         {form.getFieldValue("profilePhotoChecked") && (
    //           <Form.Item
    //             name="profilePhoto"
    //             valuePropName="fileList"
    //             getValueFromEvent={e => e?.fileList}
    //             noStyle
    //             rules={[requiredRule]}
    //           >
    //             <Upload beforeUpload={file => {
    //               if (file.size > 1024 * 1024) {
    //                 message.error('File too large. Maximum allowed size is 1MB.');
    //                 return Upload.LIST_IGNORE;
    //               }
    //               return false;
    //             }} listType="picture">
    //               <Button icon={<UploadOutlined />}>Upload</Button>
    //             </Upload>
    //           </Form.Item>
    //         )}
    //       </Form.Item>
    //       <Form.Item name="documentsChecked" label="Documents" rules={[requiredRule]}>
    //         <Checkbox.Group>
    //           <Checkbox value="birthCert">Birth Certificate</Checkbox>
    //           <Checkbox value="communityCert">Community Certificate</Checkbox>
    //           <Checkbox value="aadharStudent">Aadhar</Checkbox>
    //         </Checkbox.Group>
    //       </Form.Item>
    //       {/* Document Uploads */}
    //       {form.getFieldValue("documentsChecked")?.includes("birthCert") && (
    //         <Form.Item
    //             name="birthCertFile"
    //             valuePropName="fileList"
    //             getValueFromEvent={e => e?.fileList}
    //             noStyle
    //             rules={[requiredRule]}
    //           >
    //             <Upload beforeUpload={file => {
    //               if (file.size > 1024 * 1024) {
    //                 message.error('File too large. Maximum allowed size is 1MB.');
    //                 return Upload.LIST_IGNORE;
    //               }
    //               return false;
    //             }} listType="picture">
    //               <Button icon={<UploadOutlined />}>Upload</Button>
    //             </Upload>
    //           </Form.Item>
    //       )}
    //       {form.getFieldValue("documentsChecked")?.includes("communityCert") && (
    //         <Form.Item label="Community Certificate" required name="communityCertFile" valuePropName="fileList" getValueFromEvent={e => e?.fileList} rules={[{ required: true, message: 'Please upload Community Certificate' }]}> 
    //           <Upload beforeUpload={file => {
    //             if (file.size > 1024 * 1024) {
    //               message.error('File too large. Maximum allowed size is 1MB.');
    //               return Upload.LIST_IGNORE;
    //             }
    //             return false;
    //           }} listType="picture">
    //             <Button icon={<UploadOutlined />}>Upload</Button>
    //           </Upload>
    //         </Form.Item>
    //       )}
    //       {form.getFieldValue("documentsChecked")?.includes("aadharStudent") && (
    //         <Form.Item label="Aadhar" required name="aadharStudentFile" valuePropName="fileList" getValueFromEvent={e => e?.fileList} rules={[{ required: true, message: 'Please upload Aadhar' }]}> 
    //           <Upload beforeUpload={file => {
    //             if (file.size > 1024 * 1024) {
    //               message.error('File too large. Maximum allowed size is 1MB.');
    //               return Upload.LIST_IGNORE;
    //             }
    //             return false;
    //           }} listType="picture">
    //             <Button icon={<UploadOutlined />}>Upload</Button>
    //           </Upload>
    //         </Form.Item>
    //       )}
    //     </>
    //   ),
    // },
{
  title: "Documents",
  content: (
    <>
      {/* ✅ PROFILE PHOTO */}
      <Form.Item label="Profile Photo" required>
        <Form.Item
          name="profilePhotoChecked"
          valuePropName="checked"
          noStyle
        >
          <Checkbox>Upload Profile Photo</Checkbox>
        </Form.Item>

        {profilePhotoChecked && (
          <Form.Item
            name="profilePhoto"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
            initialValue={getDefaultFile(
              editData?.documents?.[0]?.photoPath,
              "Profile Photo"
            )}
            rules={[{ required: true, message: "Upload photo" }]}
          >
            <Upload
              listType="picture"
              beforeUpload={(file) => {
                if (file.size > 1024 * 1024) {
                  message.error("Max 1MB allowed");
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Upload</Button>
            </Upload>
          </Form.Item>
        )}
      </Form.Item>

      {/* ✅ DOCUMENT CHECKBOX */}
      <Form.Item
        name="documentsChecked"
        label="Documents"
        rules={[{ required: true }]}
      >
        <Checkbox.Group>
          <Checkbox  value="birthCert">Birth Certificate</Checkbox>
          <Checkbox value="communityCert">Community Certificate</Checkbox>
          <Checkbox value="aadharStudent">Aadhar</Checkbox>
        </Checkbox.Group>
      </Form.Item>

      {/* ✅ BIRTH CERT */}
      {documentsChecked?.includes("birthCert") && (
        <Form.Item
          label="Birth Certificate"
          name="birthCertFile"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
          initialValue={getDefaultFile(
            editData?.documents?.[0]?.birthCertPath,
            "Birth Certificate"
          )}
          rules={[{ required: true, message: "Upload Birth Certificate" }]}
        >
          <Upload
            listType="picture"
            beforeUpload={(file) => {
              if (file.size > 1024 * 1024) {
                message.error("Max 1MB allowed");
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>Upload</Button>
          </Upload>
        </Form.Item>
      )}

      {/* ✅ COMMUNITY */}
      {documentsChecked?.includes("communityCert") && (
        <Form.Item
          label="Community Certificate"
          name="communityCertFile"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
          initialValue={getDefaultFile(
            editData?.documents?.[0]?.communityCertPath,
            "Community Certificate"
          )}
          rules={[{ required: true }]}
        >
          <Upload listType="picture" beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>Upload</Button>
          </Upload>
        </Form.Item>
      )}

      {/* ✅ AADHAR */}
      {documentsChecked?.includes("aadharStudent") && (
        <Form.Item
          label="Aadhar"
          name="aadharStudentFile"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
          initialValue={getDefaultFile(
            editData?.documents?.[0]?.aadharStudentPath,
            "Aadhar"
          )}
          rules={[{ required: true }]}
        >
          <Upload listType="picture" beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>Upload</Button>
          </Upload>
        </Form.Item>
      )}
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
 !editData && {
  title: "Review",
  icon: <CheckCircleOutlined />,
  content: (
    <Card>
      <Descriptions bordered column={2}>
        {Object.entries(formData).map(([k, v]) => {
          
          // 🔥 HANDLE PHOTO SEPARATELY
          if (k === "profilePhoto" && v?.length > 0) {
            const url =
              v[0].url ||
              v[0].thumbUrl ||
              (v[0].originFileObj ? URL.createObjectURL(v[0].originFileObj) : "");

            return (
              <Descriptions.Item key={k} label="Photo">
                {url ? <img src={url} alt="student" width={100} /> : "No Photo"}
              </Descriptions.Item>
            );
          }
          else if (k === "birthCertFile" && v?.length > 0) {
             const url =
              v[0].url ||
              v[0].thumbUrl ||
              (v[0].originFileObj ? URL.createObjectURL(v[0].originFileObj) : "");
            return (
              
              <Descriptions.Item key={k} label="Birth Certificate" span={2}>
                {url ? <img src={url} alt="birth certificate" width={100} /> : "No Birth Certificate"}
              </Descriptions.Item>
            );
          }
          else if (k === "communityCertFile" && v?.length > 0) {
              const url =
              v[0].url ||
              v[0].thumbUrl ||
              (v[0].originFileObj ? URL.createObjectURL(v[0].originFileObj) : "");
            return (
              <Descriptions.Item key={k} label="Community Certificate" span={2}>
                {url ? <img src={url} alt="community certificate" width={100} /> : "No Community Certificate"}
              </Descriptions.Item>
            );
          }
          else if (k === "aadharStudentFile" && v?.length > 0) {
              const url =
              v[0].url ||
              v[0].thumbUrl ||
              (v[0].originFileObj ? URL.createObjectURL(v[0].originFileObj) : "");
            return (
              <Descriptions.Item key={k} label="Aadhar" span={2}>
                {url ? <img src={url} alt="aadhar" width={100} /> : "No Aadhar"}
              </Descriptions.Item>
            );
          }
        


          // 🔥 NORMAL FIELDS
          return (
            <Descriptions.Item key={k} label={k}>
              {/* {typeof v === "object"
                ? v?.format
                  ? v.format("DD-MM-YYYY")
                  : JSON.stringify(v)
                : String(v)} */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Admission</Title>
          <Button type="dashed" onClick={fillRandomData}>
            Fill Random Indian Data
          </Button>
        </div>

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
                    const values = form.getFieldsValue(true);

                    // Build the documents array
                    const documents = [];
                    // Profile photo
                    if (values.profilePhotoChecked) {
                      documents.push({ key: "profilePhoto", photoPath: "" }); // backend will set photoPath
                    }
                    // Other documents
                    (values.documentsChecked || []).forEach(docKey => {
                      documents.push({ key: docKey, photoPath: "" });
                    });

                    // Build the main data object
                    const data = {
                      name: values.name,
                      standard: values.standard || "10th",
                      gender: values.gender,
                      dob: values.dob ? values.dob.toISOString() : undefined,
                      religion: values.religion,
                      community: values.community,
                      caste: values.caste,
                      motherTongue: values.motherTongue,
                      aadharNo: values.aadharNo,
                      bloodGroup: values.bloodGroup,
                      identification1: values.identityMark1,
                      identification2: values.identityMark2,
                      previousSchool: values.previouslyStudied,
                      transportMode: values.vanNeeded ? "Van" : "Local",
                      family: {
                        fatherName: values.fatherName,
                        fatherPhone: values.fatherPhone,
                        fatherAadhar: values.fatherAadharNo,
                        fatherOccupation: values.fatherOccupation,
                        fatherWhatsapp: values.fatherWhatsAppNo,
                        motherName: values.motherName,
                        motherPhone: values.motherPhone,
                        motherAadhar: values.motherAadharNo,
                        motherOccupation: values.motherOccupation,
                        motherWhatsapp: values.motherWhatsAppNo,
                        familyIncome: Number(values.familyIncome) || 0,
                        siblings: String(values.sibblings || ""),
                      },
                      address: {
                        line1: values.line1,
                        line2: values.line2,
                        pin: values.pin,
                      },
                      // documents:[],
                      academics: [
                        {
                          examName: values.examName || "10th",
                          totalPercentage: Number(values.totalPercentage) || 0,
                          subjects: [],
                        }
                      ],
                      admission: {
                        admissionNo: values.admissionNo,
                        admissionDate: values.admissionDate ? values.admissionDate.toISOString() : new Date().toISOString(),
                        standard: values.standard || "10th",
                        principalSignature: "Pending",
                      }
                    };

                    // Prepare FormData for multipart/form-data

                    const formDataToSend = new FormData();
                    formDataToSend.append('data', JSON.stringify(data));

                    // --- Place this block here ---
                    if (values.profilePhotoChecked) {
                      const fileObj = values.profilePhoto?.[0];
                      if (fileObj?.originFileObj) {
                        const file = fileObj.originFileObj;
                        if (file.size > 1024 * 1024) {
                          message.error("Profile photo too large. Max 1MB");
                          return;
                        }
                        formDataToSend.append("profilePhoto", file);
                      } else if (fileObj?.url) {
                        const path = fileObj.url.replace(/^https?:\/\/[^/]+\//, "");
                        formDataToSend.append("profilePhotoPath", path);
                      }
                    }
                    // --- End block ---

                    // birth cert, community cert, aadhar - only append if checkbox is checked and file is present, also check file size <= 1MB

                    if (
                      values.documentsChecked?.includes("birthCert") &&
                      values.birthCertFile?.[0]?.originFileObj
                    ) {
                      const file = values.birthCertFile[0].originFileObj;

                      if (file.size > 1024 * 1024) {
                        message.error("Birth Certificate too large");
                        return;
                      }

                      formDataToSend.append("birthCert", file);

                      // documents.birthCert.path = ""; // 🔥 important
                    }

                    if (
                      values.documentsChecked?.includes("communityCert") &&
                      values.communityCertFile?.[0]?.originFileObj
                    ) {
                      const file = values.communityCertFile[0].originFileObj;

                      if (file.size > 1024 * 1024) {
                        message.error("Community Certificate too large");
                        return;
                      }

                      formDataToSend.append("communityCert", file);

                      // documents.communityCert.path = ""; // 🔥 important
                    }

                    if (
                      values.documentsChecked?.includes("aadharStudent") &&
                      values.aadharStudentFile?.[0]?.originFileObj
                    ) {
                      const file = values.aadharStudentFile[0].originFileObj;
                      if (file.size > 1024 * 1024) {
                        message.error("Aadhar file too large");
                        return;
                      }
                      formDataToSend.append("aadharStudent", file);

                      // documents.aadharStudent.path = ""; // 🔥 important
                    }

                    // Attach document files if present and check size <= 1MB
                    //if birthcert true make birthcert checkbox active and show the file in review step, if the file is changed then send the new file to backend, if not changed then send the existing file path to backend, same for other documents

                    if (editData) {
                      console.log("Updating with data:", formDataToSend);
                      await updateAdmission(editData.id, formDataToSend);
                      message.success("Admission updated successfully!");
                      // if (clearEditData) clearEditData();
                    } else {
                      await createAdmission(formDataToSend);
                      message.success("Admission created successfully!");
                      form.resetFields();
                      setFormData({});
                      setCurrent(0);
                    }
                  } catch (err) {
                    console.error("Admission error:", err);
                    message.error("Error creating admission. Check required fields or try again.");
                  }
                }}>{editData ? "Update" : "Submit"}</Button>
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
    {(formData?.profilePhoto?.[0]?.url || formData?.profilePhoto?.[0]?.thumbUrl) && (
      <img
        src={formData.profilePhoto[0].url || formData.profilePhoto[0].thumbUrl}
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