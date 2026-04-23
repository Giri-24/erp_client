import axios from '../../utils/axios';

export const createExam = async (data) => {
  const res = await axios.post('/exam', data);
  return res.data;
};

export const getExams = async (academicYear) => {
  const res = await axios.get('/exam', { params: academicYear ? { academicYear } : undefined });
  return res.data;
};

export const createExamSubject = async (data) => {
  const res = await axios.post('/exam/subjects', data);
  return res.data;
};

export const getExamSubjects = async (examId) => {
  const res = await axios.get(`/exam/${examId}/subjects`);
  return res.data;
};

export const createExamHall = async (data) => {
  const res = await axios.post('/exam/halls', data);
  return res.data;
};

export const getExamHalls = async () => {
  const res = await axios.get('/exam/halls/all');
  return res.data;
};

export const createExamTimetable = async (data) => {
  const res = await axios.post('/exam/timetable', data);
  return res.data;
};

export const getExamTimetable = async (examId) => {
  const res = await axios.get(`/exam/${examId}/timetable`);
  return res.data;
};

export const generateExamRollNumbers = async (examId, data) => {
  const res = await axios.post(`/exam/${examId}/roll-numbers/generate`, data);
  return res.data;
};

export const getExamRollNumbers = async (examId) => {
  const res = await axios.get(`/exam/${examId}/roll-numbers`);
  return res.data;
};

export const autoAllocateExamSeats = async (scheduleId) => {
  const res = await axios.post(`/exam/timetable/${scheduleId}/seat-allocation/auto`);
  return res.data;
};

export const getExamSeatAllocations = async (scheduleId) => {
  const res = await axios.get(`/exam/timetable/${scheduleId}/seat-allocation`);
  return res.data;
};

export const getInvigilatorCandidates = async () => {
  const res = await axios.get('/exam/invigilators/candidates');
  return res.data;
};

export const getInvigilatorAssignments = async (scheduleId) => {
  const res = await axios.get(`/exam/timetable/${scheduleId}/invigilators`);
  return res.data;
};

export const assignInvigilator = async (scheduleId, data) => {
  const res = await axios.post(`/exam/timetable/${scheduleId}/invigilators`, data);
  return res.data;
};
