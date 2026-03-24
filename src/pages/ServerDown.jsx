import React from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const ServerDown = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Result
        status="500"
        title="503 - Service Unavailable"
        subTitle="Sorry, the backend server is currently unreachable. Please try again later."
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => window.location.href = '/'}>
            Try Again
          </Button>
        }
      />
    </div>
  );
};

export default ServerDown;
