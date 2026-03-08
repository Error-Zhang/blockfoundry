import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

import { FileStorage } from '@/lib/file-storage';
import { calculateFileHash, unlinkFiles, writeFileSafe } from '@/app/api/lib/utils';

import { AtlasRepo } from './atlas.repo';
import { AtlasSprite, TextureAtlasModel } from './interface';
import { CustomError } from '@/app/api/lib/errors';

import { TextureRepo } from '@/app/api/texture-resources/texture.repo';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { getAllSubfolderIds } from '@/app/api/virtual-folders/service';
import { DIR_NAMES } from '@/lib/constants';

export const formatAtlasResponse = (atlas: TextureAtlasModel) => ({
	...atlas,
	imageUrl: FileStorage.getUrl(DIR_NAMES.ATLASES, atlas.name, atlas.format.toLowerCase()),
	jsonUrl: FileStorage.getUrl(DIR_NAMES.ATLASES, atlas.name, 'json'),
	createdAt: atlas.createdAt.toISOString().split('T')[0],
	updatedAt: atlas.updatedAt.toISOString().split('T')[0],
});

type LayoutItem = {
	id: string;
	name: string;
	width: number;
	height: number;
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
			name: tex.name,
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
	const imagePath = FileStorage.getPath(DIR_NAMES.ATLASES, `${name}.${format}`);

	const jsonPath = FileStorage.getPath(DIR_NAMES.ATLASES, `${name}.json`);

	await writeFileSafe(imagePath, imageBuffer);
	await writeFileSafe(jsonPath, JSON.stringify(jsonPayload, null, 2));

	return imageBuffer.length;
};

const createAtlasInternal = async (name: string, userId: number, textures: LayoutItem[], format: 'png' | 'webp' = 'png', padding = 2) => {
	if (textures.length < 2) {
		throw new CustomError('纹理数量不足');
	}

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
		name,
		width: atlasWidth,
		height: atlasHeight,
		sprites,
	};

	const fileSize = await saveAtlasFiles(name, format, imageBuffer, jsonPayload);

	const atlas = await AtlasRepo.create({
		name,
		width: atlasWidth,
		height: atlasHeight,
		spriteCount: sprites.length,
		format: format.toUpperCase(),
		fileSize,
		hash: calculateFileHash(imageBuffer),
		sourceTextureIds: JSON.stringify(textures.map((t) => t.id)),
		userId,
	});

	return atlas;
};

export const createAtlas = async (name: string, userId: number, options: { textureIds: string[]; format?: 'png' | 'webp' }) => {
	const textures = await prisma.textureResource.findMany({
		where: {
			id: { in: options.textureIds },
			userId,
			isPublic: true,
		},
	});

	if (!textures.length) {
		throw new CustomError('未找到可用纹理资源');
	}

	const layoutItems: LayoutItem[] = textures.map((t) => ({
		id: t.id,
		name: t.name,
		width: t.width,
		height: t.height,
		filePath: FileStorage.getPath(DIR_NAMES.TEXTURES, t.fileName),
	}));

	return createAtlasInternal(name, userId, layoutItems, options.format ?? 'png');
};

export const generateAtlasFromFolder = async (folderId: string, userId: number, newName: string) => {
	await FolderRepo.getById(folderId, userId);

	const folderIds = await getAllSubfolderIds(prisma, folderId, userId);

	const textures = await TextureRepo.getByFolderIds(folderIds, userId);

	const layoutItems: LayoutItem[] = textures.map((t) => ({
		id: t.id,
		name: t.name,
		width: t.width,
		height: t.height,
		filePath: FileStorage.getPath(DIR_NAMES.TEXTURES, t.fileName),
	}));

	return createAtlasInternal(newName, userId, layoutItems);
};

export const deleteAtlas = async (id: string, userId: number) => {
	const atlas = await AtlasRepo.getById(id, userId);

	await unlinkFiles(
		FileStorage.getPath(DIR_NAMES.ATLASES, atlas.name, atlas.format.toLowerCase()),
		FileStorage.getPath(DIR_NAMES.ATLASES, atlas.name, 'json')
	);

	await AtlasRepo.delete(id, userId);

	return { success: true };
};
