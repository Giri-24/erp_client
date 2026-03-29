import React, { useState } from 'react';
import { Button, Upload, Table, message, Alert, Space, Tag } from 'antd';
import { DownloadOutlined, CloudUploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { bulkUploadCsv } from '../admission.service';

const CSV_TEMPLATE_HEADERS = [
  'name', 'standard', 'gender', 'dob', 'religion', 'community', 'caste',
  'motherTongue', 'aadharNo', 'bloodGroup', 'previousSchool', 'transportMode',
  'rte', 'fatherName', 'fatherPhone', 'motherName', 'motherPhone',
  'address', 'pin', 'email',
];

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
    const csv = CSV_TEMPLATE_HEADERS.join(',') + '\n' +
      'John Doe,STD_5,MALE,2015-06-15,Hindu,BC,Vellalar,Tamil,123456789012,B+,Previous School,Local,false,Father Name,9876543210,Mother Name,9876543211,123 Main St,600001,john@school.local\n';
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
            Upload a CSV file with student data to create multiple admissions at once.
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
            <p>Required columns: <strong>name, standard, gender</strong></p>
            <p>Standard values: LKG, UKG, STD_1 to STD_12 (or just 1 to 12)</p>
            <p>Gender values: MALE, FEMALE</p>
            <p>Date format: YYYY-MM-DD (e.g., 2015-06-15)</p>
            <p>Maximum 500 rows per upload. Admission numbers are auto-generated.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadPage;
