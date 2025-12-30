'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/app/actions/auth';
import Link from 'next/link';
import { Alert, App, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import styles from '../../styles/register.module.scss';

const { Title, Text } = Typography;

export default function RegisterPage() {
	const { message } = App.useApp();
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [form] = Form.useForm();

	const handleSubmit = async (values: { username: string; email: string; password: string; confirmPassword: string }) => {
		setError('');
		setLoading(true);

		try {
			const result = await register(values.username, values.email, values.password);

			if (result.success) {
				message.success('注册成功，即将跳转到登录页面');
				setTimeout(() => {
					router.push('/login');
				}, 500);
			} else {
				setError(result.error || '注册失败');
			}
		} catch (err) {
			setError('注册过程中发生错误');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.registerContainer}>
			<div className={styles.registerBox}>
				<Card className={styles.registerCard}>
					<div className={styles.logoSection}>
						<div className={styles.logo}>方</div>
						<Title level={2} className={styles.title}>
							方块工坊
						</Title>
						<Text type="secondary">创建您的账号，开始使用</Text>
					</div>

					{error && <Alert title={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 24 }} />}

					<Form form={form} name="register" onFinish={handleSubmit} autoComplete="off" size="large">
						<Form.Item
							name="username"
							rules={[
								{ required: true, message: '请输入用户名' },
								{ min: 3, message: '用户名至少3个字符' },
								{ max: 20, message: '用户名最多20个字符' },
							]}
						>
							<Input prefix={<UserOutlined />} placeholder="用户名" />
						</Form.Item>

						<Form.Item
							name="email"
							rules={[
								{ required: true, message: '请输入邮箱' },
								{ type: 'email', message: '请输入有效的邮箱地址' },
							]}
						>
							<Input prefix={<MailOutlined />} placeholder="邮箱" />
						</Form.Item>

						<Form.Item
							name="password"
							rules={[
								{ required: true, message: '请输入密码' },
								{ min: 6, message: '密码至少6个字符' },
							]}
						>
							<Input.Password prefix={<LockOutlined />} placeholder="密码" />
						</Form.Item>

						<Form.Item
							name="confirmPassword"
							dependencies={['password']}
							rules={[
								{ required: true, message: '请确认密码' },
								({ getFieldValue }) => ({
									validator(_, value) {
										if (!value || getFieldValue('password') === value) {
											return Promise.resolve();
										}
										return Promise.reject(new Error('两次输入的密码不一致'));
									},
								}),
							]}
						>
							<Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
						</Form.Item>

						<Form.Item>
							<Button type="primary" htmlType="submit" loading={loading} icon={<UserAddOutlined />} block size="large">
								注册
							</Button>
						</Form.Item>
					</Form>

					<div className={styles.footer}>
						<Space orientation="horizontal">
							<Text type="secondary">已有账号？</Text>
							<Link href="/login">
								<Button type="link" style={{ padding: 0 }}>
									立即登录
								</Button>
							</Link>
						</Space>
					</div>
				</Card>
			</div>
		</div>
	);
}
