import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取虚拟文件夹列表
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const parentPath = searchParams.get('parentPath') || '';

		const folders = await prisma.virtualFolder.findMany({
			where: parentPath
				? {
						path: {
							startsWith: parentPath,
						},
					}
				: {},
			orderBy: {
				path: 'asc',
			},
		});

		return NextResponse.json({
			success: true,
			data: folders,
		});
	} catch (error) {
		console.error('获取文件夹失败:', error);
		return NextResponse.json({ success: false, error: '获取文件夹失败' }, { status: 500 });
	}
}

// POST - 创建虚拟文件夹
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { name, parentPath } = body;

		if (!name) {
			return NextResponse.json({ success: false, error: '文件夹名称不能为空' }, { status: 400 });
		}

		// 构建完整路径
		const path = parentPath ? `${parentPath}.${name}` : name;

		// 检查路径是否已存在
		const existing = await prisma.virtualFolder.findUnique({
			where: { path },
		});

		if (existing) {
			return NextResponse.json({ success: false, error: '文件夹已存在' }, { status: 400 });
		}

		// 查找父文件夹
		let parentId = null;
		if (parentPath) {
			const parent = await prisma.virtualFolder.findUnique({
				where: { path: parentPath },
			});
			parentId = parent?.id || null;
		}

		// 创建文件夹
		const folder = await prisma.virtualFolder.create({
			data: {
				name,
				path,
				parentId,
			},
		});

		return NextResponse.json({
			success: true,
			data: folder,
		});
	} catch (error) {
		console.error('创建文件夹失败:', error);
		return NextResponse.json({ success: false, error: '创建文件夹失败' }, { status: 500 });
	}
}
