import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { SuccessResponse } from '@/app/api/lib/response';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { getAllSubfolderIds } from '@/app/api/virtual-folders/service';
import { prisma } from '@/lib/prisma';

const GetFoldersQuery = z.object({
	parentId: z.string().optional(),
	category: z.string().min(1, '文件夹分类不能为空'),
});

const CreateFolderBody = z.object({
	name: z.string().min(1, '文件夹名称不能为空'),
	parentId: z.string().optional(),
	category: z.string(),
});

export const GET = apiHandler({
	query: GetFoldersQuery,
	handler: async ({ query, user }) => {
		await FolderRepo.ensureRoot(user.id, query.category);
		let folders;
		if (query.parentId) {
			const ids = await getAllSubfolderIds(prisma, query.parentId, user.id);
			folders = await FolderRepo.getByIds(ids, user.id);
		}else {
			folders = await FolderRepo.getAll(user.id, query.category);
		}

		return SuccessResponse(folders);
	},
});

export const POST = apiHandler({
	body: CreateFolderBody,
	handler: async ({ body, user }) => {
		const folder = await FolderRepo.create({
			name: body.name,
			userId: user.id,
			category: body.category,
			parentId: body.parentId || null,
		});

		return SuccessResponse(folder);
	},
});
