import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST - 清空根目录
export async function POST(request: NextRequest) {
	try {
		// 获取所有文件夹
		const allFolders = await prisma.virtualFolder.findMany();

		// 获取所有资源
		const allResources = await prisma.textureResource.findMany();

		// 如果根目录为空，直接返回
		if (allFolders.length === 0 && allResources.length === 0) {
			return NextResponse.json({
				success: true,
				message: '根目录已经是空的',
				data: {
					deletedFolders: 0,
					deletedResources: 0,
					deletedFiles: 0,
					preservedFiles: 0,
				},
			});
		}

		// 收集所有需要删除的物理文件
		const filesToDelete: string[] = [];
		const fileUrlCounts = new Map<string, number>();

		// 统计每个物理文件的引用次数
		for (const resource of allResources) {
			const url = resource.originalUrl;
			fileUrlCounts.set(url, (fileUrlCounts.get(url) || 0) + 1);
		}

		// 检查每个文件是否在其他地方被引用（由于是清空根目录，所有文件都会被删除，所以直接添加到删除列表）
		for (const [url] of fileUrlCounts.entries()) {
			filesToDelete.push(url);
		}

		// 删除所有资源记录
		await prisma.textureResource.deleteMany();

		// 删除所有文件夹
		await prisma.virtualFolder.deleteMany();

		// 删除物理文件
		let deletedFilesCount = 0;
		for (const url of filesToDelete) {
			const fileName = url.split('/').pop();
			if (fileName) {
				const uploadDir = join(process.cwd(), 'data', 'uploads', 'textures');
				const filePath = join(uploadDir, fileName);
				if (existsSync(filePath)) {
					try {
						await unlink(filePath);
						deletedFilesCount++;
					} catch (error) {
						console.error(`删除文件失败: ${filePath}`, error);
					}
				}
			}
		}

		return NextResponse.json({
			success: true,
			message: '清空成功',
			data: {
				deletedFolders: allFolders.length,
				deletedResources: allResources.length,
				deletedFiles: deletedFilesCount,
				preservedFiles: filesToDelete.length - deletedFilesCount,
			},
		});
	} catch (error) {
		console.error('清空根目录失败:', error);
		const errorMessage = error instanceof Error ? error.message : '清空根目录失败';
		return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
	}
}