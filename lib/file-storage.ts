import { join } from 'node:path';
import { DIR_NAMES } from '@/lib/constants';

const BASE_DIR = join(process.cwd(), 'data');

export const FileStorage = {
	/**
	 * 获取磁盘目录
	 */
	getDir(dirname: DIR_NAMES) {
		return join(BASE_DIR, dirname);
	},

	/**
	 * 获取文件完整路径
	 */
	getPath(dirname: DIR_NAMES, fileName: string, suffix: string = '') {
		return join(this.getDir(dirname), suffix ? `${fileName}.${suffix.toLowerCase()}` : fileName);
	},

	/**
	 * 获取访问 URL
	 */
	getUrl(dirname: DIR_NAMES, fileName: string, suffix: string = '') {
		return `/${dirname}/${suffix ? `${fileName}.${suffix.toLowerCase()}` : fileName}`;
	},
};
