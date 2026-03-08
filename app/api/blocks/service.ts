import { prisma } from '@/lib/prisma';
import { getAllSubfolderIds } from '@/app/api/virtual-folders/folder-utils';

export interface BlockRenderProps {
	renderType: string;
	renderLayer: number;
}

export interface CreateBlockData {
	name: string;
	description?: string;
	folderId?: string | null;
	renderProps: BlockRenderProps;
	textures?: Record<string, any>;
	model?: Record<string, any>;
	animation?: Record<string, any>;
}

export interface UpdateBlockData {
	name?: string;
	description?: string;
	folderId?: string | null;
	renderProps?: BlockRenderProps;
	textures?: Record<string, any>;
	model?: Record<string, any>;
	animation?: Record<string, any>;
}

export const getBlockById = async (id: string, userId: number) => {
	return prisma.block.findUnique({
		where: { id, userId },
		include: { folder: true },
	});
};

export const getAllBlocks = async (
	userId: number,
	options?: {
		folderId?: string | null;
		folderIds?: string[];
	}
) => {
	const { folderId, folderIds } = options || {};
	
	let where: any = { userId };
	
	if (folderIds && folderIds.length > 0) {
		where.folderId = { in: folderIds };
	} else if (folderId !== undefined) {
		where.folderId = folderId;
	}

	return prisma.block.findMany({
		where,
		include: { folder: true },
		orderBy: { createdAt: 'desc' },
	});
};

export const getBlockCount = async (userId: number) => {
	return prisma.block.count({ where: { userId } });
};

export const createBlock = async (userId: number, data: CreateBlockData) => {
	const block = await prisma.block.create({
		data: {
			name: data.name,
			description: data.description || '',
			folderId: data.folderId || null,
			renderType: data.renderProps.renderType,
			renderLayer: data.renderProps.renderLayer,
			textures: data.textures ? JSON.stringify(data.textures) : '{}',
			model: data.model ? JSON.stringify(data.model) : null,
			animation: data.animation ? JSON.stringify(data.animation) : null,
			userId,
		},
	});

	return formatBlockResponse(block);
};

export const updateBlock = async (id: string, userId: number, data: UpdateBlockData) => {
	const updateData: any = {};

	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.folderId !== undefined) updateData.folderId = data.folderId;
	
	if (data.renderProps) {
		updateData.renderType = data.renderProps.renderType;
		updateData.renderLayer = data.renderProps.renderLayer;
	}
	
	if (data.textures !== undefined) updateData.textures = JSON.stringify(data.textures);
	if (data.model !== undefined) updateData.model = data.model ? JSON.stringify(data.model) : null;
	if (data.animation !== undefined) updateData.animation = data.animation ? JSON.stringify(data.animation) : null;

	const block = await prisma.block.update({
		where: { id },
		data: updateData,
		include: { folder: true },
	});

	return formatBlockResponse(block);
};

export const deleteBlock = async (id: string, userId: number) => {
	const block = await prisma.block.findUnique({
		where: { id, userId },
	});

	if (!block) {
		throw new Error('方块不存在');
	}

	await prisma.block.delete({ where: { id } });
	return { success: true };
};

export const formatBlockResponse = (block: any) => {
	return {
		id: block.id,
		name: block.name,
		description: block.description,
		folderId: block.folderId,
		renderProps: {
			renderType: block.renderType,
			renderLayer: block.renderLayer,
		},
		textures: block.textures ? JSON.parse(block.textures) : undefined,
		model: block.model ? JSON.parse(block.model) : undefined,
		animation: block.animation ? JSON.parse(block.animation) : undefined,
		createdAt: block.createdAt.toISOString(),
		updatedAt: block.updatedAt.toISOString(),
	};
};
