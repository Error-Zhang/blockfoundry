import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';

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

		// 生成新的文件夹名称（添加"副本"后缀）
		let newName = `${sourceFolder.name} 副本`;
		let newPath: string;
		let newParentId: string | null;

		if (targetParentId !== undefined && targetParentId !== null) {
			// 如果指定了目标父文件夹
			const targetParent = await prisma.virtualFolder.findUnique({
				where: { id: targetParentId, userId: user.id },
			});
			if (!targetParent) {
				return NextResponse.json({ success: false, error: '目标父文件夹不存在' }, { status: 404 });
			}
			newParentId = targetParentId;
			newPath = `${targetParent.path}.${newName}`;
		} else {
			// 复制到同级目录
			newParentId = sourceFolder.parentId;
			if (sourceFolder.parentId) {
				const parentFolder = await prisma.virtualFolder.findUnique({
					where: { id: sourceFolder.parentId },
				});
				newPath = parentFolder ? `${parentFolder.path}.${newName}` : newName;
			} else {
				newPath = newName;
			}
		}

		// 检查新路径是否已存在，如果存在则添加数字后缀
		let counter = 1;
		let finalPath = newPath;
		let finalName = newName;
		while (
			await prisma.virtualFolder.findFirst({
				where: {
					path: finalPath,
					userId: user.id,
				},
			})
		) {
			counter++;
			finalName = `${sourceFolder.name} 副本 ${counter}`;
			if (newParentId) {
				const parentFolder = await prisma.virtualFolder.findUnique({
					where: { id: newParentId },
				});
				finalPath = parentFolder ? `${parentFolder.path}.${finalName}` : finalName;
			} else {
				finalPath = finalName;
			}
		}

		// 使用事务确保数据一致性
		const result = await prisma.$transaction(async (tx) => {
			// 创建新文件夹
			const newFolder = await tx.virtualFolder.create({
				data: {
					name: finalName,
					path: finalPath,
					parentId: newParentId,
					userId: user.id,
				},
			});

			// 获取所有子文件夹
			const subFolders = await tx.virtualFolder.findMany({
				where: {
					userId: user.id,
					path: {
						startsWith: `${sourceFolder.path}.`,
					},
				},
				orderBy: {
					path: 'asc',
				},
			});

			// 复制所有子文件夹
			const folderMapping = new Map<string, string>(); // 旧ID -> 新ID
			folderMapping.set(sourceFolder.id, newFolder.id);

			for (const subFolder of subFolders) {
				// 计算新路径
				const relativePath = subFolder.path.substring(sourceFolder.path.length + 1);
				const newSubPath = `${finalPath}.${relativePath}`;

				// 找到新的父文件夹ID
				let newSubParentId: string | null = null;
				if (subFolder.parentId) {
					newSubParentId = folderMapping.get(subFolder.parentId) || null;
				}

				// 创建子文件夹
				const newSubFolder = await tx.virtualFolder.create({
					data: {
						name: subFolder.name,
						path: newSubPath,
						parentId: newSubParentId,
						userId: user.id,
					},
				});

				folderMapping.set(subFolder.id, newSubFolder.id);
			}

			// 获取源文件夹及其所有子文件夹的ID
			const sourceFolderIds = [sourceFolder.id, ...subFolders.map((f) => f.id)];

			// 获取所有资源
			const resources = await tx.textureResource.findMany({
				where: {
					userId: user.id,
					folderId: {
						in: sourceFolderIds,
					},
				},
			});

			// 复制所有资源
			for (const resource of resources) {
				// 找到资源对应的新文件夹ID
				const newFolderId = resource.folderId ? folderMapping.get(resource.folderId) || newFolder.id : newFolder.id;

				// 创建资源副本（引用相同的物理文件）
				await tx.textureResource.create({
					data: {
						name: resource.name,
						description: resource.description,
						fileName: resource.fileName,
						fileHash: resource.fileHash, // 引用相同的物理文件
						width: resource.width,
						height: resource.height,
						format: resource.format,
						fileSize: resource.fileSize,
						isPublic: resource.isPublic,
						tags: resource.tags,
						folderId: newFolderId,
						usageCount: 0, // 新复制的资源使用次数重置为0
						userId: user.id,
					},
				});
			}

			return {
				newFolder,
				copiedFolders: subFolders.length + 1,
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
