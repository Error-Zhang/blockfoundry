import sharp from 'sharp';
import { UVMapping, UVCoords } from './types';

/**
 * 生成纹理图集
 * @param textures 纹理数据数组 {id, buffer}
 * @param textureSize 单个纹理尺寸（假设都是正方形）
 * @returns 图集buffer和UV映射
 */
export async function generateTextureAtlas(
	textures: { id: string; buffer: Buffer }[],
	textureSize: number = 16
): Promise<{ atlasBuffer: Buffer; width: number; height: number }> {
	if (textures.length === 0) {
		throw new Error('No textures provided');
	}

	// 计算图集尺寸（使用2的幂次方）
	const texturesPerRow = Math.ceil(Math.sqrt(textures.length));
	const atlasSize = Math.pow(2, Math.ceil(Math.log2(texturesPerRow * textureSize)));

	// 创建空白图集
	const atlas = sharp({
		create: {
			width: atlasSize,
			height: atlasSize,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	});

	// 合成所有纹理
	const composites = [];
	for (let i = 0; i < textures.length; i++) {
		const row = Math.floor(i / texturesPerRow);
		const col = i % texturesPerRow;
		const x = col * textureSize;
		const y = row * textureSize;

		// 调整纹理大小
		const resizedTexture = await sharp(textures[i].buffer).resize(textureSize, textureSize).toBuffer();

		composites.push({
			input: resizedTexture,
			top: y,
			left: x,
		});
	}

	const atlasBuffer = await atlas.composite(composites).png().toBuffer();

	return {
		atlasBuffer,
		width: atlasSize,
		height: atlasSize,
	};
}

/**
 * 计算UV坐标
 */
export function calculateUVCoords(
	textureIndex: number,
	texturesPerRow: number,
	textureSize: number,
	atlasSize: number
): UVCoords {
	const row = Math.floor(textureIndex / texturesPerRow);
	const col = textureIndex % texturesPerRow;

	const u = (col * textureSize) / atlasSize;
	const v = (row * textureSize) / atlasSize;
	const width = textureSize / atlasSize;
	const height = textureSize / atlasSize;

	return { u, v, width, height };
}

/**
 * 为方块包生成完整的UV映射
 */
export function generateUVMapping(
	blocks: Array<{
		id: string;
		topTexture?: string;
		bottomTexture?: string;
		frontTexture?: string;
		backTexture?: string;
		leftTexture?: string;
		rightTexture?: string;
	}>,
	textureIdToIndex: Map<string, number>,
	texturesPerRow: number,
	textureSize: number,
	atlasSize: number
): UVMapping {
	const uvMapping: UVMapping = {};

	blocks.forEach((block) => {
		uvMapping[block.id] = {};

		const faces = ['top', 'bottom', 'front', 'back', 'left', 'right'] as const;
		faces.forEach((face) => {
			const textureKey = `${face}Texture` as keyof typeof block;
			const textureId = block[textureKey];
			if (textureId && textureIdToIndex.has(textureId)) {
				const index = textureIdToIndex.get(textureId)!;
				uvMapping[block.id][face] = calculateUVCoords(index, texturesPerRow, textureSize, atlasSize);
			}
		});
	});

	return uvMapping;
}