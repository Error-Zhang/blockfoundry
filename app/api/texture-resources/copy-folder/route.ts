import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { copyFolderResources } from '@/app/api/texture-resources/service';
import { SuccessResponse } from '@/app/api/lib/response';

const CopyFolderBody = z.object({
	sourceFolderId: z.string(),
	folderMapping: z.record(z.string(), z.string()),
});

export const POST = apiHandler({
	body: CopyFolderBody,
	handler: async ({ body, user }) => {

		const result = await copyFolderResources(
			body.sourceFolderId,
			body.folderMapping,
			user.id
		);

		return SuccessResponse(result);
	},
});
