import React, { useState } from 'react';
import axios from 'axios';

export default function PrincipalApproval({ studentId }) {
  const [file, setFile] = useState(null);

  const handleApprove = async () => {
    const formData = new FormData();
    formData.append('principalSignature', file);

    await axios.patch(`/api/admission/${studentId}/approve`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    alert('Admission Approved');
  };

  return (
    <div>
      <h2>Principal Approval</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleApprove}>Approve</button>
    </div>
  );
}