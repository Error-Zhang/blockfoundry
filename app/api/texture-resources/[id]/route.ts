import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { SuccessResponse } from '@/app/api/lib/response';
import { TextureRepo } from '@/app/api/texture-resources/texture.repo';
import { formatTextureResponse } from '@/app/api/texture-resources/service';
import { CustomError } from '@/app/api/lib/errors';

const TextureParams = z.object({
	id: z.string().min(1, '缺少纹理ID'),
});

const UpdateTextureBody = z.object({
	name: z.string().optional(),
	folderId: z.string().nullable().optional(),
	tags: z.array(z.string()).optional(),
	isPublic: z.boolean().optional(),
});

export const GET = apiHandler({
	params: TextureParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		const resource = await TextureRepo.findById(id, user.id);
		return SuccessResponse(formatTextureResponse(resource));
	},
});

export const PUT = apiHandler({
	params: TextureParams,
	body: UpdateTextureBody,
	handler: async ({ params, body, user }) => {
		const { id } = params;

		const existingResource = await TextureRepo.findById(id, user.id);

		if (body.folderId === existingResource.folderId && body.name === existingResource.name) {
			throw new CustomError('文件名冲突')
		}

		const resource = await TextureRepo.update(id, user.id, body as any);
		return SuccessResponse(formatTextureResponse(resource));
	},
});

export const DELETE = apiHandler({
	params: TextureParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		const res = await TextureRepo.delete(id, user.id);
		return SuccessResponse(res);
	},
});
