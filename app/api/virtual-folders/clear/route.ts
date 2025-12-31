import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST - 清空虚拟文件夹
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { folderId } = body;

		if (!folderId) {
			return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
		}

		// 获取文件夹信息
		const folder = await prisma.virtualFolder.findUnique({
			where: { id: folderId },
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在' }, { status: 404 });
		}

		// 获取所有子文件夹（包括嵌套的）
		const allSubFolders = await prisma.virtualFolder.findMany({
			where: {
				path: {
					startsWith: `${folder.path}.`,
				},
			},
		});

		// 获取文件夹及其所有子文件夹下的所有资源
		const resources = await prisma.textureResource.findMany({
			where: {
				OR: [
					// 当前文件夹下的资源
					{ filePath: { startsWith: `${folder.path}.` } },
					// 精确匹配当前文件夹路径的资源
					{ filePath: folder.path },
				],
			},
		});

		// 收集所有需要删除的物理文件
		const filesToDelete: string[] = [];
		const fileUrlCounts = new Map<string, number>();

		// 统计每个物理文件的引用次数
		for (const resource of resources) {
			const url = resource.originalUrl;
			fileUrlCounts.set(url, (fileUrlCounts.get(url) || 0) + 1);
		}

		// 检查每个文件是否在其他地方被引用
		for (const [url, count] of fileUrlCounts.entries()) {
			// 查询数据库中该文件的总引用次数
			const totalCount = await prisma.textureResource.count({
				where: { originalUrl: url },
			});

			// 如果总引用次数等于当前文件夹下的引用次数，说明没有其他地方引用，可以删除
			if (totalCount === count) {
				filesToDelete.push(url);
			}
		}

		// 删除所有资源记录
		await prisma.textureResource.deleteMany({
			where: {
				OR: [
					{ filePath: { startsWith: `${folder.path}.` } },
					{ filePath: folder.path },
				],
			},
		});

		// 删除所有子文件夹
		await prisma.virtualFolder.deleteMany({
			where: {
				path: {
					startsWith: `${folder.path}.`,
				},
			},
		});

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
				deletedFolders: allSubFolders.length,
				deletedResources: resources.length,
				deletedFiles: deletedFilesCount,
				preservedFiles: filesToDelete.length - deletedFilesCount,
			},
		});
	} catch (error) {
		console.error('清空文件夹失败:', error);
		return NextResponse.json({ success: false, error: '清空文件夹失败' }, { status: 500 });
	}
}