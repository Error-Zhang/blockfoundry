import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';
import { copyFolderStructure, getFolderWithChildren, getFolderResources } from '../../lib/folder-utils';

// POST - 复制虚拟文件夹
export const POST = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;
		const body = await request.json();
		const { targetParentId } = body;

		// 获取源文件夹信息
		const sourceFolder = await prisma.virtualFolder.findUnique({
			where: { id, userId: user.id },
		});

		if (!sourceFolder) {
			return NextResponse.json({ success: false, error: '源文件夹不存在' }, { status: 404 });
		}

		// 确定目标父文件夹
		const newParentId = targetParentId !== undefined && targetParentId !== null ? targetParentId : sourceFolder.parentId;

		// 使用事务确保数据一致性
		const result = await prisma.$transaction(async (tx) => {
			// 复制文件夹结构
			const folderMapping = await copyFolderStructure(sourceFolder, newParentId, user.id, tx);

			// 获取源文件夹及其所有子文件夹的ID
			const sourceFolderIds = Array.from(folderMapping.keys());

			// 获取所有资源
			const resources = await getFolderResources(sourceFolderIds, user.id);

			// 复制所有资源
			for (const resource of resources) {
				const newFolderId = resource.folderId ? folderMapping.get(resource.folderId)! : folderMapping.values().next().value;

				await tx.textureResource.create({
					data: {
						name: resource.name,
						description: resource.description,
						fileName: resource.fileName,
						fileHash: resource.fileHash,
						width: resource.width,
						height: resource.height,
						format: resource.format,
						fileSize: resource.fileSize,
						isPublic: resource.isPublic,
						tags: resource.tags,
						folderId: newFolderId,
						usageCount: 0,
						userId: user.id,
					},
				});
			}

			return {
				newFolder: await tx.virtualFolder.findUnique({ where: { id: folderMapping.values().next().value } }),
				copiedFolders: folderMapping.size,
				copiedResources: resources.length,
			};
		});

		return NextResponse.json({
			success: true,
			message: '复制成功',
			data: result.newFolder,
		});
	} catch (error) {
		console.error('复制文件夹失败:', error);
		return NextResponse.json({ success: false, error: '复制文件夹失败' }, { status: 500 });
	}
});
