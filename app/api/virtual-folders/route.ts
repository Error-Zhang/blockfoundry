import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { SuccessResponse } from '@/app/api/lib/response';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { getIncludeFolderIds, buildFolderPath } from '@/app/api/virtual-folders/service';
import { prisma } from '@/lib/prisma';
import { CustomError } from '@/app/api/lib/errors';

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

		const allFolders = await FolderRepo.getAll(user.id, query.category);
		const folderMap = new Map(allFolders.map((f) => [f.id, f]));

		let folders;
		if (query.parentId) {
			const ids = await getIncludeFolderIds(prisma, query.parentId, user.id);
			folders = await FolderRepo.getByIds(ids, user.id);
		} else {
			folders = allFolders;
		}

		const foldersWithPath = await Promise.all(
			folders.map(async (folder) => ({
				...folder,
				path: await buildFolderPath(folderMap, folder.id),
			}))
		);

		// 将文件夹按照更新时间重新排序
		foldersWithPath.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

		return SuccessResponse(foldersWithPath);
	},
});

export const POST = apiHandler({
	body: CreateFolderBody,
	handler: async ({ body, user }) => {
		const data = {
			name: body.name,
			userId: user.id,
			category: body.category,
			parentId: body.parentId || null,
		};

		await FolderRepo.checkNameAvailable(data);

		const folder = await FolderRepo.create(data);

		return SuccessResponse(folder);
	},
});
