import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';

// GET - 获取单个纹理资源
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const resource = await prisma.textureResource.findUnique({
			where: { id },
		});

		if (!resource) {
			return NextResponse.json({ success: false, error: '纹理资源不存在' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: {
				...resource,
				tags: resource.tags ? JSON.parse(resource.tags) : [],
				createdAt: resource.createdAt.toISOString().split('T')[0],
				updatedAt: resource.updatedAt.toISOString().split('T')[0],
			},
		});
	} catch (error) {
		console.error('获取纹理资源失败:', error);
		return NextResponse.json({ success: false, error: '获取纹理资源失败' }, { status: 500 });
	}
}

// PUT - 更新纹理资源
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await request.json();

		// 处理 tags 字段
		const updateData: any = { ...body };
		if (body.tags) {
			updateData.tags = JSON.stringify(body.tags);
		}

		const resource = await prisma.textureResource.update({
			where: { id },
			data: updateData,
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					...resource,
					tags: resource.tags ? JSON.parse(resource.tags) : [],
					createdAt: resource.createdAt.toISOString().split('T')[0],
					updatedAt: resource.updatedAt.toISOString().split('T')[0],
				},
			},
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	} catch (error) {
			console.error('更新纹理资源失败:', error);
			const errorMessage = error instanceof Error ? error.message : '更新纹理资源失败';
			return NextResponse.json(
				{ success: false, error: errorMessage },
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
		}
}

// DELETE - 删除纹理资源
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 获取资源信息
		const resource = await prisma.textureResource.findUnique({
			where: { id },
		});

		if (!resource) {
			return NextResponse.json({ success: false, error: '纹理资源不存在' }, { status: 404 });
		}

		// 检查是否有其他记录引用同一个文件
		const originalFileName = resource.originalUrl?.split('/').pop();
		let shouldDeleteFile = true;

		if (originalFileName) {
			// 查询数据库中是否有其他记录使用相同的文件
			const sameFileCount = await prisma.textureResource.count({
				where: {
					originalUrl: resource.originalUrl,
					id: { not: id }, // 排除当前要删除的记录
				},
			});

			// 如果还有其他记录引用同一个文件，则不删除物理文件
			shouldDeleteFile = sameFileCount === 0;
		}

		// 只有在没有其他引用时才删除物理文件
		if (shouldDeleteFile && originalFileName) {
			const uploadDir = join(process.cwd(), 'data', 'uploads', 'textures');
			const originalPath = join(uploadDir, originalFileName);
			if (existsSync(originalPath)) {
				await unlink(originalPath);
			}
		}

		// 从数据库删除记录
		await prisma.textureResource.delete({
			where: { id },
		});

		return NextResponse.json(
			{
				success: true,
				message: shouldDeleteFile ? '删除成功' : '记录已删除（文件仍被其他记录引用）',
			},
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	} catch (error) {
		console.error('删除纹理资源失败:', error);
		const errorMessage = error instanceof Error ? error.message : '删除纹理资源失败';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}
}
