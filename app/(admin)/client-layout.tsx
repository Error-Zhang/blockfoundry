'use client';

import React, { useState } from 'react';
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import {
	BellOutlined,
	DashboardOutlined,
	FileImageOutlined,
	LogoutOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	PictureOutlined,
	SettingOutlined,
	UserOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import styles from '../styles/adminLayout.module.scss';
import type { Session } from 'next-auth';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function ClientLayout({ 
	children, 
	session 
}: { 
	children: React.ReactNode;
	session: Session;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const router = useRouter();
	const pathname = usePathname();

	const menuItems = [
		{
			key: '/dashboard',
			icon: <DashboardOutlined />,
			label: '仪表板',
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
		router.push(key);
	};

	const handleUserMenuClick = ({ key }: { key: string }) => {
		if (key === 'logout') {
			handleLogout();
		} else {
			console.log('用户菜单点击:', key);
		}
	};

	const handleLogout = async () => {
		try {
			// 调用服务端 action 退出登录
			const { logout } = await import('@/app/actions/auth');
			await logout();
			// 跳转到登录页
			router.push('/login');
			router.refresh();
		} catch (error) {
			console.error('Logout error:', error);
			// 即使出错也跳转到登录页
			router.push('/login');
		}
	};

	return (
			<Layout className={styles.mainLayout}>
				<Sider
					trigger={null}
					collapsible
					collapsed={collapsed}
					className={`${styles.adminSidebar} ${collapsed ? styles.collapsed : ''}`}
					width={280}
					collapsedWidth={80}
				>
					{/* Logo区域 */}
					<div className={`${styles.logoArea} ${collapsed ? styles.collapsed : ''}`}>
						<div className={styles.logoBackground} />

						<div className={styles.logoContent}>
							<div className={`${styles.logoIcon} ${collapsed ? styles.collapsed : ''}`}>方</div>
							{!collapsed && (
								<div className={styles.logoText}>
									<Title level={4} className={styles.logoTitle}>
										方块工坊
									</Title>
								</div>
							)}
						</div>
					</div>

					{/* 菜单 */}
					<div className={styles.menuContainer}>
						<Menu theme="light" mode="inline" selectedKeys={[pathname!]} items={menuItems} onClick={handleMenuClick} className={styles.sidebarMenu} />
					</div>

					{/* 底部装饰 */}
					{!collapsed && (
						<div className={styles.sidebarFooter}>
							<div className={styles.footerBackground} />

							<div className={styles.statusIndicator}>
								<div className={styles.statusDot} />
								<span className={styles.statusText}>系统运行正常</span>
							</div>
						</div>
					)}
				</Sider>

			<Layout>
				{/* 顶部导航 */}
					<Header className={styles.header}>
						<Button
							type="text"
							icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
							onClick={() => setCollapsed(!collapsed)}
							className={styles.toggleButton}
						/>

						<Space size="large">
							{/* 通知 */}
							<Button
								type="text"
								icon={<BellOutlined />}
								className={styles.notificationButton}
							/>

							{/* 用户菜单 */}
							<Dropdown
								menu={{
									items: userMenuItems,
									onClick: handleUserMenuClick,
								}}
								placement="bottomRight"
							>
								<Space className={styles.userMenu}>
										<Avatar
											className={styles.userAvatar}
											icon={<UserOutlined />}
										/>
										<span className={styles.userName}>
											{session?.user?.name || '用户'}
										</span>
									</Space>
							</Dropdown>
						</Space>
					</Header>

					{/* 内容区域 */}
					<Content className={styles.content}>
					{children}
				</Content>
			</Layout>
		</Layout>
	);
}
