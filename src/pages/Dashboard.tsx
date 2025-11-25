import React from 'react';
import { Typography, Space } from 'antd';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
	return (
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				textAlign: 'center',
				padding: '48px 24px',
			}}
		>
			<Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 600 }}>
				{/* Logo */}
				<div
					style={{
						width: 120,
						height: 120,
						background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
						borderRadius: 24,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						margin: '0 auto 32px',
					}}
				>
					<span
						style={{
							color: 'white',
							fontSize: 48,
							fontWeight: 'bold',
						}}
					>
						方
					</span>
				</div>

				{/* 标题 */}
				<Title
					level={1}
					style={{
						margin: 0,
						background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						fontSize: 48,
						fontWeight: 700,
					}}
				>
					方块工坊
				</Title>

				<Title
					level={2}
					style={{
						margin: 0,

						fontWeight: 400,
					}}
				>
					管理后台系统
				</Title>

				{/* 描述 */}
				<Paragraph
					style={{
						fontSize: 18,

						lineHeight: 1.6,
						margin: '24px 0',
					}}
				>
					欢迎来到方块工坊管理后台！这是一个现代化、简洁美观的管理系统界面。
					<br />
					支持明暗主题切换，响应式设计，为您提供最佳的管理体验。
				</Paragraph>

				{/* 特性列表 */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
						gap: 24,
						marginTop: 48,
						width: '100%',
					}}
				>
					{[
						{ icon: '🎨', title: '现代设计', desc: '简洁美观的界面设计' },
						{ icon: '🌙', title: '主题切换', desc: '支持明暗主题模式' },
						{ icon: '📱', title: '响应式', desc: '适配各种屏幕尺寸' },
						{ icon: '⚡', title: '高性能', desc: '流畅的用户体验' },
					].map((feature, index) => (
						<div
							key={index}
							style={{
								padding: 24,
								borderRadius: 12,

								textAlign: 'center',
								transition: 'all 0.3s ease',
							}}
						>
							<div style={{ fontSize: 32, marginBottom: 12 }}>{feature.icon}</div>
							<Title
								level={4}
								style={{
									margin: '0 0 8px 0',
								}}
							>
								{feature.title}
							</Title>
							<Paragraph
								style={{
									margin: 0,
								}}
							>
								{feature.desc}
							</Paragraph>
						</div>
					))}
				</div>
			</Space>
		</div>
	);
};

export default Dashboard;
