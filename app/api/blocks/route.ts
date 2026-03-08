import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { getAllBlocks, getBlockCount, createBlock } from './service';
import { getAllSubfolderIds } from '@/app/api/virtual-folders/folder-utils';
import { SuccessResponse, ErrorResponse } from '@/app/api/lib/response';

const GetBlocksQuery = z.object({
	folderId: z.string().optional(),
});

const CreateBlockBody = z.object({
	name: z.string().min(1, '名称不能为空'),
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
	query: GetBlocksQuery,
	handler: async ({ query, user }) => {
		let folderIds: string[] = [];

		if (query.folderId) {
			folderIds = await getAllSubfolderIds(query.folderId, user.id);
		}

		const blocks = await getAllBlocks(user.id, {
			folderIds: folderIds.length > 0 ? folderIds : undefined,
		});

		const totalCount = await getBlockCount(user.id);

		const formattedBlocks = blocks.map((block: any) => ({
			id: block.id,
			name: block.name,
			description: block.description,
			folderId: block.folderId,
			renderProps: {
				renderType: block.renderType,
				renderLayer: block.renderLayer,
			},
			textures: block.textures ? JSON.parse(block.textures) : undefined,
			model: block.model ? JSON.parse(block.model) : undefined,
			animation: block.animation ? JSON.parse(block.animation) : undefined,
			createdAt: block.createdAt.toISOString(),
			updatedAt: block.updatedAt.toISOString(),
		}));

		return SuccessResponse({
			totalCount,
			blocks: formattedBlocks,
		});
	},
});

export const POST = apiHandler({
	body: CreateBlockBody,
	handler: async ({ body, user }) => {
		const block = await createBlock(user.id, {
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
