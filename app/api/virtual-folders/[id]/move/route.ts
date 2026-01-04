import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { withAuthHandler } from '@/lib/auth-middleware';

// POST - 移动虚拟文件夹到新路径
export const POST = withAuthHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
	try {
		const { id } = await params;
		const body = await request.json();
		const { targetParentId } = body;

		// 获取当前文件夹
		const folder = await prisma.virtualFolder.findUnique({
			where: { id, userId: user.id },
		});

		if (!folder) {
			return NextResponse.json({ success: false, error: '文件夹不存在' }, { status: 404 });
		}

		// 如果移动到同一个父文件夹，直接返回
		if (folder.parentId === targetParentId) {
			return NextResponse.json({
				success: true,
				data: folder,
				message: '文件夹已在目标位置',
			});
		}

		// 计算新路径
		let newPath: string;
		if (targetParentId) {
			// 获取目标父文件夹
			const targetParent = await prisma.virtualFolder.findUnique({
				where: { id: targetParentId, userId: user.id },
			});

			if (!targetParent) {
				return NextResponse.json({ success: false, error: '目标父文件夹不存在' }, { status: 404 });
			}

			// 检查是否试图移动到自己的子文件夹
			if (targetParent.path.startsWith(`${folder.path}.`)) {
				return NextResponse.json({ success: false, error: '不能移动到自己的子文件夹' }, { status: 400 });
			}

			newPath = `${targetParent.path}.${folder.name}`;
		} else {
			// 移动到根目录
			newPath = folder.name;
		}

		const oldPath = folder.path;

		// 检查新路径是否已存在
		const existing = await prisma.virtualFolder.findFirst({
			where: { 
				path: newPath,
				userId: user.id,
			},
		});

		if (existing && existing.id !== id) {
			return NextResponse.json({ success: false, error: '目标路径已存在同名文件夹' }, { status: 400 });
		}

		// 使用事务确保数据一致性
		await prisma.$transaction(async (tx) => {
			// 1. 更新当前文件夹
			await tx.virtualFolder.update({
				where: { id },
				data: {
					path: newPath,
					parentId: targetParentId,
				},
			});

			// 2. 更新所有子文件夹的路径
			const children = await tx.virtualFolder.findMany({
				where: {
					userId: user.id,
					path: {
						startsWith: `${oldPath}.`,
					},
				},
			});

			for (const child of children) {
				const newChildPath = child.path.replace(oldPath, newPath);
				
				await tx.virtualFolder.update({
					where: { id: child.id },
					data: { 
						path: newChildPath,
					},
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
		const errorMessage = error instanceof Error ? error.message : '移动文件夹失败';
		return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
	}
});