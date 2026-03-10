import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import {  SuccessResponse} from '@/app/api/lib/response';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';

const FolderParams = z.object({
	id: z.string().min(1, '缺少文件夹ID'),
});

const FolderQuery = z.object({
	isClear: z.enum(['true', 'false']).transform(val => val === 'true').optional().default(false),
});

const UpdateFolderBody = z.object({
	name: z.string().min(1, '文件夹名称不能为空'),
});

export const DELETE = apiHandler({
	query:FolderQuery,
	params: FolderParams,
	handler: async ({ params,query, user }) => {
		console.log(query);
		const count = await FolderRepo.deleteOrClear(params.id, user.id, query.isClear);
		return SuccessResponse({
			deleteCount: count,
		});
	},
});

export const PUT = apiHandler({
	params: FolderParams,
	body: UpdateFolderBody,
	handler: async ({ params, body, user }) => {
		const { id } = params;
		await FolderRepo.checkNameAvailable({ id, name: body.name });
		const updatedFolder = await FolderRepo.update(id, user.id, { name: body.name });
		return SuccessResponse(updatedFolder);
	},
});
