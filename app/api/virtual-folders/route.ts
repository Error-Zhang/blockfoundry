import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';
import { buildPath, pathExists } from './lib/folder-utils';

// GET - 获取虚拟文件夹列表
export const GET = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const { searchParams } = new URL(request.url);
		const parentId = searchParams.get('parentId') || undefined;
		const category = searchParams.get('category');

		if (!category) {
			return NextResponse.json({ success: false, error: '文件夹分类不能为空' }, { status: 400 });
		}

		// 检查是否存在根节点，如果不存在则自动创建
		const rootFolder = await prisma.virtualFolder.findFirst({
			where: {
				userId: user.id,
				parentId: null,
				category,
			},
		});

		if (!rootFolder) {
			// 创建根节点
			await prisma.virtualFolder.create({
				data: {
					name: category === 'block' ? 'blocks' : 'textures',
					path: category === 'block' ? 'blocks' : 'textures',
					category,
					parentId: null,
					userId: user.id,
				},
			});
		}

		const folders = await prisma.virtualFolder.findMany({
			where: {
				userId: user.id,
				category,
				parentId,
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
		const { name, parentId, category = 'texture' } = body;

		if (!name) {
			return NextResponse.json({ success: false, error: '文件夹名称不能为空' }, { status: 400 });
		}

		// 构建路径并检查是否存在
		const path = await buildPath(name, parentId, user.id);

		if (await pathExists(path, user.id)) {
			return NextResponse.json({ success: false, error: '文件夹已存在' }, { status: 400 });
		}

		// 创建文件夹
		const folder = await prisma.virtualFolder.create({
			data: {
				name,
				path,
				category,
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
