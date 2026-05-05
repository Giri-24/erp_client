import React, { useMemo } from 'react';
import { Empty, Select, Table } from 'antd';

export default function TeacherView({
  teachers,
  days,
  timetableData,
  selectedTeacher,
  onSelectTeacher,
  selectedClass,
  selectedSection,
  subjects,
}) {
  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const rows = useMemo(() => {
    if (!selectedTeacher) return [];

    return timetableData.flatMap((periodRow) =>
      days
        .filter((day) => periodRow.slots?.[day.key]?.teacherId === selectedTeacher)
        .map((day) => ({
          key: `${day.key}-${periodRow.period}`,
          day: day.label,
          period: periodRow.period,
          className: selectedClass,
          section: selectedSection,
          subject: subjectMap.get(periodRow.slots?.[day.key]?.subjectId)?.name || '-',
        })),
    );
  }, [selectedTeacher, timetableData, days, selectedClass, selectedSection, subjectMap]);

  return (
    <div className="space-y-3">
      <Select
        allowClear
        placeholder="Select Teacher"
        value={selectedTeacher}
        onChange={onSelectTeacher}
        style={{ width: 320 }}
        options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
      />

      <Table
        rowKey="key"
        dataSource={rows}
        locale={{ emptyText: <Empty description={selectedTeacher ? 'No timetable rows for this teacher' : 'Select a teacher to view schedule'} /> }}
        columns={[
          { title: 'Day', dataIndex: 'day', key: 'day' },
          { title: 'Period', dataIndex: 'period', key: 'period' },
          { title: 'Class', dataIndex: 'className', key: 'className' },
          { title: 'Section', dataIndex: 'section', key: 'section' },
          { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        ]}
        pagination={{ pageSize: 8 }}
      />
    </div>
  );
}
