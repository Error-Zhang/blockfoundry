/**
 * 纹理资源 API 服务
 */

import { ApiResponse, createFormData, del, get, post, put, upload } from '@/lib/api';
import type { TextureResource } from '../lib/types';

/**
 * 获取纹理资源列表
 */
export async function getTextureResources(folderId?: string) {
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
	description?: string;
	tags?: string[];
	isPublic: boolean;
	folderId?: string;
}

export async function createTextureResource(params: CreateTextureResourceParams | any): Promise<ApiResponse<TextureResource>> {
	const formData = createFormData()
		.appendFile('file', params.file)
		.append('name', params.name)
		.append('description', params.description || '')
		.append('tags', params.tags || [])
		.append('isPublic', params.isPublic)
		.append('folderId', params.folderId || '')
		.build();

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
	folderId?: string,
	onProgress?: (progress: number) => void
): Promise<ApiResponse<TextureResource[]>> {
	const formData = createFormData()
		.appendFiles('files', files)
		.append('folderId', folderId || '')
		.build();

	return upload<TextureResource[]>('/api/texture-resources/batch', formData, onProgress);
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
	return await post<TextureResource>('/api/texture-resources', {
		action: 'copy',
		sourceId: id,
		targetFolderId,
	});
}
