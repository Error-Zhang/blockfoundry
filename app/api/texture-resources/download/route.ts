import { z } from 'zod';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { apiHandler } from '@/app/api/lib/api-handler';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { getAllSubfolderIds } from '@/app/api/virtual-folders/service';
import { DIR_NAMES, FileStorage } from '@/lib/file-storage';
import { TextureRepo } from '@/app/api/texture-resources/texture.repo';
import { FileResponse, ZipResponse } from '@/app/api/lib/response';
import { asyncPool } from '@/app/api/lib/utils';

const DownloadResourcesBody = z.object({
	folderId: z.string().min(1, '缺少文件夹ID'),
});

export const POST = apiHandler({
	body: DownloadResourcesBody,
	handler: async ({ body, user }) => {
		const { folderId } = body;

		const folder = await FolderRepo.getById(folderId, user.id);

		const folderIds = await getAllSubfolderIds(prisma, folderId, user.id);

		const resources = await TextureRepo.getByFolderIds(folderIds, user.id);

		const zip = new JSZip();

		await asyncPool(4, resources, async (resource) => {
			try {
				const filePath = FileStorage.getPath(DIR_NAMES.TEXTURES, resource.fileName);
				const buffer = await readFile(filePath);
				zip.file(resource.fileName, buffer);
			} catch (err) {
				console.error('打包失败:', resource.name, err);
			}
		});

		const zipBuffer = await zip.generateAsync({
			type: 'nodebuffer',
		});

		return ZipResponse(zipBuffer, `${folder.name}.zip`);
	},
});
