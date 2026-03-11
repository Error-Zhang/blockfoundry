import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { createAtlas,  formatAtlasResponse } from './service';
import { SuccessResponse } from '@/app/api/lib/response';
import { AtlasRepo } from '@/app/api/texture-atlas/atlas.repo';
import { FolderRepo } from '../virtual-folders/folder.repo';
import { TextureRepo } from '../texture-resources/texture.repo';

const GenerateAtlasBody = z.object({
	name: z.string().min(1, '文件名不允许为空'),
	padding: z.number().optional(),
	maxWidth: z.number().optional(),
	maxHeight: z.number().optional(),
	gridSize: z.number().optional(),
	alignPowerOfTwo: z.boolean().optional(),
	format: z.enum(['png', 'webp']).optional(),
	textureIds: z.array(z.string()).min(1, '请选择至少一个纹理'),
});

export const POST = apiHandler({
	body: GenerateAtlasBody,
	handler: async ({ body, user }) => {
		const { name, textureIds, ...options } = body;

		const data = {
			name,
			parentId: null,
			category: 'atlas',
			userId: user.id,
		};

		await AtlasRepo.checkNameAvailable(name, user.id);
		await FolderRepo.checkNameAvailable(data);

		// 1.创建一个包含图集全部纹理的文件夹
		const folder = await FolderRepo.create(data);
		const textures = await TextureRepo.findByIds(textureIds, user.id, { isPublic: true });
		const copyTextures = await TextureRepo.copyBatch(textures, user.id, folder.id);

		// 2.创建图集
		const atlas = await createAtlas({ name, userId: user.id, relatedFolderId: folder.id, textures: copyTextures }, options);

		return SuccessResponse(formatAtlasResponse(atlas));
	},
});

export const GET = apiHandler({
	handler: async ({ user }) => {
		const atlases = await AtlasRepo.getAll(user.id);
		return SuccessResponse(atlases.map(formatAtlasResponse));
	},
});
