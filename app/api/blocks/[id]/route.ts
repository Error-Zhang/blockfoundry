import { withAuthHandler } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/blocks/[id] - 获取单个方块
 */
export const GET = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;

		const block = await prisma.block.findUnique({
			where: { id, userId: user.id },
			include: {
				folder: true,
			},
		});

		if (!block) {
			return NextResponse.json({ success: false, error: '方块不存在' }, { status: 404 });
		}

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
		console.error('获取方块失败:', error);
		return NextResponse.json({ success: false, error: '获取方块失败' }, { status: 500 });
	}
});

/**
 * PUT /api/blocks/[id] - 更新方块
 */
export const PUT = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;
		const body = await request.json();
		const { name, description, folderId, renderProps, textures, model, animation } = body;

		// 验证方块是否存在
		const existingBlock = await prisma.block.findUnique({
			where: { id, userId: user.id },
		});

		if (!existingBlock) {
			return NextResponse.json({ success: false, error: '方块不存在' }, { status: 404 });
		}

		// 更新方块
		const block = await prisma.block.update({
			where: { id },
			data: {
				...(name && { name }),
				...(description !== undefined && { description }),
				...(folderId !== undefined && { folderId }),
				...(renderProps && {
					renderType: renderProps.renderType,
					renderLayer: renderProps.renderLayer,
				}),
				...(textures && { textures: JSON.stringify(textures) }),
				...(model !== undefined && { model: model ? JSON.stringify(model) : null }),
				...(animation !== undefined && { animation: animation ? JSON.stringify(animation) : null }),
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
		console.error('更新方块失败:', error);
		return NextResponse.json({ success: false, error: '更新方块失败' }, { status: 500 });
	}
});

/**
 * DELETE /api/blocks/[id] - 删除方块
 */
export const DELETE = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;

		// 验证方块是否存在
		const existingBlock = await prisma.block.findUnique({
			where: { id, userId: user.id },
		});

		if (!existingBlock) {
			return NextResponse.json({ success: false, error: '方块不存在' }, { status: 404 });
		}

		// 删除方块
		await prisma.block.delete({
			where: { id },
		});

		return NextResponse.json({
			success: true,
			data: null,
		});
	} catch (error) {
		console.error('删除方块失败:', error);
		return NextResponse.json({ success: false, error: '删除方块失败' }, { status: 500 });
	}
});