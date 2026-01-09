import { withAuthHandler } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取所有子文件夹ID
 */
async function getAllSubfolderIds(folderId: string, userId: number): Promise<string[]> {
	const folder = await prisma.virtualFolder.findFirst({
		where: { 
			id: folderId, 
			userId
		},
	});

	if (!folder) return [folderId];

	const subFolders = await prisma.virtualFolder.findMany({
		where: {
			userId,
			path: {
				startsWith: `${folder.path}.`,
			},
		},
	});

	return [folderId, ...subFolders.map((f) => f.id)];
}

/**
 * GET /api/blocks - 获取方块列表
 */
export const GET = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const { searchParams } = new URL(request.url);
		const folderId = searchParams.get('folderId');

		let folderIds: string[] = [];

		if (folderId) {
			// 获取当前文件夹及其所有子文件夹的ID
			folderIds = await getAllSubfolderIds(folderId, user.id);
		}

		// 从数据库获取方块列表
		const blocks = await prisma.block.findMany({
			where: {
				userId: user.id,
				...(folderId ? { folderId: { in: folderIds } } : { folderId: null }),
			},
			include: {
				folder: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		// 获取该用户的方块总数
		const totalCount = await prisma.block.count({
			where: {
				userId: user.id,
			},
		});

		// 转换数据格式
		const formattedBlocks = blocks.map((block) => ({
			id: block.id,
			name: block.name,
			description: block.description,
			folderId: block.folderId,
			renderProps: {
				renderType: block.renderType,
				renderLayer: block.renderLayer,
			},
			textures: block.textures ? JSON.parse(block.textures) : undefined,
			model: block.model ? JSON.parse(block.model) : undefined,
			animation: block.animation ? JSON.parse(block.animation) : undefined,
			createdAt: block.createdAt.toISOString(),
			updatedAt: block.updatedAt.toISOString(),
		}));

		return NextResponse.json({
			success: true,
			data: {
				totalCount,
				blocks: formattedBlocks,
			},
		});
	} catch (error) {
		console.error('获取方块列表失败:', error);
		return NextResponse.json({ success: false, error: '获取方块列表失败' }, { status: 500 });
	}
});

/**
 * POST /api/blocks - 创建方块
 */
export const POST = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const body = await request.json();
		const { name, description, folderId, renderProps, textures, model, animation } = body;

		// 验证必填字段
		if (!name || !renderProps) {
			return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
		}

		// 创建方块
		const block = await prisma.block.create({
			data: {
				name,
				description: description || '',
				folderId: folderId || null,
				renderType: renderProps.renderType,
				renderLayer: renderProps.renderLayer,
				textures: textures ? JSON.stringify(textures) : '{}',
				model: model ? JSON.stringify(model) : null,
				animation: animation ? JSON.stringify(animation) : null,
				userId: user.id,
			},
		});

		return NextResponse.json({
			success: true,
			data: {
				id: block.id,
				name: block.name,
				description: block.description,
				folderId: block.folderId,
				renderProps: {
					renderType: block.renderType,
					renderLayer: block.renderLayer,
				},
				textures: block.textures ? JSON.parse(block.textures) : undefined,
				model: block.model ? JSON.parse(block.model) : undefined,
				animation: block.animation ? JSON.parse(block.animation) : undefined,
				createdAt: block.createdAt.toISOString(),
				updatedAt: block.updatedAt.toISOString(),
			},
		});
	} catch (error) {
		console.error('创建方块失败:', error);
		return NextResponse.json({ success: false, error: '创建方块失败' }, { status: 500 });
	}
});