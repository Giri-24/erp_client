import React, { useState } from 'react';
import { Upload, Table, message, Space } from 'antd';
import { DownloadOutlined, CloudUploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { bulkUploadCsv } from '../admission.service';

const CSV_TEMPLATE_HEADERS = [
  'name',
  'standard',
  'section',
  'academicYear',
  'admissionDate',
  'admissionFrom',
  'admissionTo',
  'gender',
  'dob',
  'religion',
  'community',
  'communityOther',
  'caste',
  'motherTongue',
  'aadharNo',
  'bloodGroup',
  'identityMark1',
  'identityMark2',
  'previouslyStudied',
  'previousSchoolStandard',
  'transportMode',
  'vanNeeded',
  'rteApplied',
  'fatherName',
  'fatherPhone',
  'fatherWhatsAppNo',
  'fatherOccupation',
  'fatherAadharNo',
  'motherName',
  'motherPhone',
  'motherWhatsAppNo',
  'motherOccupation',
  'motherAadharNo',
  'familyIncome',
  'siblingsCount',
  'preferredPhone',
  'parentsEmail',
  'isSingleParent',
  'guardianRelation',
  'guardianName',
  'guardianPhone',
  'guardianWhatsapp',
  'guardianAadhar',
  'guardianOccupation',
  'sibling1Name',
  'sibling1School',
  'sibling1Standard',
  'sibling2Name',
  'sibling2School',
  'sibling2Standard',
  'doorNo',
  'street',
  'landmark',
  'city',
  'state',
  'pin',
  'examName',
  'boardExamType',
  'boardName',
  'registerNo',
  'monthYear',
  'academicStream',
  'totalMaxMarks',
  'totalObtainedMarks',
  'totalPercentage',
  'subjectsJson',
  'email',
];

const CSV_SAMPLE_ROW = {
  name: 'John Doe',
  standard: '10',
  section: 'A',
  academicYear: '2026-2027',
  admissionDate: '2026-05-01',
  admissionFrom: '',
  admissionTo: '',
  gender: 'MALE',
  dob: '2011-05-01',
  religion: 'Hindu',
  community: 'BC',
  communityOther: '',
  caste: 'Vellalar',
  motherTongue: 'Tamil',
  aadharNo: '123456789012',
  bloodGroup: 'B+',
  identityMark1: 'Mole on right cheek',
  identityMark2: 'Scar on left hand',
  previouslyStudied: 'Govt Hr Sec School',
  previousSchoolStandard: '10',
  transportMode: 'Van',
  vanNeeded: 'true',
  rteApplied: 'false',
  fatherName: 'Father Name',
  fatherPhone: '9876543210',
  fatherWhatsAppNo: '9876543210',
  fatherOccupation: 'Agriculture',
  fatherAadharNo: '123456789013',
  motherName: 'Mother Name',
  motherPhone: '9876543211',
  motherWhatsAppNo: '9876543211',
  motherOccupation: 'Home Maker',
  motherAadharNo: '123456789014',
  familyIncome: '150000',
  siblingsCount: '1',
  preferredPhone: 'father',
  parentsEmail: 'parents@example.com',
  isSingleParent: 'false',
  guardianRelation: '',
  guardianName: '',
  guardianPhone: '',
  guardianWhatsapp: '',
  guardianAadhar: '',
  guardianOccupation: '',
  sibling1Name: 'Sibling One',
  sibling1School: 'Same School',
  sibling1Standard: 'LKG',
  sibling2Name: '',
  sibling2School: '',
  sibling2Standard: '',
  doorNo: '12',
  street: 'Main Road',
  landmark: 'Near Bus Stand',
  city: 'Erode',
  state: 'Tamil Nadu',
  pin: '600001',
  examName: '10th Standard',
  boardExamType: 'State Board',
  boardName: 'State Board',
  registerNo: '2025001234',
  monthYear: 'March 2025',
  academicStream: 'BIO_CS',
  totalMaxMarks: '600',
  totalObtainedMarks: '513',
  totalPercentage: '85.5',
  subjectsJson: '[{"subjectName":"Tamil","maxMarks":150,"obtainedMarks":130},{"subjectName":"English","maxMarks":150,"obtainedMarks":120},{"subjectName":"Mathematics","maxMarks":100,"obtainedMarks":88}]',
  email: 'john@school.local',
};

const parseCsv = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
};

const BulkUploadPage = () => {
  const [parsedRows, setParsedRows] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const escapeCell = (value) => {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const sampleLine = CSV_TEMPLATE_HEADERS.map((header) => escapeCell(CSV_SAMPLE_ROW[header] || '')).join(',');
    const csv = `${CSV_TEMPLATE_HEADERS.join(',')}\n${sampleLine}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admission_bulk_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCsv(e.target.result);
        if (rows.length === 0) {
          message.error('No valid rows found in CSV');
          return;
        }
        if (rows.length > 500) {
          message.error('Maximum 500 rows allowed per upload');
          return;
        }
        setParsedRows(rows);
        setUploadResult(null);
        message.success(`Parsed ${rows.length} rows from CSV`);
      } catch {
        message.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleBulkUpload = async () => {
    if (parsedRows.length === 0) {
      message.error('No rows to upload');
      return;
    }
    try {
      setUploading(true);
      const result = await bulkUploadCsv(parsedRows);
      setUploadResult(result);
      message.success(`Upload complete: ${result.successCount} success, ${result.errorCount} errors`);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const previewColumns = parsedRows.length > 0
    ? Object.keys(parsedRows[0]).map(key => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        width: 130,
      }))
    : [];

  return (
    <div>
      {/* Editorial page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div className="page-breadcrumb">
            <span>Admissions</span>
            <span style={{ fontSize: 14 }}>›</span>
            <span style={{ color: '#00152a', fontWeight: 700 }}>Bulk Upload</span>
          </div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Bulk Admission Upload
          </h2>
          <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
            Upload a CSV file with all admission form fields except documents.
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 24, boxShadow: '0 4px 12px rgba(1, 29, 53, 0.03)' }}>
        <Space size="middle" wrap>
          <button
            onClick={downloadTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 9999, border: '1px solid #c3c6ce', background: 'transparent', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 13, color: '#00152a' }}
          >
            <DownloadOutlined /> Download Template
          </button>
          <Upload beforeUpload={handleFileUpload} accept=".csv" showUploadList={false}>
            <button className="gradient-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', background: 'linear-gradient(135deg, #00152a, #102a43)' }}>
              <FileExcelOutlined /> Select CSV File
            </button>
          </Upload>
          {parsedRows.length > 0 && (
            <button
              onClick={handleBulkUpload}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', background: '#005145', opacity: uploading ? 0.6 : 1 }}
            >
              <CloudUploadOutlined /> Upload {parsedRows.length} Records
            </button>
          )}
        </Space>
      </div>

      {/* Preview */}
      {parsedRows.length > 0 && !uploadResult && (
        <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
              <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Preview ({parsedRows.length} rows)</h4>
            </div>
            <Table
              size="small"
              dataSource={parsedRows.map((r, i) => ({ ...r, _key: i }))}
              rowKey="_key"
              columns={previewColumns}
              scroll={{ x: 'max-content' }}
              pagination={{ pageSize: 10 }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResult && (
        <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ width: 3, height: 28, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Upload Results</h4>
            </div>
            <Space size="middle" style={{ marginBottom: 16 }}>
              <span style={{ background: 'rgba(0, 21, 42, 0.08)', color: '#00152a', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>Total: {uploadResult.total}</span>
              <span style={{ background: 'rgba(68, 221, 193, 0.12)', color: '#005145', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>Success: {uploadResult.successCount}</span>
              <span style={{ background: 'rgba(186, 26, 26, 0.1)', color: '#ba1a1a', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>Errors: {uploadResult.errorCount}</span>
            </Space>
            <Table
              size="small"
              dataSource={uploadResult.results || []}
              rowKey="row"
              columns={[
                { title: 'Row', dataIndex: 'row', width: 70 },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  width: 100,
                  render: (v) => (
                    <span className={`status-badge ${v === 'success' ? 'approved' : 'inactive'}`} style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, background: v === 'success' ? 'rgba(68, 221, 193, 0.12)' : 'rgba(186, 26, 26, 0.1)', color: v === 'success' ? '#005145' : '#ba1a1a' }}>
                      {v}
                    </span>
                  ),
                },
                { title: 'Admission No', dataIndex: 'admissionNo', width: 200 },
                { title: 'Error', dataIndex: 'error', ellipsis: true },
              ]}
              pagination={{ pageSize: 20 }}
            />
          </div>
        </div>
      )}

      {/* Guide */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
          <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 700, color: '#00152a', marginBottom: 12 }}>CSV Format Guide</h4>
          <div style={{ color: '#43474d', fontSize: 13, fontFamily: "'Public Sans', sans-serif", lineHeight: 2 }}>
            <p>Required core columns: <strong>name, standard, gender</strong></p>
            <p>Admission, student, family, address, and academic form fields are supported. Documents are intentionally excluded.</p>
            <p>Standard values: LKG, UKG, 1 to 12, or STD_1 to STD_12.</p>
            <p>Gender values: MALE, FEMALE. Boolean values: true or false.</p>
            <p>Date format: YYYY-MM-DD for dob, admissionDate, admissionFrom, admissionTo.</p>
            <p>Use <strong>subjectsJson</strong> for subject-wise marks as a JSON array, for example: <strong>{'[{"subjectName":"Tamil","maxMarks":150,"obtainedMarks":130}]'}</strong></p>
            <p>Academic stream values: BIO_MATHS, CS_MATHS, BIO_CS, COMMERCE, HUMANITIES, OTHER.</p>
            <p>Maximum 500 rows per upload. Admission numbers are auto-generated.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadPage;
