import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { withAuthHandler } from '@/lib/auth-middleware';

// POST - 清空虚拟文件夹
export const POST = withAuthHandler(async (request: NextRequest, context, user) => {
	try {
		const body = await request.json();
		const { folderId } = body;

		if (!folderId) {
			return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
		}

		// 获取文件夹信息（确保属于当前用户）
		const folder = await prisma.virtualFolder.findFirst({
			where: { 
				id: folderId,
				userId: user.id,
			},
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在或无权访问' }, { status: 404 });
		}

		// 获取所有子文件夹（包括嵌套的，且属于当前用户）
	const allSubFolders = await prisma.virtualFolder.findMany({
		where: {
			userId: user.id,
			path: {
				startsWith: `${folder.path}.`,
			},
		},
	});

	// 获取当前文件夹及其所有子文件夹的ID
	const folderIds = [folderId, ...allSubFolders.map(f => f.id)];

	// 获取所有需要删除的资源
	const resources = await prisma.textureResource.findMany({
		where: {
			userId: user.id,
			folderId: {
				in: folderIds,
			},
		},
	});

		// 收集所有需要删除的物理文件
		const filesToDelete: string[] = [];
		const fileHashCounts = new Map<string, number>();

		// 统计每个物理文件的引用次数
		for (const resource of resources) {
			const hash = resource.fileHash;
			fileHashCounts.set(hash, (fileHashCounts.get(hash) || 0) + 1);
		}

		// 检查每个文件是否在其他地方被引用
		for (const [hash, count] of fileHashCounts.entries()) {
			// 查询数据库中该文件的总引用次数
			const totalCount = await prisma.textureResource.count({
				where: { fileHash: hash },
			});

			// 如果总引用次数等于当前文件夹下的引用次数，说明没有其他地方引用，可以删除
			if (totalCount === count) {
				// 找到对应的文件名
				const resource = resources.find(r => r.fileHash === hash);
				if (resource) {
					filesToDelete.push(resource.fileName);
				}
			}
		}

		// 删除所有资源记录
	await prisma.textureResource.deleteMany({
		where: {
			userId: user.id,
			folderId: {
				in: folderIds,
			},
		},
	});

	// 删除所有子文件夹（只删除当前用户的）
	await prisma.virtualFolder.deleteMany({
		where: {
			userId: user.id,
			path: {
				startsWith: `${folder.path}.`,
			},
		},
	});

		// 删除物理文件
		let deletedFilesCount = 0;
		for (const fileName of filesToDelete) {
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
});