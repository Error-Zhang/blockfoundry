import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { getBlockById, updateBlock, deleteBlock } from './service';
import { ErrorResponse, SuccessResponse, NotFoundResponse } from '@/app/api/lib/response';

const BlockParams = z.object({
	id: z.string().min(1, '缺少方块ID'),
});

const UpdateBlockBody = z.object({
	name: z.string().optional(),
	description: z.string().optional(),
	folderId: z.string().optional(),
	renderProps: z.object({
		renderType: z.string().optional(),
		renderLayer: z.string().optional(),
	}).optional(),
	textures: z.array(z.any()).optional(),
	model: z.record(z.any()).optional(),
	animation: z.record(z.any()).optional(),
});

export const GET = apiHandler({
	params: BlockParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		const block = await getBlockById(id, user.id);

		if (!block) {
			return NotFoundResponse('方块不存在');
		}

		return SuccessResponse(block);
	},
});

export const PUT = apiHandler({
	params: BlockParams,
	body: UpdateBlockBody,
	handler: async ({ params, body, user }) => {
		const { id } = params;

		const block = await updateBlock(id, user.id, {
			name: body.name,
			description: body.description,
			folderId: body.folderId,
			renderProps: body.renderProps,
			textures: body.textures,
			model: body.model,
			animation: body.animation,
		});

		return SuccessResponse(block);
	},
});

export const DELETE = apiHandler({
	params: BlockParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		await deleteBlock(id, user.id);
		return SuccessResponse(null);
	},
});
