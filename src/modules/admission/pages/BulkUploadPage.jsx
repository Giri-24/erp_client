import React, { useState } from 'react';
import { Upload, Table, message, Space } from 'antd';
import { DownloadOutlined, CloudUploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { bulkUploadCsv } from '../admission.service';

const CSV_TEMPLATE_HEADERS = [
  'Student Name',
  'Standard',
  'Section',
  'Academic Year',
  'Admission Date',
  'Admission No',
  'Admission From',
  'Admission To',
  'Gender',
  'Date of Birth',
  'Religion',
  'Community',
  'Custom Community',
  'Caste',
  'Mother Tongue',
  'Aadhar No',
  'Blood Group',
  'Identity Mark 1',
  'Identity Mark 2',
  'Previously Studied',
  'Previous School Standard',
  'Transport Mode',
  'RTE Applied Student',
  'Father Name',
  'Father Mobile',
  'Father WhatsApp',
  'Father Occupation',
  'Father Aadhar',
  'Mother Name',
  'Mother Mobile',
  'Mother WhatsApp',
  'Mother Occupation',
  'Mother Aadhar',
  'Family Income',
  'Number of Siblings',
  'Preferred Contact',
  'Parents Email ID',
  'Single Parent',
  'Guardian Relation',
  'Guardian Name',
  'Guardian Phone',
  'Guardian WhatsApp',
  'Guardian Aadhar',
  'Guardian Occupation',
  'Sibling 1 Name',
  'Sibling 1 School',
  'Sibling 1 Standard',
  'Sibling 2 Name',
  'Sibling 2 School',
  'Sibling 2 Standard',
  'Door No / House No',
  'Street / Village',
  'Taluk',
  'District',
  'State',
  'Pincode',
  'Examination Name',
  'Board Name',
  'Register No',
  'Date of Appearance',
  'Academic Stream',
  'Total Max Marks',
  'Total Obtained Marks',
  'Overall Percentage',
  'Subjects JSON',
  'Academic Stream Custom',
];

const CSV_SAMPLE_ROW = {
  'Student Name': 'John Doe',
  'Standard': '6',
  'Section': 'A',
  'Academic Year': '2026-2027',
  'Admission Date': '2026-05-01',
  'Admission No': 'AUTO',
  'Admission From': '2026-05-01',
  'Admission To': '2029-05-01',
  'Gender': 'MALE',
  'Date of Birth': '2015-05-01',
  'Religion': 'Hindu',
  'Community': 'BC',
  'Custom Community': '',
  'Caste': 'Vellalar',
  'Mother Tongue': 'Tamil',
  'Aadhar No': '\t123456789012',
  'Blood Group': 'B+',
  'Identity Mark 1': 'Mole on right cheek',
  'Identity Mark 2': 'Scar on left hand',
  'Previously Studied': 'Govt Hr Sec School',
  'Previous School Standard': '5',
  'Transport Mode': 'Local',
  'RTE Applied Student': 'false',
  'Father Name': 'Father Name',
  'Father Mobile': '\t9876543210',
  'Father WhatsApp': '\t9876543210',
  'Father Occupation': 'Agriculture',
  'Father Aadhar': '\t123456789013',
  'Mother Name': 'Mother Name',
  'Mother Mobile': '\t9876543211',
  'Mother WhatsApp': '\t9876543211',
  'Mother Occupation': 'Home Maker',
  'Mother Aadhar': '\t123456789014',
  'Family Income': '150000',
  'Number of Siblings': '1',
  'Preferred Contact': 'father',
  'Parents Email ID': 'parents@example.com',
  'Single Parent': 'false',
  'Guardian Relation': '',
  'Guardian Name': '',
  'Guardian Phone': '',
  'Guardian WhatsApp': '',
  'Guardian Aadhar': '',
  'Guardian Occupation': '',
  'Sibling 1 Name': 'Sibling One',
  'Sibling 1 School': 'Same School',
  'Sibling 1 Standard': 'LKG',
  'Sibling 2 Name': '',
  'Sibling 2 School': '',
  'Sibling 2 Standard': '',
  'Door No / House No': '12',
  'Street / Village': 'Main Road',
  'Taluk': 'Near Temple',
  'District': 'Erode',
  'State': 'Tamil Nadu',
  'Pincode': '\t600001',
  'Examination Name': '10th Standard',
  'Board Name': 'State Board',
  'Register No': '\t2025001234',
  'Date of Appearance': 'March 2025',
  'Academic Stream': 'BIO_CS',
  'Total Max Marks': '600',
  'Total Obtained Marks': '513',
  'Overall Percentage': '85.5',
  'Subjects JSON': '[{"subjectName":"Tamil","maxMarks":150,"obtainedMarks":130}]',
  'Academic Stream Custom': '',
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
            <p>Required core columns: <strong>name, standard, gender, academicYear</strong></p>
            <p>All student, family, address, and academic fields from the admission form are supported.</p>
            <p>Standard values: LKG, UKG, 1 to 12. Gender values: MALE, FEMALE, OTHERS.</p>
            <p>Date format: YYYY-MM-DD for dob, admissionDate, admissionFrom, and admissionTo.</p>
            <p>Use <strong>admissionNo</strong> to specify existing admission numbers for old students, or use <strong>AUTO</strong> for new students.</p>
            <p>Use <strong>subjectsJson</strong> for subject-wise marks as a JSON array, for example: <strong>{'[{"subjectName":"Tamil","maxMarks":150,"obtainedMarks":130}]'}</strong></p>
            <p>Academic stream values: BIO_MATHS, CS_MATHS, BIO_CS, COMMERCE, HUMANITIES, OTHER.</p>
            <p>Transport mode values: <strong>Local</strong>, <strong>School Van</strong>.</p>
            <p>Maximum 500 rows per upload. Documents are excluded from bulk upload.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadPage;
