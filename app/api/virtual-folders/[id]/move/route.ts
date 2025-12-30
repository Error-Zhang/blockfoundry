import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';

// POST - 移动虚拟文件夹到新路径
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { newPath } = body;

		if (!newPath) {
			return NextResponse.json({ success: false, error: '新路径不能为空' }, { status: 400 });
		}

		// 获取当前文件夹
		const folder = await prisma.virtualFolder.findUnique({
			where: { id },
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在' }, { status: 404 });
		}

		const oldPath = folder.path;

		// 如果路径没有变化，直接返回
		if (oldPath === newPath) {
			return NextResponse.json({
				success: true,
				data: folder,
			});
		}

		// 检查新路径是否已存在
		const existing = await prisma.virtualFolder.findUnique({
			where: { path: newPath },
		});

		if (existing && existing.id !== id) {
			return NextResponse.json({ success: false, error: '目标路径已存在' }, { status: 400 });
		}

		// 从新路径中提取文件夹名称
		const pathParts = newPath.split('.');
		const newName = pathParts[pathParts.length - 1];

		// 使用事务确保数据一致性
		await prisma.$transaction(async (tx) => {
			// 1. 更新当前文件夹
			await tx.virtualFolder.update({
				where: { id },
				data: {
					name: newName,
					path: newPath,
				},
			});

			// 2. 更新所有子文件夹的路径
			const children = await tx.virtualFolder.findMany({
				where: {
					path: {
						startsWith: `${oldPath}.`,
					},
				},
			});

			for (const child of children) {
				const newChildPath = child.path.replace(oldPath, newPath);
				const childPathParts = newChildPath.split('.');
				const childName = childPathParts[childPathParts.length - 1];
				
				await tx.virtualFolder.update({
					where: { id: child.id },
					data: { 
						path: newChildPath,
						name: childName,
					},
				});
			}

			// 3. 更新所有子资源的路径
			const resources = await tx.textureResource.findMany({
				where: {
					filePath: {
						startsWith: `${oldPath}.`,
					},
				},
			});

			for (const resource of resources) {
				const newResourcePath = resource.filePath.replace(oldPath, newPath);
				await tx.textureResource.update({
					where: { id: resource.id },
					data: { filePath: newResourcePath },
				});
			}
		});

		// 返回更新后的文件夹
		const updatedFolder = await prisma.virtualFolder.findUnique({
			where: { id },
		});

		return NextResponse.json({
			success: true,
			data: updatedFolder,
			message: '文件夹移动成功',
		});
	} catch (error) {
		console.error('移动文件夹失败:', error);
		return NextResponse.json({ success: false, error: '移动文件夹失败' }, { status: 500 });
	}
}