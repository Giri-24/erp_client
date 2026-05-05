import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  message,
  Select,
  Space,
  Switch,
  Tabs,
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import TimetableGrid from '../components/TimetableGrid';
import EditTimetableModal from '../components/EditTimetableModal';
import TeacherView from '../components/TeacherView';

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const CLASS_OPTIONS = [
  'LKG', 'UKG', 'STD_1', 'STD_2', 'STD_3', 'STD_4', 'STD_5',
  'STD_6', 'STD_7', 'STD_8', 'STD_9', 'STD_10', 'STD_11', 'STD_12',
].map((value) => ({ label: value, value }));

const SECTION_OPTIONS = ['A', 'B', 'C', 'D'].map((value) => ({ label: value, value }));

const EXAM_TYPE_OPTIONS = [
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
];

const SUBJECT_MASTER = [
  { id: 'SUB1', name: 'Mathematics' },
  { id: 'SUB2', name: 'Science' },
  { id: 'SUB3', name: 'English' },
  { id: 'SUB4', name: 'Social Science' },
  { id: 'SUB5', name: 'Computer Science' },
  { id: 'SUB6', name: 'Tamil' },
  { id: 'SUB7', name: 'Hindi' },
];

const TEACHER_MASTER = [
  { id: 'T1', name: 'Ms. Priya', subjectIds: ['SUB1', 'SUB5'] },
  { id: 'T2', name: 'Mr. Karthik', subjectIds: ['SUB2'] },
  { id: 'T3', name: 'Ms. Lavanya', subjectIds: ['SUB3'] },
  { id: 'T4', name: 'Mr. Arun', subjectIds: ['SUB4'] },
  { id: 'T5', name: 'Ms. Nithya', subjectIds: ['SUB6', 'SUB7'] },
  { id: 'T6', name: 'Mr. Vijay', subjectIds: ['SUB1', 'SUB2'] },
];

const DAY_COUNT_BY_EXAM_TYPE = {
  25: 3,
  50: 5,
  100: 7,
};

const formatDayLabel = (date) => `${date.format('ddd')} ${date.format('DD MMM')}`;

const createDaysFromStart = (startDate, examType) => {
  if (!startDate) return [];
  const dayCount = DAY_COUNT_BY_EXAM_TYPE[examType] || 5;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = dayjs(startDate).add(index, 'day');
    const key = date.format('YYYY-MM-DD');
    return {
      key,
      label: formatDayLabel(date),
      date,
    };
  });
};

const createInitialRows = (days, subjects, teachers) =>
  PERIODS.map((period) => {
    const slots = {};

    days.forEach((day, dayIndex) => {
      const subject = subjects[(period + dayIndex - 1) % subjects.length] || subjects[0];
      const candidateTeachers = teachers.filter((teacher) => teacher.subjectIds.includes(subject.id));
      const teacher = candidateTeachers[(period + dayIndex - 1) % candidateTeachers.length] || teachers[0];

      slots[day.key] = {
        subjectId: subject?.id,
        teacherId: teacher?.id,
        type: period <= 2 ? 'REVISION' : 'EXAM',
      };
    });

    return { period, slots };
  });

const createTeacherBusyMap = (days) => {
  const busyMap = {};
  days.forEach((day, dayIndex) => {
    PERIODS.forEach((period) => {
      const key = `${day.key}-${period}`;
      if ((dayIndex + period) % 4 === 0) busyMap[key] = ['T2'];
      if ((dayIndex + period) % 5 === 0) busyMap[key] = [...(busyMap[key] || []), 'T4'];
    });
  });
  return busyMap;
};

export default function ExamTimetablePage() {
  const [timetableData, setTimetableData] = useState([]);
  const [subjects] = useState(SUBJECT_MASTER);
  const [teachers] = useState(TEACHER_MASTER);
  const [selectedClass, setSelectedClass] = useState('STD_10');
  const [selectedSection, setSelectedSection] = useState('A');
  const [examType, setExamType] = useState(50);
  const [startDate, setStartDate] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState();
  const [days, setDays] = useState([]);
  const [teacherBusyMap, setTeacherBusyMap] = useState({});
  const [modalState, setModalState] = useState({
    open: false,
    period: null,
    dayKey: null,
    slot: null,
  });

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );

  const onGenerate = async () => {
    if (!selectedClass || !selectedSection || !examType || !startDate) {
      message.warning('Please select class, section, exam type and start date');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const generatedDays = createDaysFromStart(startDate, examType);
      const generatedRows = createInitialRows(generatedDays, subjects, teachers);
      setDays(generatedDays);
      setTimetableData(generatedRows);
      setTeacherBusyMap(createTeacherBusyMap(generatedDays));
      setLoading(false);
      message.success('Timetable generated');
    }, 700);
  };

  const onEditCell = (period, dayKey, slot) => {
    if (!editMode) return;
    setModalState({ open: true, period, dayKey, slot });
  };

  const onSaveCell = (values) => {
    const { period, dayKey } = modalState;
    if (!period || !dayKey) return;

    const selectedTeacherRow = teacherMap.get(values.teacherId);
    const isMappingValid = selectedTeacherRow?.subjectIds?.includes(values.subjectId);
    if (!isMappingValid) {
      message.warning('Invalid subject-teacher mapping');
    }

    const busyKey = `${dayKey}-${period}`;
    if ((teacherBusyMap[busyKey] || []).includes(values.teacherId)) {
      message.warning('Teacher already assigned in another class at this time');
    }

    setTimetableData((prevRows) =>
      prevRows.map((row) => {
        if (row.period !== period) return row;
        return {
          ...row,
          slots: {
            ...row.slots,
            [dayKey]: {
              subjectId: values.subjectId,
              teacherId: values.teacherId,
              type: values.type,
            },
          },
        };
      }),
    );

    setModalState({ open: false, period: null, dayKey: null, slot: null });
  };

  const onReset = () => {
    setTimetableData([]);
    setDays([]);
    setSelectedTeacher(undefined);
    setModalState({ open: false, period: null, dayKey: null, slot: null });
    message.success('Timetable reset');
  };

  const onSaveChanges = () => {
    message.success('Changes saved');
  };

  const exportExcel = () => {
    if (!days.length || !timetableData.length) {
      message.warning('Generate timetable first');
      return;
    }

    const header = ['Period', ...days.map((day) => day.label)];
    const rows = timetableData.map((row) => [
      row.period,
      ...days.map((day) => {
        const slot = row.slots?.[day.key];
        if (!slot) return '-';
        const subject = subjectMap.get(slot.subjectId)?.name || '-';
        const teacher = teacherMap.get(slot.teacherId)?.name || '-';
        const type = slot.type === 'EXAM' ? 'Exam' : 'Revision';
        return `${subject} / ${teacher} / ${type}`;
      }),
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'exam-timetable.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPdf = () => {
    message.info('Use browser print dialog to save as PDF');
    window.print();
  };

  const printTimetable = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <Card title="Exam Timetable">
        <div className="flex flex-wrap items-end justify-end gap-3">
          <div className="min-w-[220px]">
            <div className="mb-1 text-xs text-on-surface-variant">Class</div>
            <Select className="w-full" value={selectedClass} onChange={setSelectedClass} options={CLASS_OPTIONS} />
          </div>
          <div className="min-w-[220px]">
            <div className="mb-1 text-xs text-on-surface-variant">Section</div>
            <Select className="w-full" value={selectedSection} onChange={setSelectedSection} options={SECTION_OPTIONS} />
          </div>
          <div className="min-w-[220px]">
            <div className="mb-1 text-xs text-on-surface-variant">Exam Type</div>
            <Select className="w-full" value={examType} onChange={setExamType} options={EXAM_TYPE_OPTIONS} />
          </div>
          <div className="min-w-[220px]">
            <div className="mb-1 text-xs text-on-surface-variant">Start Date</div>
            <DatePicker value={startDate} onChange={setStartDate} className="w-full" />
          </div>
          <Button type="primary" loading={loading} onClick={onGenerate}>
            Generate
          </Button>
        </div>
      </Card>

      <Card>
        <Tabs
          defaultActiveKey="timetable"
          items={[
            {
              key: 'timetable',
              label: 'Timetable',
              children: (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Space wrap>
                      <span className="text-sm text-on-surface-variant">Edit Mode</span>
                      <Switch checked={editMode} onChange={setEditMode} />
                    </Space>
                    <Space wrap>
                      <Button icon={<EditOutlined />} onClick={onSaveChanges}>Save Changes</Button>
                      <Button icon={<ReloadOutlined />} onClick={onReset}>Reset</Button>
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'pdf', label: 'Export PDF', onClick: exportPdf },
                            { key: 'excel', label: 'Export Excel', onClick: exportExcel },
                          ],
                        }}
                      >
                        <Button icon={<DownloadOutlined />}>Export</Button>
                      </Dropdown>
                      <Button icon={<PrinterOutlined />} onClick={printTimetable}>Print</Button>
                    </Space>
                  </div>

                  <TimetableGrid
                    days={days}
                    timetableData={timetableData}
                    subjects={subjects}
                    teachers={teachers}
                    editable={editMode}
                    onCellClick={onEditCell}
                  />
                </div>
              ),
            },
            {
              key: 'teacher-view',
              label: 'Teacher View',
              children: (
                <TeacherView
                  teachers={teachers}
                  days={days}
                  timetableData={timetableData}
                  selectedTeacher={selectedTeacher}
                  onSelectTeacher={setSelectedTeacher}
                  selectedClass={selectedClass}
                  selectedSection={selectedSection}
                  subjects={subjects}
                />
              ),
            },
          ]}
        />
      </Card>

      <EditTimetableModal
        open={modalState.open}
        onCancel={() => setModalState({ open: false, period: null, dayKey: null, slot: null })}
        onSave={onSaveCell}
        subjects={subjects}
        teachers={teachers}
        value={modalState.slot}
      />
    </div>
  );
}
