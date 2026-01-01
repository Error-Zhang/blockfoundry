import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/with-auth-handler';

// GET - 获取单个纹理资源
export const GET = withAuthHandler(async (request, { params }, user) => {
	const { id } = await params;
	try {
		const resource = await prisma.textureResource.findFirst({
			where: { 
				id,
				userId: user.id,
			},
		});

		if (!resource) {
			return NextResponse.json({ success: false, error: '纹理资源不存在或无权访问' }, { status: 404 });
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
});

// PUT - 更新纹理资源
export const PUT = withAuthHandler(async (request, { params }, user) => {
	try {
		const { id } = await params;
		const body = await request.json();

		// 先检查资源是否存在且属于当前用户
		const existingResource = await prisma.textureResource.findFirst({
			where: { 
				id,
				userId: user.id,
			},
		});

		if (!existingResource) {
			return NextResponse.json(
				{ success: false, error: '纹理资源不存在或无权访问' },
				{ status: 404 }
			);
		}

		// 处理 tags 字段
		const updateData: any = { ...body };
		if (body.tags) {
			updateData.tags = JSON.stringify(body.tags);
		}

		// 检查 filePath 是否冲突
			if (updateData.filePath && updateData.filePath !== existingResource.filePath) {
				const conflictResource = await prisma.textureResource.findFirst({
					where: {
						filePath: updateData.filePath,
						userId: user.id,
						id: { not: id },
					},
				});

				if (conflictResource) {
					return NextResponse.json(
						{ success: false, error: '目标路径已存在同名文件' },
						{ status: 400 }
					);
				}
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
			
			// 处理 Prisma 唯一约束错误
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
				return NextResponse.json(
					{ success: false, error: '目标路径已存在同名文件' },
					{ status: 400 }
				);
			}
			
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
});

// DELETE - 删除纹理资源
export const DELETE = withAuthHandler(async (request, { params }, user) => {
	try {
		const { id } = await params;

		// 获取资源信息（确保是当前用户的资源）
		const resource = await prisma.textureResource.findFirst({
			where: { 
				id,
				userId: user.id,
			},
		});

		if (!resource) {
			return NextResponse.json({ success: false, error: '纹理资源不存在或无权访问' }, { status: 404 });
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
});
