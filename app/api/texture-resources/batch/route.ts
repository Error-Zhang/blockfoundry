import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { TEXTURE_UPLOAD_DIR } from '@/lib/constants';

// POST - 批量上传纹理资源
export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const files = formData.getAll('files') as File[];
		const folderPath = (formData.get('folderPath') as string) || '';

		if (!files || files.length === 0) {
			return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 });
		}

		// 确保上传目录存在
		if (!existsSync(TEXTURE_UPLOAD_DIR)) {
			await mkdir(TEXTURE_UPLOAD_DIR, { recursive: true });
		}

		const resources = [];
		const errors = [];

		// 第一步：检查所有文件是否存在冲突
		const conflictChecks = [];
		for (const file of files) {
			const name = file.name.replace(/\.[^/.]+$/, '');
			const virtualPath = folderPath ? `${folderPath}.${name}` : name;
			conflictChecks.push({ file, name, virtualPath });
		}

		// 批量检查数据库中是否已存在
		const existingPaths = await prisma.textureResource.findMany({
			where: {
				filePath: {
					in: conflictChecks.map((c) => c.virtualPath),
				},
			},
			select: {
				filePath: true,
			},
		});

		const existingPathSet = new Set(existingPaths.map((r) => r.filePath));

		// 分离冲突和非冲突文件
		const validChecks = conflictChecks.filter((c) => !existingPathSet.has(c.virtualPath));
		const conflictChecks_filtered = conflictChecks.filter((c) => existingPathSet.has(c.virtualPath));

		// 记录冲突的文件
		conflictChecks_filtered.forEach((c) => {
			errors.push(`纹理 "${c.file.name}" 已存在`);
		});

		// 第二步：只处理没有冲突的文件
		for (const check of validChecks) {
			try {
				const { file, name, virtualPath } = check;
				const fileName = `${Date.now()}_${file.name}`;
				const filePath = join(TEXTURE_UPLOAD_DIR, fileName);

				// 保存文件
				const bytes = await file.arrayBuffer();
				const buffer = Buffer.from(bytes);
				await writeFile(filePath, buffer);

				// 使用 sharp 获取图片尺寸
				const metadata = await sharp(filePath).metadata();
				const width = metadata.width || 0;
				const height = metadata.height || 0;
				const format = metadata.format?.toUpperCase() || '???';

				// 保存到数据库
				const resource = await prisma.textureResource.create({
					data: {
						name,
						description: '',
						fileName: file.name,
						filePath: virtualPath,
						originalUrl: `/uploads/textures/${fileName}`,
						width,
						height,
						format,
						fileSize: file.size,
						isPublic: true,
						tags: JSON.stringify([]),
						usageCount: 0,
					},
				});

				resources.push({
					...resource,
					tags: [],
					createdAt: resource.createdAt.toISOString().split('T')[0],
					updatedAt: resource.updatedAt.toISOString().split('T')[0],
				});
			} catch (error: any) {
				errors.push(`上传 "${check.file.name}" 失败: ${error.message}`);
			}
		}

		// 返回结果，包含成功和失败信息
		return NextResponse.json({
			success: resources.length > 0,
			data: resources,
			errors: errors.length > 0 ? errors : undefined,
			message: errors.length > 0 ? `成功上传 ${resources.length} 个文件，${errors.length} 个文件失败` : `成功上传 ${resources.length} 个文件`,
		});
	} catch (error) {
		console.error('批量上传纹理失败:', error);
		return NextResponse.json({ success: false, error: '批量上传纹理失败' }, { status: 500 });
	}
}
