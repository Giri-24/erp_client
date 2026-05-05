import React, { useMemo } from 'react';
import { Table } from 'antd';
import TimetableCell from './TimetableCell';

export default function TimetableGrid({
  days,
  timetableData,
  subjects,
  teachers,
  editable,
  onCellClick,
}) {
  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );
  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );

  const columns = [
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
      width: 100,
      fixed: 'left',
      render: (period) => <span className="font-medium">{period}</span>,
    },
    ...days.map((day) => ({
      title: day.label,
      key: day.key,
      render: (_, row) => {
        const slot = row.slots?.[day.key];
        return (
          <TimetableCell
            editable={editable}
            slot={slot}
            subjectMap={subjectMap}
            teacherMap={teacherMap}
            onClick={() => onCellClick?.(row.period, day.key, slot)}
          />
        );
      },
    })),
  ];

  return (
    <Table
      rowKey="period"
      bordered
      pagination={false}
      dataSource={timetableData}
      columns={columns}
      scroll={{ x: 980 }}
    />
  );
}
