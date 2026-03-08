import { Prisma } from '@prisma/client';
import { NotFoundError } from '@/app/api/lib/errors';

export async function prismaSafe<T>(
	promise: Promise<T>,
	options?: {
		notFoundMessage?: string;
	}
): Promise<T> {
	try {
		return await promise;
	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
			throw new NotFoundError(options?.notFoundMessage);
		}

		throw err;
	}
}