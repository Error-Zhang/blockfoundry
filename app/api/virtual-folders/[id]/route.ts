import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE - 删除虚拟文件夹
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 检查文件夹是否存在
		const folder = await prisma.virtualFolder.findUnique({
			where: { id },
			include: {
				children: true,
			},
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在' }, { status: 404 });
		}

		// 检查是否有子文件夹
		if (folder.children.length > 0) {
			return NextResponse.json({ success: false, error: '请先删除子文件夹' }, { status: 400 });
		}

		// 检查文件夹下是否有纹理资源
		const resources = await prisma.textureResource.findMany({
			where: {
				filePath: {
					startsWith: folder.path,
				},
			},
		});

		if (resources.length > 0) {
			return NextResponse.json({ success: false, error: '文件夹下还有纹理资源，请先删除' }, { status: 400 });
		}

		// 删除文件夹
		await prisma.virtualFolder.delete({
			where: { id },
		});

		return NextResponse.json({
			success: true,
			message: '删除成功',
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