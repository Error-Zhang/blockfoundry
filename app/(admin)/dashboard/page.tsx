'use client';

import React from 'react';
import { Typography, Space } from 'antd';
import styles from '../../styles/dashboard.module.scss';

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  return (
    <div className={styles.dashboardContainer}>
      <Space orientation="vertical" size="large" className={styles.contentWrapper}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <span className={styles.logoText}>方</span>
        </div>

        {/* 标题 */}
        <Title level={1} className={styles.mainTitle}>
          方块工坊
        </Title>

        <Title level={2} className={styles.subTitle}>
          管理后台系统
        </Title>

        {/* 描述 */}
        <Paragraph className={styles.description}>
          欢迎来到方块工坊管理后台！这是一个现代化、简洁美观的管理系统界面。
          <br />
          支持明暗主题切换,响应式设计,为您提供最佳的管理体验。
        </Paragraph>

        {/* 特性列表 */}
        <div className={styles.featuresGrid}>
          {[
            { icon: '🎨', title: '现代设计', desc: '简洁美观的界面设计' },
            { icon: '🌙', title: '主题切换', desc: '支持明暗主题模式' },
            { icon: '📱', title: '响应式', desc: '适配各种屏幕尺寸' },
            { icon: '⚡', title: '高性能', desc: '流畅的用户体验' },
          ].map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <Title level={4} className={styles.featureTitle}>
                {feature.title}
              </Title>
              <Paragraph className={styles.featureDesc}>
                {feature.desc}
              </Paragraph>
            </div>
          ))}
        </div>
      </Space>
    </div>
  );
}