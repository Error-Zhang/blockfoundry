import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { SuccessResponse } from '@/app/api/lib/response';
import { TextureRepo } from '@/app/api/texture-resources/texture.repo';

const ClearFolderBody = z.object({
	folderId: z.string().min(1, '文件夹ID不能为空'),
});

export const POST = apiHandler({
	body: ClearFolderBody,
	handler: async ({ body, user }) => {
		const result = await TextureRepo.clearInFolder(body.folderId, user.id);
		return SuccessResponse(result);
	},
});
