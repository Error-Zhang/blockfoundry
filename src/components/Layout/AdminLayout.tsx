import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import {
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	DashboardOutlined,
	UserOutlined,
	ShoppingOutlined,
	SettingOutlined,
	LogoutOutlined,
	BellOutlined,
	AppstoreOutlined,
	PictureOutlined,
	FileImageOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/admin-layout.less';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AdminLayout: React.FC = () => {
	const [collapsed, setCollapsed] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	const menuItems = [
		{
			key: '/dashboard',
			icon: <DashboardOutlined />,
			label: '仪表板',
		},
		{
			key: '/users',
			icon: <UserOutlined />,
			label: '用户管理',
		},
		{
			key: '/texture-resources',
			icon: <FileImageOutlined />,
			label: '纹理资源管理',
		},
		{
			key: '/texture-atlas',
			icon: <PictureOutlined />,
			label: '纹理图集管理',
		},
		{
			key: '/settings',
			icon: <SettingOutlined />,
			label: '系统设置',
		},
	];

	const userMenuItems = [
		{
			key: 'profile',
			icon: <UserOutlined />,
			label: '个人资料',
		},
		{
			key: 'settings',
			icon: <SettingOutlined />,
			label: '设置',
		},
		{
			type: 'divider' as const,
		},
		{
			key: 'logout',
			icon: <LogoutOutlined />,
			label: '退出登录',
			danger: true,
		},
	];

	const handleMenuClick = ({ key }: { key: string }) => {
		navigate(key);
	};

	const handleUserMenuClick = ({ key }: { key: string }) => {
		if (key === 'logout') {
			console.log('退出登录');
		} else {
			console.log('用户菜单点击:', key);
		}
	};

	return (
		<Layout style={{ minHeight: '100vh' }}>
			<Sider
				trigger={null}
				collapsible
				collapsed={collapsed}
				className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}
				width={280}
				collapsedWidth={80}
			>
				{/* Logo区域 */}
				<div className={`logo-area ${collapsed ? 'collapsed' : ''}`}>
					<div className="logo-background" />

					<div className="logo-content">
						<div className={`logo-icon ${collapsed ? 'collapsed' : ''}`}>方</div>
						{!collapsed && (
							<div className="logo-text">
								<Title level={4} className="logo-title">
									方块工坊
								</Title>
							</div>
						)}
					</div>
				</div>

				{/* 菜单 */}
				<div className="menu-container">
					<Menu theme="light" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={handleMenuClick} className="sidebar-menu" />
				</div>

				{/* 底部装饰 */}
				{!collapsed && (
					<div className="sidebar-footer">
						<div className="footer-background" />

						<div className="status-indicator">
							<div className="status-dot" />
							<span className="status-text">系统运行正常</span>
						</div>
					</div>
				)}
			</Sider>

			<Layout>
				{/* 顶部导航 */}
				<Header
					style={{
						padding: '0 24px',
						background: '#ffffff',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						borderBottom: '1px solid #d9d9d9',
						boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
					}}
				>
					<Button
						type="text"
						icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
						onClick={() => setCollapsed(!collapsed)}
						style={{
							fontSize: '16px',
							width: 48,
							height: 48,
							color: '#000000',
						}}
					/>

					<Space size="large">
						{/* 通知 */}
						<Button
							type="text"
							icon={<BellOutlined />}
							style={{
								fontSize: '16px',
								color: '#000000',
							}}
						/>

						{/* 用户菜单 */}
						<Dropdown
							menu={{
								items: userMenuItems,
								onClick: handleUserMenuClick,
							}}
							placement="bottomRight"
						>
							<Space
								style={{
									cursor: 'pointer',
									padding: '8px 12px',
									borderRadius: 6,
									transition: 'background-color 0.2s',
								}}
							>
								<Avatar
									style={{
										background: 'linear-gradient(135deg, #000000, #333333)',
									}}
									icon={<UserOutlined />}
								/>
								<span
									style={{
										color: '#000000',
										fontWeight: 500,
									}}
								>
									管理员
								</span>
							</Space>
						</Dropdown>
					</Space>
				</Header>

				{/* 内容区域 */}
				<Content
					style={{
						padding: '32px',
						minHeight: 'calc(100vh - 112px)',
						background: '#ffffff',
						borderRadius: 8,
						boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
						overflow: 'auto',
					}}
				>
					<Outlet />
				</Content>
			</Layout>
		</Layout>
	);
};

export default AdminLayout;
