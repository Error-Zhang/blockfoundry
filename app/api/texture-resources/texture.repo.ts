import { prisma } from '@/lib/prisma';
import { prismaSafe } from '@/app/api/lib/prismaSafe';
import { TextureResourceModel } from '@/app/api/texture-resources/interface';
import { CustomError, NotFoundError } from '@/app/api/lib/errors';
import { getIncludeFolderIds } from '@/app/api/virtual-folders/service';

export const TextureRepo = {
	create,
	update,
	delete: deleteTexture,
	findById,
	countInFolder,
	clearInFolder,
	findByHash,
	checkNameExists,
	copy,
	copyBatch,
	findByFolders,
	findByIds,
};

async function findById(id: string, userId: number) {
	return prismaSafe(
		prisma.textureResource.findFirstOrThrow({
			where: { id, userId },
		})
	);
}

async function countInFolder(folderId: string, userId: number) {
	return prisma.textureResource.count({
		where: { userId, folderId },
	});
}

async function findByHash(fileHash: string, userId: number) {
	return prisma.textureResource.findFirst({
		where: { fileHash, userId },
	});
}

async function checkNameExists(name: string, folderId: string, userId: number) {
	const result = await prisma.textureResource.findFirst({
		where: {
			name,
			folderId,
			userId,
		},
	});
	return !!result;
}

async function findByFolders(folderIds: string[], userId: number,options:object={}) {
	return prisma.textureResource.findMany({
		where: {
			userId,
			folderId: { in: folderIds },
			...options,
		},
	});
}

async function findByIds(ids: string[], userId: number, options: object = {}) {
	return prisma.textureResource.findMany({
		where: {
			id: { in: ids },
			userId,
			...options,
		},
	});
}

async function create(data: Partial<TextureResourceModel>) {
	return prisma.textureResource.create({
		data,
	} as any);
}

async function update(id: string, userId: number, data: Partial<TextureResourceModel>) {
	await findById(id, userId);

	return prisma.textureResource.update({
		where: { id },
		data,
		include: { folder: true },
	});
}

async function deleteTexture(id: string, userId: number) {
	const resource = await prisma.textureResource.delete({
		where: { id, userId },
	});

	return resource;
}

async function copy(asset: TextureResourceModel, userId: number, targetFolderId: string) {
	return prisma.textureResource.create({
		data: {
			...asset,
			id: undefined,
			folderId: targetFolderId,
			usageCount: 0,
			userId,
		},
	});
}

async function copyBatch(resources: TextureResourceModel[], userId: number, targetFolderId: string) {
	return prisma.$transaction(
		resources.map((r) =>
			prisma.textureResource.create({
				data: {
					...r,
					id: undefined,
					folderId: targetFolderId,
					usageCount: 0,
					userId,
				},
			})
		)
	);
}

async function clearInFolder(folderId: string, userId: number){
	const folderIds = await getIncludeFolderIds(prisma, folderId, userId);
	const { count } = await prisma.textureResource.deleteMany({
		where: {
			userId,
			folderId: { in: folderIds },
		},
	});
	return { deletedCount: count };
}