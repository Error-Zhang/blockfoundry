import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import {  SuccessResponse} from '@/app/api/lib/response';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';

const FolderParams = z.object({
	id: z.string().min(1, '缺少文件夹ID'),
});

const UpdateFolderBody = z.object({
	name: z.string().min(1, '文件夹名称不能为空'),
});

export const DELETE = apiHandler({
	params: FolderParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		const result = await FolderRepo.delete(id, user.id);
		return SuccessResponse(result);
	},
});

export const PUT = apiHandler({
	params: FolderParams,
	body: UpdateFolderBody,
	handler: async ({ params, body, user }) => {
		const { id } = params;
		const updatedFolder = await FolderRepo.update(id, user.id, { name: body.name });
		return SuccessResponse(updatedFolder);
	},
});
