import { prisma } from '@/lib/prisma';
import { prismaSafe } from '@/app/api/lib/prismaSafe';
import { CustomError } from '@/app/api/lib/errors';
import { VirtualFolderModel } from '@/app/api/virtual-folders/interface';
import { copyFolderStructure, getIncludeFolderIds } from '@/app/api/virtual-folders/service';

export const FolderRepo = {
	getAll,
	getById,
	getByIds,
	create,
	update,
	deleteOrClear,
	ensureRoot,
	copy,
	move,
	upsert,
	checkNameAvailable,
};

async function getAll(userId: number, category: string) {
	return prisma.virtualFolder.findMany({
		where: { userId, category },
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

async function deleteOrClear(id: string, userId: number, isClear: boolean) {
	return prisma.$transaction(async (tx) => {
		const subIds = await getIncludeFolderIds(tx as any, id, userId);

		let { count } = await tx.virtualFolder.deleteMany({
			where: {
				userId,
				parentId: { in: subIds },
			},
		});

		if (!isClear) {
			await tx.virtualFolder.delete({
				where: { id },
			});
			count++;
		}
		return count;
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
	return await copyFolderStructure(folder, targetParentId);
}

async function checkNameAvailable(where: { id: string; name: string } | { name: string; parentId: string | null; userId: number; category: string }) {
	// 允许常见特殊符号，但不允许点号（.）
	const regex = /^[a-zA-Z0-9\u4e00-\u9fa5!@#$%^&*()\-_+=[\]{},?/~`]+$/;
	if (!regex.test(where.name)) {
		throw new CustomError('文件名称不符合规范');
	}
	const existing = await prisma.virtualFolder.findFirst({
		where,
		select: { id: true },
	});

	if (existing) {
		throw new CustomError('文件夹名称冲突');
	}
}
