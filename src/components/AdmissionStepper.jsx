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
  Modal,
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
const { Title, Text } = Typography;

// --- Premium Scholar Obsidian Styles ---
const scholarStyles = `
  .admission-container {
    padding: 2.5rem;
    background: #fdfdfd;
    min-height: 100vh;
  }

  .glass-stepper-card {
    background: #ffffff;
    border-radius: 32px;
    box-shadow: 0 30px 60px rgba(0, 21, 42, 0.05);
    border: 1px solid #f1f5f9;
    overflow: hidden;
  }

  .step-indicator-wrapper {
    display: flex;
    justify-content: space-between;
    padding: 2.5rem 5rem;
    background: #00152a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .step-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    position: relative;
    flex: 1;
    z-index: 1;
    background: transparent;
    border: 0;
    padding: 0;
    text-align: center;
    cursor: pointer;
  }

  .step-node::after {
    content: '';
    position: absolute;
    top: 28px;
    left: 50%;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    z-index: -1;
  }

  .step-node:last-child::after { display: none; }

  .step-node:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.45);
    outline-offset: 8px;
    border-radius: 24px;
  }

  .step-circle {
    width: 56px;
    height: 56px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .step-node:hover .step-circle {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .step-node.active .step-circle {
    background: #ffffff;
    color: #00152a;
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
    border-color: #ffffff;
  }

  .step-node.completed .step-circle {
    background: #10b981;
    color: #ffffff;
    border-color: #10b981;
  }

  .step-label {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: rgba(255, 255, 255, 0.3);
    transition: color 0.3s ease;
  }

  .step-node.active .step-label { color: #ffffff; }
  .step-node.completed .step-label { color: #10b981; }

  .form-section-header {
    margin-bottom: 3rem;
  }

  .premium-descriptions .ant-descriptions-item-label {
    font-weight: 800 !important;
    color: #64748b !important;
    font-size: 0.7rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    background: #f8fafc !important;
    min-width: 110px !important;
    width: auto !important;
    white-space: normal !important;
  }

  .premium-descriptions .ant-descriptions-item-content {
    font-weight: 600 !important;
    color: #00152a !important;
    font-size: 0.85rem !important;
  }

  .nav-btn {
    height: 56px;
    padding: 0 2.5rem;
    border-radius: 18px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.8rem;
  }

  .btn-primary {
    background: #00152a;
    color: #ffffff;
    border: none;
    box-shadow: 0 10px 25px rgba(0, 21, 42, 0.15);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 35px rgba(0, 21, 42, 0.25);
    background: #002347;
  }

  .btn-ghost {
    background: #f1f5f9;
    border: none;
    color: #475569;
  }

  .btn-ghost:hover {
    background: #e2e8f0;
    color: #00152a;
  }
`;

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

 const [selectedDoc, setSelectedDoc] = useState(null);
const [isPreviewOpen, setIsPreviewOpen] = useState(false);
 
      

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

  const getDefaultSection = () => "A";

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
        communityOther: editData.community === "OTHERS" ? editData.communityOther : undefined,
        bloodGroup: editData.bloodGroup,
        identityMark1: editData.identification1,
        identityMark2: editData.identification2,
        previouslyStudied: editData.previousSchool,
        previousSchoolStandard: editData.previousSchoolStandard || editData.previousStandard,
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
        siblingsCount: Number(editData.family?.siblings) || 0,
        preferredPhone: editData.family?.preferredPhone || "father",
        parentsEmail: editData.family?.parentsEmail,
        line1: editData.address?.line1,
        line2: editData.address?.line2,
        doorNo: editData.address?.line1,
        street: editData.address?.line2,
        landmark: editData.address?.landmark,
        city: editData.address?.city,
        state: editData.address?.state || "Tamil Nadu",
        pin: editData.address?.pin,
        admissionNo: editData.admission?.admissionNo,
        admissionFrom: editData.admission?.admissionFrom ? dayjs(editData.admission.admissionFrom) : null,
        admissionTo: editData.admission?.admissionTo ? dayjs(editData.admission.admissionTo) : null,
        admissionDate: editData.admission?.admissionDate ? dayjs(editData.admission.admissionDate) : null,
        examName: primaryAcademic.examName,
        boardExamType: primaryAcademic.boardName && primaryAcademic.boardName !== 'State Board' ? 'Other' : 'State Board',
        boardName: primaryAcademic.boardName && primaryAcademic.boardName !== 'State Board' ? primaryAcademic.boardName : undefined,
        academicStream: primaryAcademic.stream || editData.academicStream,
        registerNo: primaryAcademic.registerNo,
        monthYear: primaryAcademic.monthYear,
        totalPercentage: primaryAcademic.totalPercentage,
        subjects: (primaryAcademic.subjects || []).map(normalizeSubjectRow),

        // Single parent & guardian
        isSingleParent: editData.family?.isSingleParent || false,
        guardianName: editData.family?.guardianName,
        guardianPhone: editData.family?.guardianPhone,
        guardianWhatsapp: editData.family?.guardianWhatsapp,
        guardianAadhar: editData.family?.guardianAadhar,
        guardianOccupation: editData.family?.guardianOccupation,
        guardianRelation: editData.family?.guardianRelation,

        // Sibling details
        sibling1Name: editData.family?.sibling1Name,
        sibling1Standard: editData.family?.sibling1Standard,
        sibling1School: editData.family?.sibling1School,
        sibling2Name: editData.family?.sibling2Name,
        sibling2Standard: editData.family?.sibling2Standard,
        sibling2School: editData.family?.sibling2School,
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
      flatData.photosReceived = doc.photosReceived || false;

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
    const randCommunity = () => ["BC", "MBC", "OBC", "SC", "ST", "SCA", "OTHERS"][Math.floor(Math.random() * 7)];
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
      previousSchoolStandard: "10th",
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
      siblingsCount: 1,

      line1: "12, Main Road",
      line2: "Gandhi Nagar",
      city: "Erode",
      state: "Tamil Nadu",
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
const siblingCount = Form.useWatch("siblingsCount", form) || 0;
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
  const optionalAadharRule = {
    message: "Aadhar number must be 12 digits",
    pattern: /^\d{12}$/,
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
  const isSingleParent = Form.useWatch("isSingleParent", form);
  const boardExamType = Form.useWatch("boardExamType", form);
  const siblingReviewItems = (() => {
    const configuredCount = Number(formData?.siblingsCount) || 0;
    const discoveredCount = Object.keys(formData || {}).reduce((max, key) => {
      const match = key.match(/^sibling(\d+)School$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const totalSiblings = Math.max(configuredCount, discoveredCount);

    return Array.from({ length: totalSiblings }, (_, index) => {
      const siblingNumber = index + 1;
      const siblingName = formData?.[`sibling${siblingNumber}Name`]?.trim();
      const schoolName = formData?.[`sibling${siblingNumber}School`]?.trim();
      const standard = formData?.[`sibling${siblingNumber}Standard`]?.trim();

      if (!siblingName && !schoolName && !standard) {
        return null;
      }

      return {
        siblingNumber,
        siblingName: siblingName || `Sibling ${siblingNumber}`,
        schoolName: schoolName || "-",
        standard: standard || "-",
      };
    }).filter(Boolean);
  })();

  const preferredContacts = Array.isArray(formData?.preferredPhone)
    ? formData.preferredPhone
    : formData?.preferredPhone
      ? [formData.preferredPhone]
      : [];

  const reviewDocuments = [
    { label: "Birth Certificate", file: formData.birthCertFile, key: "birthCert" },
    { label: "Community Certificate", file: formData.communityCertFile, key: "communityCert" },
    { label: "Aadhar", file: formData.aadharStudentFile, key: "aadharStudent" },
    { label: "Transfer Certificate", file: formData.transferCertFile, key: "transferCert" },
  ].filter((doc) => doc.file?.[0]);

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
                    <Input style={{color:"red"}} disabled placeholder="Auto-generated" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="admissionDate" label="Admission Date" rules={[requiredRule]}>
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                 <Col span={12}>
              <Form.Item name="academicYear" label="Academic Year" initialValue={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}>
                <Select placeholder="Select academic year" allowClear>
                  <Select.Option value="2024-2025">2024-2025</Select.Option>
                  <Select.Option value="2025-2026">2025-2026</Select.Option>
                  <Select.Option value="2026-2027">2026-2027</Select.Option>
                  <Select.Option value="2027-2028">2027-2028</Select.Option>
                  <Select.Option value="2028-2029">2028-2029</Select.Option>
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
              <Form.Item name="section" label="Section" initialValue="A">
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
              <Form.Item name="dob" label="Date of Birth" rules={[requiredRule]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
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
                  <Select.Option value="OBC">OBC</Select.Option>
                  <Select.Option value="SC">SC</Select.Option>
                  <Select.Option value="ST">ST</Select.Option>
                  <Select.Option value="SCA">SCA</Select.Option>
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
            <Col span={12}><Form.Item name="previousSchoolStandard" label="Previous School Standard" rules={[requiredRule]}><Input placeholder="e.g. 10th" /></Form.Item></Col>
           
           
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
          {/* Single Parent Checkbox */}
          <Row gutter={16} className="mb-4">
            <Col span={24}>
              <Form.Item name="isSingleParent" valuePropName="checked">
                <Checkbox>Single Parent</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {/* LEFT — FATHER */}
            <Col span={12}>
              <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Father Particulars</h4>
              <Form.Item name="fatherName" label="Father Name" rules={isSingleParent ? [] : []}>
                <Input disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>
              <Form.Item name="fatherPhone" label="Father Mobile">
                <Input maxLength={10} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>
              <Form.Item label="Father WhatsApp">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="fatherWhatsAppNo" noStyle>
                    <Input maxLength={10} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} style={{ width: 'calc(100% - 120px)' }} />
                  </Form.Item>
                  <Button
                    type="default"
                    onClick={() => {
                      const phone = form.getFieldValue('fatherPhone');
                      if (phone) form.setFieldsValue({ fatherWhatsAppNo: phone });
                    }}
                    disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'}
                  >
                    Same as Mobile
                  </Button>
                </Space.Compact>
              </Form.Item>
              <Form.Item name="fatherOccupation" label="Father Occupation">
                <Input disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>
              <Form.Item name="fatherAadharNo" label="Father Aadhar" rules={[optionalAadharRule]}>
                <Input maxLength={12} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>
            </Col>

            {/* RIGHT — MOTHER */}
            <Col span={12}>
              <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Mother Particulars</h4>
              <Form.Item name="motherName" label="Mother Name">
                <Input disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} />
              </Form.Item>
              <Form.Item name="motherPhone" label="Mother Mobile">
                <Input maxLength={10} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} />
              </Form.Item>
              <Form.Item label="Mother WhatsApp">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="motherWhatsAppNo" noStyle>
                    <Input maxLength={10} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} style={{ width: 'calc(100% - 120px)' }} />
                  </Form.Item>
                  <Button
                    type="default"
                    onClick={() => {
                      const phone = form.getFieldValue('motherPhone');
                      if (phone) form.setFieldsValue({ motherWhatsAppNo: phone });
                    }}
                    disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'}
                  >
                    Same as Mobile
                  </Button>
                </Space.Compact>
              </Form.Item>
              <Form.Item name="motherOccupation" label="Mother Occupation">
                <Input disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} />
              </Form.Item>
              <Form.Item name="motherAadharNo" label="Mother Aadhar" rules={[optionalAadharRule]}>
                <Input maxLength={12} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} />
              </Form.Item>
              
            </Col>
          </Row>

          <Row justify="left" className="mt-4">
  <Col span={8}>
    <Form.Item name="familyIncome" label="Family Income">
      <Input />
    </Form.Item>
  </Col>
</Row>

          {/* Guardian details for single parent */}
          {isSingleParent && (
            <div className="mt-6 pt-4 border-t border-outline-variant">
              <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Guardian Details</h4>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="guardianRelation" label="Guardian Relation" rules={[{ required: true, message: 'Select guardian relation' }]}>
                    <Select placeholder="Select relation">
                      <Select.Option value="father">Father</Select.Option>
                      <Select.Option value="mother">Mother</Select.Option>
                      <Select.Option value="grandfather">Grandfather</Select.Option>
                      <Select.Option value="grandmother">Grandmother</Select.Option>
                      <Select.Option value="uncle">Uncle</Select.Option>
                      <Select.Option value="aunt">Aunt</Select.Option>
                      <Select.Option value="other">Other</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="guardianName" label="Guardian Name" rules={[{ required: true, message: 'Enter guardian name' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="guardianPhone" label="Guardian Phone">
                    <Input maxLength={10} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Guardian WhatsApp">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="guardianWhatsapp" noStyle>
                        <Input maxLength={10} style={{ width: 'calc(100% - 120px)' }} />
                      </Form.Item>
                      <Button
                        type="default"
                        onClick={() => {
                          const phone = form.getFieldValue('guardianPhone');
                          if (phone) form.setFieldsValue({ guardianWhatsapp: phone });
                        }}
                      >
                        Same as Mobile
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="guardianAadhar" label="Guardian Aadhar">
                    <Input maxLength={12} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="guardianOccupation" label="Guardian Occupation">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}


          <div className="mt-8 pt-4 border-t border-outline-variant">
            <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Siblings & Preferences</h4>
            <Row gutter={16}>
             
              <Col span={12}>
                <Form.Item name="siblingsCount" label="Number of Siblings">
  <Input type="number" min={0} placeholder="Enter number" />
</Form.Item>
              </Col>
            </Row>

            {Array.from({ length: siblingCount }).map((_, index) => (
  <div key={index} className="mt-4">
    
    <h4 className="text-sm font-semibold mb-2">
      Sibling {index + 1} Details
    </h4>

    <Row gutter={16}>
      <Col span={8}>
        <Form.Item
          name={`sibling${index + 1}Name`}
          label={`Sibling ${index + 1} Name`}
        >
          <Input placeholder="Enter name" />
        </Form.Item>
      </Col>

      <Col span={8}>
        <Form.Item
          name={`sibling${index + 1}School`}
          label={`Sibling ${index + 1} School`}
        >
          <Input placeholder="Enter school name" />
        </Form.Item>
      </Col>

      <Col span={8}>
        <Form.Item
          name={`sibling${index + 1}Standard`}
          label={`Sibling ${index + 1} Standard`}
        >
          <Select placeholder="Select standard" allowClear>
            <Select.Option value="LKG">LKG</Select.Option>
            <Select.Option value="UKG">UKG</Select.Option>
            {[...Array(12)].map((_, i) => (
              <Select.Option key={i + 1} value={String(i + 1)}>{`${i + 1}${['st','nd','rd'][i] || 'th'} Standard`}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

    </Row>

  </div>
))}

            {/* Sibling 1 Details */}
           {/* <Divider orientation="left" style={{ fontSize: 13 }}>Sibling 1 Details</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="sibling1Name" label="Sibling 1 Name">
                  <Input placeholder="Name of sibling" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sibling1Standard" label="Sibling 1 Standard">
                  <Select placeholder="Select standard" allowClear>
                    <Select.Option value="LKG">LKG</Select.Option>
                    <Select.Option value="UKG">UKG</Select.Option>
                    {[...Array(12)].map((_, i) => (
                      <Select.Option key={i + 1} value={String(i + 1)}>{`${i + 1}${['st','nd','rd'][i] || 'th'} Standard`}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sibling1School" label="Sibling 1 School">
                  <Select placeholder="Select school" onChange={() => {
                    if (sibling1School !== "Other School") {
                      form.setFieldsValue({ sibling1OtherSchoolName: undefined });
                    }
                  }}>
                    <Select.Option value="Same School">Same School</Select.Option>
                    <Select.Option value="Other School">Other School</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Sibling 1 — Other School Input */}
           {/* {sibling1School === "Other School" && (
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Form.Item name="sibling1OtherSchoolName" label="School Name" rules={[{ required: true, message: "Enter school name" }]}>
                    <Input placeholder="Enter school name" />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {/* Sibling 2 Details */}
           {/* <Divider orientation="left" style={{ fontSize: 13 }}>Sibling 2 Details</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="sibling2Name" label="Sibling 2 Name">
                  <Input placeholder="Name of sibling" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sibling2Standard" label="Sibling 2 Standard">
                  <Select placeholder="Select standard" allowClear>
                    <Select.Option value="LKG">LKG</Select.Option>
                    <Select.Option value="UKG">UKG</Select.Option>
                    {[...Array(12)].map((_, i) => (
                      <Select.Option key={i + 1} value={String(i + 1)}>{`${i + 1}${['st','nd','rd'][i] || 'th'} Standard`}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sibling2School" label="Sibling 2 School">
                  <Select placeholder="Select school" onChange={() => {
                    if (sibling2School !== "Other School") {
                      form.setFieldsValue({ sibling2OtherSchoolName: undefined });
                    }
                  }}>
                    <Select.Option value="Same School">Same School</Select.Option>
                    <Select.Option value="Other School">Other School</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Sibling 2 — Other School Input */}
           {/* {sibling2School === "Other School" && (
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Form.Item name="sibling2OtherSchoolName" label="School Name" rules={[{ required: true, message: "Enter school name" }]}>
                    <Input placeholder="Enter school name" />
                  </Form.Item>
                </Col>
              </Row>
            )}
           } */}

            <div className="mt-8 pt-4 border-t border-outline-variant">
  <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">
    Contact Details
  </h4>
</div>



            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
  name="preferredPhone"
  label="Preferred Contact"
  initialValue={["father"]}
>
  <Checkbox.Group
    options={[
      { label: "Father", value: "father" },
      { label: "Mother", value: "mother" },
    ]}
  />
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
              <Form.Item name="street" label="Street / Village" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="landmark" label="Taluk">
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="city" label="District" rules={[requiredRule]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="state" label="State" initialValue="Tamil Nadu" rules={[requiredRule]}>
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
              <Col span={6}>
                <Form.Item name="examName" label="Name of Examination" rules={[requiredRule]}>
                  <Input placeholder="SSLC / MATRIC / CBSE" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="boardExamType" label="Board" initialValue="State Board">
                  <Select>
                    <Select.Option value="State Board">State Board</Select.Option>
                    <Select.Option value="Other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              {boardExamType === "Other" && (
                <Col span={6}>
                  <Form.Item name="boardName" label="Board Name" rules={[{ required: true, message: 'Enter board name' }]}> 
                    <Input placeholder="e.g. CBSE, ICSE" />
                  </Form.Item>
                </Col>
              )}
              <Col span={6}>
                <Form.Item name="monthYear" label="Month and Year of Appearance">
                  <Input placeholder="e.g. March 2025" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="registerNo" label="Register No">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="academicStream" label="Academic Stream / Group">
                  <Select placeholder="Select group">
                    <Select.Option value="GROUP_1">Physics, Chemistry, Maths, Biology</Select.Option>
                    <Select.Option value="GROUP_2">Physics, Chemistry, Maths, Computer Science</Select.Option>
                    <Select.Option value="GROUP_3">Physics, Chemistry, Biology, Computer Science</Select.Option>
                    <Select.Option value="GROUP_4">Commerce, Economics, Accountancy, Computer Application</Select.Option>
                  </Select>
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
      icon: <FileTextOutlined />,
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <p className="text-on-surface-variant text-sm border-b border-outline-variant pb-2">Upload mandatory certificates and student profile photo.</p>
          </div>
          <>
            {/* ✅ PROFILE PHOTO */}
           <Form.Item
  label="Profile Photo"
  name="profilePhoto"
  valuePropName="fileList"
  getValueFromEvent={(e) => e?.fileList}
  initialValue={getDefaultFile(
    editData?.documents?.[0]?.photoPath,
    "Profile Photo"
  )}
  rules={[
    { required: true, message: "Profile photo is required" },
    {
      validator: (_, fileList) =>
        fileList && fileList.length === 1
          ? Promise.resolve()
          : Promise.reject("Upload exactly 1 photo"),
    },
  ]}
>
  <Upload
    listType="picture-card"
    maxCount={1}
    accept="image/*"
  >
    <div className="flex flex-col items-center">
      <span className="material-symbols-outlined text-2xl">
        add_a_photo
      </span>
      <p className="text-xs mt-1">Upload</p>
    </div>
  </Upload>
</Form.Item>

            {/* ✅ DOCUMENT CHECKBOX */}
            <Form.Item label="Documents" required>
  <div className="grid grid-cols-3 gap-4">

    {/* Birth Certificate */}
    <Form.Item
      name="birthCertFile"
      valuePropName="fileList"
      getValueFromEvent={(e) => e?.fileList}
      rules={[{ required: true, message: "Upload Birth Certificate" }]}
    >
      <Upload listType="picture-card" maxCount={1}>
        <div className="text-center">
          <span className="material-symbols-outlined text-2xl">description</span>
          <p className="text-xs mt-1">Birth Cert</p>
        </div>
      </Upload>
    </Form.Item>

    {/* Community Certificate */}
    <Form.Item
      name="communityCertFile"
      valuePropName="fileList"
      getValueFromEvent={(e) => e?.fileList}
    >
      <Upload listType="picture-card" maxCount={1}>
        <div className="text-center">
          <span className="material-symbols-outlined text-2xl">badge</span>
          <p className="text-xs mt-1">Community</p>
        </div>
      </Upload>
    </Form.Item>

    {/* Aadhaar */}
    <Form.Item
      name="aadharStudentFile"
      valuePropName="fileList"
      getValueFromEvent={(e) => e?.fileList}
      rules={[{ required: true, message: "Upload Aadhaar" }]}
    >
      <Upload listType="picture-card" maxCount={1}>
        <div className="text-center">
          <span className="material-symbols-outlined text-2xl">credit_card</span>
          <p className="text-xs mt-1">Aadhaar</p>
        </div>
      </Upload>
    </Form.Item>

    {/* Transfer Certificate */}
<Form.Item
  name="transferCertFile"
  valuePropName="fileList"
  getValueFromEvent={(e) => e?.fileList}
  rules={[{ required: false, message: "Upload Transfer Certificate" }]}
>
  <Upload listType="picture-card" maxCount={1}>
    <div className="text-center">
      <span className="material-symbols-outlined text-2xl">
        description
      </span>
      <p className="text-xs mt-1">Transfer Cert</p>
    </div>
  </Upload>
</Form.Item>

  </div>
</Form.Item>

            {/* ✅ HARD COPY FLAGS */}
           <Form.Item name="hardCopyDocs" label="Hard Copy Documents">
  <Select
    mode="multiple"
    placeholder="Select submitted documents"
    className="w-full"
    options={[
      { value: "birthCert", label: "Birth Certificate" },
      { value: "communityCert", label: "Community Certificate" },
      { value: "aadharStudent", label: "Aadhar (Student)" },
      { value: "aadharFather", label: "Aadhar (Father)" },
      { value: "aadharMother", label: "Aadhar (Mother)" },
      { value: "transferCert", label: "Transfer Certificate" },
      { value: "3 Photos received", label: "3 Hard Copy photos" },
    ]}
  />
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
        <div id="reviewStepContent" className="space-y-10">
          {/* Download PDF Button */}
          <div className="flex justify-end mb-4">
            <Button
              icon={<DownloadOutlined />}
              type="primary"
              onClick={async () => {
                try {
                  const { exportStudentPdfFormatted } = await import("../utils/exportStudentPdf");
                  const academicYear = formData.academicYear || "year";
                  const admissionNo = formData.admissionNo || "number";
                  const filename = `Admission_PSF_${academicYear}_${admissionNo}.pdf`;
                  // Map formData to PDF fields
                  const pdfData = {
                    studentName: formData.name,
                    fatherName: formData.fatherName,
                    motherName: formData.motherName,
                    birthDate: formData.dob?.format?.("DD/MM/YYYY") || formData.dob,
                    gender: formData.gender,
                    addressLine1: [formData.doorNo || formData.line1, formData.street || formData.line2].filter(Boolean).join(", "),
                    city: formData.city,
                    pincode: formData.pin,
                    religion: formData.religion,
                    nationality: formData.nationality || "Indian",
                    exam: formData.examName,
                    regNo: formData.registerNo,
                    examYear: formData.examYear,
                    academicTable: (formData.subjects || []).map(sub => ({
                      subject: sub.subjectName,
                      maxMarks: sub.maxMarks,
                      marksObtained: sub.obtainedMarks,
                      percentage: sub.maxMarks ? `${((sub.obtainedMarks / sub.maxMarks) * 100).toFixed(2)}%` : "-"
                    })),
                    phone: formData.fatherPhone,
                    email: formData.email,
                    aadhar: formData.aadharNo,
                    bloodGroup: formData.bloodGroup,
                    admissionFor: formData.standard,
                    section: formData.section,
                    academicYear: formData.academicYear,
                    transport: formData.vanNeeded ? "Van" : "No",
                    rteStudent: formData.rteApplied ? "Yes" : "No",
                  };
                  // Optionally, load logo as base64 (fallback to no logo if fails)
                  let logoBase64 = undefined;
                  try {
                    const logoUrl = require("../assets/logo.jpeg");
                    if (logoUrl) {
                      const toBase64 = url => fetch(url).then(r => r.blob()).then(blob => new Promise((res, rej) => {
                        const reader = new FileReader();
                        reader.onloadend = () => res(reader.result);
                        reader.onerror = rej;
                        reader.readAsDataURL(blob);
                      }));
                      logoBase64 = await toBase64(logoUrl);
                    }
                  } catch (e) {
                    // Ignore logo error, proceed without logo
                  }
                  exportStudentPdfFormatted(pdfData, filename, logoBase64);
                } catch (err) {
                  message.error("Failed to generate PDF. Please try again.");
                  // Optionally log error: console.error(err);
                }
              }}
            >
              Download PDF
            </Button>
          </div>
          <div className="form-section-header">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Student Admission</h3>
            <p className="text-slate-500 text-sm font-medium">Verify the integrity of all data vectors before final academic sealing.</p>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
             {/* Part 1: Persona & Identity */}
             <div className="xl:col-span-2 space-y-8">
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md h-full">
                   <div className="flex justify-between items-start mb-8">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
                          <UserOutlined className="text-teal-600 text-xs" />
                        </span>
                        Persona Profile
                      </h4>
                      {formData.profilePhoto?.[0] && (
                        <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white shadow-xl">
                           <img 
                             src={formData.profilePhoto[0].url || (formData.profilePhoto[0].originFileObj ? URL.createObjectURL(formData.profilePhoto[0].originFileObj) : "")} 
                             alt="Student" 
                             className="w-full h-full object-cover"
                           />
                        </div>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      <Descriptions column={1} size="small" className="premium-descriptions">
                         <Descriptions.Item label="Full Name">{formData.name}</Descriptions.Item>
                         <Descriptions.Item label="Standard">{formData.standard}</Descriptions.Item>
                         <Descriptions.Item label="Academic Year">{formData.academicYear}</Descriptions.Item>
                         <Descriptions.Item label="Date of Birth">{formData.dob?.format?.("DD/MM/YYYY")}</Descriptions.Item>
                         <Descriptions.Item label="Gender">{formData.gender}</Descriptions.Item>
                         <Descriptions.Item label="Aadhar No">{formData.aadharNo}</Descriptions.Item>
                      </Descriptions>
                      <Descriptions column={1} size="small" className="premium-descriptions">
                         <Descriptions.Item label="Religion">{formData.religion}</Descriptions.Item>
                         <Descriptions.Item label="Community">{formData.community} ({formData.caste})</Descriptions.Item>
                         <Descriptions.Item label="Mother Tongue">{formData.motherTongue}</Descriptions.Item>
                         <Descriptions.Item label="Blood Group">{formData.bloodGroup}</Descriptions.Item>
                         <Descriptions.Item label="Resident Pin">{formData.pin}</Descriptions.Item>
                         <Descriptions.Item label="Transport">{formData.vanNeeded ? "School Van" : "Local Transit"}</Descriptions.Item>
                      </Descriptions>
                   </div>

                   <div className="mt-8 pt-8 border-t border-slate-50">
                      <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Residential Vector</h5>
                      <p className="text-sm font-extrabold text-slate-900 leading-relaxed">
                         {[formData.doorNo || formData.line1, formData.street || formData.line2, formData.city, formData.state]
                           .filter(Boolean)
                           .join(", ") || "—"}
                      </p>
                   </div>
                </div>
             </div>

             {/* Part 2: Academic Summary */}
             <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-2xl shadow-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-8 flex items-center gap-2">
                   <BookOutlined className="text-teal-400" /> Academic Standing
                </h4>
                
                <div className="space-y-6">
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-1">Last Examination</div>
                      <div className="text-xl font-black">{formData.examName}</div>
                      <div className="text-xs text-white/40 mt-1">{formData.boardExamType} | Reg: {formData.registerNo}</div>
                   </div>

                   <div className="p-5 bg-teal-500 rounded-2xl shadow-lg shadow-teal-500/20">
                      <div className="text-[9px] font-black uppercase text-white/70 tracking-widest mb-1">Aggregate Performance</div>
                      <div className="text-3xl font-black text-white">{formData.totalPercentage}%</div>
                   </div>

                   <div className="space-y-3">
                      <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Subject Breakdown</div>
                      {formData.subjects?.filter(s => s.subjectName).map((sub, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                           <span className="font-bold">{sub.subjectName}</span>
                           <span className="font-black text-teal-400">{sub.obtainedMarks} / {sub.maxMarks}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             {/* Part 3: Family matrix */}
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-full">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2">
                   <TeamOutlined className="text-blue-600" /> Family Matrix
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Paternal</h5>
                     <div className="space-y-1.5">
                         <div className="text-sm font-black text-slate-900">{formData.fatherName}</div>
                         <div className="text-xs font-bold text-slate-500">{formData.fatherOccupation}</div>
                         <div className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2">
                            <span className="material-symbols-outlined text-[14px]">call</span>
                            {formData.fatherPhone}
                         </div>
                       <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                         <span className="material-symbols-outlined text-[14px]">chat</span>
                         {formData.fatherWhatsAppNo || "-"}
                       </div>
                       <div className="text-xs font-bold text-slate-500">Aadhar: {formData.fatherAadharNo || "-"}</div>
                      </div>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Maternal</h5>
                     <div className="space-y-1.5">
                         <div className="text-sm font-black text-slate-900">{formData.motherName}</div>
                         <div className="text-xs font-bold text-slate-500">{formData.motherOccupation}</div>
                         <div className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2">
                            <span className="material-symbols-outlined text-[14px]">call</span>
                            {formData.motherPhone}
                         </div>
                       <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                         <span className="material-symbols-outlined text-[14px]">chat</span>
                         {formData.motherWhatsAppNo || "-"}
                       </div>
                       <div className="text-xs font-bold text-slate-500">Aadhar: {formData.motherAadharNo || "-"}</div>
                      </div>
                   </div>
                </div>

                {formData.isSingleParent && (
                   <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                      <h5 className="text-[9px] font-black uppercase text-amber-600 tracking-widest mb-2 flex items-center gap-2">
                         <span className="material-symbols-outlined text-sm">shield_person</span> Guardian Nexus
                      </h5>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                       <span className="font-extrabold text-slate-900">{formData.guardianName} ({formData.guardianRelation})</span>
                       <span className="font-bold text-slate-500">Phone: {formData.guardianPhone || "-"}</span>
                       <span className="font-bold text-emerald-700">WhatsApp: {formData.guardianWhatsapp || "-"}</span>
                       <span className="font-bold text-slate-500">Aadhar: {formData.guardianAadhar || "-"}</span>
                       <span className="font-bold text-slate-500 md:col-span-2">Occupation: {formData.guardianOccupation || "-"}</span>
                      </div>
                   </div>
                )}

                 <div className="mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <h5 className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-2">Contact Preference</h5>
                  <div className="text-xs text-slate-700 font-bold">Preferred: {preferredContacts.length ? preferredContacts.join(", ") : "-"}</div>
                  <div className="mt-2 text-xs text-slate-700">Father WhatsApp: <span className="font-bold">{formData.fatherWhatsAppNo || "-"}</span></div>
                  <div className="text-xs text-slate-700">Mother WhatsApp: <span className="font-bold">{formData.motherWhatsAppNo || "-"}</span></div>
                  {formData.isSingleParent && (
                    <div className="text-xs text-slate-700">Guardian WhatsApp: <span className="font-bold">{formData.guardianWhatsapp || "-"}</span></div>
                  )}
                 </div>

                <div className="space-y-4">
                   <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sibling Context</h5>
                   <div className="flex flex-wrap gap-4">
                      {siblingReviewItems.map((sibling) => (
                        <div
                          key={sibling.siblingNumber}
                          className="px-5 py-3 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-700 border border-slate-100"
                        >
                          <span className="text-slate-900">{sibling.siblingName}</span>
                           <span className="text-slate-400 mx-1">-</span>
                          <span>{sibling.schoolName}</span>
                           <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-400">
                            Standard: {sibling.standard}
                           </div>
                        </div>
                      ))}
                      {siblingReviewItems.length === 0 && (
                        <div className="text-xs text-slate-400 italic">No siblings registered in current matrix.</div>
                      )}
                   </div>
                </div>
             </div>

             {/* Part 4: Verification Vault */}
             <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2">
                   <FileTextOutlined className="text-indigo-600" /> Verification Vault
                </h4>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                   {reviewDocuments.map((doc, idx) => {
                     const isUploaded = doc.file?.[0];
                     const fileUrl = isUploaded ? (doc.file[0].url || (doc.file[0].originFileObj ? URL.createObjectURL(doc.file[0].originFileObj) : "")) : null;
                     const isPdf = doc.file?.[0]?.type === "application/pdf" || doc.file?.[0]?.name?.toLowerCase().endsWith(".pdf");

                     return (
                       <div key={idx} 
                        onClick={() => {
  if (!fileUrl) return;
  setSelectedDoc({ ...doc, fileUrl, isPdf });
  setIsPreviewOpen(true);
}}
                       className="relative group aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all border-teal-500 shadow-lg">
                          {fileUrl ? (
                             isPdf ? (
                               <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4">
                                  <span className="material-symbols-outlined text-teal-400 text-3xl mb-2">picture_as_pdf</span>
                                  <span className="text-[8px] font-black text-white uppercase text-center">{doc.label}</span>
                               </div>
                             ) : (
                               <img src={fileUrl} className="w-full h-full object-cover" alt={doc.label} />
                             )
                          ) : (
                             <div className="w-full h-full bg-white flex flex-col items-center justify-center p-4">
                                <span className="material-symbols-outlined text-slate-200 text-2xl mb-2">upload_file</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase text-center">{doc.label}</span>
                             </div>
                          )}
                          <div className="absolute top-2 right-2">
                              <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] bg-teal-500 text-white">
                                <span className="material-symbols-outlined text-xs">check</span>
                             </span>
                          </div>
                       </div>

                       
                     );
                   })}
                   {reviewDocuments.length === 0 && (
                    <div className="col-span-full text-xs text-slate-400 italic">
                      No uploaded documents available for preview.
                    </div>
                   )}

                   {isPreviewOpen && selectedDoc && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
<div className="bg-white p-6 rounded-xl w-[900px] max-w-[95%]">
      <h2 className="text-lg font-bold mb-4">{selectedDoc.label}</h2>
{selectedDoc.isPdf ? (
  <iframe
    src={`${selectedDoc.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
    className="w-full h-[80vh] rounded-lg border"
  />
) : (
  <img
    src={selectedDoc.fileUrl}
    className="w-full max-h-[80vh] object-contain mx-auto rounded-lg"
  />
)}
      <div className="flex justify-end mt-4">
        <button onClick={() => setIsPreviewOpen(false)}>Close</button>
      </div>

    </div>
  </div>
)}
                   
                   {/* Verification Tags */}
                   <div className="col-span-full pt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                         {formData.vanNeeded && (
                           <Tag className="rounded-full px-4 py-1 border-blue-200 bg-blue-50 text-blue-700 font-extrabold text-[9px] uppercase shadow-sm">
                              Transport Requested
                           </Tag>
                         )}
                         {formData.rteApplied && (
                           <Tag className="rounded-full px-4 py-1 border-rose-200 bg-rose-50 text-rose-700 font-extrabold text-[9px] uppercase shadow-sm">
                              RTE Quota Applied
                           </Tag>
                         )}
                         {formData.photosReceived && (
                           <Tag className="rounded-full px-4 py-1 border-teal-200 bg-teal-50 text-teal-700 font-extrabold text-[9px] uppercase shadow-sm">
                              Photos Verified
                           </Tag>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      ),
    }
  ];

  const syncFormData = () => {
    const values = form.getFieldsValue(true);
    setFormData(values);
    return values;
  };

  const goToStep = async (targetStep) => {
    if (targetStep < 0 || targetStep >= steps.length || targetStep === current) {
      return;
    }

    if (targetStep > current) {
      try {
        await form.validateFields();
      } catch (err) {
        message.error("Please fill all required fields correctly.");
        return;
      }
    }

    syncFormData();
    setCurrent(targetStep);
  };

  const next = () => goToStep(current + 1);

  const prev = () => {
    syncFormData();
    setCurrent(current - 1);
  };
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
    <div className="admission-container">
      <style>{scholarStyles}</style>
      
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
              Academic <span className="text-teal-600">Application</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 mt-3 uppercase tracking-widest text-[10px]">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
Enroll Admission            </p>
          </div>
          
          <div className="flex gap-4">
            <Button 
              className="btn-ghost shadow-sm" 
              icon={<span className="material-symbols-outlined text-sm">auto_fix_high</span>}
              onClick={fillRandomData}
            >
              Fill Mockup
            </Button>
            <Button 
              className="btn-ghost shadow-sm" 
              icon={<span className="material-symbols-outlined text-sm">save</span>}
              onClick={handleSaveDraft}
            >
              Save Progress
            </Button>
          </div>
        </div>

        <div className="glass-stepper-card mb-12">
          {/* Custom Step Indicator */}
          <div className="step-indicator-wrapper">
            {steps.map((step, idx) => (
              <button
                type="button"
                key={idx} 
                className={`step-node ${current === idx ? 'active' : ''} ${current > idx ? 'completed' : ''}`}
                onClick={() => void goToStep(idx)}
                aria-current={current === idx ? "step" : undefined}
                aria-label={`Go to ${step.title} step`}
              >
                <div className="step-circle">
                  {current > idx ? <span className="material-symbols-outlined">check</span> : step.icon}
                </div>
                <span className="step-label">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="p-16">
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              className="admission-form"
              onValuesChange={(changedValues, allValues) => {
                if (Object.prototype.hasOwnProperty.call(changedValues, "standard") && !allValues.section) {
                  const autoSection = getDefaultSection();
                  form.setFieldsValue({ section: autoSection });
                  setFormData({ ...allValues, section: autoSection });
                  return;
                }

                setFormData(allValues);
              }}
            >
              {steps[current].content}
            </Form>

            <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center">
              <div>
                {current > 0 && (
                  <button 
                    onClick={prev} 
                    className="nav-btn btn-ghost"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Previous Sector
                  </button>
                )}
              </div>
              
              <div className="flex gap-4">
                {current < steps.length - 1 ? (
                  <button 
                    onClick={next} 
                    className="nav-btn btn-primary"
                  >
                    Advance to {steps[current + 1].title}
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    className="nav-btn btn-primary bg-teal-600 hover:bg-teal-700"
                    onClick={async () => {
                      try {
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
 
                         // Add photosReceived flag
                         const photosReceivedFlag = values.photosReceived || false;
 
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
                           previousSchoolStandard: values.previousSchoolStandard,
                           transportMode: values.vanNeeded ? "Van" : "Local",
                           section: values.section || getDefaultSection(),
                           academicYear: values.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
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
                             siblings: String(values.siblingsCount || values.sibblings || ""),
                             preferredPhone: values.preferredPhone || "father",
                             parentsEmail: values.parentsEmail,
                             // Single parent & guardian
                             isSingleParent: values.isSingleParent || false,
                             guardianName: values.guardianName,
                             guardianPhone: values.guardianPhone,
                             guardianWhatsapp: values.guardianWhatsapp,
                             guardianAadhar: values.guardianAadhar,
                             guardianOccupation: values.guardianOccupation,
                             guardianRelation: values.guardianRelation,
                             // Sibling details
                             sibling1Name: values.sibling1Name,
                             sibling1Standard: values.sibling1Standard,
                             sibling1School: values.sibling1School,
                             sibling2Name: values.sibling2Name,
                             sibling2Standard: values.sibling2Standard,
                             sibling2School: values.sibling2School,
                             siblingDetails: Array.from({ length: Number(values.siblingsCount) || 0 }, (_, i) => ({
                               name: values[`sibling${i + 1}Name`],
                               school: values[`sibling${i + 1}School`],
                               standard: values[`sibling${i + 1}Standard`],
                             })),
                           },
                           address: {
                             line1: values.doorNo,
                             line2: values.street,
                             landmark: values.landmark,
                             city: values.city,
                             state: values.state || "Tamil Nadu",
                             pin: values.pin,
                           },
                           documents: documents,
                           photosReceived: photosReceivedFlag,
                           academics: [
                             {
                               examName: values.examName || "SSLC",
                               boardName: values.boardExamType === 'Other' ? (values.boardName || 'State Board') : 'State Board',
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
                         }

                        if (editData) {
                          await updateAdmission(editData.id, formDataToSend);
                          localStorage.removeItem("admission_draft");
                          message.success("Admission updated successfully!");
                          if (clearEditData) clearEditData();
                        } else {
                          await createAdmission(formDataToSend);
                          localStorage.removeItem("admission_draft");
                          message.success("Student successfully enrolled! Preparing a fresh admission form...");
                          setTimeout(() => {
                            window.location.reload();
                          }, 800);
                          return;
                        }
                        
                      } catch (err) {
                        console.error("Admission error:", err);
                        message.error("Error creating admission. Check required fields or try again.");
                      }
                    }}
                  >
                    Enroll the  student
                    <span className="material-symbols-outlined text-lg">verified</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Insight Ticker */}
        <div className="flex justify-center mb-16">
          <div className="bg-slate-50 px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-600 text-sm animate-pulse">lightbulb</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex gap-2">
              <span className="text-teal-600">Architect Intel:</span> 
              Academic year {dayjs().format('YYYY')}-{(parseInt(dayjs().format('YYYY'))+1)} is active by default.
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
                  <span style={styles.label}>Date of Birth :</span>
                  <span style={styles.value}>{formData.dob?.format?.("DD/MM/YYYY") || ".... / .... / ...."}</span>
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
