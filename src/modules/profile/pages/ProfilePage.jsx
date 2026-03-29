import React, { useEffect, useState } from 'react';
import { Card, message } from 'antd';
import ProfileForm from '../components/ProfileForm';
import { getProfile, updateProfile } from '../profile.service';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProfile()
      .then((data) => setProfile(data))
      .catch(() => message.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await updateProfile(values);
      setProfile(values);
      message.success('Profile updated!');
    } catch {
      message.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: '100%', padding: '16px 12px' }}>
      <Card
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 760,
          margin: '0 auto',
          borderRadius: 18,
          boxShadow: '0 4px 24px #0001',
          background: 'rgba(255,255,255,0.95)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 700, color: '#22609f' }}>
          My Profile
        </h2>
        <ProfileForm profile={profile} onSave={handleSave} loading={saving || loading} />
      </Card>
    </div>
  );
};

export default ProfilePage;
