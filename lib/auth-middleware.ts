import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

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

type AuthenticatedUser = Extract<AuthResult, { authenticated: true }>['user'];

type AuthenticatedHandler<T = any> = (request: NextRequest, context: T, user: AuthenticatedUser) => Promise<NextResponse>;

/**
 * 高阶函数,为路由处理器添加认证检查
 * @param handler 需要认证的路由处理器
 * @returns 包装后的路由处理器
 */
export function withAuthHandler<T = any>(handler: AuthenticatedHandler<T>) {
	return async (request: NextRequest, context: T) => {
		const authResult = await withAuth();
		if (!authResult.authenticated) {
			return authResult.response;
		}
		return handler(request, context, authResult.user);
	};
}
