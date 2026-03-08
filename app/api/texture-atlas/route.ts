import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { createAtlas,  formatAtlasResponse } from './service';
import { ErrorResponse, SuccessResponse } from '@/app/api/lib/response';
import { AtlasRepo } from '@/app/api/texture-atlas/atlas.repo';
import { CustomError } from '@/app/api/lib/errors';

const GenerateAtlasBody = z.object({
	textureIds: z.array(z.string()).min(1, '请选择至少一个纹理'),
	name: z.string().min(1,"文件名不允许为空"),
	padding: z.number().optional(),
	maxWidth: z.number().optional(),
	maxHeight: z.number().optional(),
	gridSize: z.number().optional(),
	alignPowerOfTwo: z.boolean().optional(),
	format: z.enum(['png', 'webp']).optional(),
});

export const POST = apiHandler({
	body: GenerateAtlasBody,
	handler: async ({ body, user }) => {
		const { name ,...data} = body;
		const exist = await AtlasRepo.getByName(name, user.id);
		if (exist) {
			throw new CustomError('文件名已存在');
		}

		const result = await createAtlas(name, user.id, data);

		return SuccessResponse(result);
	},
});

export const GET = apiHandler({
	handler: async ({ user }) => {
		const atlases = await AtlasRepo.getAll(user.id);
		return SuccessResponse(atlases.map(formatAtlasResponse));
	},
});
