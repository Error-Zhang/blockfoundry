import { join } from 'node:path';
import { DIR_NAMES } from '@/lib/constants';
import { unlinkFiles, writeFileSafe } from '@/app/api/lib/utils';

const BASE_DIR = join(process.cwd(), 'data');

export const FileStorage = {
	/**
	 * 获取磁盘目录
	 */
	getFileDir(dirname: DIR_NAMES) {
		return join(BASE_DIR, dirname);
	},

	/**
	 * 获取文件完整路径
	 */
	getFilePath(dirname: DIR_NAMES, fileName: string, suffix: string = '') {
		return join(this.getFileDir(dirname), suffix ? `${fileName}.${suffix.toLowerCase()}` : fileName);
	},

	/**
	 * 获取访问 URL
	 */
	getFileUrl(dirname: DIR_NAMES, fileName: string, suffix: string = '') {
		return `/${dirname}/${suffix ? `${fileName}.${suffix.toLowerCase()}` : fileName}`;
	},

	async writeFile(path: string, content: any): Promise<void> {
		await writeFileSafe(path, content);
	},

	async deleteFile(dirname: DIR_NAMES, fileName: string, suffix: string = '') {
		await unlinkFiles(FileStorage.getFilePath(dirname, fileName, suffix));
	}
};
