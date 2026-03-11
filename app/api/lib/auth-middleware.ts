import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { BadRequestResponse, NotFoundResponse, ServerErrorResponse, UnauthorizedResponse } from '@/app/api/lib/response';
import { Prisma } from '@prisma/client';
import { CustomError } from '@/app/api/lib/errors';

/**
 * API认证中间件
 * 验证用户是否已登录,返回用户信息或错误响应
 */
export async function withAuth() {
	const session = await auth();

	if (!session || !session.user || !session.user.id) {
		return {
			authenticated: false as const,
			response: UnauthorizedResponse(),
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

export function withErrorHandler<T extends any[]>(handler: (...args: T) => Promise<Response>) {
	return async (...args: T) => {
		try {
			return await handler(...args);
		} catch (err: any) {
			if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return NotFoundResponse();
			if (err instanceof CustomError) return BadRequestResponse(err.message);
			console.error(err);
			return ServerErrorResponse();
		}
	};
}

/**
 * 高阶函数,为路由处理器添加认证检查
 * @param handler 需要认证的路由处理器
 * @returns 包装后的路由处理器
 */
export function withAuthHandler<T = any>(handler: AuthenticatedHandler<T>) {
	return withErrorHandler(async (request: NextRequest, context: T) => {
		const authResult = await withAuth();

		if (!authResult.authenticated) {
			return authResult.response;
		}

		return await handler(request, context, authResult.user);
	});
}
