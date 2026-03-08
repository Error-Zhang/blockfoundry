import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { deleteAtlas } from '../service';
import { SuccessResponse, ErrorResponse } from '@/app/api/lib/response';

const AtlasParams = z.object({
	id: z.string().min(1, '缺少图集ID'),
});

export const DELETE = apiHandler({
	params: AtlasParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		await deleteAtlas(id, user.id);
		return SuccessResponse(null);
	},
});
