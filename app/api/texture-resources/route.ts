import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';

// GET - 获取所有纹理资源
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const folderPath = searchParams.get('folderPath') || '';

		// 从数据库获取纹理资源列表
		const resources = await prisma.textureResource.findMany({
			where: folderPath
				? {
						filePath: {
							startsWith: folderPath,
						},
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

// POST - 创建单个纹理资源
export async function POST(request: NextRequest) {
	try {
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
		const uploadDir = join(process.cwd(), 'data', 'uploads', 'textures');
		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		// 生成唯一文件名
		const timestamp = Date.now();
		const fileExt = file.name.split('.').pop();
		const fileName = `${timestamp}_${file.name}`;
		const filePath = join(uploadDir, fileName);

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

		// 保存到数据库
		const resource = await prisma.textureResource.create({
			data: {
				name: name || file.name.replace(/\.[^/.]+$/, ''),
				description: description || '',
				fileName: file.name,
				filePath: virtualPath,
				thumbnailUrl: `/uploads/textures/${fileName}`,
				originalUrl: `/uploads/textures/${fileName}`,
				width,
				height,
				format,
				fileSize: file.size,
				isMainTexture: true,
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
