import React from 'react';
import { Card, Avatar, List } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';

const SiblingLinkCard = ({ siblings }) => {
  return (
    <Card
      title={<span><TeamOutlined /> Sibling Link</span>}
      bordered={false}
      style={{ borderRadius: 16, marginBottom: 24 }}
      bodyStyle={{ padding: 18 }}
    >
      {siblings && siblings.length > 0 ? (
        <List
          itemLayout="horizontal"
          dataSource={siblings}
          renderItem={sib => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} style={{ background: '#22609f' }} />}
                title={<b>{sib.name}</b>}
                description={`Class: ${sib.standard || 'N/A'}`}
              />
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', color: '#888' }}>No linked siblings</div>
      )}
    </Card>
  );
};

export default SiblingLinkCard;
