'use server';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function login(email: string, password: string) {
  try {
    await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: '邮箱或密码错误' };
    }
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

export async function logout() {
  try {
    await nextAuthSignOut({ redirect: false });
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: '退出登录失败' };
  }
}

export async function register(username: string, email: string, password: string) {
  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return { success: false, error: '该邮箱已被注册' };
      }
      if (existingUser.username === username) {
        return { success: false, error: '该用户名已被使用' };
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: '注册失败，请稍后重试' };
  }
}