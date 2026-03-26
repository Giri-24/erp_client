import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { admissionSchema } from '../admission.schema';
import { createAdmission } from '../admission.service';

export default function AdmissionForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(admissionSchema),
  });

  const onSubmit = async (data) => {
    try {
      await createAdmission(data);
      alert('Admission Created Successfully');
    } catch (err) {
      alert('Error submitting form');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-8">

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Student Admission Form
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Student Info */}
          <div>
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              Student Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Full Name"
                {...register('name')}
                className="input"
              />
              <input
                placeholder="Standard"
                {...register('standard')}
                className="input"
              />

              <select {...register('gender')} className="input">
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>

              <input type="date" {...register('dob')} className="input" />

              <input
                placeholder="Community"
                {...register('community')}
                className="input"
              />
                      {/* New fields for admissionFrom and admissionTo */}
                      <div>
                        <label className="label">Admission From</label>
                        <input type="date" {...register('admissionFrom')} className="input" />
                      </div>
                      <div>
                        <label className="label">Admission To</label>
                        <input type="date" {...register('admissionTo')} className="input" />
                      </div>
            </div>

            <p className="error">{errors.name?.message}</p>
          </div>

          {/* Family */}
          <div>
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              Family Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Father Name"
                {...register('fatherName')}
                className="input"
              />
              <input
                placeholder="Mother Name"
                {...register('motherName')}
                className="input"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              Address
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Full Address"
                {...register('address')}
                className="input"
              />
              <input
                placeholder="PIN Code"
                {...register('pin')}
                className="input"
              />
            </div>
          </div>

          {/* Documents */}
          <div>
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              Documents Upload
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="label">Photo</label>
                <input type="file" {...register('photo')} className="file" />
              </div>

              <div>
                <label className="label">Birth Certificate</label>
                <input type="file" {...register('birthCert')} className="file" />
              </div>

              <div>
                <label className="label">Aadhar</label>
                <input type="file" {...register('aadhar')} className="file" />
              </div>

              <div>
                <label className="label">Staff Signature</label>
                <input type="file" {...register('staffSignature')} className="file" />
              </div>

            </div>
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-md transition"
            >
              Submit Admission
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}