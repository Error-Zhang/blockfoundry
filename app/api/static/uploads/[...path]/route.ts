import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { FileStorage } from '@/lib/file-storage';
import { withErrorHandler } from '@/app/api/lib/auth-middleware';
import { FileResponse } from '@/app/api/lib/response';
import { DIR_NAMES } from '@/lib/constants';

const contentTypeMap: Record<string, string> = {
	// images
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',

	// data
	json: 'application/json',

	// text
	txt: 'text/plain',
	css: 'text/css',
	js: 'application/javascript',

	// 3D / game assets
	gltf: 'model/gltf+json',
	glb: 'model/gltf-binary',
};

export const GET = withErrorHandler(async (request: NextRequest, props: { params: Promise<{ path: string[] }> }) => {
	const params = await props.params;
	const baseDir = FileStorage.getDir(DIR_NAMES.UPLOADS);
	const filePath = join(baseDir, ...params.path);

	// 检查文件是否存在
	if (!existsSync(filePath)) {
		throw new Error('文件不存在');
	}

	// 读取文件
	const fileBuffer = await readFile(filePath);

	// 根据文件扩展名设置 Content-Type
	const ext = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();


	const contentType = contentTypeMap[ext || ''];

	if(!contentType) {
		throw new Error('不支持的文件类型');
	}

	// 返回文件
	return FileResponse(fileBuffer, {
		'Content-Type': contentType,
		'Cache-Control': 'public, max-age=31536000, immutable',
	});
});