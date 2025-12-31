import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE - 删除虚拟文件夹
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 检查文件夹是否存在
	const folder = await prisma.virtualFolder.findUnique({
		where: { id },
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

	// 删除当前文件夹
	await prisma.virtualFolder.delete({
		where: { id },
	});

	// 删除物理文件
	const { unlink } = await import('fs/promises');
	const { join } = await import('path');
	const { existsSync } = await import('fs');

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
}

// PUT - 更新虚拟文件夹（重命名或移动）
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { name, path: newPath } = body;

		// 获取当前文件夹
		const folder = await prisma.virtualFolder.findUnique({
			where: { id },
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在' }, { status: 404 });
		}

		const oldPath = folder.path;
		let finalPath = oldPath;
		let finalName = folder.name;

		// 如果提供了新路径，直接使用
		if (newPath && newPath !== oldPath) {
			finalPath = newPath;
			// 从路径中提取名称
			const pathParts = newPath.split('.');
			finalName = pathParts[pathParts.length - 1];
		}
		// 如果只提供了新名称，构建新路径
		else if (name && name !== folder.name) {
			const pathParts = oldPath.split('.');
			pathParts[pathParts.length - 1] = name;
			finalPath = pathParts.join('.');
			finalName = name;
		}

		// 如果路径没有变化，直接返回
		if (finalPath === oldPath && finalName === folder.name) {
			return NextResponse.json({
				success: true,
				data: folder,
			});
		}

		// 检查新路径是否已存在
		const existing = await prisma.virtualFolder.findUnique({
			where: { path: finalPath },
		});

		if (existing && existing.id !== id) {
			return NextResponse.json({ success: false, error: '目标路径已存在' }, { status: 400 });
		}

		// 更新文件夹
		const updatedFolder = await prisma.virtualFolder.update({
			where: { id },
			data: {
				name: finalName,
				path: finalPath,
			},
		});

		// 更新所有子文件夹和资源的路径
		const children = await prisma.virtualFolder.findMany({
			where: {
				path: {
					startsWith: `${oldPath}.`,
				},
			},
		});

		for (const child of children) {
			const newChildPath = child.path.replace(oldPath, finalPath);
			await prisma.virtualFolder.update({
				where: { id: child.id },
				data: { path: newChildPath },
			});
		}

		const resources = await prisma.textureResource.findMany({
			where: {
				filePath: {
					startsWith: `${oldPath}.`,
				},
			},
		});

		for (const resource of resources) {
			const newResourcePath = resource.filePath.replace(oldPath, finalPath);
			await prisma.textureResource.update({
				where: { id: resource.id },
				data: { filePath: newResourcePath },
			});
		}

		return NextResponse.json({
			success: true,
			data: updatedFolder,
		});
	} catch (error) {
		console.error('更新文件夹失败:', error);
		return NextResponse.json({ success: false, error: '更新文件夹失败' }, { status: 500 });
	}
}