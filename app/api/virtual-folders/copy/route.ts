import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - 复制虚拟文件夹
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { folderId, newName, targetParentId } = body;

		if (!folderId || !newName) {
			return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
		}

		// 获取源文件夹信息
		const sourceFolder = await prisma.virtualFolder.findUnique({
			where: { id: folderId },
		});

		if (!sourceFolder) {
			return NextResponse.json({ success: false, error: '源文件夹不存在' }, { status: 404 });
		}

		// 生成新的路径
		let newPath: string;
		let newParentId: string | null;

		if (targetParentId !== undefined) {
			// 如果指定了目标父文件夹
			newParentId = targetParentId;
			if (targetParentId) {
				const targetParent = await prisma.virtualFolder.findUnique({
					where: { id: targetParentId },
				});
				if (!targetParent) {
					return NextResponse.json({ success: false, error: '目标父文件夹不存在' }, { status: 404 });
				}
				newPath = `${targetParent.path}.${newName}`;
			} else {
				newPath = newName;
			}
		} else {
			// 默认复制到同级目录
			const parentPath = sourceFolder.path.split('.').slice(0, -1).join('.');
			newPath = parentPath ? `${parentPath}.${newName}` : newName;
			newParentId = sourceFolder.parentId;
		}

		// 检查新路径是否已存在
		const existingFolder = await prisma.virtualFolder.findUnique({
			where: { path: newPath },
		});

		if (existingFolder) {
			return NextResponse.json({ success: false, error: '目标路径已存在' }, { status: 400 });
		}

		// 创建新文件夹
		const newFolder = await prisma.virtualFolder.create({
			data: {
				name: newName,
				path: newPath,
				parentId: newParentId,
			},
		});

		// 获取所有子文件夹
		const subFolders = await prisma.virtualFolder.findMany({
			where: {
				path: {
					startsWith: `${sourceFolder.path}.`,
				},
			},
			orderBy: {
				path: 'asc',
			},
		});

		// 复制所有子文件夹
		const folderMapping = new Map<string, string>(); // 旧路径 -> 新路径
		folderMapping.set(sourceFolder.path, newPath);

		for (const subFolder of subFolders) {
			// 计算新路径
			const relativePath = subFolder.path.substring(sourceFolder.path.length + 1);
			const newSubPath = `${newPath}.${relativePath}`;

			// 创建子文件夹
			await prisma.virtualFolder.create({
				data: {
					name: subFolder.name,
					path: newSubPath,
					parentId: subFolder.parentId === sourceFolder.id ? newFolder.id : null,
				},
			});

			folderMapping.set(subFolder.path, newSubPath);
		}

		// 获取所有资源
		const resources = await prisma.textureResource.findMany({
			where: {
				OR: [
					{ filePath: { startsWith: `${sourceFolder.path}.` } },
					{ filePath: sourceFolder.path },
				],
			},
		});

		// 复制所有资源
		for (const resource of resources) {
			// 计算新的 filePath
			let newFilePath: string;
			if (resource.filePath === sourceFolder.path) {
				newFilePath = newPath;
			} else {
				const relativePath = resource.filePath.substring(sourceFolder.path.length + 1);
				newFilePath = `${newPath}.${relativePath}`;
			}

			// 创建资源副本（引用相同的物理文件）
		await prisma.textureResource.create({
			data: {
				name: resource.name,
				description: resource.description,
				fileName: resource.fileName,
				filePath: newFilePath,
				originalUrl: resource.originalUrl, // 引用相同的物理文件
				thumbnailUrl: resource.thumbnailUrl,
				width: resource.width,
				height: resource.height,
				format: resource.format,
				fileSize: resource.fileSize,
				isPublic: resource.isPublic,
				tags: resource.tags,
				usageCount: 0, // 新复制的资源使用次数重置为0
			},
		});
		}

		return NextResponse.json({
			success: true,
			message: '复制成功',
			data: {
				copiedFolders: subFolders.length + 1,
				copiedResources: resources.length,
			},
		});
	} catch (error) {
		console.error('复制文件夹失败:', error);
		return NextResponse.json({ success: false, error: '复制文件夹失败' }, { status: 500 });
	}
}