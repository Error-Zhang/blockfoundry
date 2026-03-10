import { prisma } from '@/lib/prisma';
import { VirtualFolderModel } from '@/app/api/virtual-folders/interface';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';

export async function getIncludeFolderIds(tx: typeof prisma, rootId: string, userId: number): Promise<string[]> {
	const result: string[] = [rootId];
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

export async function buildFolderPath(
	folderMap: Map<string, VirtualFolderModel>,
	folderId: string
): Promise<string> {
	const parts: string[] = [];
	let currentId: string | null = folderId;

	while (currentId) {
		const folder = folderMap.get(currentId);
		if (!folder) break;
		parts.unshift(folder.name);
		currentId = folder.parentId;
	}

	return parts.join('.');
}

async function generateUniqueName(baseName: string, parentId: string | null, userId: number): Promise<string> {
	let name = baseName;
	let counter = 1;

	while (true) {
		const existing = await prisma.virtualFolder.findFirst({
			where: {
				name,
				parentId,
				userId,
			},
			select: { id: true },
		});

		if (!existing) {
			return name;
		}

		counter++;
		name = `${baseName} (${counter})`;
	}
}

export async function copyFolderStructure(sourceFolder: VirtualFolderModel, targetParentId: string | null): Promise<Map<string, string>> {
	const folderMapping = new Map<string, string>();
	const userId = sourceFolder.userId;

	async function copyRecursive(source: VirtualFolderModel, newParentId: string | null, isRoot: boolean = false) {
		let folderName = source.name;

		if (isRoot) {
			folderName = await generateUniqueName(source.name, newParentId, userId);
		}

		const newFolder = await FolderRepo.create({
			name: folderName,
			parentId: newParentId,
			userId,
			category: source.category,
		});

		folderMapping.set(source.id, newFolder.id);

		const subFolders = await prisma.virtualFolder.findMany({
			where: {
				parentId: source.id,
				userId,
			},
			orderBy: { name: 'asc' },
		});

		for (const subFolder of subFolders) {
			await copyRecursive(subFolder, newFolder.id, false);
		}
	}

	await copyRecursive(sourceFolder, targetParentId, true);

	return folderMapping;
}