import React, { useEffect, useState } from 'react';
import { Card, Spin, message } from 'antd';
import SiblingLinkCard from '../components/SiblingLinkCard';
import axios from 'axios';

const StudentFullBio = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    axios.get(`/students/${studentId}`)
      .then(res => setStudent(res.data))
      .catch(() => message.error('Failed to load student bio'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Spin />;
  if (!student) return null;

  return (
    <div style={{ width: '100%', padding: '16px 12px' }}>
      <Card
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 900,
          margin: '0 auto',
          borderRadius: 18,
          boxShadow: '0 4px 24px #0001',
          background: 'rgba(255,255,255,0.95)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 700, color: '#22609f' }}>
          {student.name} - Full Bio
        </h2>
        {/* ...other bio fields/cards... */}
        <SiblingLinkCard siblings={student.siblings || []} />
      </Card>
    </div>
  );
};

export default StudentFullBio;
