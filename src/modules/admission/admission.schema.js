import * as yup from 'yup';

export const admissionSchema = yup.object({
  name: yup.string().required('Name is required'),
  standard: yup.string().required('Standard is required'),
  gender: yup.string().required('Gender is required'),
  dob: yup.string().required('DOB is required'),
  community: yup.string().required('Community is required'),

  fatherName: yup.string().required('Father name required'),
  motherName: yup.string().required('Mother name required'),

  address: yup.string().required('Address required'),
  pin: yup.string().required('PIN required'),

  admissionFrom: yup.date().nullable(),
  admissionTo: yup.date().nullable(),
});