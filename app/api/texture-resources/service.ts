import { FileStorage } from '@/lib/file-storage';
import sharp from 'sharp';
import { TextureResourceModel, UploadResult, UploadTextureParams } from '@/app/api/texture-resources/interface';
import { TextureRepo } from '@/app/api/texture-resources/texture.repo';
import { FolderRepo } from '@/app/api/virtual-folders/folder.repo';
import { asyncPool, calculateFileHash, writeFileSafe } from '@/app/api/lib/utils';
import { DIR_NAMES } from '@/lib/constants';
import { CustomError } from '@/app/api/lib/errors';
import { getIncludeFolderIds } from '@/app/api/virtual-folders/service';
import { prisma } from '@/lib/prisma';
import path from 'node:path';

const processSingleTexture = async (
	file: File,
	params: {
		name: string;
		tags: string;
		isPublic: boolean;
		folderId: string;
	},
	userId: number
) => {
	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);

	const fileHash = calculateFileHash(buffer);

	const existingFile = await TextureRepo.findByHash(fileHash, userId);

	let savedFileName: string;
	let filePath: string;

	if (existingFile) {
		savedFileName = existingFile.fileName;
		filePath = FileStorage.getFilePath(DIR_NAMES.TEXTURES, savedFileName);
	} else {
		const timestamp = Date.now();
		savedFileName = `${timestamp}_${params.name}`;
		filePath = FileStorage.getFilePath(DIR_NAMES.TEXTURES, savedFileName);
		await writeFileSafe(filePath, buffer);
	}

	const metadata = await sharp(filePath).metadata();

	return {
		name: path.parse(params.name).name,
		fileName: savedFileName,
		fileHash,
		width: metadata.width!,
		height: metadata.height!,
		format: metadata.format!.toUpperCase(),
		fileSize: file.size,
		isPublic: params.isPublic,
		tags: params.tags,
		folderId: params.folderId,
		userId,
	} as Partial<TextureResourceModel>;
};

/**
 * 单个文件上传核心逻辑
 */
const uploadSingleTexture = async (item: UploadTextureParams, userId: number): Promise<UploadResult> => {
	try {
		const exist = await TextureRepo.checkNameExists(item.name, item.folderId, userId);

		if (exist) {
			return {
				success: false,
				error: '文件名冲突',
				fileName: item.name,
			};
		}

		const data = await processSingleTexture(item.file, item, userId);
		const texture = await TextureRepo.create(data);

		return {
			success: true,
			data: texture,
			fileName: item.name,
		};
	} catch (err) {
		console.error(err);

		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error',
			fileName: item.name,
		};
	}
};

/**
 * 批量上传
 */
export const uploadTexturesBatch = async (files: UploadTextureParams[], userId: number) => {
	const results: UploadResult[] = await asyncPool(4, files, (item) => uploadSingleTexture(item, userId));

	const successCount = results.filter((r) => r.success).length;
	const failCount = results.length - successCount;

	return {
		successCount,
		failCount,
		results,
	};
};

/**
 * 单文件上传
 */
export const uploadTexture = async (file: File, params: Omit<UploadTextureParams, 'file'>, userId: number) => {
	const result = await uploadSingleTexture({ file, ...params }, userId);

	if (!result.success) {
		throw new CustomError(result.error);
	}

	return result.data;
};

export const formatTextureResponse = (resource: TextureResourceModel) => {
	return {
		...resource,
		tags: resource.tags ? JSON.parse(resource.tags) : [],
		url: FileStorage.getFileUrl(DIR_NAMES.TEXTURES, resource.fileName),
		createdAt: resource.createdAt.toISOString().split('T')[0],
		updatedAt: resource.updatedAt.toISOString().split('T')[0],
	};
};

export const copyTexture = async (resourceId: string, targetFolderId: string, userId: number) => {
	const resource = await TextureRepo.findById(resourceId, userId);
	
	if (!resource) {
		throw new CustomError('资源不存在');
	}

	const exit = await TextureRepo.checkNameExists(resource.name, targetFolderId, userId);

	if(exit){
		throw new CustomError('文件名冲突');
	}

	const copiedResource = await TextureRepo.copy(resource, userId, targetFolderId);

	return formatTextureResponse(copiedResource);
};

export const copyFolderResources = async (
	sourceFolderId: string,
	folderMapping: Record<string, string>,
	userId: number
) => {
	const sourceFolder = await FolderRepo.getById(sourceFolderId, userId);

	if (!sourceFolder) {
		throw new CustomError('源文件夹不存在');
	}

	const allFolderIds = await getIncludeFolderIds(prisma, sourceFolderId, userId);
	const resources = await TextureRepo.findByFolders(allFolderIds, userId);

	const groupedByTargetFolder = new Map<string, typeof resources>();

	for (const resource of resources) {
		const targetFolderId = folderMapping[resource.folderId];
		if (!targetFolderId) {
			console.error('文件夹映射不完整:' + resource.folderId);
			continue;
		}

		if (!groupedByTargetFolder.has(targetFolderId)) {
			groupedByTargetFolder.set(targetFolderId, []);
		}
		groupedByTargetFolder.get(targetFolderId)!.push(resource);
	}

	const allCopiedResources: typeof resources = [];

	for (const [targetFolderId, folderResources] of groupedByTargetFolder) {
		const copied = await TextureRepo.copyBatch(folderResources, userId, targetFolderId);
		allCopiedResources.push(...copied);
	}

	return {
		count: allCopiedResources.length,
		resources: allCopiedResources.map(formatTextureResponse),
	};
};
