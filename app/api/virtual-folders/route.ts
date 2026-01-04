import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';

// GET - 获取虚拟文件夹列表
export const GET = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const { searchParams } = new URL(request.url);
		const parentPath = searchParams.get('parentPath') || '';

		// 检查是否存在根节点，如果不存在则自动创建
		const rootFolder = await prisma.virtualFolder.findFirst({
			where: {
				userId: user.id,
				parentId: null,
			},
		});

		if (!rootFolder) {
			// 创建根节点
			await prisma.virtualFolder.create({
				data: {
					name: 'root',
					path: 'root',
					parentId: null,
					userId: user.id,
				},
			});
		}

		const folders = await prisma.virtualFolder.findMany({
			where: {
				userId: user.id,
				...(parentPath
					? {
							path: {
								startsWith: parentPath,
							},
						}
					: {}),
			},
			orderBy: {
				path: 'asc',
			},
		});

		return NextResponse.json({
			success: true,
			data: folders,
		});
	} catch (error) {
		console.error('获取文件夹失败:', error);
		return NextResponse.json({ success: false, error: '获取文件夹失败' }, { status: 500 });
	}
});

// POST - 创建虚拟文件夹
export const POST = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const body = await request.json();
		const { name, parentId } = body;

		if (!name) {
			return NextResponse.json({ success: false, error: '文件夹名称不能为空' }, { status: 400 });
		}

		// 获取父文件夹信息以构建路径
		let path = name;
		if (parentId) {
			const parent = await prisma.virtualFolder.findFirst({
				where: {
					id: parentId,
					userId: user.id,
				},
			});

			if (!parent) {
				return NextResponse.json({ success: false, error: '父文件夹不存在' }, { status: 400 });
			}

			path = `${parent.path}.${name}`;
		}

		// 检查路径是否已存在（在当前用户的文件夹中）
		const existing = await prisma.virtualFolder.findFirst({
			where: {
				path,
				userId: user.id,
			},
		});

		if (existing) {
			return NextResponse.json({ success: false, error: '文件夹已存在' }, { status: 400 });
		}

		// 创建文件夹
		const folder = await prisma.virtualFolder.create({
			data: {
				name,
				path,
				parentId,
				userId: user.id,
			},
		});

		return NextResponse.json({
			success: true,
			data: folder,
		});
	} catch (error) {
		console.error('创建文件夹失败:', error);
		return NextResponse.json({ success: false, error: '创建文件夹失败' }, { status: 500 });
	}
});
