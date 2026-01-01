'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Alert, App, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, LoginOutlined, MailOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';

import styles from '@/app/styles/auth.module.scss';
import { login, register } from '@/app/actions/auth';
import { userLocalStore } from '@/app/store/user.store';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';

const { Title, Text } = Typography;

export default function AuthPage() {
	const { message } = App.useApp();
	const router = useRouter();
	const searchParams = useSearchParams();

	// 从 URL 参数获取模式，默认为登录
	const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
	const [form] = Form.useForm();

	// 页面加载时自动填充保存的账号密码（仅登录模式）
	useEffect(() => {
		if (isLogin) {
			form.setFieldsValue(userLocalStore.current);
		}
	}, [form, isLogin]);

	// 切换模式时重置表单
	useEffect(() => {
		form.resetFields();
		if (isLogin) {
			form.setFieldsValue(userLocalStore.current);
		}
	}, [isLogin, form]);

	const onSuccess = (params: any) => {
		userLocalStore.setCurrent(params[0]);
		setTimeout(() => router.push('/dashboard'), 500);
		message.success(`${isLogin ? '登陆' : '注册'}成功，即将跳转到控制台`);
	};

	const {
		loading: loginLoading,
		error: loginError,
		handle: handleLogin,
	} = useAsyncAction(login, {
		onSuccess,
	});

	const {
		loading: registerLoading,
		error: registerError,
		handle: handleRegister,
	} = useAsyncAction(register, {
		onSuccess,
	});

	const loading = isLogin ? loginLoading : registerLoading;
	const error = isLogin ? loginError : registerError;

	const handleSubmit = (values: any) => {
		const action = isLogin ? handleLogin : handleRegister;
		action(values);
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
	};

	return (
		<div className={styles.authContainer}>
			<div className={styles.authBox}>
				<Card className={styles.authCard}>
					<div className={styles.logoSection}>
						<div className={styles.logo}>方</div>
						<Title level={2} className={styles.title}>
							方块工坊
						</Title>
						<Text type="secondary">{isLogin ? '欢迎回来，请登录您的账号' : '创建您的账号，开始使用'}</Text>
					</div>

					{error && <Alert title={error} type="error" showIcon closable style={{ marginBottom: 24 }} />}

					<Form form={form} name={isLogin ? 'login' : 'register'} onFinish={handleSubmit} autoComplete="off" size="large">
						{!isLogin && (
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
						)}

						<Form.Item
							name="email"
							rules={[
								{ required: true, message: '请输入邮箱' },
								{ type: 'email', message: '请输入有效的邮箱地址' },
							]}
						>
							<Input prefix={isLogin ? <UserOutlined /> : <MailOutlined />} placeholder="邮箱" />
						</Form.Item>

						<Form.Item
							name="password"
							rules={[{ required: true, message: '请输入密码' }, ...(isLogin ? [] : [{ min: 6, message: '密码至少6个字符' }])]}
						>
							<Input.Password prefix={<LockOutlined />} placeholder="密码" />
						</Form.Item>

						{!isLogin && (
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
						)}

						<Form.Item>
							<Button
								type="primary"
								htmlType="submit"
								loading={loading}
								icon={isLogin ? <LoginOutlined /> : <UserAddOutlined />}
								block
								size="large"
							>
								{isLogin ? '登录' : '注册'}
							</Button>
						</Form.Item>
					</Form>

					<div className={styles.footer}>
						<Space orientation="horizontal">
							<Text type="secondary">{isLogin ? '还没有账号？' : '已有账号？'}</Text>
							<Button type="link" style={{ padding: 0 }} onClick={toggleMode}>
								{isLogin ? '立即注册' : '立即登录'}
							</Button>
						</Space>
					</div>
				</Card>
			</div>
		</div>
	);
}
