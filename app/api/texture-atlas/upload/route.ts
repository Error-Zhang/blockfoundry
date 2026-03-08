import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import JSZip from 'jszip';
import { withAuthHandler } from '@/app/api/lib/auth-middleware';
import { ErrorResponse } from '@/app/api/lib/response';

export const POST = withAuthHandler(async (request: NextRequest, _, user) => {
	const formData = await request.formData();
	const file = formData.get('file') as File;
	if (!file) return ErrorResponse('未上传文件');

	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);

	const zip = new JSZip();
	await zip.loadAsync(buffer);

	let imageBuffer: Buffer | null = null;
	let jsonData: {
		id: string;
		name: string;
		width: number;
		height: number;
		sprites: Array<{ id: string; name: string; x: number; y: number; width: number; height: number }>;
	} | null = null;

	const files = Object.keys(zip.files);
	for (const fileName of files) {
		if (fileName.endsWith('.png') || fileName.endsWith('.webp')) {
			imageBuffer = await zip.file(fileName)!.async('nodebuffer');
		} else if (fileName.endsWith('.json')) {
			const content = await zip.file(fileName)!.async('text');
			jsonData = JSON.parse(content);
		}
	}

	if (!imageBuffer || !jsonData) {
		return NextResponse.json({ success: false, error: '压缩包中缺少图片或JSON文件' }, { status: 400 });
	}

	if (!jsonData.sprites || jsonData.sprites.length === 0) {
		return NextResponse.json({ success: false, error: 'JSON中缺少sprites信息' }, { status: 400 });
	}

	const folderName = jsonData.name || `atlas_${Date.now()}`;
	const folderId = await findOrCreateFolder(folderName, null, user.id, 'texture');

	const atlasImage = sharp(imageBuffer);
	const importedTextures: Array<{ id: string; name: string; width: number; height: number }> = [];

	for (const sprite of jsonData.sprites) {
		let texture = await copyTexture(sprite.id, user.id);
		texture = await extractTextureFromAtlas(atlasImage, sprite, user.id, folderId, sprite.id);
		importedTextures.push(texture);
	}

	return NextResponse.json({
		success: true,
		data: {
			folderId,
			folderName,
			importedCount: importedTextures.length,
			textures: importedTextures,
		},
	});
});
