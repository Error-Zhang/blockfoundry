import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { UPLOAD_BASE_DIR } from '@/lib/constants';

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ path: string[] }> }
) {
	try {
		const params = await props.params;
		const filePath = join(UPLOAD_BASE_DIR, ...params.path);

		// 检查文件是否存在
		if (!existsSync(filePath)) {
			return NextResponse.json(
				{ error: '文件不存在' },
				{ status: 404 }
			);
		}

		// 读取文件
		const fileBuffer = await readFile(filePath);

		// 根据文件扩展名设置 Content-Type
		const ext = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();
		const contentTypeMap: Record<string, string> = {
			png: 'image/png',
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			gif: 'image/gif',
			webp: 'image/webp',
			svg: 'image/svg+xml',
		};

		const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

		// 返回文件
		return new NextResponse(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		});
	} catch (error) {
		console.error('读取文件失败:', error);
		return NextResponse.json(
			{ error: '读取文件失败' },
			{ status: 500 }
		);
	}
}