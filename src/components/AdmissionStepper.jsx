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
  Alert,
} from "antd";
import {
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
import { createAdmission, updateAdmission, getNextAdmissionNo, getAcademicStreams, createAcademicStream } from "../modules/admission/admission.service";

import { getAcademicYears } from "../modules/fees/fees.service";
import { getAdminSettings } from "../modules/settings/settings.service";
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

  .admission-form .ant-upload-list-picture-card .ant-upload-list-item-done {
    border: 2px solid #16a34a !important;
    box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.2);
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

const derivePreviousStandard = (currentStandard) => {
  const normalized = normalizeStandardValue(currentStandard);
  if (normalized === null || normalized === undefined) return undefined;

  const raw = String(normalized).trim();
  const num = Number(raw);
  if (Number.isNaN(num)) return undefined;
  if (num <= 1) return "UKG";
  return `${num - 1}`;
};

const toApiAssetUrl = (path) => {
  if (!path) return "";
  const normalizedPath = String(path).replace(/\\/g, '/').replace(/^\.\//, '');
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  if (normalizedPath.startsWith('/erp/api/')) return normalizedPath;
  return `/erp/api/${normalizedPath.replace(/^\/+/, '')}`;
};

const pickAssetPath = (...candidates) => {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
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

const getReadableStream = (stream, customStream, academicStreams = []) => {
  if (stream === "OTHER") return customStream || "Other";
  const found = academicStreams.find(s => s.name === stream || s.id === stream);
  return found ? found.label : (stream || "-");
};

const extractMissingFieldMessage = (err) => {
  const data = err?.response?.data;
  const missing = data?.missingFields || data?.fields || data?.errors;
  if (Array.isArray(missing) && missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (Array.isArray(data?.message) && data.message.length) {
    return data.message.join(", ");
  }

  return "Error creating admission. Please review required fields and try again.";
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const handleBeforeUpload = (file) => {
  const isLt20M = file.size <= MAX_FILE_SIZE;
  if (!isLt20M) {
    message.error(`${file.name} exceeds 20MB limit.`);
    return Upload.LIST_IGNORE;
  }
  return false; // Prevent automatic upload
};

const AdmissionStepper = ({ editData, clearEditData, onAfterUpdate }) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});
  const [community, setCommunity] = useState("");
  const [adminSettings, setAdminSettings] = useState({});
  const [documentAssets, setDocumentAssets] = useState({});
  const [academicStreams, setAcademicStreams] = useState([]);
  const [isAddingStream, setIsAddingStream] = useState(false);



  const normalizeAssetSrc = (value) => {
    if (!value) return "";
    if (value.startsWith("data:image") || value.startsWith("http://") || value.startsWith("https://")) return value;
    return `/erp/api/${String(value).replace(/^\/+/, "").replace(/\\/g, "/")}`;
  };

  const [availableYears, setAvailableYears] = useState([]);
  const [draftExists, setDraftExists] = useState(false);

  const scrollToTop = () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const scrollNow = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollNow();
    window.requestAnimationFrame(scrollNow);
  };

  const getLatestAcademicYearFromApi = (years) => {
    if (!Array.isArray(years) || years.length === 0) return "";
    return [...years]
      .filter(Boolean)
      .sort((a, b) => Number(String(b).split("-")[0]) - Number(String(a).split("-")[0]))[0] || "";
  };

  useEffect(() => {
    getAdminSettings().then((s) => {
      setAdminSettings(s || {});
      setDocumentAssets(s?.documentAssets || {});
    }).catch(() => { });

    getAcademicStreams().then((streams) => {
      setAcademicStreams(Array.isArray(streams) ? streams : []);
    }).catch(() => { });
  }, []);


  useEffect(() => {
    message.config({ duration: 4 });
  }, []);

  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const years = await getAcademicYears();
        const normalizedYears = Array.isArray(years) ? years.filter(Boolean) : [];
        setAvailableYears(normalizedYears);

        if (!editData) {
          const latestAcademicYear = getLatestAcademicYearFromApi(normalizedYears);
          if (latestAcademicYear) {
            form.setFieldsValue({ academicYear: latestAcademicYear });
            setFormData((prev) => ({ ...prev, academicYear: latestAcademicYear }));
          }
        }
      } catch {
        setAvailableYears([]);
      }
    };

    loadAcademicYears();
  }, [editData, form]);


  async function generatePDF() {
    try {
      const pageOne = document.getElementById("pdfPage1");
      const pageTwo = document.getElementById("pdfPage2");
      if (!pageOne || !pageTwo) return;

      const renderPage = async (element) => {
        const canvas = await html2canvas(element, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });
        return canvas.toDataURL("image/png");
      };

      const firstPageImage = await renderPage(pageOne);
      const secondPageImage = await renderPage(pageTwo);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;

      pdf.addImage(firstPageImage, "PNG", 0, 0, pageWidth, pageHeight);
      pdf.addPage();
      pdf.addImage(secondPageImage, "PNG", 0, 0, pageWidth, pageHeight);

      pdf.save(`Admission_${formData.admissionNo || "draft"}.pdf`);
      message.success("Admission PDF generated successfully!");
    } catch (err) {
      console.error(err);
      message.error("Failed to generate PDF.");
    }
  }



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
              type="button"
              className="px-3 py-1 text-xs text-white transition-all rounded-lg bg-primary hover:bg-primary-container"
              onClick={handleRestoreDraft}
            >
              Restore
            </button>
            <button
              type="button"
              className="text-xs text-error hover:underline"
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
        message.success({ content: "Draft restored successfully!", key: "draft_notice", duration: 4 });
        setDraftExists(false);
      }
    } catch (err) {
      message.error("Failed to restore draft.", 4);
    }
  };

  const handleSaveDraft = () => {
    const values = form.getFieldsValue(true);
    const studentName = values.name || "Unnamed_Student";
    const draftKey = `admission_draft_${studentName.replace(/\s+/g, '_')}`;
    
    const draft = {
      values,
      step: current,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
    // Also update a 'recent drafts' list for the dashboard if needed
    localStorage.setItem("admission_draft", JSON.stringify(draft)); // Keep last for quick restore
    message.success(`Progress for "${studentName}" saved successfully!`, 4);
    setDraftExists(true);
  };

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);



  const handleClearDraft = () => {
    localStorage.removeItem("admission_draft");
    setDraftExists(false);
    message.success({ content: "Draft cleared.", key: "draft_notice", duration: 4 });
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
        message.error("Auto admission number failed", 4);
      }
    };

    // ✅ only for NEW admission (not edit)
    if (!editData) {
      fetchAdmissionNo();
    }
  }, []);

  // Fetch academic streams on mount
  useEffect(() => {
    const loadStreams = async () => {
      try {
        const streams = await getAcademicStreams();
        setAcademicStreams(Array.isArray(streams) ? streams : []);
      } catch {
        setAcademicStreams([]);
      }
    };
    loadStreams();
  }, []);

  const handleAddNewStream = async () => {
    const customValue = form.getFieldValue("academicStreamCustom");
    if (!customValue || !customValue.trim()) {
      message.warning("Please enter a stream name first");
      return;
    }

    setIsAddingStream(true);
    try {
      const label = customValue.trim();
      const name = label.toUpperCase().replace(/\s+/g, '_');

      const newStream = await createAcademicStream({
        name,
        label,
        isCustom: true
      });

      message.success(`Stream "${label}" added successfully!`);

      // Refresh the list
      const updatedStreams = await getAcademicStreams();
      setAcademicStreams(Array.isArray(updatedStreams) ? updatedStreams : []);

      // Select the newly created stream and clear custom field
      form.setFieldsValue({
        academicStream: newStream.name,
        academicStreamCustom: undefined
      });
    } catch (err) {
      if (err.response?.status === 409) {
        message.error("This stream already exists");
      } else {
        message.error("Failed to add new stream");
      }
    } finally {
      setIsAddingStream(false);
    }
  };


  useEffect(() => {
    if (editData) {
      const primaryAcademic = editData.academics?.[0] || {};
      const doc = editData.documents?.[0] || {};
      const existingPhotoPath = pickAssetPath(
        doc.photoPath,
        doc.profilePhotoPath,
        doc.profilePhoto
      );

      const profilePhotoFile = existingPhotoPath
        ? [{ uid: "-1", name: "Profile Photo", status: "done", url: toApiAssetUrl(existingPhotoPath) }]
        : [];
      const birthCertFile = doc.birthCertPath
        ? [{ uid: "-1", name: "Birth Certificate", status: "done", url: toApiAssetUrl(doc.birthCertPath) }]
        : [];
      const communityCertFile = doc.communityCertPath
        ? [{ uid: "-1", name: "Community Certificate", status: "done", url: toApiAssetUrl(doc.communityCertPath) }]
        : [];
      const aadharStudentFile = doc.aadharStudentPath
        ? [{ uid: "-1", name: "Aadhar", status: "done", url: toApiAssetUrl(doc.aadharStudentPath) }]
        : [];
      const transferCertFile = doc.transferCertPath
        ? [{ uid: "-1", name: "Transfer Certificate", status: "done", url: toApiAssetUrl(doc.transferCertPath) }]
        : [];
      const entranceExamFile = doc.entranceExamPath
        ? [{ uid: "-1", name: "Entrance Exam", status: "done", url: toApiAssetUrl(doc.entranceExamPath) }]
        : [];

      const documentsChecked = [
        (doc.birthCert || birthCertFile.length > 0) && "birthCert",
        (doc.communityCert || communityCertFile.length > 0) && "communityCert",
        (doc.aadharStudent || aadharStudentFile.length > 0) && "aadharStudent",
        (doc.transferCert || transferCertFile.length > 0) && "transferCert",
        (doc.entranceExam || entranceExamFile.length > 0) && "entranceExam",
      ].filter(Boolean);

      const resolvedPreviousSchool =
        editData.previousSchool ||
        editData.admission?.previousSchool ||
        primaryAcademic.previousSchool ||
        undefined;

      const resolvedPreviousSchoolStandard =
        editData.previousSchoolStandard ||
        editData.previousStandard ||
        editData.admission?.previousSchoolStandard ||
        editData.admission?.previousStandard ||
        primaryAcademic.previousSchoolStandard ||
        primaryAcademic.standard ||
        derivePreviousStandard(editData.standard || editData.admission?.standard) ||
        undefined;

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
        customCommunity: editData.community === "OTHERS" ? (editData.customCommunity || editData.communityOther) : undefined,
        communityOther: editData.community === "OTHERS" ? (editData.customCommunity || editData.communityOther) : undefined,
        bloodGroup: editData.bloodGroup,
        identityMark1: editData.identification1,
        identityMark2: editData.identification2,
        previouslyStudied: resolvedPreviousSchool,
        previousSchoolStandard: resolvedPreviousSchoolStandard,
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
        state: editData.address?.state && editData.address.state !== "Tamil Nadu" ? "OTHERS" : (editData.address?.state || "Tamil Nadu"),
        stateOther: editData.address?.state && editData.address.state !== "Tamil Nadu" ? editData.address.state : undefined,
        pin: editData.address?.pin,
        admissionNo: editData.admission?.admissionNo,
        admissionFrom: editData.admission?.admissionFrom ? dayjs(editData.admission.admissionFrom) : null,
        admissionTo: editData.admission?.admissionTo ? dayjs(editData.admission.admissionTo) : null,
        admissionDate: editData.admission?.admissionDate ? dayjs(editData.admission.admissionDate) : null,
        examName: primaryAcademic.examName,
        boardExamType: primaryAcademic.boardName && primaryAcademic.boardName !== 'State Board' ? 'Other' : 'State Board',
        boardName: primaryAcademic.boardName && primaryAcademic.boardName !== 'State Board' ? primaryAcademic.boardName : undefined,
        academicStream: primaryAcademic.stream || editData.academicStream,
        academicStreamCustom: primaryAcademic.streamCustom || editData.academicStreamCustom,
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

        profilePhotoChecked: !!existingPhotoPath,
        profilePhoto: profilePhotoFile,
        birthCertFile,
        communityCertFile,
        aadharStudentFile,
        transferCertFile,
        entranceExamFile,
        documentsChecked,
      };

      // Keep legacy document selection field for compatibility.
      flatData.documents = documentsChecked;

      // Handle hard copy flags
      const hardCopySelection = [];
      if (doc.birthCertHardCopy) hardCopySelection.push("birthCert");
      if (doc.communityCertHardCopy) hardCopySelection.push("communityCert");
      if (doc.aadharStudentHardCopy) hardCopySelection.push("aadharStudent");
      if (doc.aadharFatherHardCopy) hardCopySelection.push("aadharFather");
      if (doc.aadharMotherHardCopy) hardCopySelection.push("aadharMother");
      if (doc.transferCertHardCopy) hardCopySelection.push("transferCert");
      if (doc.entranceExamHardCopy) hardCopySelection.push("entranceExam");
      flatData.hardCopyDocs = hardCopySelection;
      flatData.photosReceived = doc.photosReceived || false;

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
      transportMode: "Van",

      examName: "10th Standard",
      registerNo: "2025001234",
      monthYear: "March 2025",
      academicYear: getLatestAcademicYearFromApi(availableYears) || undefined,
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
    message.success("Filled with random Indian standard data!", 4);
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
    validator: (_, value) => {
      if (!value) return Promise.resolve();
      return /^\d{12}$/.test(String(value).trim())
        ? Promise.resolve()
        : Promise.reject(new Error("Aadhar number must be 12 digits"));
    },
  };
  const pinRule = {
    required: true,
    message: "PIN must be 6 digits",
    pattern: /^\d{6}$/,
  };
  const profilePhotoChecked = Form.useWatch("profilePhotoChecked", form);
  const watchedStandard = Form.useWatch("standard", form);
  const watchedSubjects = Form.useWatch("subjects", form) || [];
  const isSingleParent = Form.useWatch("isSingleParent", form);
  const boardExamType = Form.useWatch("boardExamType", form);
  const selectedState = Form.useWatch("state", form);
  const selectedAcademicStream = Form.useWatch("academicStream", form);
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
    { label: "Entrance Exam", file: formData.entranceExamFile, key: "entranceExam" },
  ].filter((doc) => doc.file?.[0]);

  const recommendedDocuments = [
    { label: "Birth Certificate", file: formData.birthCertFile },
    { label: "Community Certificate", file: formData.communityCertFile },
    { label: "Aadhar", file: formData.aadharStudentFile },
    { label: "Transfer Certificate", file: formData.transferCertFile },
    { label: "Entrance Exam", file: formData.entranceExamFile },
  ];

  const missingRecommendedDocuments = recommendedDocuments
    .filter((doc) => !doc.file?.[0])
    .map((doc) => doc.label);

  const getSafePreviewUrl = (fileItem) => {
    if (!fileItem) return null;
    if (fileItem.url) return fileItem.url;
    if (fileItem.thumbUrl) return fileItem.thumbUrl;

    if (fileItem.originFileObj instanceof Blob) {
      try {
        return URL.createObjectURL(fileItem.originFileObj);
      } catch {
        return null;
      }
    }

    return null;
  };

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
      const existingPhotoPath = pickAssetPath(
        doc.photoPath,
        doc.profilePhotoPath,
        doc.profilePhoto
      );

      form.setFieldsValue({
        profilePhoto: getDefaultFile(existingPhotoPath, "Profile Photo"),
        documentsChecked: [
          (doc.birthCert || doc.birthCertPath) && "birthCert",
          (doc.communityCert || doc.communityCertPath) && "communityCert",
          (doc.aadharStudent || doc.aadharStudentPath) && "aadharStudent",
          (doc.transferCert || doc.transferCertPath) && "transferCert",
          (doc.entranceExam || doc.entranceExamPath) && "entranceExam",
        ].filter(Boolean),
        profilePhotoChecked: !!existingPhotoPath,
      });
    }
  }, [editData]);



  const watchedGuardianRelation = Form.useWatch("guardianRelation", form);
  
  useEffect(() => {
    if (isSingleParent && (watchedGuardianRelation === "father" || watchedGuardianRelation === "mother")) {
      const relation = watchedGuardianRelation === "father" ? "father" : "mother";
      const name = form.getFieldValue(`${relation}Name`);
      const phone = form.getFieldValue(`${relation}Phone`);
      const whatsapp = form.getFieldValue(`${relation}WhatsAppNo`);
      const aadhar = form.getFieldValue(`${relation}AadharNo`);
      const occupation = form.getFieldValue(`${relation}Occupation`);
      
      form.setFieldsValue({
        guardianName: name,
        guardianPhone: phone,
        guardianWhatsapp: whatsapp,
        guardianAadhar: aadhar,
        guardianOccupation: occupation
      });
    }
  }, [watchedGuardianRelation, isSingleParent, form]);

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
    const url = toApiAssetUrl(path);

    return [
      {
        uid: "-1",
        name,
        status: "done",
        url,
      },
    ];
  };

  const getExistingFilePath = (fileList) => {
    const item = Array.isArray(fileList) ? fileList[0] : null;
    const raw = item?.url || item?.thumbUrl || "";
    if (!raw || /^blob:/i.test(raw) || /^data:/i.test(raw)) return "";

    let normalized = String(raw);
    normalized = normalized.replace(/^https?:\/\/[^/]+/i, "");
    normalized = normalized.replace(/^\/?erp\/api\//i, "");
    return normalized.replace(/^\/+/, "");
  };



  const steps = [
    // 🔥 STUDENT
    {
      title: "Student",
      icon: <UserOutlined />,
      fields: ["name", "gender", "dob", "community", "standard"],
      content: (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-primary">Student Profile</h3>
            <p className="pb-2 text-sm border-b text-on-surface-variant border-outline-variant">Enter the student's basic identification and demographic details.</p>
            <div className="pt-4 mt-4 ">
              <h4 className="mb-3 text-sm font-bold tracking-wider uppercase text-secondary">Admission Details</h4>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item name="admissionNo" label="Admission No">
                    <Input style={{ color: "red" }} disabled placeholder="Auto-generated" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="admissionDate" label="Admission Date" rules={[requiredRule]}>
                    <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="academicYear" label="Academic Year">
                    <Input disabled placeholder="Auto-assigned from active academic year" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="transportMode" label="Transport Mode" initialValue="Self">
                    <Select
                      options={[
                        { value: 'Self', label: 'Self' },
                        { value: 'Van', label: 'School Van' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <div style={{ marginTop: '28px' }}>
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

            {/* Academic Stream - visible only for 11th & 12th */}
            {(watchedStandard === "11" || watchedStandard === "12" || watchedStandard === "11th" || watchedStandard === "12th") && (
              <>
                <Col span={12}>
                  <Form.Item name="academicStream" label="Academic Stream">
                    <Select
                      placeholder="Select stream"
                      allowClear
                      options={[
                        ...academicStreams.map(s => ({ value: s.name, label: s.label })),
                        { value: "OTHER", label: "Other (Add New)" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                {selectedAcademicStream === "OTHER" && (
                  <Col span={12}>
                    <Form.Item name="academicStreamCustom" label="Custom Stream Name" rules={[{ required: true, message: 'Enter custom stream name' }]}>
                      <Input
                        placeholder="e.g. Fine Arts"
                        suffix={
                          <Button
                            type="primary"
                            size="small"
                            loading={isAddingStream}
                            onClick={handleAddNewStream}
                            icon={<PlusOutlined />}
                          >
                            Add
                          </Button>
                        }
                      />
                    </Form.Item>
                  </Col>
                )}

              </>
            )}
            <Col span={12}>
              <Form.Item name="gender" label="Gender" rules={[requiredRule]}>
                <Select>
                  <Select.Option value="MALE">Male</Select.Option>
                  <Select.Option value="FEMALE">Female</Select.Option>
                  <Select.Option value="OTHERS">Others</Select.Option>
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
            <Col span={12}><Form.Item name="aadharNo" label="Aadhar No" rules={[{ pattern: /^\d{12}$/, message: 'Must be 12 digits' }]}><Input maxLength={12} /></Form.Item></Col>

            <Col span={12}><Form.Item name="bloodGroup" label="Blood Group" ><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="identityMark1" label="Identity Mark 1"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="identityMark2" label="Identity Mark 2"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="previouslyStudied" label="Previously Studied" ><Input placeholder="Optional" /></Form.Item></Col>
            <Col span={12}><Form.Item name="previousSchoolStandard" label="Previous School Standard" >

              <Select
                placeholder="Optional"
                allowClear
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

            </Form.Item></Col>


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
            <p className="pb-2 text-sm border-b text-on-surface-variant border-outline-variant">Provide information about parents, siblings, and contact preferences.</p>
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
              <h4 className="mb-3 text-sm font-bold tracking-wider uppercase text-secondary">Father Particulars</h4>
              <Form.Item name="fatherName" label="Father Name" rules={isSingleParent ? [] : []}>
                <Input disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>
              <Form.Item name="fatherPhone" label="Father Mobile" rules={[{ pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}>
                <Input maxLength={10} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>

              <Form.Item label="Father WhatsApp">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item 
                    name="fatherWhatsAppNo" 
                    noStyle 
                    rules={[{ pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}
                  >
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
              <Form.Item name="fatherAadharNo" label="Father Aadhar" rules={[{ pattern: /^\d{12}$/, message: 'Must be 12 digits' }]}>
                <Input maxLength={12} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'father'} />
              </Form.Item>

            </Col>

            {/* RIGHT — MOTHER */}
            <Col span={12}>
              <h4 className="mb-3 text-sm font-bold tracking-wider uppercase text-secondary">Mother Particulars</h4>
              <Form.Item name="motherName" label="Mother Name">
                <Input disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} />
              </Form.Item>
              <Form.Item name="motherPhone" label="Mother Mobile" rules={[{ pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}>
                <Input maxLength={10} disabled={isSingleParent && form.getFieldValue('guardianRelation') !== 'mother'} />
              </Form.Item>

              <Form.Item label="Mother WhatsApp">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item 
                    name="motherWhatsAppNo" 
                    noStyle 
                    rules={[{ pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}
                  >
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
              <Form.Item name="motherAadharNo" label="Mother Aadhar" rules={[{ pattern: /^\d{12}$/, message: 'Must be 12 digits' }]}>
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
            <div className="pt-4 mt-6 border-t border-outline-variant">
              <h4 className="mb-3 text-sm font-bold tracking-wider uppercase text-secondary">Guardian Details</h4>
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
                  <Form.Item 
                    name="guardianName" 
                    label="Guardian Name" 
                    rules={[{ 
                      required: watchedGuardianRelation !== "father" && watchedGuardianRelation !== "mother", 
                      message: 'Enter guardian name' 
                    }]}
                  >
                    <Input disabled={watchedGuardianRelation === "father" || watchedGuardianRelation === "mother"} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="guardianPhone" label="Guardian Phone" rules={[{ pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}>
                    <Input maxLength={10} />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item label="Guardian WhatsApp">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item 
                        name="guardianWhatsapp" 
                        noStyle 
                        rules={[{ pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}
                      >
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
                  <Form.Item name="guardianAadhar" label="Guardian Aadhar" rules={[{ pattern: /^\d{12}$/, message: 'Must be 12 digits' }]}>
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


          <div className="pt-4 mt-8 border-t border-outline-variant">
            <h4 className="mb-3 text-sm font-bold tracking-wider uppercase text-secondary">Siblings & Preferences</h4>
            <Row gutter={16}>

              <Col span={12}>
                <Form.Item name="siblingsCount" label="Number of Siblings">
                  <Input type="number" min={0} placeholder="Enter number" />
                </Form.Item>
              </Col>
            </Row>

            {Array.from({ length: siblingCount }).map((_, index) => (
              <div key={index} className="mt-4">

                <h4 className="mb-2 text-sm font-semibold">
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
                          <Select.Option key={i + 1} value={String(i + 1)}>{`${i + 1}${['st', 'nd', 'rd'][i] || 'th'} Standard`}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                </Row>

              </div>
            ))}

            {/* Sibling 1 Details */}
            {/* <Divider titlePlacement="left" style={{ fontSize: 13 }}>Sibling 1 Details</Divider>
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
            {/* <Divider titlePlacement="left" style={{ fontSize: 13 }}>Sibling 2 Details</Divider>
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

            <div className="pt-4 mt-8 border-t border-outline-variant">
              <h4 className="mb-3 text-sm font-bold tracking-wider uppercase text-secondary">
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
            <p className="pb-2 text-sm border-b text-on-surface-variant border-outline-variant">Enter the current contact information for correspondence and transport.</p>
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
                <Select>
                  <Select.Option value="Tamil Nadu">Tamil Nadu</Select.Option>
                  <Select.Option value="OTHERS">Others</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            {selectedState === "OTHERS" && (
              <Col span={12}>
                <Form.Item name="stateOther" label="Specify State" rules={[requiredRule]}>
                  <Input placeholder="Enter state name" />
                </Form.Item>
              </Col>
            )}

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
            <p className="pb-2 text-sm border-b text-on-surface-variant border-outline-variant">Details of qualifying examinations and subject-wise performance.</p>
          </div>
          <>
            {(() => {
              const std = form.getFieldValue("standard");
              return !std || (std !== "LKG" && std !== "UKG");
            })() ? (
              <>
                {/* ── Qualifying Exam header ── */}
                <Divider titlePlacement="left">Qualifying Examination Passed and Percentage of Mark Obtained</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="examName" label="Name of Examination" >
                  <Select placeholder="10th/11th/Entrance" allowClear={false}>
                    <Select.Option value="10th">10th</Select.Option>
                    <Select.Option value="11th">11th</Select.Option>
                    <Select.Option value="Entrance">Entrance</Select.Option>
                  </Select>
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
                  <Form.Item name="boardName" label="Board Name" >
                    <Input placeholder="e.g. CBSE, ICSE" />
                  </Form.Item>
                </Col>
              )}
              <Col span={6}>
                <Form.Item name="monthYear" label="Date of Appearance">
                  <Input placeholder="March 2025 or 01/03/25" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="registerNo" label="Register No">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="academicStream" label="Academic Stream / Group">
                  <Select
                    placeholder="Select group"
                    allowClear
                    options={[
                      ...academicStreams.map(s => ({ value: s.name, label: s.label })),
                      { value: "OTHER", label: "Other (Add New)" },
                    ]}
                  />
                </Form.Item>
              </Col>

              {selectedAcademicStream === "OTHER" && (
                <Col span={12}>
                  <Form.Item name="academicStreamCustom" label="Specify Custom Stream" rules={[requiredRule]}>
                    <Input
                      autoFocus
                      placeholder="Type custom stream/course here"
                      suffix={
                        <Button
                          type="primary"
                          size="small"
                          loading={isAddingStream}
                          onClick={handleAddNewStream}
                          icon={<PlusOutlined />}
                        >
                          Add
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
              )}
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
                        <Select.Option value="HUMANITIES">History, Geography, Political Science, Economics</Select.Option>
                        <Select.Option value="OTHER">Other</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  {selectedAcademicStream === "OTHER" && (
                    <Col span={10}>
                      <Form.Item name="academicStreamCustom" label="Specify Custom Stream" rules={[requiredRule]}>
                        <Input autoFocus placeholder="Type custom stream/course here" />
                      </Form.Item>
                    </Col>
                  )}
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
                          {form.getFieldValue('academicStream') === 'BIO_MATHS' && 'Physics, Chemistry, Biology, Mathematics'}
                          {form.getFieldValue('academicStream') === 'CS_MATHS' && 'Physics, Chemistry, Computer Science, Mathematics'}
                          {form.getFieldValue('academicStream') === 'BIO_CS' && 'Physics, Chemistry, Biology, Computer Science'}
                          {form.getFieldValue('academicStream') === 'HUMANITIES' && 'History, Geography, Political Science, Economics'}
                          {form.getFieldValue('academicStream') === 'OTHER' && (form.getFieldValue('academicStreamCustom') || 'Other')}
                          {form.getFieldValue('academicStream') === 'COMMERCE' && 'Commerce, Economics, Accountancy, Computer Application'}
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
                          {form.getFieldValue('academicStream') === 'HUMANITIES' && 'History, Geography, Political Science, Economics'}
                          {form.getFieldValue('academicStream') === 'OTHER' && (form.getFieldValue('academicStreamCustom') || 'Other')}
                          {!form.getFieldValue('academicStream') && <em>Select a stream above</em>}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <span className="text-3xl material-symbols-outlined text-slate-300">history_edu</span>
            </div>
            <h4 className="text-slate-900 font-bold">Academic History Not Required</h4>
            <p className="text-slate-500 text-sm mt-1">Previous performance data is not applicable for {watchedStandard} admissions.</p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-4 py-2 rounded-full">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
              Safe to skip
            </div>
          </div>
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
            <p className="pb-2 text-sm border-b text-on-surface-variant border-outline-variant">Upload certificates and student profile photo (optional). <span className="font-bold text-primary">Max size: 20MB per file.</span></p>
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
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                accept="image/*"
                beforeUpload={handleBeforeUpload}
                showUploadList={{ showPreviewIcon: false }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl material-symbols-outlined">
                    add_a_photo
                  </span>
                  <p className="mt-1 text-xs">Upload</p>
                </div>
              </Upload>
            </Form.Item>

            {/* ✅ DOCUMENT CHECKBOX */}
            <Form.Item label="Documents">
              <div className="grid grid-cols-3 gap-4">

                {/* Birth Certificate */}
                <Form.Item
                  name="birthCertFile"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => e?.fileList}
                >
                  <Upload listType="picture-card" maxCount={1} beforeUpload={handleBeforeUpload} accept="image/*,.pdf" showUploadList={{ showPreviewIcon: false }}>
                    <div className="text-center">
                      <span className="text-2xl material-symbols-outlined">description</span>
                      <p className="mt-1 text-xs">Birth Cert</p>
                    </div>
                  </Upload>
                </Form.Item>

                {/* Community Certificate */}
                <Form.Item
                  name="communityCertFile"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => e?.fileList}
                >
                  <Upload listType="picture-card" maxCount={1} beforeUpload={handleBeforeUpload} accept="image/*,.pdf" showUploadList={{ showPreviewIcon: false }}>
                    <div className="text-center">
                      <span className="text-2xl material-symbols-outlined">badge</span>
                      <p className="mt-1 text-xs">Community</p>
                    </div>
                  </Upload>
                </Form.Item>

                {/* Aadhaar */}
                <Form.Item
                  name="aadharStudentFile"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => e?.fileList}
                >
                  <Upload listType="picture-card" maxCount={1} beforeUpload={handleBeforeUpload} accept="image/*,.pdf" showUploadList={{ showPreviewIcon: false }}>
                    <div className="text-center">
                      <span className="text-2xl material-symbols-outlined">credit_card</span>
                      <p className="mt-1 text-xs">Aadhaar</p>
                    </div>
                  </Upload>
                </Form.Item>

                {/* Transfer Certificate */}
                <Form.Item
                  name="transferCertFile"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => e?.fileList}
                >
                  <Upload listType="picture-card" maxCount={1} beforeUpload={handleBeforeUpload} accept="image/*,.pdf" showUploadList={{ showPreviewIcon: false }}>
                    <div className="text-center">
                      <span className="text-2xl material-symbols-outlined">
                        description
                      </span>
                      <p className="mt-1 text-xs">Transfer Cert</p>
                    </div>
                  </Upload>
                </Form.Item>

                <Form.Item
                  name="entranceExamFile"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => e?.fileList}
                >
                  <Upload listType="picture-card" maxCount={1} beforeUpload={handleBeforeUpload} accept="image/*,.pdf" showUploadList={{ showPreviewIcon: false }}>
                    <div className="text-center">
                      <span className="text-2xl material-symbols-outlined">fact_check</span>
                      <p className="mt-1 text-xs">Entrance Exam</p>
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
                  { value: "entranceExam", label: "Entrance Exam" },
                  { value: "3 Photos received", label: "3 Hard Copy photos" },
                ]}
              />
            </Form.Item>


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
          <div className="flex items-center justify-end gap-3 mb-4">
            <Button
              onClick={() => {
                syncFormData();
                message.success("Review refreshed", 2);
                scrollToTop();
              }}
            >
              Refresh Review
            </Button>
            <Button
              icon={<DownloadOutlined />}
              type="primary"
              onClick={generatePDF}
            >
              Download PDF
            </Button>
          </div>
          {missingRecommendedDocuments.length > 0 && (
            <Alert
              type="info"
              showIcon
              message="Optional documents are pending"
              description={`Pending: ${missingRecommendedDocuments.join(", ")}. You can still enroll now and upload later.`}
            />
          )}
          <div className="form-section-header">
            <h3 className="text-3xl font-black tracking-tighter text-slate-900">Student Admission</h3>
            <p className="text-sm font-medium text-slate-500">Verify the integrity of all data vectors before final academic sealing.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            {/* Part 1: Persona & Identity */}
            <div className="space-y-8 xl:col-span-2">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md h-full">
                <div className="flex items-start justify-between mb-8">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-500/10">
                      <UserOutlined className="text-xs text-teal-600" />
                    </span>
                    Persona Profile
                  </h4>
                  {formData.profilePhoto?.[0] && (
                    <div className="w-24 h-24 overflow-hidden border-2 border-white shadow-xl rounded-3xl">
                      <img
                        src={getSafePreviewUrl(formData.profilePhoto?.[0]) || ""}
                        alt="Student"
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <Descriptions column={1} size="small" className="premium-descriptions">
                    <Descriptions.Item label="Full Name">{formData.name}</Descriptions.Item>
                    <Descriptions.Item label="Standard">{formData.standard}</Descriptions.Item>
                    <Descriptions.Item label="Academic Year">{formData.academicYear}</Descriptions.Item>
                    {formData.academicStream && (
                      <Descriptions.Item label="Stream / Group">{
                        getReadableStream(formData.academicStream, formData.academicStreamCustom, academicStreams)
                      }</Descriptions.Item>

                    )}
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
                    <Descriptions.Item label="Transport">{formData.transportMode || "Self"}</Descriptions.Item>
                  </Descriptions>
                </div>

                <div className="pt-8 mt-8 border-t border-slate-50">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Residential Vector</h5>
                  <p className="text-sm font-extrabold leading-relaxed text-slate-900">
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
                <div className="p-5 border bg-white/5 rounded-2xl border-white/10">
                  <div className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-1">Last Examination</div>
                  <div className="text-xl font-black">{formData.examName}</div>
                  <div className="mt-1 text-xs text-white/40">{formData.boardExamType} | Reg: {formData.registerNo}</div>
                </div>

                <div className="p-5 bg-teal-500 shadow-lg rounded-2xl shadow-teal-500/20">
                  <div className="text-[9px] font-black uppercase text-white/70 tracking-widest mb-1">Aggregate Performance</div>
                  <div className="text-3xl font-black text-white">{formData.totalPercentage}%</div>
                </div>

                <div className="space-y-3">
                  <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Subject Breakdown</div>
                  {formData.subjects?.filter(s => s.subjectName).map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-xs border-b border-white/5">
                      <span className="font-bold">{sub.subjectName}</span>
                      <span className="font-black text-teal-400">{sub.obtainedMarks} / {sub.maxMarks}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            {/* Part 3: Family matrix */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-full">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2">
                <TeamOutlined className="text-blue-600" /> Family Matrix
              </h4>

              <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
                <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Father</h5>
                  <div className="space-y-1.5">
                    <div className="text-sm font-black text-slate-900">{formData.fatherName}</div>
                    <div className="text-xs font-bold text-slate-500">{formData.fatherOccupation}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-blue-600">
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      {formData.fatherPhone}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      {formData.fatherWhatsAppNo || "-"}
                    </div>
                    <div className="text-xs font-bold text-slate-500">Aadhar: {formData.fatherAadharNo || "-"}</div>
                  </div>
                </div>
                <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Mother</h5>
                  <div className="space-y-1.5">
                    <div className="text-sm font-black text-slate-900">{formData.motherName}</div>
                    <div className="text-xs font-bold text-slate-500">{formData.motherOccupation}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-blue-600">
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      {formData.motherPhone}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      {formData.motherWhatsAppNo || "-"}
                    </div>
                    <div className="text-xs font-bold text-slate-500">Aadhar: {formData.motherAadharNo || "-"}</div>
                  </div>
                </div>
              </div>

              {formData.isSingleParent && (
                <div className="p-6 mb-8 border bg-amber-50 rounded-2xl border-amber-100">
                  <h5 className="text-[9px] font-black uppercase text-amber-600 tracking-widest mb-2 flex items-center gap-2">
                    <span className="text-sm material-symbols-outlined">shield_person</span> Guardian Nexus
                  </h5>
                  <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <span className="font-extrabold text-slate-900">{formData.guardianName} ({formData.guardianRelation})</span>
                    <span className="font-bold text-slate-500">Phone: {formData.guardianPhone || "-"}</span>
                    <span className="font-bold text-emerald-700">WhatsApp: {formData.guardianWhatsapp || "-"}</span>
                    <span className="font-bold text-slate-500">Aadhar: {formData.guardianAadhar || "-"}</span>
                    <span className="font-bold text-slate-500 md:col-span-2">Occupation: {formData.guardianOccupation || "-"}</span>
                  </div>
                </div>
              )}

              <div className="p-4 mb-8 border border-blue-100 bg-blue-50 rounded-2xl">
                <h5 className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-2">Contact Preference</h5>
                <div className="text-xs font-bold text-slate-700">Preferred: {preferredContacts.length ? preferredContacts.join(", ") : "-"}</div>
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
                      <span className="mx-1 text-slate-400">-</span>
                      <span>{sibling.schoolName}</span>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-400">
                        Standard: {sibling.standard}
                      </div>
                    </div>
                  ))}
                  {siblingReviewItems.length === 0 && (
                    <div className="text-xs italic text-slate-400">No siblings registered in current matrix.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Part 4: Verification Vault */}
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2">
                <FileTextOutlined className="text-indigo-600" /> Verification Vault
              </h4>

              <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
                {reviewDocuments.map((doc, idx) => {
                  const fileItem = doc.file?.[0];
                  const fileUrl = getSafePreviewUrl(fileItem);
                  const fileType = fileItem?.type || "";
                  const fileName = fileItem?.name || "";
                  const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

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
                          <div className="flex flex-col items-center justify-center w-full h-full p-4 bg-slate-900">
                            <span className="mb-2 text-3xl text-teal-400 material-symbols-outlined">picture_as_pdf</span>
                            <span className="text-[8px] font-black text-white uppercase text-center">{doc.label}</span>
                          </div>
                        ) : (
                          <img src={fileUrl} className="object-cover w-full h-full" alt={doc.label} />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full p-4 bg-white">
                          <span className="mb-2 text-2xl material-symbols-outlined text-slate-200">upload_file</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase text-center">{doc.label}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] bg-teal-500 text-white">
                          <span className="text-xs material-symbols-outlined">check</span>
                        </span>
                      </div>
                    </div>


                  );
                })}
                {reviewDocuments.length === 0 && (
                  <div className="text-xs italic col-span-full text-slate-400">
                    No uploaded documents available for preview.
                  </div>
                )}

                {isPreviewOpen && selectedDoc && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-white p-6 rounded-xl w-[900px] max-w-[95%]">
                      <h2 className="mb-4 text-lg font-bold">{selectedDoc.label}</h2>
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
                        <button type="button" onClick={() => setIsPreviewOpen(false)}>Close</button>
                      </div>

                    </div>
                  </div>
                )}

                {/* Verification Tags */}
                <div className="pt-4 space-y-3 col-span-full">
                  <div className="flex flex-wrap gap-2">
                    {formData.transportMode && formData.transportMode !== "Self" && (
                      <Tag className="rounded-full px-4 py-1 border-blue-200 bg-blue-50 text-blue-700 font-extrabold text-[9px] uppercase shadow-sm">
                        Transport: {formData.transportMode}
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
        const errorFields = err?.errorFields?.map(f => f.errors?.[0]).filter(Boolean).join(", ");
        message.error(`Please check these fields: ${errorFields || "Required data missing"}`, 5);
        return;
      }
    }

    syncFormData();
    setCurrent(targetStep);
    scrollToTop();
  };

  const next = () => goToStep(current + 1);

  const prev = () => {
    syncFormData();
    setCurrent(current - 1);
    scrollToTop();
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
      width: "794px",
      height: "1123px",
      background: "#fff",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#0f172a",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      padding: "30px 40px",
    },
    header: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr 1fr",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "15px",
      borderBottom: "1px solid #e2e8f0",
    },
    schoolHeader: {
      display: "flex",
      gap: "20px",
      alignItems: "center",
    },
    institutionName: {
      margin: 0,
      fontSize: "24px",
      fontWeight: "900",
      color: "#0f172a",
      letterSpacing: "-0.02em",
    },
    tagline: {
      margin: "4px 0 0",
      fontSize: "12px",
      color: "#64748b",
      fontWeight: "500",
      maxWidth: "400px",
    },
    photoBox: {
      width: "100px",
      height: "120px",
      background: "#f8fafc",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      justifySelf: "end",
    },
    sectionTitle: {
      margin: "0 0 16px",
      fontSize: "14px",
      fontWeight: "800",
      color: "#0f172a",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    contentGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      marginBottom: "15px",
    },
    fieldRow: {
      display: "flex",
      padding: "8px 0",
      borderBottom: "1px solid #f8fafc",
    },
    fieldLabel: {
      fontSize: "11px",
      color: "#64748b",
      fontWeight: "600",
      width: "120px",
    },
    fieldValue: {
      fontSize: "11px",
      color: "#0f172a",
      fontWeight: "800",
      flex: 1,
    },
    academicTable: {
      width: "100%",
      borderCollapse: "collapse",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      marginBottom: "20px",
    },
    academicTh: {
      backgroundColor: "transparent",
      padding: "10px 16px",
      fontSize: "10px",
      textAlign: "left",
      textTransform: "uppercase",
      color: "#64748b",
      fontWeight: "900",
      letterSpacing: "0.05em",
      borderBottom: "2px solid #0f172a",
    },
    academicTd: {
      padding: "12px 16px",
      fontSize: "11px",
      fontWeight: "700",
      borderBottom: "1px solid #f1f5f9",
    },
    signatureSection: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "auto",
      paddingTop: "20px",
      paddingBottom: "40px",
    },
    sigBlock: {
      textAlign: "center",
    },
    sigLine: {
      margin: 0,
      fontSize: "10px",
      fontWeight: "800",
      color: "#64748b",
      textTransform: "uppercase",
      paddingTop: "8px",
      borderTop: "1px dashed #cbd5e1",
    },
    sigImage: {
      maxHeight: "60px",
      maxWidth: "120px",
      objectFit: "contain",
      marginBottom: "8px",
    },
    footer: {
      marginTop: "auto",
      paddingTop: "20px",
      borderTop: "1px solid #f1f5f9",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerText: {
      margin: 0,
      fontSize: "9px",
      color: "#94a3b8",
    }
  };




  return (
    <div className="admission-container">
      <style>{scholarStyles}</style>

      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-5xl font-black leading-tight tracking-tighter text-slate-900">
              Academic <span className="text-teal-600">Application</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 mt-3 uppercase tracking-widest text-[10px]">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
              Enroll Admission            </p>
          </div>

          <div className="flex gap-4">
            <Button
              className="shadow-sm btn-ghost"
              icon={<span className="text-sm material-symbols-outlined">auto_fix_high</span>}
              onClick={fillRandomData}
            >
              Fill Mockup
            </Button>
            <Button
              className="shadow-sm btn-ghost"
              icon={<span className="text-sm material-symbols-outlined">save</span>}
              onClick={handleSaveDraft}
            >
              Save Progress
            </Button>
          </div>
        </div>

        <div className="mb-12 glass-stepper-card">
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
              preserve={true}
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

            <div className="flex items-center justify-between pt-10 mt-20 border-t border-slate-100">
              <div>
                {current > 0 && (
                  <button
                    type="button"
                    onClick={prev}
                    className="nav-btn btn-ghost"
                  >
                    <span className="text-lg material-symbols-outlined">arrow_back</span>
                    Previous Sector
                  </button>
                )}
              </div>

              <div className="flex gap-4">
                {current < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="nav-btn btn-primary"
                  >
                    Advance to {steps[current + 1].title}
                    <span className="text-lg material-symbols-outlined">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bg-teal-600 nav-btn btn-primary hover:bg-teal-700"
                    onClick={async () => {
                      try {
                        const values = form.getFieldsValue(true);

                        try {
                          await form.validateFields();
                        } catch (validationError) {
                          const fields = (validationError?.errorFields || [])
                            .map((item) => item?.name?.join(" > "))
                            .filter(Boolean);

                          if (fields.length) {
                            message.error(`Please complete required fields: ${fields.join(", ")}`, 5);
                          } else {
                            message.error("Please complete all required fields.", 4);
                          }
                          return;
                        }

                        const hasBirthFile = !!values.birthCertFile?.[0];
                        const hasCommunityFile = !!values.communityCertFile?.[0];
                        const hasAadharFile = !!values.aadharStudentFile?.[0];
                        const hasTransferFile = !!values.transferCertFile?.[0];
                        const hasEntranceFile = !!values.entranceExamFile?.[0];

                        const selectedDocs = new Set(values.documentsChecked || []);
                        if (hasBirthFile) selectedDocs.add("birthCert");
                        if (hasCommunityFile) selectedDocs.add("communityCert");
                        if (hasAadharFile) selectedDocs.add("aadharStudent");
                        if (hasTransferFile) selectedDocs.add("transferCert");
                        if (hasEntranceFile) selectedDocs.add("entranceExam");

                        const selectedDocList = Array.from(selectedDocs);

                        // Build the documents array
                        const documents = [];
                        const hardCopyDocs = values.hardCopyDocs || [];
                        
                        // Profile photo
                        documents.push({ 
                          key: "photo", 
                          uploaded: !!values.profilePhoto?.[0],
                          photoPath: "" 
                        });

                        const ALL_DOC_KEYS = ["birthCert", "communityCert", "aadharStudent", "transferCert", "entranceExam", "aadharFather", "aadharMother"];
                        ALL_DOC_KEYS.forEach(docKey => {
                          const hasFile = !!values[`${docKey}File`]?.[0];
                          const isHardCopy = hardCopyDocs.includes(docKey);
                          
                          documents.push({
                            key: docKey,
                            uploaded: hasFile,
                            hardCopy: isHardCopy,
                            photoPath: ""
                          });
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
                          transportMode: values.transportMode || "Self",
                          section: values.section || getDefaultSection(),
                          academicYear: values.academicYear || getLatestAcademicYearFromApi(availableYears) || undefined,
                          academicStream: values.academicStream || undefined,
                          academicStreamCustom: values.academicStream === "OTHER" ? values.academicStreamCustom : undefined,
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
                            state: values.state === "OTHERS" ? values.stateOther : (values.state || "Tamil Nadu"),
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
                        const profileFileObj = values.profilePhoto?.[0];
                        if (profileFileObj?.originFileObj) {
                          const file = profileFileObj.originFileObj;
                          if (file.size > MAX_FILE_SIZE) {
                            message.error("Profile photo too large. Max 20MB");
                            return;
                          }
                          formDataToSend.append("profilePhoto", file);
                        } else if (profileFileObj?.url) {
                          const path = profileFileObj.url.replace(/^https?:\/\/[^/]+\//, "");
                          formDataToSend.append("profilePhotoPath", path);
                        }
                        // --- End block ---

                        // birth cert, community cert, aadhar - only append if checkbox is checked and file is present, also check file size <= 1MB

                        if (
                          selectedDocs.has("birthCert") &&
                          values.birthCertFile?.[0]?.originFileObj
                        ) {
                          const file = values.birthCertFile[0].originFileObj;

                          if (file.size > MAX_FILE_SIZE) {
                            message.error("Birth Certificate too large (Max 20MB)");
                            return;
                          }

                          formDataToSend.append("birthCert", file);
                        } else if (selectedDocs.has("birthCert")) {
                          const existingPath = getExistingFilePath(values.birthCertFile);
                          if (existingPath) formDataToSend.append("birthCertPath", existingPath);
                        }

                        if (
                          selectedDocs.has("communityCert") &&
                          values.communityCertFile?.[0]?.originFileObj
                        ) {
                          const file = values.communityCertFile[0].originFileObj;

                          if (file.size > MAX_FILE_SIZE) {
                            message.error("Community Certificate too large (Max 20MB)");
                            return;
                          }

                          formDataToSend.append("communityCert", file);
                        } else if (selectedDocs.has("communityCert")) {
                          const existingPath = getExistingFilePath(values.communityCertFile);
                          if (existingPath) formDataToSend.append("communityCertPath", existingPath);
                        }

                        if (
                          selectedDocs.has("aadharStudent") &&
                          values.aadharStudentFile?.[0]?.originFileObj
                        ) {
                          const file = values.aadharStudentFile[0].originFileObj;
                          if (file.size > MAX_FILE_SIZE) {
                            message.error("Aadhar file too large (Max 20MB)");
                            return;
                          }
                          formDataToSend.append("aadharStudent", file);
                        } else if (selectedDocs.has("aadharStudent")) {
                          const existingPath = getExistingFilePath(values.aadharStudentFile);
                          if (existingPath) formDataToSend.append("aadharStudentPath", existingPath);
                        }

                        if (
                          selectedDocs.has("transferCert") &&
                          values.transferCertFile?.[0]?.originFileObj
                        ) {
                          const file = values.transferCertFile[0].originFileObj;
                          if (file.size > MAX_FILE_SIZE) {
                            message.error("Transfer certificate file too large (Max 20MB)");
                            return;
                          }
                          formDataToSend.append("transferCert", file);
                        } else if (selectedDocs.has("transferCert")) {
                          const existingPath = getExistingFilePath(values.transferCertFile);
                          if (existingPath) formDataToSend.append("transferCertPath", existingPath);
                        }

                        if (
                          selectedDocs.has("entranceExam") &&
                          values.entranceExamFile?.[0]?.originFileObj
                        ) {
                          const file = values.entranceExamFile[0].originFileObj;
                          if (file.size > MAX_FILE_SIZE) {
                            message.error("Entrance exam file too large (Max 20MB)");
                            return;
                          }
                          formDataToSend.append("entranceExam", file);
                        } else if (selectedDocs.has("entranceExam")) {
                          const existingPath = getExistingFilePath(values.entranceExamFile);
                          if (existingPath) formDataToSend.append("entranceExamPath", existingPath);
                        }

                        if (editData) {
                          console.log("Updating admission with data:", { id: editData.id, formDataToSend });
                          await updateAdmission(editData.id, formDataToSend);
                          localStorage.removeItem("admission_draft");
                          message.success("Admission updated successfully!", 4);
                          if (clearEditData) clearEditData();
                          if (onAfterUpdate) onAfterUpdate();
                        } else {
                          await createAdmission(formDataToSend);
                          localStorage.removeItem("admission_draft");
                          message.success("Student successfully enrolled! Preparing a fresh admission form...", 4);
                          setTimeout(() => {
                            window.location.reload();
                          }, 800);
                          return;
                        }

                      } catch (err) {
                        console.error("Admission error:", err);
                        message.error(extractMissingFieldMessage(err), 5);
                      }
                    }}
                  >
                    {editData ? "Update student profile" : "Enroll the student"}
                    <span className="text-lg material-symbols-outlined">verified</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Insight Ticker */}
        <div className="flex justify-center mb-16">
          <div className="flex items-center gap-4 px-8 py-4 border shadow-sm bg-slate-50 rounded-3xl border-slate-100">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-500/10">
              <span className="text-sm text-teal-600 material-symbols-outlined animate-pulse">lightbulb</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex gap-2">
              <span className="text-teal-600">Architect Intel:</span>
              Academic year from API is locked for this admission form.
            </p>
          </div>
        </div>
      </div>

      {/* ── HIDDEN PDF TEMPLATE ── */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {/* PAGE 1 */}
        <div id="pdfPage1" style={styles.pdfWrapper}>
          <div style={styles.header}>
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: "900", textTransform: "uppercase" }}>Admission No</p>
              <p style={{ margin: 0, fontSize: "18px", color: "#0d9488", fontWeight: "900" }}>{formData.admissionNo || "PENDING"}</p>
              <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#64748b" }}>AY: {formData.academicYear}</p>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <img src={logo} alt="Logo" style={{ height: "60px", objectFit: "contain" }} />
                <div>
                  <h1 style={{ ...styles.institutionName, fontSize: "20px", color: "#0d9488" }}>{adminSettings.schoolName || "PSF Public School"}</h1>
                  <p style={{ margin: "2px 0 0", fontSize: "10px", fontWeight: "700", color: "#475569" }}>
                    Vadugappatti (Po), Sankari (Tk), Salem (Dt) - 637301
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.photoBox}>
              {getSafePreviewUrl(formData.profilePhoto?.[0]) ? (
                <img
                  src={getSafePreviewUrl(formData.profilePhoto?.[0])}
                  alt="Student Photo"
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#cbd5e1" }}>PASTE PHOTO</span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ ...styles.sectionTitle, color: "#0d9488", borderBottom: "1px solid #ccfbf1", paddingBottom: "6px", marginBottom: "8px" }}>1. Student & Parental Profiles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                {[
                  ["Student Name", formData.name],
                  ["Standard", formData.standard ? `STD ${formData.standard}` : "-"],
                  ["Section", formData.section || "A"],
                  ["Date of Birth", formData.dob?.format?.("DD MMM YYYY") || "-"],
                  ["Gender", formData.gender],
                  ["Academic Stream", getReadableStream(formData.academicStream, formData.academicStreamCustom, academicStreams)],
                  ["Father's Name", formData.fatherName],
                  ["Father's Phone", formData.fatherPhone],
                  ["Father's Aadhar", formData.fatherAadharNo],
                  ["Mother's Name", formData.motherName],
                  ["Mother's Phone", formData.motherPhone],
                  ["Mother's Aadhar", formData.motherAadharNo],
                  ["Transport Mode", formData.transportMode || "Self"],
                  ["RTE Applied", formData.rteApplied ? "YES" : "NO"],
                ].map(([l, v], i) => (
                  <div key={i} style={styles.fieldRow}>
                    <span style={styles.fieldLabel}>{l}</span>
                    <span style={styles.fieldValue}>{v || "-"}</span>
                  </div>
                ))}
              </div>
            </div>

          <h3 style={{ ...styles.sectionTitle, color: "#0d9488", borderBottom: "1px solid #ccfbf1", paddingBottom: "6px", marginBottom: "8px" }}>2. Residential & Contact Info</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "12px" }}>
            <div style={{ padding: "16px", border: "1px solid #f1f5f9", borderRadius: "12px", background: "#f8fafc" }}>
              <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: "900", color: "#64748b", textTransform: "uppercase" }}>Residential Domicile</p>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: "800", color: "#0f172a", lineHeight: "1.5" }}>
                {[formData.line1, formData.street, formData.city, formData.state, formData.pin].filter(Boolean).join(", ")}
              </p>
            </div>
            <div>
              <div style={styles.fieldRow}><span style={styles.fieldLabel}>Parent Email</span><span style={styles.fieldValue}>{formData.parentsEmail || "—"}</span></div>
              <div style={styles.fieldRow}><span style={styles.fieldLabel}>Identity 1</span><span style={styles.fieldValue}>{formData.identityMark1 || "—"}</span></div>
              <div style={styles.fieldRow}><span style={styles.fieldLabel}>Identity 2</span><span style={styles.fieldValue}>{formData.identityMark2 || "—"}</span></div>
              <div style={styles.fieldRow}><span style={styles.fieldLabel}>Blood Group</span><span style={styles.fieldValue}>{formData.bloodGroup || "—"}</span></div>
            </div>
          </div>

          {formData.standard !== "LKG" && formData.standard !== "UKG" && (
            <>
              <div style={{ marginTop: "4px" }}>
                <h3 style={{ ...styles.sectionTitle, color: "#0d9488", borderBottom: "1px solid #ccfbf1", paddingBottom: "6px", marginBottom: "8px" }}>3. Academic & Institutional Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginBottom: "12px" }}>
                  <div style={styles.fieldRow}><span style={styles.fieldLabel}>Prev. School</span><span style={styles.fieldValue}>{formData.previouslyStudied || "—"}</span></div>
                  <div style={styles.fieldRow}><span style={styles.fieldLabel}>Prev. Std</span><span style={styles.fieldValue}>{formData.previousSchoolStandard || "—"}</span></div>
                  <div style={styles.fieldRow}><span style={styles.fieldLabel}>Qualifying Exam</span><span style={styles.fieldValue}>{formData.examName}</span></div>
                  <div style={styles.fieldRow}><span style={styles.fieldLabel}>Board Name</span><span style={styles.fieldValue}>{formData.boardExamType === "Other" ? formData.boardName : formData.boardExamType}</span></div>
                </div>
              </div>
              <table style={{ ...styles.academicTable, marginBottom: "20px" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.academicTh, borderBottom: "2px solid #0d9488" }}>Subject</th>
                    <th style={{ ...styles.academicTh, borderBottom: "2px solid #0d9488", textAlign: "center" }}>Max Marks</th>
                    <th style={{ ...styles.academicTh, borderBottom: "2px solid #0d9488", textAlign: "center" }}>Obtained</th>
                    <th style={{ ...styles.academicTh, borderBottom: "2px solid #0d9488", textAlign: "center" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.subjects || []).map((exam, idx) => (
                    <tr key={idx}>
                      <td style={styles.academicTd}>{exam.subjectName}</td>
                      <td style={{ ...styles.academicTd, textAlign: "center" }}>{exam.maxMarks}</td>
                      <td style={{ ...styles.academicTd, textAlign: "center" }}>{exam.obtainedMarks}</td>
                      <td style={{ ...styles.academicTd, textAlign: "center", color: "#0d9488", fontWeight: "900" }}>
                        {exam.maxMarks > 0 ? ((exam.obtainedMarks / exam.maxMarks) * 100).toFixed(1) + '%' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={styles.footer}>
            <p style={styles.footerText}>Generated for {formData.name || 'Student'} • {dayjs().format("DD MMM YYYY")}</p>
            <p style={{ ...styles.footerText, fontWeight: "800", color: "#0d9488" }}>Page 1 of 2</p>
          </div>
        </div>

        {/* PAGE 2 */}
        <div id="pdfPage2" style={styles.pdfWrapper}>
          <h3 style={{ ...styles.sectionTitle, color: "#0d9488", borderBottom: "1px solid #ccfbf1", paddingBottom: "8px" }}>4. Demographic Matrix</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
            {[
              ["Religion", formData.religion],
              ["Community", formData.community],
              ["Caste", formData.caste],
              ["Mother Tongue", formData.motherTongue],
              ["Blood Group", formData.bloodGroup],
              ["Aadhar No", formData.aadharNo],
              ["Single Parent", formData.isSingleParent ? "YES" : "NO"],
              ["Guardian", formData.isSingleParent ? `${formData.guardianName} (${formData.guardianRelation})` : "N/A"],
              ["Income", `₹${formData.familyIncome || 0}`],
            ].map(([l, v], i) => (
              <div key={i} style={styles.fieldRow}>
                <span style={styles.fieldLabel}>{l}</span>
                <span style={styles.fieldValue}>{v || "-"}</span>
              </div>
            ))}
          </div>

          {siblingReviewItems.length > 0 && (
            <div style={{ marginBottom: "30px" }}>
              <h3 style={styles.sectionTitle}>Sibling Ledger</h3>
              <table style={{ ...styles.academicTable, marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={styles.academicTh}>Name</th>
                    <th style={styles.academicTh}>School</th>
                    <th style={styles.academicTh}>Standard</th>
                  </tr>
                </thead>
                <tbody>
                  {siblingReviewItems.slice(0, 2).map((s, idx) => (
                    <tr key={idx}>
                      <td style={styles.academicTd}>{s.siblingName}</td>
                      <td style={styles.academicTd}>{s.schoolName}</td>
                      <td style={styles.academicTd}>{s.standard}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: "auto" }}>
            <h3 style={styles.sectionTitle}>5. Institutional Declaration</h3>
            <div style={{ padding: "24px", border: "2px solid #0f172a", borderRadius: "20px", marginBottom: "40px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "#475569", lineHeight: "1.8", textAlign: "justify" }}>
                I hereby declare that all particulars furnished in this admission form are true and correct to the best of my knowledge. I undertake to abide by the rules, regulations, and disciplinary code of conduct established by the institution. I understand that providing false information may result in the immediate cancellation of this admission.
              </p>
            </div>

            <div style={{ ...styles.signatureSection, paddingTop: "20px" }}>
              <div style={{ ...styles.sigBlock, width: "200px", textAlign: "left" }}>
                <div style={{ height: "60px" }} />
                <p style={{ ...styles.sigLine, textAlign: "left" }}>Parent / Guardian Signature</p>
              </div>
              <div style={{ ...styles.sigBlock, width: "200px", textAlign: "right" }}>
                <div style={{ height: "60px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                  {normalizeAssetSrc(documentAssets.principalSignature) && (
                    <img
                      src={normalizeAssetSrc(documentAssets.principalSignature)}
                      alt="Principal"
                      crossOrigin="anonymous"
                      style={styles.sigImage}
                    />
                  )}
                </div>
                <p style={{ ...styles.sigLine, textAlign: "right" }}>Principal / Headmaster</p>
              </div>
            </div>
          </div>

          {normalizeAssetSrc(documentAssets.rubberStamp) && (
            <div style={{ textAlign: "center", marginTop: "30px" }}>
              <img
                src={normalizeAssetSrc(documentAssets.rubberStamp)}
                alt="Seal"
                crossOrigin="anonymous"
                style={{ width: '80px', height: '80px', objectFit: 'contain', opacity: 0.8 }}
              />
              <p style={{ margin: "8px 0 0", fontSize: "9px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Institutional Seal</p>
            </div>
          )}

          <div style={styles.footer}>
            <p style={styles.footerText}>System Generated Record • {dayjs().format("DD MMM YYYY, HH:mm")}</p>
            <p style={{ ...styles.footerText, fontWeight: "800", color: "#0f172a" }}>Page 2 of 2</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionStepper;
