import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { SuccessResponse} from '@/app/api/lib/response';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { CustomError } from '@/app/api/lib/errors';

const MoveFolderParams = z.object({
	id: z.string().min(1, '缺少文件夹ID'),
});

const MoveFolderBody = z.object({
	targetParentId: z.string("缺少目标文件夹ID"),
});

export const POST = apiHandler({
	params: MoveFolderParams,
	body: MoveFolderBody,
	handler: async ({ params, body, user }) => {
		const { id } = params;
		const { targetParentId } = body;

		if (targetParentId === id) {
			throw new CustomError('不能将文件夹移动到自身');
		}

		const updatedFolder = await FolderRepo.move(id, user.id, targetParentId);

		return SuccessResponse(updatedFolder);
	},
});
