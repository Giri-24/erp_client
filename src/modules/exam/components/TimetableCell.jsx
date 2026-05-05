import React from 'react';
import { Tag } from 'antd';

export default function TimetableCell({ slot, subjectMap, teacherMap, onClick, editable }) {
  const subjectName = slot?.subjectId ? subjectMap.get(slot.subjectId)?.name : null;
  const teacherName = slot?.teacherId ? teacherMap.get(slot.teacherId)?.name : null;
  const type = slot?.type || 'REVISION';

  return (
    <button
      type="button"
      className={`w-full min-h-[88px] rounded-lg border border-outline-variant/40 p-2 text-left transition-colors ${
        editable
          ? 'hover:bg-surface-container-high cursor-pointer'
          : 'cursor-default'
      }`}
      onClick={onClick}
      disabled={!editable}
    >
      <div className="text-sm font-medium text-on-surface line-clamp-2">{subjectName || '-'}</div>
      <div className="mt-1 text-xs text-on-surface-variant line-clamp-2">{teacherName || '-'}</div>
      <div className="mt-2">
        <Tag
          className={
            type === 'EXAM'
              ? 'bg-error/10 text-error border-error/20'
              : 'bg-primary/10 text-primary border-primary/20'
          }
        >
          {type === 'EXAM' ? 'Exam' : 'Revision'}
        </Tag>
      </div>
    </button>
  );
}
