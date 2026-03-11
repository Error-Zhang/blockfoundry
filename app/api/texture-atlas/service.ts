import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

import { FileStorage } from '@/lib/file-storage';
import { calculateFileHash, unlinkFiles, writeFileSafe } from '@/app/api/lib/utils';

import { AtlasRepo } from './atlas.repo';
import { AtlasSprite, TextureAtlasModel } from './interface';
import { CustomError } from '@/app/api/lib/errors';

import { TextureRepo } from '@/app/api/texture-resources/texture.repo';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { getIncludeFolderIds } from '@/app/api/virtual-folders/service';
import { DIR_NAMES } from '@/lib/constants';
import { TextureResourceModel } from '@/app/api/texture-resources/interface';

export const formatAtlasResponse = (atlas: TextureAtlasModel) => ({
	...atlas,
	imageUrl: FileStorage.getFileUrl(DIR_NAMES.ATLASES, atlas.name, atlas.format.toLowerCase()),
	jsonUrl: FileStorage.getFileUrl(DIR_NAMES.ATLASES, atlas.name, 'json'),
	createdAt: atlas.createdAt.toISOString().split('T')[0],
	updatedAt: atlas.updatedAt.toISOString().split('T')[0],
});

type LayoutItem = {
	id: string;
	name: string;
	width: number;
	height: number;
	fileName: string;
	filePath: string;
};

const buildAtlasLayout = (textures: LayoutItem[], padding = 0, maxWidth = 1024) => {
	let x = 0;
	let y = 0;
	let rowHeight = 0;

	let atlasWidth = 0;
	let atlasHeight = 0;

	const sprites: AtlasSprite[] = [];
	const overlays: sharp.OverlayOptions[] = [];

	for (const tex of textures) {
		if (x + tex.width > maxWidth) {
			x = 0;
			y += rowHeight + padding;
			rowHeight = 0;
		}

		overlays.push({
			input: tex.filePath,
			left: x,
			top: y,
		});

		sprites.push({
			id: tex.id,
			name: tex.fileName,
			x,
			y,
			width: tex.width,
			height: tex.height,
			u0: 0,
			v0: 0,
			u1: 0,
			v1: 0,
		});

		rowHeight = Math.max(rowHeight, tex.height);
		atlasWidth = Math.max(atlasWidth, x + tex.width);

		x += tex.width + padding;
	}

	atlasHeight = y + rowHeight;

	return { atlasWidth, atlasHeight, sprites, overlays };
};

const renderAtlasImage = async (width: number, height: number, overlays: sharp.OverlayOptions[], format: 'png' | 'webp') => {
	const base = sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	});

	const pipeline = base.composite(overlays);

	return format === 'webp' ? pipeline.webp({ quality: 90 }).toBuffer() : pipeline.png().toBuffer();
};

const saveAtlasFiles = async (name: string, format: 'png' | 'webp', imageBuffer: Buffer, jsonPayload: any) => {
	await FileStorage.writeFile(FileStorage.getFilePath(DIR_NAMES.ATLASES, name, format), imageBuffer);
	await FileStorage.writeFile(FileStorage.getFilePath(DIR_NAMES.ATLASES, name, 'json'), JSON.stringify(jsonPayload, null, 2));

	return imageBuffer.length;
};

const createAtlasInternal = async (
	base: { name: string; userId: number; relatedFolderId: string },
	textures: LayoutItem[],
	format: 'png' | 'webp' = 'png',
	padding = 0
) => {
	const { atlasWidth, atlasHeight, sprites, overlays } = buildAtlasLayout(textures, padding);

	if (!atlasWidth || !atlasHeight) {
		throw new CustomError('生成图集尺寸异常');
	}

	const imageBuffer = await renderAtlasImage(atlasWidth, atlasHeight, overlays, format);

	// UV 计算
	const q = (n: number) => parseFloat(n.toFixed(6));

	for (const s of sprites) {
		s.u0 = q(s.x / atlasWidth);
		s.v0 = q(s.y / atlasHeight);
		s.u1 = q((s.x + s.width) / atlasWidth);
		s.v1 = q((s.y + s.height) / atlasHeight);
	}

	const jsonPayload = {
		name: base.name,
		width: atlasWidth,
		height: atlasHeight,
		sprites,
	};

	const fileSize = await saveAtlasFiles(base.name, format, imageBuffer, jsonPayload);

	const atlas = await AtlasRepo.create({
		name: base.name,
		width: atlasWidth,
		height: atlasHeight,
		spriteCount: sprites.length,
		format: format.toUpperCase(),
		fileSize,
		hash: calculateFileHash(imageBuffer),
		userId: base.userId,
		folderId: base.relatedFolderId,
	});

	return atlas;
};

export const createAtlas = async (
	base: { name: string; userId: number; relatedFolderId: string; textures: TextureResourceModel[] },
	options: { format?: 'png' | 'webp' }
) => {
	const layoutItems: LayoutItem[] = base.textures.map((t) => ({
		...t,
		filePath: FileStorage.getFilePath(DIR_NAMES.TEXTURES, t.fileName),
	}));

	return createAtlasInternal(base, layoutItems, options.format);
};

export const deleteAtlas = async (id: string, userId: number) => {
	const atlas = await AtlasRepo.getById(id, userId);

	await FileStorage.deleteFile(DIR_NAMES.ATLASES, atlas.name, atlas.format);
	await FileStorage.deleteFile(DIR_NAMES.ATLASES, atlas.name, 'json');

	await AtlasRepo.delete(id, userId);

	return { success: true };
};
