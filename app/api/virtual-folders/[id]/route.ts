import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';
import { buildPath, pathExists, updateFolderPaths } from '../lib/folder-utils';

// DELETE - 删除虚拟文件夹
export const DELETE = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;

		// 检查文件夹是否存在且属于当前用户
	const folder = await prisma.virtualFolder.findFirst({
		where: { 
			id,
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
	const folderIds = [id, ...allSubFolders.map(f => f.id)];

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

	// 删除当前文件夹
	await prisma.virtualFolder.delete({
		where: { id },
	});

	// 删除物理文件
	const { unlink } = await import('fs/promises');
	const { join } = await import('path');
	const { existsSync } = await import('fs');

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
			message: '删除成功',
			data: {
				deletedFolders: allSubFolders.length + 1,
				deletedResources: resources.length,
				deletedFiles: deletedFilesCount,
				preservedFiles: filesToDelete.length - deletedFilesCount,
			},
		});
	} catch (error) {
		console.error('删除文件夹失败:', error);
		return NextResponse.json({ success: false, error: '删除文件夹失败' }, { status: 500 });
	}
});

// PUT - 更新虚拟文件夹（重命名或移动）
export const PUT = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;
		const body = await request.json();
		const { name, path: newPath } = body;

		// 获取当前文件夹（确保属于当前用户）
		const folder = await prisma.virtualFolder.findFirst({
			where: { 
				id,
				userId: user.id,
			},
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在或无权访问' }, { status: 404 });
		}

		const oldPath = folder.path;
		let finalPath = oldPath;
		let finalName = folder.name;

		// 处理重命名
		if (name && name !== folder.name) {
			finalName = name;
			finalPath = await buildPath(name, folder.parentId, user.id);

			// 检查新路径是否已存在
			if (await pathExists(finalPath, user.id, id)) {
				return NextResponse.json({ success: false, error: '目标路径已存在' }, { status: 400 });
			}
		} else if (finalPath === oldPath) {
			return NextResponse.json({ success: true, data: folder });
		}

		// 使用事务更新文件夹及其子文件夹
		const updatedFolder = await prisma.$transaction(async (tx) => {
			const updated = await tx.virtualFolder.update({
				where: { id },
				data: { name: finalName },
			});
			await updateFolderPaths(id, oldPath, finalPath, user.id, tx);
			return updated;
		});

		return NextResponse.json({ success: true, data: updatedFolder });
	} catch (error) {
		console.error('更新文件夹失败:', error);
		return NextResponse.json({ success: false, error: '更新文件夹失败' }, { status: 500 });
	}
});