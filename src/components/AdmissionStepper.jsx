import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
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
  Divider,
  Radio,
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
  PlusOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.jpeg";
import { createAdmission, updateAdmission, getNextAdmissionNo } from "../modules/admission/admission.service";
import dayjs from "dayjs";
const { Title } = Typography;

const normalizeStandardValue = (value) => {
  if (value === null || value === undefined) return value;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();

  if (lower === "lkg") return "LKG";
  if (lower === "ukg") return "UKG";

  const stdCodeMatch = lower.match(/^std[_\-\s]?(\d{1,2})$/);
  if (stdCodeMatch) return stdCodeMatch[1];

  const numberMatch = lower.match(/^(\d{1,2})(st|nd|rd|th)?(\s*standard)?$/);
  if (numberMatch) return numberMatch[1];

  return raw;
};

const normalizeSubjectRow = (subject) => ({
  subjectName: subject?.subjectName || subject?.subject || subject?.name || "",
  maxMarks:
    subject?.maxMarks ??
    subject?.maxMark ??
    subject?.maxMarksPrescribed ??
    subject?.maximumMarksPrescribed ??
    null,
  obtainedMarks:
    subject?.obtainedMarks ??
    subject?.markObtained ??
    subject?.marksObtained ??
    subject?.score ??
    null,
});

const AdmissionStepper = ({ editData, clearEditData }) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});
  const [community, setCommunity] = useState("");

  const [availableYears, setAvailableYears] = useState([]);
  const [draftExists, setDraftExists] = useState(false);

  // Check for local drafts on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("admission_draft");
    if (savedDraft) {
      setDraftExists(true);
      message.info({
        content: (
          <div className="flex items-center gap-3">
            <span>You have a saved draft!</span>
            <button
              className="px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-primary-container transition-all"
              onClick={handleRestoreDraft}
            >
              Restore
            </button>
            <button
              className="text-error text-xs hover:underline"
              onClick={handleClearDraft}
            >
              Discard
            </button>
          </div>
        ),
        duration: 10,
        key: "draft_notice"
      });
    }
  }, []);

  const handleRestoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem("admission_draft");
      if (savedDraft) {
        const { values, step } = JSON.parse(savedDraft);
        if (values.dob) values.dob = dayjs(values.dob);
        if (values.admissionDate) values.admissionDate = dayjs(values.admissionDate);
        if (values.admissionFrom) values.admissionFrom = dayjs(values.admissionFrom);
        if (values.admissionTo) values.admissionTo = dayjs(values.admissionTo);

        form.setFieldsValue(values);
        setFormData(values);
        setCurrent(step || 0);
        message.success({ content: "Draft restored successfully!", key: "draft_notice" });
        setDraftExists(false);
      }
    } catch (err) {
      message.error("Failed to restore draft.");
    }
  };

  const handleSaveDraft = () => {
    const values = form.getFieldsValue(true);
    const draft = {
      values,
      step: current,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("admission_draft", JSON.stringify(draft));
    message.success("Progress saved as draft locally!");
    setDraftExists(true);
  };

  const handleClearDraft = () => {
    localStorage.removeItem("admission_draft");
    setDraftExists(false);
    message.success({ content: "Draft cleared.", key: "draft_notice" });
  };

  const [fileLists, setFileLists] = useState({
    profilePhoto: [],
    birthCert: [],
    communityCert: [],
    aadharStudent: [],
    // ...add more as needed
  });

  useEffect(() => {
    const fetchAdmissionNo = async () => {
      try {
        const res = await getNextAdmissionNo();

        form.setFieldsValue({
          admissionNo: res.admissionNo,
        });

        setFormData(prev => ({
          ...prev,
          admissionNo: res.admissionNo,
        }));

      } catch (err) {
        message.error("Auto admission number failed");
      }
    };

    // ✅ only for NEW admission (not edit)
    if (!editData) {
      fetchAdmissionNo();
    }
  }, []);

  useEffect(() => {
    if (editData) {
      const primaryAcademic = editData.academics?.[0] || {};
      const flatData = {
        name: editData.name,
        standard: normalizeStandardValue(editData.standard || editData.admission?.standard),
        gender: editData.gender,
        dob: editData.dob ? dayjs(editData.dob) : null,
        religion: editData.religion,
        community: editData.community,
        caste: editData.caste,
        motherTongue: editData.motherTongue,
        aadharNo: editData.aadharNo,
        customCommunity: editData.community === "OTHERS" ? editData.communityOther : undefined,
        bloodGroup: editData.bloodGroup,
        identityMark1: editData.identification1,
        identityMark2: editData.identification2,
        previouslyStudied: editData.previousSchool,
        previousBoard: editData.previousBoard || editData.board || editData.admission?.previousBoard || editData.admission?.board,
        section: editData.section || undefined,
        academicYear: editData.academicYear || undefined,
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
        familyIncome: String(editData.family?.familyIncome),
        sibblings: editData.family?.siblings,
        preferredPhone: editData.family?.preferredPhone || "father",
        parentsEmail: editData.family?.parentsEmail,
        line1: editData.address?.line1,
        line2: editData.address?.line2,
        pin: editData.address?.pin,
        admissionNo: editData.admission?.admissionNo,
        admissionFrom: editData.admission?.admissionFrom ? dayjs(editData.admission.admissionFrom) : null,
        admissionTo: editData.admission?.admissionTo ? dayjs(editData.admission.admissionTo) : null,
        admissionDate: editData.admission?.admissionDate ? dayjs(editData.admission.admissionDate) : null,
        examName: primaryAcademic.examName,
        academicStream: primaryAcademic.stream || editData.academicStream,
        registerNo: primaryAcademic.registerNo,
        monthYear: primaryAcademic.monthYear,
        totalPercentage: primaryAcademic.totalPercentage,
        subjects: (primaryAcademic.subjects || []).map(normalizeSubjectRow),
      };

      // Handle documents for checkbox group
      const doc = editData.documents?.[0] || {};
      const docSelection = [];
      if (doc.birthCert) docSelection.push("birthCert");
      if (doc.communityCert) docSelection.push("communityCert");
      if (doc.aadharStudent) docSelection.push("aadharStudent");
      flatData.documents = docSelection;

      // Handle hard copy flags
      const hardCopySelection = [];
      if (doc.birthCertHardCopy) hardCopySelection.push("birthCert");
      if (doc.communityCertHardCopy) hardCopySelection.push("communityCert");
      if (doc.aadharStudentHardCopy) hardCopySelection.push("aadharStudent");
      if (doc.aadharFatherHardCopy) hardCopySelection.push("aadharFather");
      if (doc.aadharMotherHardCopy) hardCopySelection.push("aadharMother");
      if (doc.transferCertHardCopy) hardCopySelection.push("transferCert");
      flatData.hardCopyDocs = hardCopySelection;

      // Handle photo structure assuming we are getting a valid image config
      if (doc.photo || doc.photoPath) {
        flatData.profilePhotoChecked = true;
        flatData.profilePhoto = [
          {
            uid: "-1",
            name: "photo.jpg",
            status: "done",
            url: doc.photoPath ? `/erp/api/${doc.photoPath.replace(/\\/g, '/')}` : "https://via.placeholder.com/150",
          },
        ];
      }

      form.setFieldsValue(flatData);
      setFormData(flatData);
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
      customeCommunity: communitySelected === "OTHERS" ? "Kongu" : undefined,
      motherTongue: "Tamil",
      aadharNo: random12(),
      bloodGroup: randBloodGroup(),
      identityMark1: "Mole on right cheek",
      identityMark2: "Scar on left hand",
      previouslyStudied: "Govt Hr Sec School",
      previousBoard: Math.random() > 0.5 ? "TAMILNADU_BOARD" : "OTHER_BOARD",
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
      registerNo: "2025001234",
      monthYear: "March 2025",
      totalPercentage: 85,
      subjects: [
        { subjectName: 'Tamil', maxMarks: 150, obtainedMarks: 130 },
        { subjectName: 'English', maxMarks: 150, obtainedMarks: 120 },
        { subjectName: 'Mathematics', maxMarks: 100, obtainedMarks: 88 },
        { subjectName: 'Science', maxMarks: 100, obtainedMarks: 90 },
        { subjectName: 'Social Science', maxMarks: 100, obtainedMarks: 85 },
      ],

      //admissionNo: `ADM${Math.floor(1000 + Math.random() * 9000)}`,
      admissionDate: dayjs(),
      admissionFrom: dayjs(),
      admissionTo: dayjs().add(3, 'year'),
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
  const documentsChecked = Form.useWatch("documentsChecked", form);
  const profilePhotoChecked = Form.useWatch("profilePhotoChecked", form);
  const watchedStandard = Form.useWatch("standard", form);
  const watchedSubjects = Form.useWatch("subjects", form) || [];
  const siblingSchool = Form.useWatch("siblingSchool", form);

  useEffect(() => {
    if (!watchedSubjects || watchedSubjects.length === 0) return;

    let totalMax = 0;
    let totalObtained = 0;

    watchedSubjects.forEach((s) => {
      totalMax += Number(s?.maxMarks) || 0;
      totalObtained += Number(s?.obtainedMarks) || 0;
    });

    if (totalMax > 0) {
      const percent = (totalObtained / totalMax) * 100;

      form.setFieldsValue({
        totalPercentage: Number(percent.toFixed(2)),
      });
    }
  }, [watchedSubjects]);
  const isHigherSecondary = watchedStandard === '11' || watchedStandard === '12';



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



  // Re-sync subjects to Form.List after it mounts when navigating to the Academic step.
  // Form.List may not receive values set via setFieldsValue while it was unmounted,
  // so we push the stored formData.subjects back after the step renders.
  useEffect(() => {
    if (current === 3) {
      const subjects = formData?.subjects;
      if (subjects !== undefined) {
        form.setFieldsValue({
          subjects:
            subjects.length > 0
              ? subjects
              : [{ subjectName: '', maxMarks: null, obtainedMarks: null }],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);
  // helper
  const getDefaultFile = (path, name = "file") => {
    if (!path) return [];
    return [
      {
        uid: "-1",
        name,
        status: "done",
        url: `/erp/api/${path.replace(/\\/g, '/')}`,
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
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-primary">Student Profile</h3>
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Enter the student's basic identification and demographic details.</p>
            <div className="mt-4 pt-4 ">
              <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Admission Details</h4>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item name="admissionNo" label="Admission No">
                    <Input disabled placeholder="Auto-generated" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="admissionDate" label="Admission Date" rules={[requiredRule]}>
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                 <Col span={12}>
              <Form.Item name="academicYear" label="Academic Year">
                <Select placeholder="Select academic year" allowClear>
                  <Select.Option value="2024-2025">2024-2025</Select.Option>
                  <Select.Option value="2025-2026">2025-2026</Select.Option>
                  <Select.Option value="2026-2027">2026-2027</Select.Option>
                  <Select.Option value="2027-2028">2027-2028</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <div style={{ display: 'flex', gap: '20px', marginTop: '28px' }}>
                <Form.Item name="vanNeeded" valuePropName="checked">
                  <Checkbox>Transport Needed</Checkbox>
                </Form.Item>
                <Form.Item name="rteApplied" valuePropName="checked">
                  <Checkbox>RTE Applied Student</Checkbox>
                </Form.Item>
              </div>
            </Col>
              </Row>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name="name" label="Student Name" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="standard" label="Standard" rules={[requiredRule]}>
                <Select
                  placeholder="Select standard"
                  options={[
                    { value: 'LKG', label: 'LKG' },
                    { value: 'UKG', label: 'UKG' },
                    { value: '1', label: '1st Standard' },
                    { value: '2', label: '2nd Standard' },
                    { value: '3', label: '3rd Standard' },
                    { value: '4', label: '4th Standard' },
                    { value: '5', label: '5th Standard' },
                    { value: '6', label: '6th Standard' },
                    { value: '7', label: '7th Standard' },
                    { value: '8', label: '8th Standard' },
                    { value: '9', label: '9th Standard' },
                    { value: '10', label: '10th Standard' },
                    { value: '11', label: '11th Standard' },
                    { value: '12', label: '12th Standard' },
                  ]}
                />
              </Form.Item>
            </Col>
             <Col span={12}>
              <Form.Item name="section" label="Section">
                <Select placeholder="Select section" allowClear>
                  <Select.Option value="A">A</Select.Option>
                  <Select.Option value="B">B</Select.Option>
                  <Select.Option value="C">C</Select.Option>
                  <Select.Option value="D">D</Select.Option>
                  <Select.Option value="E">E</Select.Option>
                </Select>
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
              <Form.Item name="religion" label="Religion" rules={[requiredRule]}>
                <Input />
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

            <Col span={12}>
              <Form.Item name="caste" label="Caste" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="motherTongue" label="Mother Tongue" rules={[requiredRule]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="aadharNo" label="Aadhar No" rules={[aadharRule]}><Input maxLength={12} /></Form.Item></Col>
            <Col span={12}><Form.Item name="bloodGroup" label="Blood Group" rules={[requiredRule]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="identityMark1" label="Identity Mark 1" rules={[requiredRule]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="identityMark2" label="Identity Mark 2" rules={[requiredRule]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="previouslyStudied" label="Previously Studied" rules={[requiredRule]}><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="previousBoard" label="Board Studied" rules={[requiredRule]}>
                <Select placeholder="Select board">
                  <Select.Option value="TAMILNADU_BOARD">Tamilnadu Board</Select.Option>
                  <Select.Option value="OTHER_BOARD">Other Board</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },

    // 🔥 FAMILY
    {
      title: "Family",
      icon: <TeamOutlined />,
      fields: [],
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Provide information about parents, siblings, and contact preferences.</p>
          </div>
          <Row gutter={16}>
            {/* LEFT — FATHER */}
            <Col span={12}>
              <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Father Particulars</h4>
              <Form.Item name="fatherName" label="Father Name">
                <Input />
              </Form.Item>
              <Form.Item name="fatherPhone" label="Father Phone">
                <Input maxLength={10} />
              </Form.Item>
              <Form.Item name="fatherOccupation" label="Father Occupation">
                <Input />
              </Form.Item>
              <Form.Item name="fatherAadharNo" label="Father Aadhar">
                <Input maxLength={12} />
              </Form.Item>
              <Form.Item name="fatherWhatsAppNo" label="Father WhatsApp">
                <Input maxLength={10} />
              </Form.Item>
            </Col>

            {/* RIGHT — MOTHER */}
            <Col span={12}>
              <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Mother Particulars</h4>
              <Form.Item name="motherName" label="Mother Name">
                <Input />
              </Form.Item>
              <Form.Item name="motherPhone" label="Mother Phone">
                <Input maxLength={10} />
              </Form.Item>
              <Form.Item name="motherOccupation" label="Mother Occupation">
                <Input />
              </Form.Item>
              <Form.Item name="motherAadharNo" label="Mother Aadhar">
                <Input maxLength={12} />
              </Form.Item>
              <Form.Item name="motherWhatsAppNo" label="Mother WhatsApp">
                <Input maxLength={10} />
              </Form.Item>
            </Col>
          </Row>


          <div className="mt-8 pt-4 border-t border-outline-variant">
            <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Siblings & Preferences</h4>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="familyIncome" label="Family Income">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sibblings" label="Siblings">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="siblingSchool" label="Sibling School">
                  <Select placeholder="Select option">
                    <Select.Option value="same">Same School</Select.Option>
                    <Select.Option value="other">Other School</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              {siblingSchool === "other" && (
                <Col span={12}>
                  <Form.Item
                    name="otherSchoolName"
                    label="Other School Name"
                    rules={[{ required: true, message: "Enter school name" }]}
                  >
                    <Input placeholder="Enter school name" />
                  </Form.Item>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="preferredPhone" label="Preferred Contact" initialValue="father">
                  <Radio.Group>
                    <Radio value="father">Father</Radio>
                    <Radio value="mother">Mother</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="parentsEmail" label="Parents Email ID" rules={[{ type: 'email', message: 'Please enter a valid email' }]}>
                  <Input placeholder="parents@example.com" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </div>
      ),
    },

    // 🔥 ADDRESS
    {
      title: "Address",
      icon: <HomeOutlined />,
      fields: [],
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Enter the current contact information for correspondence and transport.</p>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="doorNo" label="Door No / House No" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="street" label="Street / Area" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="landmark" label="Landmark">
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="city" label="City" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="state" label="State" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="pin" label="Pincode" rules={[pinRule]}>
                <Input maxLength={6} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },

    // 🔥 ACADEMIC
    {
      title: "Academic",
      icon: <BookOutlined />,
      fields: [],
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Details of qualifying examinations and subject-wise performance.</p>
          </div>
          <>
            {/* ── Qualifying Exam header ── */}
            <Divider orientation="left">Qualifying Examination Passed and Percentage of Mark Obtained</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="examName" label="Name of Examination" rules={[requiredRule]}>
                  <Input placeholder="SSLC / MATRIC / CBSE" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="monthYear" label="Month and Year of Appearance">
                  <Input placeholder="e.g. March 2025" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="registerNo" label="Register No">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            {/* ── Per-subject marks table ── */}
            <Card
              size="small"
              title="Subject-wise Marks"
              extra={<span style={{ color: '#888', fontSize: 12 }}>Totals are auto-calculated from rows</span>}
              style={{ marginBottom: 16 }}
            >
              <Form.List name="subjects" initialValue={[{ subjectName: '', maxMarks: null, obtainedMarks: null }]}>
                {(fields, { add, remove }) => (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'left' }}>Subject</th>
                          <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', width: 140 }}>Maximum Marks Prescribed</th>
                          <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', width: 140 }}>Marks Obtained</th>
                          <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', width: 100 }}>% in Subject</th>
                          <th style={{ border: '1px solid #d9d9d9', padding: '8px', width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map(({ key, name }) => {
                          const s = watchedSubjects[name] || {};
                          const pct =
                            Number(s.maxMarks) > 0 && s.obtainedMarks != null
                              ? ((Number(s.obtainedMarks) / Number(s.maxMarks)) * 100).toFixed(1)
                              : '-';
                          return (
                            <tr key={key}>
                              <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px' }}>
                                <Form.Item name={[name, 'subjectName']} rules={[requiredRule]} noStyle>
                                  <Input placeholder="Subject name" />
                                </Form.Item>
                              </td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px' }}>
                                <Form.Item name={[name, 'maxMarks']} rules={[requiredRule]} noStyle>
                                  <InputNumber min={0} max={999} style={{ width: '100%' }} placeholder="Max" />
                                </Form.Item>
                              </td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px' }}>
                                <Form.Item name={[name, 'obtainedMarks']} rules={[requiredRule]} noStyle>
                                  <InputNumber min={0} max={999} style={{ width: '100%' }} placeholder="Obtained" />
                                </Form.Item>
                              </td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px', textAlign: 'center', fontWeight: 500 }}>
                                {pct !== '-' ? `${pct}%` : '-'}
                              </td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '4px 8px', textAlign: 'center' }}>
                                <MinusCircleOutlined
                                  style={{ color: '#ff4d4f', cursor: 'pointer' }}
                                  onClick={() => remove(name)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {/* TOTAL row */}
                        {(() => {
                          const totalMax = watchedSubjects.reduce((sum, s) => sum + (Number(s?.maxMarks) || 0), 0);
                          const totalObtained = watchedSubjects.reduce((sum, s) => sum + (Number(s?.obtainedMarks) || 0), 0);
                          const totalPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '-';
                          return (
                            <tr style={{ background: '#f0f5ff', fontWeight: 700 }}>
                              <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'right' }}>TOTAL</td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>{totalMax || '-'}</td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>{totalObtained || '-'}</td>
                              <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>
                                {totalPct !== '-' ? `${totalPct}%` : '-'}
                              </td>
                              <td style={{ border: '1px solid #d9d9d9' }}></td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                    <Button
                      type="dashed"
                      onClick={() => add({ subjectName: '', maxMarks: null, obtainedMarks: null })}
                      icon={<PlusOutlined />}
                      style={{ width: '100%' }}
                    >
                      Add Subject
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            {/* Overall % — can be left blank for auto-calculation on the backend */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="totalPercentage" label="Overall % (leave blank to auto-calculate)">
                  <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} placeholder="e.g. 87.50" />
                </Form.Item>
              </Col>
            </Row>

            {/* ── Higher Secondary stream selector (11th / 12th only) ── */}
            {isHigherSecondary && (
              <>
                <Divider orientation="left">Higher Secondary — Subjects Offered (Part III)</Divider>
                <Row gutter={16}>
                  <Col span={14}>
                    <Form.Item name="academicStream" label="Academic Stream / Group" rules={[requiredRule]}>
                      <Select placeholder="Select stream">
                        <Select.Option value="BIO_MATHS">Physics, Chemistry, Biology, Mathematics</Select.Option>
                        <Select.Option value="CS_MATHS">Physics, Chemistry, Computer Science, Mathematics</Select.Option>
                        <Select.Option value="BIO_CS">Physics, Chemistry, Biology, Computer Science</Select.Option>
                        <Select.Option value="COMMERCE">Commerce, Economics, Accountancy, Computer Application</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Card size="small" title="Subjects Offered" style={{ marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Academic Stream</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Part</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td rowSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                          {form.getFieldValue('academicStream') === 'BIO_MATHS' && 'Phy, Chem, Bio, Maths'}
                          {form.getFieldValue('academicStream') === 'CS_MATHS' && 'Phy, Chem, CS, Maths'}
                          {form.getFieldValue('academicStream') === 'BIO_CS' && 'Phy, Chem, Bio, CS'}
                          {form.getFieldValue('academicStream') === 'COMMERCE' && 'Commerce Group'}
                          {!form.getFieldValue('academicStream') && <em>—</em>}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Part I (Compulsory)</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Tamil</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Part II (Compulsory)</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>English</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Part III (Choose)</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {form.getFieldValue('academicStream') === 'BIO_MATHS' && 'Physics, Chemistry, Biology, Mathematics'}
                          {form.getFieldValue('academicStream') === 'CS_MATHS' && 'Physics, Chemistry, Computer Science, Mathematics'}
                          {form.getFieldValue('academicStream') === 'BIO_CS' && 'Physics, Chemistry, Biology, Computer Science'}
                          {form.getFieldValue('academicStream') === 'COMMERCE' && 'Commerce, Economics, Accountancy, Computer Application'}
                          {!form.getFieldValue('academicStream') && <em>Select a stream above</em>}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </>
        </div>
      ),
    },

    // 🔥 DOCUMENTS
    {
      title: "Documents",
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Upload mandatory certificates and student profile photo.</p>
          </div>
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
                <Checkbox value="birthCert">Birth Certificate</Checkbox>
                <Checkbox value="communityCert">Community Certificate</Checkbox>
                <Checkbox value="aadharStudent">Aadhar</Checkbox>
              </Checkbox.Group>
            </Form.Item>

            {/* ✅ HARD COPY FLAGS */}
            <Divider orientation="left" style={{ fontSize: 13 }}>Hard Copy Received (mark if physical document is submitted)</Divider>
            <Form.Item name="hardCopyDocs" label="Hard Copy Documents">
              <Checkbox.Group>
                <Checkbox value="birthCert">Birth Certificate</Checkbox>
                <Checkbox value="communityCert">Community Certificate</Checkbox>
                <Checkbox value="aadharStudent">Aadhar (Student)</Checkbox>
                <Checkbox value="aadharFather">Aadhar (Father)</Checkbox>
                <Checkbox value="aadharMother">Aadhar (Mother)</Checkbox>
                <Checkbox value="transferCert">Transfer Certificate</Checkbox>
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
        </div>
      ),
    },


    // 🔥 REVIEW
    {
      title: "Review",
      icon: <CheckCircleOutlined />,
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Verify all information before submission.</p>
          </div>
          <Card>
            <Descriptions bordered column={2}>
              {Object.entries(formData).map(([k, v]) => {
                if (k === "rteApplied" || k === "vanNeeded") return null;
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
                  const file = v[0];
                  const url = file.url || file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "");
                  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf");

                  return (
                    <Descriptions.Item key={k} label="Birth Certificate" span={2}>
                      {url ? (
                        isPdf ? (
                          <div className="flex flex-col gap-2">
                            <iframe src={url} width="100%" height="200px" title="Birth Certificate" className="border rounded" />
                            <a href={url} target="_blank" rel="noreferrer" className="text-secondary text-xs hover:underline flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">open_in_new</span> Open Full PDF
                            </a>
                          </div>
                        ) : (
                          <img src={url} alt="birth certificate" width={100} className="rounded shadow-sm border" />
                        )
                      ) : "No Birth Certificate"}
                    </Descriptions.Item>
                  );
                }
                else if (k === "communityCertFile" && v?.length > 0) {
                  const file = v[0];
                  const url = file.url || file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "");
                  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf");

                  return (
                    <Descriptions.Item key={k} label="Community Certificate" span={2}>
                      {url ? (
                        isPdf ? (
                          <div className="flex flex-col gap-2">
                            <iframe src={url} width="100%" height="200px" title="Community Certificate" className="border rounded" />
                            <a href={url} target="_blank" rel="noreferrer" className="text-secondary text-xs hover:underline flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">open_in_new</span> Open Full PDF
                            </a>
                          </div>
                        ) : (
                          <img src={url} alt="community certificate" width={100} className="rounded shadow-sm border" />
                        )
                      ) : "No Community Certificate"}
                    </Descriptions.Item>
                  );
                }
                else if (k === "aadharStudentFile" && v?.length > 0) {
                  const file = v[0];
                  const url = file.url || file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "");
                  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf");

                  return (
                    <Descriptions.Item key={k} label="Aadhar" span={2}>
                      {url ? (
                        isPdf ? (
                          <div className="flex flex-col gap-2">
                            <iframe src={url} width="100%" height="200px" title="Aadhar" className="border rounded" />
                            <a href={url} target="_blank" rel="noreferrer" className="text-secondary text-xs hover:underline flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">open_in_new</span> Open Full PDF
                            </a>
                          </div>
                        ) : (
                          <img src={url} alt="aadhar" width={100} className="rounded shadow-sm border" />
                        )
                      ) : "No Aadhar"}
                    </Descriptions.Item>
                  );
                }



                // 🔥 NORMAL FIELDS — skip file-upload keys (already handled above)
                if (['profilePhoto', 'birthCertFile', 'communityCertFile', 'aadharStudentFile', 'profilePhotoChecked'].includes(k)) {
                  return null;
                }
                // Skip null / undefined / empty values
                if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
                  return null;
                }

                const formatLabel = (key) =>
                  key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());
                return (

                  <Descriptions.Item key={k} label={formatLabel(k)}>
                    {typeof v === "object"
                      ? v?.format
                        ? v.format("DD-MM-YYYY")
                        : Array.isArray(v)
                          ? v.map((item) =>
                            typeof item === 'object'
                              ? item.subjectName || JSON.stringify(item)
                              : String(item)
                          ).join(', ')
                          : JSON.stringify(v)
                      : String(v)}
                  </Descriptions.Item>
                );
              })}
            </Descriptions>

            <Descriptions bordered column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="Transport">
                {formData.vanNeeded ? "Van" : "Local"}
              </Descriptions.Item>

              <Descriptions.Item label="RTE Applied">
                {formData.rteApplied ? "Yes" : "No"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
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
  pdfWrapper: {
    width: "800px",
    background: "white",
    fontFamily: "'Public Sans', sans-serif",
    color: "#222",
  },
  header: {
    backgroundColor: "#F59E0B",
    padding: "30px 40px",
    textAlign: "center",
    color: "white",
    position: "relative",
    marginBottom: "30px",
  },
  institutionName: {
    fontSize: "28px",
    fontWeight: "900",
    margin: 0,
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: "12px",
    fontWeight: "500",
    opacity: 0.9,
    margin: "4px 0",
  },
  formTitle: {
    fontSize: "20px",
    fontWeight: "800",
    marginTop: "20px",
    padding: "6px 24px",
    border: "2px solid white",
    display: "inline-block",
    textTransform: "uppercase",
  },
  photoBox: {
    position: "absolute",
    right: "40px",
    top: "30px",
    width: "100px",
    height: "120px",
    border: "1px dashed rgba(255,255,255,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "rgba(255,255,255,0.8)",
  },
  content: {
    padding: "0 40px 40px",
  },
  row: {
    display: "flex",
    gap: "20px",
    marginBottom: "18px",
    alignItems: "flex-end",
  },
  field: {
    display: "flex",
    flex: 1,
    alignItems: "flex-end",
    gap: "10px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#444",
    whiteSpace: "nowrap",
  },
  value: {
    flex: 1,
    borderBottom: "1px dotted #999",
    fontSize: "14px",
    paddingBottom: "2px",
    color: "#000",
    fontWeight: "500",
    minHeight: "20px"
  },
  addressSection: {
    border: "1px dashed #cbd5e1",
    padding: "20px",
    marginTop: "25px",
    marginBottom: "20px",
    position: "relative",
  },
  addressLabel: {
    position: "absolute",
    top: "-10px",
    left: "20px",
    background: "white",
    padding: "0 10px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#F59E0B",
    textTransform: "uppercase",
  },
  declaration: {
    textAlign: "center",
    marginTop: "40px",
    padding: "0 20px",
  },
  declTitle: {
    fontSize: "14px",
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  declText: {
    fontSize: "12px",
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "60px",
  },
  signatureRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 40px",
  },
  sigLine: {
    width: "200px",
    borderTop: "1px dotted #666",
    textAlign: "center",
    paddingTop: "8px",
    fontSize: "12px",
    fontWeight: "700",
  },
  academicSection: {
    marginTop: "25px",
    marginBottom: "20px",
  },
  academicTitle: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#F59E0B",
    textTransform: "uppercase",
    marginBottom: "12px",
    borderBottom: "2px solid #F59E0B",
    paddingBottom: "4px",
    display: "inline-block",
  },
  academicTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  academicTh: {
    backgroundColor: "#fff9f2",
    border: "1px solid #fed7aa",
    padding: "8px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#9a3412",
    textAlign: "center",
  },
  academicTd: {
    border: "1px solid #fed7aa",
    padding: "8px",
    fontSize: "11px",
    textAlign: "center",
  },
  footer: {
    height: "15px",
    backgroundColor: "#F59E0B",
    marginTop: "40px",
  }
};

const generatePDF = async () => {
  const input = document.getElementById("pdfContent");
  if (!input) return;

  const canvas = await html2canvas(input, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: 800,
  });

  const imgWidth = 210; // mm
  const pageHeight = 297; // mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;

  const pdf = new jsPDF("p", "mm", "a4");
  let position = 0;

  const imgData = canvas.toDataURL("image/png");

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`Admission_${formData.admissionNo || "draft"}.pdf`);
};

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-end px-4">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-primary">Admission Desk</h2>
            <p className="text-on-surface-variant font-medium mt-1">Manage new student enrollments and academic records.</p>
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold text-primary uppercase tracking-tighter">Academic Session 2026-27</span>
          </div>
        </div>


        {/* Custom Stepper Designer UI */}
        <div className="grid grid-cols-7 gap-x-1 gap-y-4 mb-10 mt-6 px-4">
          {steps.map((step, index) => {
            const isActive = index === current;
            const isCompleted = index < current;

            return (
              <div
                key={index}
                className="flex flex-col items-center gap-2 group cursor-pointer"
                onClick={() => setCurrent(index)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                    ${isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110"
                      : isCompleted
                        ? "bg-primary/80 text-white shadow-md"
                        : "bg-surface-container-high text-on-surface-variant group-hover:bg-primary-fixed"
                    }`}
                >
                  {isCompleted ? <span className="material-symbols-outlined text-[1.2rem]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}>check</span> : index + 1}
                </div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider text-center transition-colors duration-300
                    ${isActive ? "text-primary" : "text-on-surface-variant"}`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>


        {/* Main Form Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_rgba(1,29,53,0.06)] overflow-hidden">
          <div className="p-8 border-b border-surface-container-low flex justify-between items-center">
            <div>
              <h3 className="font-headline text-2xl font-extrabold text-primary">{steps[current].title} Details</h3>
              <p className="text-on-surface-variant text-sm mt-1">Step {current + 1} of {steps.length}: Please provide the following information.</p>
            </div>
            <button
              className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-sm rounded-xl transition-all flex items-center gap-2 active:scale-95"
              onClick={fillRandomData}
            >
              <span className="material-symbols-outlined text-lg">auto_fix_high</span>
              Fill Random Indian Data
            </button>
          </div>

          <Form
            form={form}
            layout="vertical"
            onValuesChange={(_, all) => setFormData(all)}
            className="p-8"
          >
            <div className="min-h-[400px]">
              {steps[current].content}
            </div>
          </Form>

          {/* Footer Actions */}
          <div className="px-8 py-6 bg-surface-container-low flex justify-between items-center">
            <button
              className="px-6 py-3 text-primary font-bold text-sm hover:underline flex items-center gap-2 transition-all active:scale-95"
              onClick={() => {
                form.resetFields();
                setFormData({});
                setCurrent(0);
                handleClearDraft();
                if (clearEditData) clearEditData();
              }}
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Discard Application
            </button>
            <div className="flex gap-4">
              {current > 0 && (
                <button
                  className="px-8 py-3 bg-white border border-outline-variant text-primary font-bold text-sm rounded-xl hover:bg-surface-container-lowest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  onClick={prev}
                >
                  <span className="material-symbols-outlined text-lg rotate-180">arrow_forward</span>
                  Prev
                </button>
              )}

              <button
                className="px-8 py-3 bg-white border border-outline-variant text-primary font-bold text-sm rounded-xl hover:bg-surface-container-lowest shadow-sm transition-all active:scale-95"
                onClick={handleSaveDraft}
              >
                Save as Draft
              </button>

              {current < steps.length - 1 ? (
                <button
                  style={{
                    background: 'linear-gradient(to right, #00152a, #102a43)'
                  }}
                  className="px-10 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95"
                  onClick={next}
                >
                  Next Stage
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              ) : (
                <div className="flex gap-4">
                  <button
                    className="px-8 py-3 bg-white border border-outline-variant text-primary font-bold text-sm rounded-xl hover:bg-surface-container-lowest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    onClick={generatePDF}
                  >
                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                    PDF
                  </button>
                  <button
                    className="px-10 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95"
                    onClick={async () => {

                      try {
                        await form.validateFields();
                        const values = form.getFieldsValue(true);

                        // Build the documents array
                        const documents = [];
                        const hardCopyDocs = values.hardCopyDocs || [];
                        // Profile photo
                        if (values.profilePhotoChecked) {
                          documents.push({ key: "profilePhoto", photoPath: "" }); // backend will set photoPath
                        }
                        // Other documents (with hardCopy flag)
                        (values.documentsChecked || []).forEach(docKey => {
                          documents.push({ key: docKey, photoPath: "", hardCopy: hardCopyDocs.includes(docKey) });
                        });
                        // Hard-copy only docs (not in documentsChecked but marked as hard copy)
                        hardCopyDocs.forEach(docKey => {
                          if (!(values.documentsChecked || []).includes(docKey)) {
                            documents.push({ key: docKey, uploaded: false, hardCopy: true });
                          }
                        });

                        // Build the main data object
                        const data = {
                          name: values.name,
                          standard: values.standard || "10th",
                          rte: values.rteApplied || false,
                          gender: values.gender,
                          dob: values.dob ? values.dob.toISOString() : undefined,
                          religion: values.religion,
                          community: values.community,
                          caste: values.caste,
                          customCommunity: values.community === "OTHERS" ? values.communityOther : undefined,
                          motherTongue: values.motherTongue,
                          aadharNo: values.aadharNo,
                          bloodGroup: values.bloodGroup,
                          identification1: values.identityMark1,
                          identification2: values.identityMark2,
                          previousSchool: values.previouslyStudied,
                          previousBoard: values.previousBoard,
                          transportMode: values.vanNeeded ? "Van" : "Local",
                          section: values.section || undefined,
                          academicYear: values.academicYear || undefined,
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
                            preferredPhone: values.preferredPhone || "father",
                            parentsEmail: values.parentsEmail,
                          },
                          address: {
                            line1: values.line1,
                            line2: values.line2,
                            pin: values.pin,
                          },
                          // documents:[],
                          academics: [
                            {
                              examName: values.examName || "SSLC",
                              registerNo: values.registerNo,
                              monthYear: values.monthYear,
                              totalPercentage: values.totalPercentage ? Number(values.totalPercentage) : undefined,
                              subjects: (values.subjects || [])
                                .filter(s => s?.subjectName)
                                .map(s => ({
                                  subjectName: s.subjectName,
                                  maxMarks: Number(s.maxMarks) || 0,
                                  obtainedMarks: Number(s.obtainedMarks) || 0,
                                })),
                              stream: values.academicStream || undefined,
                            }
                          ],
                          admission: {
                            admissionNo: values.admissionNo || 'AUTO',
                            academicYear: values.academicYear || undefined,
                            admissionFrom: values.admissionFrom ? values.admissionFrom.toISOString() : undefined,
                            admissionTo: values.admissionTo ? values.admissionTo.toISOString() : undefined,
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
                          handleClearDraft();
                        }
                      } catch (err) {
                        console.error("Admission error:", err);
                        message.error("Error creating admission. Check required fields or try again.");
                      } finally {
                        // Optional: Resetting or navigating away if needed
                      }
                    }}
                    style={{
                      background: 'linear-gradient(to right, #00152a, #102a43)'
                    }}
                  >
                    {editData ? "Update Application" : "Submit Enrollment"}
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insight Chip */}
        <div className="flex justify-center pb-8">
          <div className="inline-flex items-center gap-3 bg-surface-container-lowest px-6 py-3 rounded-full shadow-ambient border border-outline-variant/10">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse transition-all"></span>
            <p className="text-xs font-medium text-on-surface-variant">
              <span className="font-extrabold text-primary uppercase tracking-tighter">Admission Insight:</span> Aadhar validation is recommended before finalizing academic records.
            </p>
          </div>
        </div>
      </div>

      {/* ── HIDDEN PDF TEMPLATE ── */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div id="pdfContent" style={styles.pdfWrapper}>
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
              <img src={logo} alt="logo" style={{ width: "80px", filter: "brightness(0) invert(1)" }} />
              <div style={{ textAlign: 'left' }}>
                <h1 style={styles.institutionName}>Matric Hr Sec School</h1>
                <p style={styles.tagline}>Excellence in Education - Vadugappatti, Salem</p>
              </div>
            </div>
            <div style={styles.photoBox}>PASTE PHOTO</div>
            <div style={styles.formTitle}>Admission Form</div>
          </div>

          <div style={styles.content}>
             <div style={styles.row}>
                <div style={styles.field}>
                  <span style={styles.label}>Student's Name :</span>
                  <span style={styles.value}>{formData.name}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={styles.field}>
                  <span style={styles.label}>Father's Name :</span>
                  <span style={styles.value}>{formData.fatherName}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={styles.field}>
                  <span style={styles.label}>Mother's Name :</span>
                  <span style={styles.value}>{formData.motherName}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.6}}>
                  <span style={styles.label}>Birth Date :</span>
                  <span style={styles.value}>{formData.dob?.format?.("DD / MM / YYYY") || ".... / .... / ...."}</span>
                </div>
                <div style={{...styles.field, flex: 0.4}}>
                  <span style={styles.label}>Gender :</span>
                  <span style={styles.value}>{formData.gender}</span>
                </div>
             </div>

             <div style={styles.addressSection}>
                <span style={styles.addressLabel}>Residential Address</span>
                <div style={styles.row}>
                  <div style={styles.field}>
                    <span style={styles.label}>Address Line 1 :</span>
                    <span style={styles.value}>{formData.line1}</span>
                  </div>
                </div>
                <div style={styles.row}>
                  <div style={{...styles.field, flex: 0.6}}>
                    <span style={styles.label}>City :</span>
                    <span style={styles.value}>{formData.line2}</span>
                  </div>
                  <div style={{...styles.field, flex: 0.4}}>
                    <span style={styles.label}>Pincode :</span>
                    <span style={styles.value}>{formData.pin}</span>
                  </div>
                </div>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Religion :</span>
                  <span style={styles.value}>{formData.religion}</span>
                </div>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Nationality :</span>
                  <span style={styles.value}>Indian</span>
                </div>
             </div>

             <div style={styles.academicSection}>
                <div style={styles.academicTitle}>III. Academic Performance</div>
                <div style={{...styles.row, marginBottom: '10px'}}>
                  <div style={{...styles.field, flex: 0.4}}>
                    <span style={styles.label}>Exam :</span>
                    <span style={styles.value}>{formData.examName}</span>
                  </div>
                  <div style={{...styles.field, flex: 0.3}}>
                    <span style={styles.label}>Reg No :</span>
                    <span style={styles.value}>{formData.registerNo}</span>
                  </div>
                  <div style={{...styles.field, flex: 0.3}}>
                    <span style={styles.label}>Year :</span>
                    <span style={styles.value}>{formData.monthYear}</span>
                  </div>
                </div>
                <table style={styles.academicTable}>
                  <thead>
                    <tr>
                      <th style={styles.academicTh}>SUBJECT</th>
                      <th style={styles.academicTh}>MAX MARKS</th>
                      <th style={styles.academicTh}>MARKS OBTAINED</th>
                      <th style={styles.academicTh}>PERCENTAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.subjects || []).map((exam, idx) => (
                      <tr key={idx}>
                        <td style={{...styles.academicTd, textAlign: 'left'}}>{exam.subjectName}</td>
                        <td style={styles.academicTd}>{exam.maxMarks}</td>
                        <td style={styles.academicTd}>{exam.obtainedMarks}</td>
                        <td style={styles.academicTd}>
                          {exam.maxMarks > 0 ? ((exam.obtainedMarks / exam.maxMarks) * 100).toFixed(1) + '%' : '-'}
                        </td>
                      </tr>
                    ))}
                    {formData.subjects?.length > 0 && (
                       <tr style={{backgroundColor: '#fff9f2', fontWeight: 'bold'}}>
                         <td style={{...styles.academicTd, textAlign: 'right'}}>TOTAL</td>
                         <td style={styles.academicTd}>
                           {formData.subjects.reduce((sum, s) => sum + (Number(s.maxMarks) || 0), 0)}
                         </td>
                         <td style={styles.academicTd}>
                           {formData.subjects.reduce((sum, s) => sum + (Number(s.obtainedMarks) || 0), 0)}
                         </td>
                         <td style={styles.academicTd}>
                            {(() => {
                              const tm = formData.subjects.reduce((sum, s) => sum + (Number(s.maxMarks) || 0), 0);
                              const to = formData.subjects.reduce((sum, s) => sum + (Number(s.obtainedMarks) || 0), 0);
                              return tm > 0 ? ((to / tm) * 100).toFixed(1) + '%' : '-';
                            })()}
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Phone Number :</span>
                  <span style={styles.value}>{formData.fatherPhone || formData.motherPhone}</span>
                </div>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Email Address :</span>
                  <span style={styles.value}>{formData.parentsEmail}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Aadhar Number :</span>
                  <span style={styles.value}>{formData.aadharNo}</span>
                </div>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Blood Group :</span>
                  <span style={styles.value}>{formData.bloodGroup}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Father Occupation :</span>
                  <span style={styles.value}>{formData.fatherOccupation}</span>
                </div>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Admission For :</span>
                  <span style={styles.value}>STD {formData.standard}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Section :</span>
                  <span style={styles.value}>{formData.section}</span>
                </div>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Year :</span>
                  <span style={styles.value}>{formData.academicYear}</span>
                </div>
             </div>

             <div style={styles.row}>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>Transport :</span>
                  <span style={styles.value}>{formData.vanNeeded ? "School Van" : "Private / Local"}</span>
                </div>
                <div style={{...styles.field, flex: 0.5}}>
                  <span style={styles.label}>RTE Student :</span>
                  <span style={styles.value}>{formData.rteApplied ? "Yes" : "No"}</span>
                </div>
             </div>

             <div style={styles.declaration}>
                <h4 style={styles.declTitle}>Declaration</h4>
                <p style={styles.declText}>
                  I hereby, declaring that I will obey all the rules and regulations of the institution and be fully responsible for violating the rules.
                </p>
                
                <div style={styles.signatureRow}>
                  <div style={styles.sigLine}>Student's Signature</div>
                  <div style={styles.sigLine}>Authorized's Signature</div>
                </div>
             </div>
          </div>
          <div style={styles.footer}></div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionStepper;