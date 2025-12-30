/**
 * 虚拟文件夹 API 服务
 */

import { get, post, put, del, ApiResponse } from '@/lib/api';

export interface VirtualFolder {
	id: string;
	name: string;
	path: string;
	parentId: string | null;
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
export interface CreateVirtualFolderParams {
	name: string;
	parentPath?: string;
}

export async function createVirtualFolder(params: CreateVirtualFolderParams): Promise<ApiResponse<VirtualFolder>> {
	return post<VirtualFolder>('/api/virtual-folders', params);
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
 * 更新虚拟文件夹路径
 */
export interface UpdateVirtualFolderParams {
	name?: string;
	path?: string;
}

export async function updateVirtualFolder(id: string, params: UpdateVirtualFolderParams): Promise<ApiResponse<VirtualFolder>> {
	return put<VirtualFolder>(`/api/virtual-folders/${id}`, params);
}

/**
 * 移动虚拟文件夹到新路径
 */
export async function moveVirtualFolder(id: string, newPath: string): Promise<ApiResponse<VirtualFolder>> {
	return post<VirtualFolder>(`/api/virtual-folders/${id}/move`, { newPath });
}