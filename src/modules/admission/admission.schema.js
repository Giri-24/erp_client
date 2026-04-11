import * as yup from 'yup';

export const admissionSchema = yup.object({
  name: yup.string().required('Name is required'),
  standard: yup.string().required('Standard is required'),
  gender: yup.string().required('Gender is required'),
  dob: yup.string().required('DOB is required'),
  community: yup.string().required('Community is required'),

  fatherName: yup.string().nullable(),
  motherName: yup.string().nullable(),

  address: yup.string().nullable(),
  pin: yup.string().nullable(),

  admissionFrom: yup.date().nullable(),
  admissionTo: yup.date().nullable(),

  // Single parent & guardian
  isSingleParent: yup.boolean().nullable(),
  guardianName: yup.string().nullable(),
  guardianRelation: yup.string().nullable(),

  // Sibling details
  sibling1Name: yup.string().nullable(),
  sibling1Standard: yup.string().nullable(),
  sibling1School: yup.string().nullable(),
  sibling2Name: yup.string().nullable(),
  sibling2Standard: yup.string().nullable(),
  sibling2School: yup.string().nullable(),

  // Board exam
  boardExamType: yup.string().nullable(),
  boardName: yup.string().nullable(),

  // Photos received
  photosReceived: yup.boolean().nullable(),
});