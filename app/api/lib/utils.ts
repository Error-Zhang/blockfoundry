import { unlink } from 'fs/promises';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export function calculateFileHash(buffer: Buffer): string {
	return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * writeFileSafe
 * 写文件，如果目录不存在会自动创建
 */
export async function writeFileSafe(filePath: string, data: string | Buffer) {
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true }); // 递归创建目录
	await writeFile(filePath, data);
}

/**
 * 删除文件
 * @param paths
 */
export const unlinkFiles = async (...paths: string[]) => {
	const fileList = Array.isArray(paths) ? paths : [paths];

	await Promise.all(
		fileList.map(async (filePath) => {
			try {
				await unlink(filePath);
			} catch (err: any) {
				if (err.code !== 'ENOENT') {
					throw err;
				}
			}
		})
	);
};

export const asyncPool = async <T, R>(limit: number, items: T[], iterator: (item: T) => Promise<R>): Promise<R[]> => {
	const ret: Promise<R>[] = [];
	const executing: Promise<any>[] = [];

	for (const item of items) {
		const p = Promise.resolve().then(() => iterator(item));
		ret.push(p);

		if (limit <= items.length) {
			const e: any = p.then(() => executing.splice(executing.indexOf(e), 1));
			executing.push(e);

			if (executing.length >= limit) {
				await Promise.race(executing);
			}
		}
	}

	return Promise.all(ret);
};