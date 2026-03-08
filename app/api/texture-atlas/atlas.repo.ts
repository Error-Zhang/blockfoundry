import { prisma } from '@/lib/prisma';
import { prismaSafe } from '@/app/api/lib/prismaSafe';
import { TextureAtlasModel } from '@/app/api/texture-atlas/interface';
import { NotFoundError } from '@/app/api/lib/errors';

export const AtlasRepo = {
	create,
	update,
	delete: deleteAtlas,
	getById,
	getByName,
	getByHash,
	getAll,
};

async function getById(id: string, userId: number) {
	return prismaSafe(
		prisma.textureAtlas.findFirstOrThrow({
			where: { id, userId },
		})
	);
}

async function getByName(name: string, userId: number) {
	return prisma.textureAtlas.findFirst({
		where: { name, userId },
	});
}

async function getByHash(hash: string, userId: number) {
	return prisma.textureAtlas.findFirst({
		where: { hash, userId },
	});
}

async function getAll(userId: number) {
	return prisma.textureAtlas.findMany({
		where: { userId },
		orderBy: { updatedAt: 'desc' },
	});
}

async function create(data: Partial<TextureAtlasModel>) {
	return prisma.textureAtlas.create({
		data: data as any,
	});
}

async function update(id: string, userId: number, data: Partial<TextureAtlasModel>) {
	await getById(id, userId);

	return prisma.textureAtlas.update({
		where: { id },
		data,
	});
}

async function deleteAtlas(id: string, userId: number) {
	const atlas = await prisma.textureAtlas.findFirst({
		where: { id, userId },
	});

	if (!atlas) {
		throw new NotFoundError('图集不存在');
	}

	await prisma.textureAtlas.delete({
		where: { id },
	});
}
