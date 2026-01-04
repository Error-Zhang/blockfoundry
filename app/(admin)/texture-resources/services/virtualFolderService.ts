/**
 * 虚拟文件夹 API 服务
 */

import { ApiResponse, del, get, post, put } from '@/lib/api';

export interface VirtualFolder {
	id: string;
	name: string;
	path: string;
	parentId: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * 获取虚拟文件夹列表
 */
export async function getVirtualFolders(parentPath?: string): Promise<ApiResponse<VirtualFolder[]>> {
	return get<VirtualFolder[]>('/api/virtual-folders', parentPath ? { parentPath } : undefined);
}

/**
 * 创建虚拟文件夹
 */
export async function createVirtualFolder(name: string, parentId: string): Promise<ApiResponse<VirtualFolder>> {
	return post<VirtualFolder>('/api/virtual-folders', { name, parentId });
}

/**
 * 重命名虚拟文件夹
 */
export async function renameVirtualFolder(id: string, name: string): Promise<ApiResponse<VirtualFolder>> {
	return put<VirtualFolder>(`/api/virtual-folders/${id}`, { name });
}

/**
 * 删除虚拟文件夹
 */
export async function deleteVirtualFolder(id: string): Promise<ApiResponse<void>> {
	return del<void>(`/api/virtual-folders/${id}`);
}

/**
 * 移动虚拟文件夹到新路径
 */
export async function moveVirtualFolder(id: string, targetParentId: string): Promise<ApiResponse<VirtualFolder>> {
	return post<VirtualFolder>(`/api/virtual-folders/${id}/move`, {
		targetParentId,
	});
}

/**
 * 复制虚拟文件夹
 */
export async function copyVirtualFolder(id: string, targetParentId: string): Promise<ApiResponse<VirtualFolder>> {
	return post<VirtualFolder>(`/api/virtual-folders/${id}/copy`, {
		targetParentId,
	});
}

/**
 * 下载虚拟文件夹
 */
export async function downloadVirtualFolder(folderId: string): Promise<Blob> {
	const response = await fetch('/api/virtual-folders/download', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ folderId }),
	});

	if (!response.ok) {
		throw new Error('下载失败');
	}

	return response.blob();
}

/**
 * 清空虚拟文件夹
 */
export async function clearVirtualFolder(id: string): Promise<ApiResponse<void>> {
	return post<void>('/api/virtual-folders/clear', { folderId: id });
}
