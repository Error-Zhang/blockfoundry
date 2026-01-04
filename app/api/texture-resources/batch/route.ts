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

// POST - 批量上传纹理资源
export const POST = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const formData = await request.formData();
		const files = formData.getAll('files') as File[];
		const folderId = (formData.get('folderId') as string) || null;

		if (!files || files.length === 0) {
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

		// 确保上传目录存在
		if (!existsSync(TEXTURE_UPLOAD_DIR)) {
			await mkdir(TEXTURE_UPLOAD_DIR, { recursive: true });
		}

		const resources = [];
		const errors = [];

		// 第一步：检查所有文件是否存在冲突
		const fileChecks = [];
		for (const file of files) {
			const name = file.name.replace(/\.[^/.]+$/, '');
			fileChecks.push({ file, name });
		}

		// 批量检查数据库中是否已存在同名文件（在同一文件夹下）
		const existingNames = await prisma.textureResource.findMany({
			where: {
				userId: user.id,
				folderId: folderId || null,
				name: {
					in: fileChecks.map((c) => c.name),
				},
			},
			select: {
				name: true,
			},
		});

		const existingNameSet = new Set(existingNames.map((r) => r.name));

		// 分离冲突和非冲突文件
		const validChecks = fileChecks.filter((c) => !existingNameSet.has(c.name));
		const conflictChecks = fileChecks.filter((c) => existingNameSet.has(c.name));

		// 记录冲突的文件
		conflictChecks.forEach((c) => {
			errors.push(`纹理 "${c.file.name}" 已存在`);
		});

		// 第二步：只处理没有冲突的文件
		for (const check of validChecks) {
			try {
				const { file, name } = check;

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
				const width = metadata.width || 0;
				const height = metadata.height || 0;
				const format = metadata.format?.toUpperCase() || '???';

				// 保存到数据库
				const resource = await prisma.textureResource.create({
					data: {
						name,
						description: '',
						fileName,
						fileHash,
						width,
						height,
						format,
						fileSize: file.size,
						isPublic: true,
						tags: JSON.stringify([]),
						folderId: folderId || null,
						usageCount: 0,
						userId: user.id,
					},
				});

				resources.push({
					...resource,
					tags: [],
					url: generateFileUrl(resource.fileName),
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
});
