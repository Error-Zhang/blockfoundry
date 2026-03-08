import { prisma } from '@/lib/prisma';
import { prismaSafe } from '@/app/api/lib/prismaSafe';
import { TextureResourceModel } from '@/app/api/texture-resources/interface';
import { CustomError, NotFoundError } from '@/app/api/lib/errors';

export const TextureRepo = {
	create,
	update,
	delete: deleteTexture,
	getById,
	getByFolderIds,
	countInFolder,
	findByHash,
	checkNameExists,
	copy,
	copyBatch,
	findByFolders,
};

async function getById(id: string, userId: number) {
	return prismaSafe(
		prisma.textureResource.findFirstOrThrow({
			where: { id, userId },
		})
	);
}

async function getByFolderIds(folderIds: string[], userId: number) {
	let where: any = { userId };

	if (folderIds.length > 0) {
		where.folderId = { in: folderIds };
	}

	const result = await prismaSafe(
		prisma.textureResource.findMany({
			where,
			orderBy: { createdAt: 'desc' },
		})
	);

	return result;
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
			userId
		},
	});
	return !!result;
}

async function findByFolders(folderIds: string[], userId: number) {
	return prisma.textureResource.findMany({
		where: {
			userId,
			folderId: { in: folderIds },
		},
	});
}

async function create(data: Partial<TextureResourceModel>) {
	return prisma.textureResource.create({
		data,
	} as any);
}

async function update(id: string, userId: number, data: Partial<TextureResourceModel>) {
	await getById(id, userId);

	return prisma.textureResource.update({
		where: { id },
		data,
		include: { folder: true },
	});
}

async function deleteTexture(id: string, userId: number) {
	return prisma.$transaction(async (tx) => {
		const resource = await tx.textureResource.findFirstOrThrow({
			where: { id, userId },
		});

		const sameFileCount = await tx.textureResource.count({
			where: {
				fileHash: resource.fileHash,
				id: { not: id },
			},
		});

		await tx.textureResource.delete({
			where: { id },
		});

		return {
			shouldDeleteFile: sameFileCount === 0,
			fileName: resource.fileName,
		};
	});
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