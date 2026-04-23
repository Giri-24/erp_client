import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, message, Select, Space, Table, Tag } from 'antd';
import {
  autoAllocateExamSeats,
  getExams,
  getExamTimetable,
  getExamSeatAllocations,
  getInvigilatorCandidates,
  getInvigilatorAssignments,
  assignInvigilator,
} from '../exam.service';

const csvEscape = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const downloadCsv = (filename, headers, dataRows) => {
  const content = [headers.join(','), ...dataRows.map((r) => r.map(csvEscape).join(','))].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function SeatAllocationPage() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState();
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const loadExams = async () => {
    try {
      const examRows = await getExams();
      setExams(examRows || []);
      if (!examId && examRows?.length) setExamId(examRows[0].id);
    } catch {
      message.error('Failed to load exams');
    }
  };

  const loadSchedules = async (id) => {
    if (!id) return;
    try {
      const tableRows = await getExamTimetable(id);
      setSchedules(tableRows || []);
      const first = tableRows?.[0]?.id;
      if (first) setScheduleId((prev) => prev || first);
    } catch {
      message.error('Failed to load timetable entries');
    }
  };

  const loadAllocations = async (id) => {
    if (!id) return setRows([]);
    setTableLoading(true);
    try {
      const allocRows = await getExamSeatAllocations(id);
      setRows(allocRows || []);
    } catch {
      message.error('Failed to load seat allocations');
    }
    setTableLoading(false);
  };

  const loadInvigilatorMeta = async (id) => {
    if (!id) {
      setAssignments([]);
      return;
    }
    try {
      const [staffRows, assignmentRows] = await Promise.all([
        getInvigilatorCandidates(),
        getInvigilatorAssignments(id),
      ]);
      setInvigilators(staffRows || []);
      setAssignments(assignmentRows || []);
    } catch {
      message.error('Failed to load invigilator data');
    }
  };

  useEffect(() => { loadExams(); }, []);
  useEffect(() => { loadSchedules(examId); }, [examId]);
  useEffect(() => { loadAllocations(scheduleId); }, [scheduleId]);
  useEffect(() => { loadInvigilatorMeta(scheduleId); }, [scheduleId]);

  const onAutoAllocate = async () => {
    if (!scheduleId) return message.warning('Select timetable slot first');
    setLoading(true);
    try {
      const res = await autoAllocateExamSeats(scheduleId);
      message.success(res?.message || 'Seat allocation completed');
      await loadAllocations(scheduleId);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Seat allocation failed');
    }
    setLoading(false);
  };

  const groupedSummary = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.hall?.name || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [rows]);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === scheduleId),
    [schedules, scheduleId],
  );

  const assignmentMap = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => map.set(a.hallId, a.staffId));
    return map;
  }, [assignments]);

  const hallInvigilatorRows = useMemo(() => {
    if (!selectedSchedule?.halls) return [];
    return selectedSchedule.halls.map((h) => {
      const assigned = assignments.find((a) => a.hallId === h.hallId);
      return {
        hallId: h.hallId,
        hallName: h.hall?.name || '-',
        staffId: assigned?.staffId,
        staffName: assigned?.staff?.name || '-',
        employeeId: assigned?.staff?.employeeId || '-',
      };
    });
  }, [selectedSchedule, assignments]);

  const onAssignInvigilator = async (hallId, staffId) => {
    if (!scheduleId || !hallId || !staffId) return;
    setSavingAssign(true);
    try {
      await assignInvigilator(scheduleId, { hallId, staffId });
      message.success('Invigilator assigned');
      await loadInvigilatorMeta(scheduleId);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Invigilator assignment failed');
    }
    setSavingAssign(false);
  };

  const groupedByHall = useMemo(() => {
    const grouped = rows.reduce((acc, row) => {
      const key = row.hall?.name || 'Unknown Hall';
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
    Object.values(grouped).forEach((seatRows) => seatRows.sort((a, b) => a.seatNumber - b.seatNumber));
    return grouped;
  }, [rows]);

  const scheduleMeta = useMemo(() => {
    if (!selectedSchedule) return null;
    const examDate = new Date(selectedSchedule.examDate).toLocaleDateString();
    const startsAt = new Date(selectedSchedule.startsAt).toLocaleTimeString();
    const endsAt = new Date(selectedSchedule.endsAt).toLocaleTimeString();
    const classLabel = `${selectedSchedule.standard}${selectedSchedule.section ? `-${selectedSchedule.section}` : ''}`;
    const subjectLabel = `${selectedSchedule.subject?.code || '-'} - ${selectedSchedule.subject?.name || '-'}`;
    return { examDate, startsAt, endsAt, classLabel, subjectLabel };
  }, [selectedSchedule]);

  const assignmentByHallName = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const hallName = a.hall?.name;
      if (hallName) map.set(hallName, a.staff?.name || '-');
    });
    return map;
  }, [assignments]);

  const printSeatChart = () => {
    if (!selectedSchedule || !rows.length) {
      message.warning('No seat allocations available to print');
      return;
    }

    const blocks = Object.entries(groupedByHall)
      .map(([hallName, seatRows]) => {
        const tableRows = seatRows
          .map(
            (r) => `<tr><td>${r.seatNumber}</td><td>${r.rollNumber?.rollNumber || '-'}</td><td>${r.student?.name || '-'}</td><td>${r.student?.standard || '-'}${r.student?.section ? '-' + r.student.section : ''}</td></tr>`,
          )
          .join('');
        return `
          <section style="margin-bottom:24px; break-inside:avoid;">
            <h3 style="margin:0 0 6px 0;">${hallName}</h3>
            <div style="margin:0 0 10px 0; font-size:12px;"><strong>Invigilator:</strong> ${assignmentByHallName.get(hallName) || '-'}</div>
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="border:1px solid #aaa; padding:6px; text-align:left;">Seat</th>
                  <th style="border:1px solid #aaa; padding:6px; text-align:left;">Roll No</th>
                  <th style="border:1px solid #aaa; padding:6px; text-align:left;">Student</th>
                  <th style="border:1px solid #aaa; padding:6px; text-align:left;">Class</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </section>
        `;
      })
      .join('');

    const html = `
      <html>
      <head><title>Seat Chart</title></head>
      <body style="font-family:Arial, sans-serif; padding:16px;">
        <h2 style="margin:0 0 6px 0;">Exam Seat Chart</h2>
        <div style="margin:0 0 12px 0; font-size:13px;">
          <strong>Date:</strong> ${scheduleMeta?.examDate || '-'} |
          <strong> Subject:</strong> ${scheduleMeta?.subjectLabel || '-'} |
          <strong> Class:</strong> ${scheduleMeta?.classLabel || '-'}
        </div>
        ${blocks}
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return message.error('Popup blocked. Please allow popups to print.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const printAttendanceSheets = () => {
    if (!selectedSchedule || !rows.length) {
      message.warning('No seat allocations available to print');
      return;
    }

    const blocks = Object.entries(groupedByHall)
      .map(([hallName, seatRows]) => {
        const tableRows = seatRows
          .map(
            (r, idx) => `<tr>
              <td>${idx + 1}</td>
              <td>${r.seatNumber}</td>
              <td>${r.rollNumber?.rollNumber || '-'}</td>
              <td>${r.student?.name || '-'}</td>
              <td>${r.student?.standard || '-'}${r.student?.section ? '-' + r.student.section : ''}</td>
              <td style="width:130px;"></td>
              <td style="width:55px;"></td>
              <td style="width:55px;"></td>
            </tr>`,
          )
          .join('');

        return `
          <section style="margin-bottom:28px; page-break-after:always;">
            <h2 style="margin:0 0 6px 0; font-size:18px;">Hall-wise Attendance Sheet</h2>
            <div style="font-size:12px; margin-bottom:10px;">
              <div><strong>Date:</strong> ${scheduleMeta?.examDate || '-'} | <strong>Time:</strong> ${scheduleMeta?.startsAt || '-'} - ${scheduleMeta?.endsAt || '-'}</div>
              <div><strong>Subject:</strong> ${scheduleMeta?.subjectLabel || '-'} | <strong>Class:</strong> ${scheduleMeta?.classLabel || '-'}</div>
              <div><strong>Hall:</strong> ${hallName} | <strong>Invigilator:</strong> ${assignmentByHallName.get(hallName) || '-'}</div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr>
                  <th style="border:1px solid #999; padding:6px;">S.No</th>
                  <th style="border:1px solid #999; padding:6px;">Seat No</th>
                  <th style="border:1px solid #999; padding:6px;">Roll No</th>
                  <th style="border:1px solid #999; padding:6px;">Student Name</th>
                  <th style="border:1px solid #999; padding:6px;">Class</th>
                  <th style="border:1px solid #999; padding:6px;">Candidate Signature</th>
                  <th style="border:1px solid #999; padding:6px;">P</th>
                  <th style="border:1px solid #999; padding:6px;">A</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div style="margin-top:30px; display:flex; justify-content:space-between; font-size:12px;">
              <div>
                <div style="margin-top:30px; border-top:1px solid #222; width:200px;">Invigilator Signature</div>
              </div>
              <div>
                <div style="margin-top:30px; border-top:1px solid #222; width:200px;">Chief Superintendent Signature</div>
              </div>
            </div>
          </section>
        `;
      })
      .join('');

    const html = `
      <html>
      <head><title>Attendance Sheets</title></head>
      <body style="font-family:Arial, sans-serif; padding:14px;">${blocks}</body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return message.error('Popup blocked. Please allow popups to print.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const exportSeatAllocationCsv = () => {
    if (!rows.length) return message.warning('No seat allocations to export');
    const dataRows = [...rows]
      .sort((a, b) => {
        const hallA = a.hall?.name || '';
        const hallB = b.hall?.name || '';
        if (hallA !== hallB) return hallA.localeCompare(hallB);
        return a.seatNumber - b.seatNumber;
      })
      .map((r) => [
        r.hall?.name || '-',
        r.seatNumber,
        r.rollNumber?.rollNumber || '-',
        r.student?.name || '-',
        `${r.student?.standard || '-'}${r.student?.section ? '-' + r.student.section : ''}`,
      ]);

    const fileTag = scheduleMeta?.examDate?.replace(/\//g, '-') || 'schedule';
    downloadCsv(
      `seat_allocation_${fileTag}.csv`,
      ['Hall', 'Seat No', 'Roll No', 'Student Name', 'Class'],
      dataRows,
    );
  };

  const exportInvigilatorCsv = () => {
    if (!hallInvigilatorRows.length) return message.warning('No invigilator plan to export');
    const dataRows = hallInvigilatorRows.map((r) => [
      scheduleMeta?.examDate || '-',
      `${scheduleMeta?.startsAt || '-'} - ${scheduleMeta?.endsAt || '-'}`,
      scheduleMeta?.subjectLabel || '-',
      scheduleMeta?.classLabel || '-',
      r.hallName,
      r.employeeId || '-',
      r.staffName || '-',
    ]);

    const fileTag = scheduleMeta?.examDate?.replace(/\//g, '-') || 'schedule';
    downloadCsv(
      `invigilator_plan_${fileTag}.csv`,
      ['Exam Date', 'Time', 'Subject', 'Class', 'Hall', 'Employee ID', 'Invigilator'],
      dataRows,
    );
  };

  const exportPlanPdf = () => {
    if (!selectedSchedule) return message.warning('Select timetable slot first');
    const invigilatorRows = hallInvigilatorRows
      .map(
        (r) => `<tr><td>${r.hallName}</td><td>${r.employeeId || '-'}</td><td>${r.staffName || '-'}</td></tr>`,
      )
      .join('');

    const seatRows = [...rows]
      .sort((a, b) => {
        const hallA = a.hall?.name || '';
        const hallB = b.hall?.name || '';
        if (hallA !== hallB) return hallA.localeCompare(hallB);
        return a.seatNumber - b.seatNumber;
      })
      .map(
        (r) => `<tr><td>${r.hall?.name || '-'}</td><td>${r.seatNumber}</td><td>${r.rollNumber?.rollNumber || '-'}</td><td>${r.student?.name || '-'}</td><td>${r.student?.standard || '-'}${r.student?.section ? '-' + r.student.section : ''}</td></tr>`,
      )
      .join('');

    const html = `
      <html>
      <head><title>Exam Plan PDF</title></head>
      <body style="font-family:Arial,sans-serif; padding:16px;">
        <h2 style="margin-bottom:8px;">Exam Invigilator & Seat Allocation Plan</h2>
        <div style="font-size:13px; margin-bottom:14px;">
          <strong>Date:</strong> ${scheduleMeta?.examDate || '-'} |
          <strong> Time:</strong> ${scheduleMeta?.startsAt || '-'} - ${scheduleMeta?.endsAt || '-'} |
          <strong> Subject:</strong> ${scheduleMeta?.subjectLabel || '-'} |
          <strong> Class:</strong> ${scheduleMeta?.classLabel || '-'}
        </div>
        <h3 style="margin:12px 0 6px 0;">Invigilator Plan</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
          <thead><tr><th style="border:1px solid #999; padding:6px;">Hall</th><th style="border:1px solid #999; padding:6px;">Employee ID</th><th style="border:1px solid #999; padding:6px;">Invigilator</th></tr></thead>
          <tbody>${invigilatorRows || '<tr><td colspan="3" style="border:1px solid #999; padding:6px;">No assignments</td></tr>'}</tbody>
        </table>

        <h3 style="margin:12px 0 6px 0;">Seat Allocation</h3>
        <table style="width:100%; border-collapse:collapse;">
          <thead><tr><th style="border:1px solid #999; padding:6px;">Hall</th><th style="border:1px solid #999; padding:6px;">Seat</th><th style="border:1px solid #999; padding:6px;">Roll No</th><th style="border:1px solid #999; padding:6px;">Student</th><th style="border:1px solid #999; padding:6px;">Class</th></tr></thead>
          <tbody>${seatRows || '<tr><td colspan="5" style="border:1px solid #999; padding:6px;">No seat allocations</td></tr>'}</tbody>
        </table>
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return message.error('Popup blocked. Please allow popups to print.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-4">
      <Card title="Auto Seat Allocation" extra={<Space>
        <Select
          style={{ width: 300 }}
          value={examId}
          onChange={(v) => { setExamId(v); setScheduleId(undefined); }}
          options={exams.map((e) => ({ label: `${e.name} (${e.code})`, value: e.id }))}
          placeholder="Select Exam"
        />
        <Select
          style={{ width: 420 }}
          value={scheduleId}
          onChange={setScheduleId}
          options={schedules.map((s) => ({
            label: `${new Date(s.examDate).toLocaleDateString()} | ${s.subject?.code || '-'} | ${s.standard}${s.section ? `-${s.section}` : ''}`,
            value: s.id,
          }))}
          placeholder="Select Timetable Slot"
        />
      </Space>}>
        <Space>
          <Button type="primary" loading={loading} onClick={onAutoAllocate}>Run Auto Allocation</Button>
          <Button onClick={() => loadAllocations(scheduleId)}>Refresh</Button>
          <Button onClick={printSeatChart}>Print Seat Chart</Button>
          <Button onClick={printAttendanceSheets}>Print Attendance Sheets</Button>
          <Button onClick={exportSeatAllocationCsv}>Export Seat CSV</Button>
          <Button onClick={exportInvigilatorCsv}>Export Invigilator CSV</Button>
          <Button onClick={exportPlanPdf}>Export PDF Plan</Button>
        </Space>
        <div className="mt-3 flex flex-wrap gap-2">
          {groupedSummary.map(([hall, count]) => (
            <Tag key={hall} color="blue">{hall}: {count}</Tag>
          ))}
        </div>
      </Card>

      <Card title="Hall-wise Invigilator Assignment">
        <Table
          rowKey="hallId"
          loading={savingAssign}
          dataSource={hallInvigilatorRows}
          pagination={false}
          columns={[
            { title: 'Hall', dataIndex: 'hallName' },
            {
              title: 'Invigilator',
              key: 'invigilator',
              render: (_, r) => (
                <Select
                  style={{ width: 360 }}
                  placeholder="Assign invigilator"
                  value={assignmentMap.get(r.hallId)}
                  onChange={(staffId) => onAssignInvigilator(r.hallId, staffId)}
                  options={invigilators.map((s) => ({
                    label: `${s.employeeId || '-'} - ${s.name} (${s.department || 'General'})`,
                    value: s.id,
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
              ),
            },
            { title: 'Assigned Name', dataIndex: 'staffName' },
          ]}
        />
      </Card>

      <Card title="Allocated Seats">
        <Table
          rowKey="id"
          loading={tableLoading}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Hall', key: 'hall', render: (_, r) => r.hall?.name || '-' },
            { title: 'Seat No', dataIndex: 'seatNumber' },
            { title: 'Roll No', key: 'roll', render: (_, r) => r.rollNumber?.rollNumber || '-' },
            { title: 'Student', key: 'student', render: (_, r) => r.student?.name || '-' },
            { title: 'Class', key: 'class', render: (_, r) => `${r.student?.standard || '-'}${r.student?.section ? `-${r.student.section}` : ''}` },
          ]}
        />
      </Card>
    </div>
  );
}
