'use client';

import React from 'react';
import { Typography, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

export default function EmptyPage({ 
  title, 
  description = '此页面正在开发中,敬请期待...' 
}: { 
  title: string; 
  description?: string;
}) {
  const router = useRouter();

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '48px 24px',
    }}>
      <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: 500 }}>
        {/* 图标 */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}>
          <span style={{
            fontSize: 32,
          }}>
            🚧
          </span>
        </div>

        {/* 标题 */}
        <Title level={2} style={{ 
          margin: 0,
        }}>
          {title}
        </Title>

        {/* 描述 */}
        <Paragraph style={{ 
          fontSize: 16,
          lineHeight: 1.6,
          margin: 0,
        }}>
          {description}
        </Paragraph>

        {/* 返回按钮 */}
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard')}
          style={{ marginTop: 24 }}
        >
          返回仪表板
        </Button>
      </Space>
    </div>
  );
}