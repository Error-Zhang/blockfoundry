import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { formatTextureResponse, uploadTexture } from '@/app/api/texture-resources/service';
import { SuccessResponse } from '@/app/api/lib/response';
import { TextureRepo } from '@/app/api/texture-resources/texture.repo';
import { getAllSubfolderIds } from '@/app/api/virtual-folders/service';
import { prisma } from '@/lib/prisma';
import path from 'node:path';

const GetTexturesQuery = z.object({
	folderId: z.string(),
});

const UploadTextureFormData = z.object({
	folderId: z.string(),
	file: z.instanceof(File),
	name: z.string().optional(),
	tags: z.array(z.string()).optional(),
	isPublic: z.boolean().optional(),
});

export const GET = apiHandler({
	query: GetTexturesQuery,
	handler: async ({ query, user }) => {
		let folderIds = await getAllSubfolderIds(prisma, query.folderId, user.id);

		const resources = await TextureRepo.getByFolderIds(folderIds, user.id);

		const totalCount = await TextureRepo.countInFolder(query.folderId, user.id);

		const formattedResources = resources.map(formatTextureResponse);

		return SuccessResponse({
			totalCount,
			resources: formattedResources,
		});
	},
});

export const POST = apiHandler({
	formData: UploadTextureFormData,
	handler: async ({ formData, user }) => {
		const ext = path.extname(formData.file.name);
		const name = formData.name ? formData.name + (path.extname(formData.name) ? '' : ext) : formData.file.name;
		const resource = await uploadTexture(
			formData.file,
			{
				name,
				tags: formData.tags,
				isPublic: formData.isPublic ?? true,
				folderId: formData.folderId,
			},
			user.id
		);

		return SuccessResponse(resource);
	},
});
