'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/auth';
import Link from 'next/link';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons';
import styles from '../../styles/login.module.scss';

const { Title, Text } = Typography;

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [form] = Form.useForm();

	const handleSubmit = async (values: { email: string; password: string }) => {
		setError('');
		setLoading(true);

		try {
			const result = await login(values.email, values.password);

			if (result.success) {
				router.push('/dashboard');
				router.refresh();
			} else {
				setError(result.error || '登录失败');
			}
		} catch (err) {
			setError('登录过程中发生错误');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.loginContainer}>
			<div className={styles.loginBox}>
				<Card className={styles.loginCard}>
					<div className={styles.logoSection}>
						<div className={styles.logo}>方</div>
						<Title level={2} className={styles.title}>
							方块工坊
						</Title>
						<Text type="secondary">欢迎回来，请登录您的账号</Text>
					</div>

					{error && <Alert title={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 24 }} />}

					<Form form={form} name="login" onFinish={handleSubmit} autoComplete="off" size="large">
						<Form.Item
							name="email"
							rules={[
								{ required: true, message: '请输入邮箱' },
								{ type: 'email', message: '请输入有效的邮箱地址' },
							]}
						>
							<Input prefix={<UserOutlined />} placeholder="邮箱" />
						</Form.Item>

						<Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
							<Input.Password prefix={<LockOutlined />} placeholder="密码" />
						</Form.Item>

						<Form.Item>
							<Button type="primary" htmlType="submit" loading={loading} icon={<LoginOutlined />} block size="large">
								登录
							</Button>
						</Form.Item>
					</Form>

					<div className={styles.footer}>
						<Space orientation="horizontal">
							<Text type="secondary">还没有账号？</Text>
							<Link href="/register">
								<Button type="link" style={{ padding: 0 }}>
									立即注册
								</Button>
							</Link>
						</Space>
					</div>
				</Card>
			</div>
		</div>
	);
}
