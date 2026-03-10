/**
 * 纹理资源 API 服务
 */

import { ApiResponse, createFormData, del, FormDataBuilder, get, post, put, upload } from '@/lib/api';
import type { TextureResource } from '../lib/types';

/**
 * 获取纹理资源列表
 */
export async function getTextureResources(folderId: string) {
	return get<{ totalCount: number; resources: TextureResource[] }>('/api/texture-resources', { folderId });
}

/**
 * 获取单个纹理资源
 */
export async function getTextureResource(id: string) {
	return get<TextureResource>(`/api/texture-resources/${id}`);
}

/**
 * 创建纹理资源
 */
export interface CreateTextureResourceParams {
	file: File;
	name: string;
	tags?: string[];
	isPublic: boolean;
	folderId: string;
}

export async function createTextureResource(params: CreateTextureResourceParams | any): Promise<ApiResponse<TextureResource>> {
	const formData = createFormData(params);
	return upload<TextureResource>('/api/texture-resources', formData);
}

/**
 * 更新纹理资源
 */
export async function updateTextureResource(id: string, data: Partial<TextureResource>): Promise<ApiResponse<TextureResource>> {
	return put<TextureResource>(`/api/texture-resources/${id}`, data);
}

/**
 * 删除纹理资源
 */
export async function deleteTextureResource(id: string): Promise<ApiResponse<void>> {
	return del<void>(`/api/texture-resources/${id}`);
}

/**
 * 批量上传纹理资源
 */
export async function batchUploadTextureResources(
	files: File[],
	params: {
		folderId: string;
		tags?: string[];
	},
	onProgress?: (progress: number) => void
) {
	const formData = createFormData({
		files,
		...params,
	});
	return upload<{
		successCount: number;
		failCount: number;
		results: {
			success: boolean;
			error?: string;
			data: TextureResource;
			fileName: string;
		}[];
	}>('/api/texture-resources/batch', formData, onProgress);
}

/**
 * 获取所有标签
 */
export async function getTags() {
	return await get<string[]>('/api/texture-resources/tags');
}

/**
 * 复制纹理资源
 */
export async function copyTextureResource(id: string, targetFolderId?: string): Promise<ApiResponse<TextureResource>> {
	return await put<TextureResource>('/api/texture-resources', {
		sourceId: id,
		targetFolderId,
	});
}

/**
 * 下载文件夹中的纹理资源
 */
export async function downloadFolderResources(folderId: string): Promise<Blob> {
	const response = await fetch('/api/texture-resources/download', {
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
 * 清空文件夹中的纹理资源
 */
export async function clearTextureResourceInFolder(folderId: string): Promise<ApiResponse<{ deletedCount: number }>> {
	return post<{ deletedCount: number }>('/api/texture-resources/clear-folder', { folderId });
}

/**
 * 复制文件夹中的纹理资源
 */
export async function copyFolderResources(
	sourceFolderId: string,
	folderMapping: Record<string, string>
): Promise<ApiResponse<{ count: number; resources: TextureResource[] }>> {
	return post<{ count: number; resources: TextureResource[] }>('/api/texture-resources/copy-folder', {
		sourceFolderId,
		folderMapping,
	});
}
