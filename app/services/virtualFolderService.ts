/**
 * 统一的虚拟文件夹 API 服务
 * 支持通过 category 参数区分不同类型的文件夹
 */

import { del, get, post, put } from '@/lib/api';

export interface VirtualFolder {
	id: string;
	name: string;
	path: string;
	category?: string;
	parentId: string;
	createdAt: string;
	updatedAt: string;
}

export type FolderCategory = 'texture' | 'block' | 'atlas';

/**
 * 获取虚拟文件夹列表
 */
export async function getVirtualFolders(category?: FolderCategory, parentId?: string) {
	return get<VirtualFolder[]>('/api/virtual-folders', { category, parentId });
}

/**
 * 创建虚拟文件夹
 */
export async function createVirtualFolder(name: string, parentId: string, category: FolderCategory) {
	return post<VirtualFolder>('/api/virtual-folders', { name, parentId, category });
}

/**
 * 重命名虚拟文件夹
 */
export async function renameVirtualFolder(id: string, name: string) {
	return put<VirtualFolder>(`/api/virtual-folders/${id}`, { name });
}

/**
 * 删除虚拟文件夹
 */
export async function deleteVirtualFolder(id: string, isClear: boolean = false) {
	return del<{ deletedCount: number }>(`/api/virtual-folders/${id}`, { isClear });
}

/**
 * 移动虚拟文件夹到新路径
 */
export async function moveVirtualFolder(id: string, targetParentId: string) {
	return post<VirtualFolder>(`/api/virtual-folders/${id}/move`, {
		targetParentId,
	});
}

/**
 * 复制虚拟文件夹
 */
export async function copyVirtualFolder(id: string, targetParentId: string) {
	return post<Record<string, string>>(`/api/virtual-folders/${id}/copy`, {
		targetParentId,
	});
}
