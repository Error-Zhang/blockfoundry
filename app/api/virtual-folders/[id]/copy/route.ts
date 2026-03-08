import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { SuccessResponse } from '@/app/api/lib/response';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';

const CopyFolderParams = z.object({
	id: z.string().min(1, '缺少文件夹ID'),
});

const CopyFolderBody = z.object({
	targetParentId: z.string().optional().nullable(),
});

export const POST = apiHandler({
	params: CopyFolderParams,
	body: CopyFolderBody,
	handler: async ({ params, body, user }) => {
		const { id } = params;
		const { targetParentId } = body;

		const copyResult = await FolderRepo.copy(id, user.id, targetParentId || null);

		return SuccessResponse(copyResult);
	},
});
