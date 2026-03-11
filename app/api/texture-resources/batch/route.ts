import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { uploadTexturesBatch } from '@/app/api/texture-resources/service';
import { SuccessResponse } from '@/app/api/lib/response';
const UploadTexturesFormData = z.object({
	folderId: z.string(),
	files: z.union([z.instanceof(File), z.array(z.instanceof(File))]).transform((v) => (Array.isArray(v) ? v : [v])),
	tags: z.array(z.string()).optional().default([]),
});

export const POST = apiHandler({
	formData: UploadTexturesFormData,
	handler: async ({ formData, user }) => {
		const res = await uploadTexturesBatch(
			formData.files.map((file: File) => ({
				file,
				name: file.name,
				folderId: formData.folderId,
				tags: formData.tags.toString(),
				isPublic: true,
			})),
			user.id
		);
		return SuccessResponse(res);
	},
});
