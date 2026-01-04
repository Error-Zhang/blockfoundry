import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { TEXTURE_UPLOAD_DIR } from '@/lib/constants';
import { withAuthHandler } from '@/lib/auth-middleware';

// 生成文件URL的辅助函数
function generateFileUrl(fileName: string): string {
	return `/uploads/textures/${fileName}`;
}

// 计算文件哈希值
function calculateFileHash(buffer: Buffer): string {
	return crypto.createHash('sha256').update(buffer).digest('hex');
}

// 递归获取所有子文件夹ID
async function getAllSubfolderIds(folderId: string, userId: number): Promise<string[]> {
	const folderIds: string[] = [folderId];

	// 查找直接子文件夹
	const children = await prisma.virtualFolder.findMany({
		where: {
			parentId: folderId,
			userId: userId,
		},
		select: {
			id: true,
		},
	});

	// 递归查找每个子文件夹的子文件夹
	for (const child of children) {
		const subIds = await getAllSubfolderIds(child.id, userId);
		folderIds.push(...subIds);
	}

	return folderIds;
}

// GET - 获取所有纹理资源
export const GET = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const { searchParams } = new URL(request.url);
		const folderId = searchParams.get('folderId');

		let folderIds: string[] = [];

		if (folderId) {
			// 获取当前文件夹及其所有子文件夹的ID
			folderIds = await getAllSubfolderIds(folderId, user.id);
		}

		// 从数据库获取纹理资源列表（只获取当前用户的资源）
		const resources = await prisma.textureResource.findMany({
			where: {
				userId: user.id,
				...(folderId ? { folderId: { in: folderIds } } : { folderId: null }),
			},
			include: {
				folder: true, // 包含文件夹信息
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		// 获取该用户的资源总数
		const totalCount = await prisma.textureResource.count({
			where: {
				userId: user.id,
			},
		});

		// 转换数据格式
		const formattedResources = resources.map((resource) => ({
			...resource,
			tags: resource.tags ? JSON.parse(resource.tags) : [],
			url: generateFileUrl(resource.fileName),
			folderPath: resource.folder?.path || null,
			createdAt: resource.createdAt.toISOString().split('T')[0],
			updatedAt: resource.updatedAt.toISOString().split('T')[0],
		}));

		return NextResponse.json({
			success: true,
			data: {
				totalCount,
				resources: formattedResources,
			},
		});
	} catch (error) {
		console.error('获取纹理资源失败:', error);
		return NextResponse.json({ success: false, error: '获取纹理资源失败' }, { status: 500 });
	}
});

// POST - 创建单个纹理资源或复制资源
export const POST = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const contentType = request.headers.get('content-type');

		// 处理复制操作
		if (contentType?.includes('application/json')) {
			const body = await request.json();
			const { action, sourceId, targetFolderId } = body;

			if (action === 'copy' && sourceId) {
				// 查找源资源（确保是当前用户的资源）
				const sourceResource = await prisma.textureResource.findFirst({
					where: {
						id: sourceId,
						userId: user.id,
					},
				});

				if (!sourceResource) {
					return NextResponse.json({ success: false, error: '源文件不存在或无权访问' }, { status: 404 });
				}

				// 如果指定了目标文件夹，验证文件夹是否存在
				if (targetFolderId) {
					const targetFolder = await prisma.virtualFolder.findFirst({
						where: {
							id: targetFolderId,
							userId: user.id,
						},
					});

					if (!targetFolder) {
						return NextResponse.json({ success: false, error: '目标文件夹不存在或无权访问' }, { status: 404 });
					}
				}

				// 检查目标文件夹中是否已存在同名文件
				const existingResource = await prisma.textureResource.findFirst({
					where: {
						name: sourceResource.name,
						folderId: targetFolderId || null,
						userId: user.id,
					},
				});

				if (existingResource) {
					return NextResponse.json({ success: false, error: '目标文件夹已存在同名文件' }, { status: 409 });
				}

				// 复制资源记录（不复制物理文件，共享同一个文件）
				const newResource = await prisma.textureResource.create({
					data: {
						name: sourceResource.name,
						description: sourceResource.description,
						fileName: sourceResource.fileName,
						fileHash: sourceResource.fileHash,
						width: sourceResource.width,
						height: sourceResource.height,
						format: sourceResource.format,
						fileSize: sourceResource.fileSize,
						isPublic: sourceResource.isPublic,
						tags: sourceResource.tags,
						folderId: targetFolderId || null,
						usageCount: 0,
						userId: user.id,
					},
				});

				return NextResponse.json({
					success: true,
					data: {
						...newResource,
						tags: newResource.tags ? JSON.parse(newResource.tags) : [],
						url: generateFileUrl(newResource.fileName),
						createdAt: newResource.createdAt.toISOString().split('T')[0],
						updatedAt: newResource.updatedAt.toISOString().split('T')[0],
					},
				});
			}

			return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
		}

		// 处理文件上传
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const tags = formData.get('tags') as string;
		const isPublic = formData.get('isPublic') === 'true';
		const folderId = (formData.get('folderId') as string) || null;

		if (!file) {
			return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 });
		}

		// 如果指定了文件夹，验证文件夹是否存在
		if (folderId) {
			const folder = await prisma.virtualFolder.findFirst({
				where: {
					id: folderId,
					userId: user.id,
				},
			});

			if (!folder) {
				return NextResponse.json({ success: false, error: '文件夹不存在或无权访问' }, { status: 404 });
			}
		}

		// 检查是否已存在同名文件（在同一文件夹下）
		const existingResource = await prisma.textureResource.findFirst({
			where: {
				name: name || file.name.replace(/\.[^/.]+$/, ''),
				folderId: folderId || null,
				userId: user.id,
			},
		});

		if (existingResource) {
			return NextResponse.json(
				{
					success: false,
					error: `纹理 "${name || file.name}" 已存在于该文件夹下`,
				},
				{ status: 409 }
			);
		}

		// 确保上传目录存在
		if (!existsSync(TEXTURE_UPLOAD_DIR)) {
			await mkdir(TEXTURE_UPLOAD_DIR, { recursive: true });
		}

		// 读取文件内容
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// 计算文件哈希值
		const fileHash = calculateFileHash(buffer);

		// 检查是否已存在相同哈希的文件（去重）
		const existingFile = await prisma.textureResource.findFirst({
			where: {
				fileHash,
				userId: user.id,
			},
		});

		let fileName: string;
		let filePath: string;

		if (existingFile) {
			// 文件已存在，复用现有文件
			fileName = existingFile.fileName;
			filePath = join(TEXTURE_UPLOAD_DIR, fileName);
		} else {
			// 新文件，保存到磁盘
			const timestamp = Date.now();
			fileName = `${timestamp}_${file.name}`;
			filePath = join(TEXTURE_UPLOAD_DIR, fileName);
			await writeFile(filePath, buffer);
		}

		// 使用 sharp 获取图片尺寸
		const metadata = await sharp(filePath).metadata();
		const width = metadata.width || 256;
		const height = metadata.height || 256;
		const format = metadata.format?.toUpperCase() || 'PNG';

		// 保存到数据库
		const resource = await prisma.textureResource.create({
			data: {
				name: name || file.name.replace(/\.[^/.]+$/, ''),
				description: description || '',
				fileName,
				fileHash,
				width,
				height,
				format,
				fileSize: file.size,
				isPublic,
				tags: JSON.stringify(tags ? tags.split(',') : []),
				folderId: folderId || null,
				usageCount: 0,
				userId: user.id,
			},
		});

		return NextResponse.json({
			success: true,
			data: {
				...resource,
				tags: resource.tags ? JSON.parse(resource.tags) : [],
				url: generateFileUrl(resource.fileName),
				createdAt: resource.createdAt.toISOString().split('T')[0],
				updatedAt: resource.updatedAt.toISOString().split('T')[0],
			},
		});
	} catch (error) {
		console.error('上传纹理失败:', error);
		return NextResponse.json({ success: false, error: '上传纹理失败' }, { status: 500 });
	}
});
