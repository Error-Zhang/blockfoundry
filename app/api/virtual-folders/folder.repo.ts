import { prisma } from '@/lib/prisma';
import { prismaSafe } from '@/app/api/lib/prismaSafe';
import { CustomError } from '@/app/api/lib/errors';
import { VirtualFolderModel } from '@/app/api/virtual-folders/interface';
import { copyFolderStructure, getAllSubfolderIds } from '@/app/api/virtual-folders/service';

export const FolderRepo = {
	getAll,
	getById,
	getByIds,
	create,
	update,
	delete: deleteFolder,
	ensureRoot,
	copy,
	move,
	upsert,
};

async function getAll(userId: number, category: string) {
	return prisma.virtualFolder.findMany({
		where: { userId, category },
		orderBy: { name: 'asc' },
	});
}

async function getById(id: string, userId: number) {
	return prismaSafe(
		prisma.virtualFolder.findFirstOrThrow({
			where: { id, userId },
		}),
		{ notFoundMessage: '文件夹不存在' }
	);
}

async function getByIds(ids: string[], userId: number) {
	return prismaSafe(
		prisma.virtualFolder.findMany({
			where: {
				id: { in: ids },
				userId,
			},
			orderBy: { name: 'asc' },
		}),
		{
			notFoundMessage: '文件夹不存在',
		}
	);
}

async function create(data: Partial<VirtualFolderModel>) {
	return prisma.virtualFolder.create({ data } as any);
}

async function update(id: string, userId: number, data: { name: string }) {
	await getById(id, userId); // 权限 + 存在校验

	return prisma.virtualFolder.update({
		where: { id },
		data,
	});
}

async function deleteFolder(id: string, userId: number) {
	return prisma.$transaction(async (tx) => {
		const subIds = await getAllSubfolderIds(tx as any, id, userId);

		await tx.virtualFolder.deleteMany({
			where: {
				userId,
				parentId: { in: subIds },
			},
		});

		return tx.virtualFolder.delete({
			where: { id },
		});
	});
}

async function ensureRoot(userId: number, category: string) {
	const existing = await prisma.virtualFolder.findFirst({
		where: {
			userId,
			parentId: null,
			category,
		},
	});

	if (existing) return existing;

	return prisma.virtualFolder.create({
		data: {
			name: 'root',
			category,
			parentId: null,
			userId,
		},
	});
}

async function move(id: string, userId: number, newParentId: string | null) {
	const folder = await getById(id, userId);

	if (newParentId === folder.id) {
		throw new CustomError('不能移动到自身');
	}

	return prisma.virtualFolder.update({
		where: { id },
		data: { parentId: newParentId },
	});
}

async function upsert(
	id: string,
	data: {
		name: string;
		parentId: string | null;
		userId: number;
		category: string;
	}
): Promise<VirtualFolderModel> {
	return prisma.virtualFolder.upsert({
		where: { id, ...data },
		update: {}, // 存在则直接返回
		create: data,
	});
}

async function copy(id: string, userId: number, targetParentId: string | null) {
	const folder = await FolderRepo.getById(id, userId);

	const folderMapping = await copyFolderStructure(folder, targetParentId);
	return {
		sourceId: folder.id,
		newId: folderMapping.get(folder.id),
		mapping: folderMapping,
	};
}

