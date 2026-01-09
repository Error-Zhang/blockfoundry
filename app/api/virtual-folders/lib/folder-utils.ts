import { prisma } from '@/lib/prisma';
import { VirtualFolder } from '@prisma/client';

/**
 * 获取文件夹及其所有子文件夹
 */
export async function getFolderWithChildren(folderId: string, userId: number) {
	const folder = await prisma.virtualFolder.findFirst({
		where: { id: folderId, userId },
	});

	if (!folder) {
		return null;
	}

	const children = await prisma.virtualFolder.findMany({
		where: {
			userId,
			path: { startsWith: `${folder.path}.` },
		},
		orderBy: { path: 'asc' },
	});

	return { folder, children };
}

/**
 * 获取文件夹下的所有资源
 */
export async function getFolderResources(folderIds: string[], userId: number) {
	return prisma.textureResource.findMany({
		where: {
			userId,
			folderId: { in: folderIds },
		},
	});
}

/**
 * 构建新路径
 */
export async function buildPath(name: string, parentId: string | null, userId: number): Promise<string> {
	if (!parentId) {
		return name;
	}

	const parent = await prisma.virtualFolder.findFirst({
		where: { id: parentId, userId },
	});

	if (!parent) {
		throw new Error('父文件夹不存在');
	}

	return `${parent.path}.${name}`;
}

/**
 * 检查路径是否存在
 */
export async function pathExists(path: string, userId: number, excludeId?: string): Promise<boolean> {
	const existing = await prisma.virtualFolder.findFirst({
		where: { path, userId },
	});

	return existing !== null && existing.id !== excludeId;
}

/**
 * 更新文件夹及其子文件夹的路径
 */
export async function updateFolderPaths(folderId: string, oldPath: string, newPath: string, userId: number, tx: any = prisma) {
	// 更新当前文件夹
	await tx.virtualFolder.update({
		where: { id: folderId },
		data: { path: newPath },
	});

	// 更新所有子文件夹
	const children = await tx.virtualFolder.findMany({
		where: {
			userId,
			path: { startsWith: `${oldPath}.` },
		},
	});

	for (const child of children) {
		const newChildPath = child.path.replace(oldPath, newPath);
		await tx.virtualFolder.update({
			where: { id: child.id },
			data: { path: newChildPath },
		});
	}
}

/**
 * 生成唯一的文件夹名称（处理重复）
 */
export async function generateUniqueName(
	baseName: string,
	parentId: string | null,
	userId: number,
	suffix: string = '副本'
): Promise<{ name: string; path: string }> {
	let counter = 0;
	let name = `${baseName} ${suffix}`;
	let path = await buildPath(name, parentId, userId);

	while (await pathExists(path, userId)) {
		counter++;
		name = `${baseName} ${suffix} ${counter}`;
		path = await buildPath(name, parentId, userId);
	}

	return { name, path };
}

/**
 * 复制文件夹结构（不包括资源）
 */
export async function copyFolderStructure(
	sourceFolder: VirtualFolder,
	targetParentId: string | null,
	userId: number,
	tx: any
): Promise<Map<string, string>> {
	const folderMapping = new Map<string, string>();

	// 生成新名称和路径
	const { name: newName, path: newPath } = await generateUniqueName(sourceFolder.name, targetParentId, userId);

	// 创建新文件夹
	const newFolder = await tx.virtualFolder.create({
		data: {
			name: newName,
			path: newPath,
			parentId: targetParentId,
			userId,
			category: sourceFolder.category,
		},
	});

	folderMapping.set(sourceFolder.id, newFolder.id);

	// 获取所有子文件夹
	const subFolders = await tx.virtualFolder.findMany({
		where: {
			userId,
			path: { startsWith: `${sourceFolder.path}.` },
		},
		orderBy: { path: 'asc' },
	});

	// 复制所有子文件夹
	for (const subFolder of subFolders) {
		const relativePath = subFolder.path.substring(sourceFolder.path.length + 1);
		const newSubPath = `${newPath}.${relativePath}`;
		const newSubParentId = subFolder.parentId ? folderMapping.get(subFolder.parentId) || null : null;

		const newSubFolder = await tx.virtualFolder.create({
			data: {
				name: subFolder.name,
				path: newSubPath,
				parentId: newSubParentId,
				userId,
				category: subFolder.category,
			},
		});

		folderMapping.set(subFolder.id, newSubFolder.id);
	}

	return folderMapping;
}
