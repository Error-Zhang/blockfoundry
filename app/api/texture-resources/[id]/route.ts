import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';

// 生成文件URL的辅助函数
function generateFileUrl(fileName: string): string {
	return `/uploads/textures/${fileName}`;
}

// GET - 获取单个纹理资源
export const GET = withAuthHandler(async (request, { params }, user) => {
	const { id } = await params;
	try {
		const resource = await prisma.textureResource.findFirst({
			where: {
				id,
				userId: user.id,
			},
			include: {
				folder: true,
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
				url: generateFileUrl(resource.fileName),
				folderPath: resource.folder?.path || null,
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
			return NextResponse.json({ success: false, error: '纹理资源不存在或无权访问' }, { status: 404 });
		}

		// 处理 tags 字段
		const updateData: any = { ...body };
		if (body.tags) {
			updateData.tags = JSON.stringify(body.tags);
		}

		// 如果更新了 folderId，验证文件夹是否存在
		if (updateData.folderId !== undefined && updateData.folderId !== null) {
			const folder = await prisma.virtualFolder.findFirst({
				where: {
					id: updateData.folderId,
					userId: user.id,
				},
			});

			if (!folder) {
				return NextResponse.json({ success: false, error: '文件夹不存在或无权访问' }, { status: 404 });
			}
		}

		// 检查同一文件夹下是否有同名文件
		if (updateData.name || updateData.folderId !== undefined) {
			const newName = updateData.name || existingResource.name;
			const newFolderId = updateData.folderId !== undefined ? updateData.folderId : existingResource.folderId;

			const conflictResource = await prisma.textureResource.findFirst({
				where: {
					name: newName,
					folderId: newFolderId,
					userId: user.id,
					id: { not: id },
				},
			});

			if (conflictResource) {
				return NextResponse.json({ success: false, error: '目标文件夹已存在同名文件' }, { status: 400 });
			}
		}

		const resource = await prisma.textureResource.update({
			where: { id },
			data: updateData,
			include: {
				folder: true,
			},
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					...resource,
					tags: resource.tags ? JSON.parse(resource.tags) : [],
					url: generateFileUrl(resource.fileName),
					folderPath: resource.folder?.path || null,
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
			return NextResponse.json({ success: false, error: '目标路径已存在同名文件' }, { status: 400 });
		}

		const errorMessage = error instanceof Error ? error.message : '更新纹理资源失败';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{
				status: 500,
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

		// 检查是否有其他记录引用同一个文件（通过 fileHash）
		const sameFileCount = await prisma.textureResource.count({
			where: {
				fileHash: resource.fileHash,
				id: { not: id }, // 排除当前要删除的记录
			},
		});

		// 只有在没有其他引用时才删除物理文件
		const shouldDeleteFile = sameFileCount === 0;

		if (shouldDeleteFile) {
			const uploadDir = join(process.cwd(), 'data', 'uploads', 'textures');
			const filePath = join(uploadDir, resource.fileName);
			if (existsSync(filePath)) {
				await unlink(filePath);
			}
		}

		// 从数据库删除记录
		await prisma.textureResource.delete({
			where: { id },
		});

		return NextResponse.json({
			success: true,
			message: '删除成功',
		});
	} catch (error) {
		console.error('删除纹理资源失败:', error);
		const errorMessage = error instanceof Error ? error.message : '删除纹理资源失败';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{
				status: 500,
			}
		);
	}
});
