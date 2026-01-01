import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthResult } from '@/lib/auth-middleware';

type AuthenticatedUser = Extract<AuthResult, { authenticated: true }>['user'];

type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  context: T,
  user: AuthenticatedUser
) => Promise<NextResponse>;

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