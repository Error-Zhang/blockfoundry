import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { TEXTURE_UPLOAD_DIR } from '@/lib/constants';

// GET - 获取所有纹理资源
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const folderPath = searchParams.get('folderPath') || '';

		// 从数据库获取纹理资源列表
		const resources = await prisma.textureResource.findMany({
			where: folderPath
				? {
						OR: [
							// 精确匹配文件夹路径
							{ filePath: folderPath },
							// 匹配子文件（必须以 folderPath. 开头）
							{ filePath: { startsWith: `${folderPath}.` } },
						],
					}
				: {},
			orderBy: {
				createdAt: 'desc',
			},
		});


		// 转换 tags 字段（从 JSON 字符串转为数组）
		const formattedResources = resources.map((resource) => ({
			...resource,
			tags: resource.tags ? JSON.parse(resource.tags) : [],
			createdAt: resource.createdAt.toISOString().split('T')[0],
			updatedAt: resource.updatedAt.toISOString().split('T')[0],
		}));

		return NextResponse.json({
			success: true,
			data: formattedResources,
		});
	} catch (error) {
		console.error('获取纹理资源失败:', error);
		return NextResponse.json({ success: false, error: '获取纹理资源失败' }, { status: 500 });
	}
}

// POST - 创建单个纹理资源或复制资源
export async function POST(request: NextRequest) {
	try {
		const contentType = request.headers.get('content-type');

		// 处理复制操作
		if (contentType?.includes('application/json')) {
			const body = await request.json();
			const { action, sourceId, filePath } = body;

			if (action === 'copy' && sourceId && filePath) {
				// 查找源资源
				const sourceResource = await prisma.textureResource.findUnique({
					where: { id: sourceId },
				});

				if (!sourceResource) {
					return NextResponse.json({ success: false, error: '源文件不存在' }, { status: 404 });
				}

				// 检查目标路径是否已存在
				const existingResource = await prisma.textureResource.findUnique({
					where: { filePath },
				});

				if (existingResource) {
					return NextResponse.json(
						{ success: false, error: '目标路径已存在同名文件' },
						{ status: 409 }
					);
				}

				// 复制资源记录（不复制物理文件，共享同一个文件）
				const newResource = await prisma.textureResource.create({
					data: {
						name: sourceResource.name,
						description: sourceResource.description,
						fileName: sourceResource.fileName,
						filePath,
						originalUrl: sourceResource.originalUrl,
						width: sourceResource.width,
						height: sourceResource.height,
						format: sourceResource.format,
						fileSize: sourceResource.fileSize,
						isPublic: sourceResource.isPublic,
						tags: sourceResource.tags,
						usageCount: 0,
					},
				});

				return NextResponse.json({
					success: true,
					data: {
						...newResource,
						tags: newResource.tags ? JSON.parse(newResource.tags) : [],
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
		const folderPath = (formData.get('folderPath') as string) || '';

		if (!file) {
			return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 });
		}

		// 确保上传目录存在
		if (!existsSync(TEXTURE_UPLOAD_DIR)) {
			await mkdir(TEXTURE_UPLOAD_DIR, { recursive: true });
		}

		// 生成唯一文件名
		const timestamp = Date.now();
		const fileExt = file.name.split('.').pop();
		const fileName = `${timestamp}_${file.name}`;
		const filePath = join(TEXTURE_UPLOAD_DIR, fileName);

		// 保存文件
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		await writeFile(filePath, buffer);

		// 使用 sharp 获取图片尺寸
		const metadata = await sharp(filePath).metadata();
		const width = metadata.width || 256;
		const height = metadata.height || 256;
		const format = metadata.format?.toUpperCase() || 'PNG';

		// 构建虚拟路径
		const virtualPath = folderPath ? `${folderPath}.${name}` : name;

		// 检查是否已存在相同路径的资源
		const existingResource = await prisma.textureResource.findUnique({
			where: { filePath: virtualPath },
		});

		if (existingResource) {
			return NextResponse.json(
				{ 
					success: false, 
					error: `纹理 "${name}" 已存在于该路径下` 
				}, 
				{ status: 409 }
			);
		}

		// 如果有 folderPath，确保所有父文件夹都存在于虚拟文件夹表中
		if (folderPath) {
			const pathParts = folderPath.split('.');
			let currentPath = '';

			for (const part of pathParts) {
				const newPath = currentPath ? `${currentPath}.${part}` : part;

				// 检查虚拟文件夹是否存在
				const existingFolder = await prisma.virtualFolder.findUnique({
					where: { path: newPath },
				});

				// 如果不存在，创建虚拟文件夹
				if (!existingFolder) {
					// 查找父文件夹的 ID
					let parentId: string | null = null;
					if (currentPath) {
						const parentFolder = await prisma.virtualFolder.findUnique({
							where: { path: currentPath },
						});
						parentId = parentFolder?.id || null;
					}

					await prisma.virtualFolder.create({
						data: {
							name: part,
							path: newPath,
							parentId,
						},
					});
				}

				currentPath = newPath;
			}
		}

		// 保存到数据库
		const resource = await prisma.textureResource.create({
			data: {
				name: name || file.name.replace(/\.[^/.]+$/, ''),
				description: description || '',
				fileName: file.name,
				filePath: virtualPath,
				originalUrl: `/uploads/textures/${fileName}`,
				width,
				height,
				format,
				fileSize: file.size,
				isPublic,
				tags: JSON.stringify(tags ? tags.split(',') : []),
				usageCount: 0,
			},
		});

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
		console.error('上传纹理失败:', error);
		return NextResponse.json({ success: false, error: '上传纹理失败' }, { status: 500 });
	}
}
