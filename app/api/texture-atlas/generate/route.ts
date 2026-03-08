import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { generateAtlasFromFolder } from '../service';
import { SuccessResponse } from '@/app/api/lib/response';

const GenerateFromFolderBody = z.object({
	folderId: z.string().min(1, '缺少文件夹ID'),
	folderName: z.string().optional(),
});

export const POST = apiHandler({
	body: GenerateFromFolderBody,
	handler: async ({ body, user }) => {
		const { folderId, folderName } = body;
		const atlasResult = await generateAtlasFromFolder(folderId, user.id, folderName);
		return SuccessResponse(atlasResult);
	},
});
