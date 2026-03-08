import { prisma } from '@/lib/prisma';
import { VirtualFolderModel } from '@/app/api/virtual-folders/interface';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';

export async function getAllSubfolderIds(tx: typeof prisma, rootId: string, userId: number): Promise<string[]> {
	const result: string[] = [];
	const queue = [rootId];

	while (queue.length) {
		const parentId = queue.shift()!;

		const children = await tx.virtualFolder.findMany({
			where: { parentId, userId },
			select: { id: true },
		});

		for (const child of children) {
			result.push(child.id);
			queue.push(child.id);
		}
	}

	return result;
}

export async function copyFolderStructure(sourceFolder: VirtualFolderModel, targetParentId: string | null): Promise<Map<string, string>> {
	const folderMapping = new Map<string, string>();
	const userId = sourceFolder.userId;

	async function copyRecursive(source: VirtualFolderModel, newParentId: string | null) {
		// 存在则取，否则创建（原子操作）
		const newFolder = await FolderRepo.upsert(source.id, {
			name: source.name,
			parentId: newParentId,
			userId,
			category: source.category,
		});

		folderMapping.set(source.id, newFolder.id);

		// 查子目录
		const subFolders = await prisma.virtualFolder.findMany({
			where: {
				parentId: source.id,
				userId,
			},
			orderBy: { name: 'asc' },
		});

		// 递归复制
		for (const subFolder of subFolders) {
			await copyRecursive(subFolder, newFolder.id);
		}
	}

	await copyRecursive(sourceFolder, targetParentId);

	return folderMapping;
}