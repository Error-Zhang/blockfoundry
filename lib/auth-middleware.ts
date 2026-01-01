import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * API认证中间件
 * 验证用户是否已登录,返回用户信息或错误响应
 */
export async function withAuth() {
	const session = await auth();

	if (!session || !session.user || !session.user.id) {
		return {
			authenticated: false as const,
			response: NextResponse.json({ success: false, error: '未授权,请先登录' }, { status: 401 }),
		};
	}

	return {
		authenticated: true as const,
		user: {
			id: parseInt(session.user.id),
			email: session.user.email!,
			name: session.user.name!,
		},
	};
}

/**
 * 类型定义
 */
export type AuthResult = Awaited<ReturnType<typeof withAuth>>;
