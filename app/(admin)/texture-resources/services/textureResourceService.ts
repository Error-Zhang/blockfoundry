/**
 * 纹理资源 API 服务
 */

import { ApiResponse, createFormData, del, get, put, upload } from '@/lib/api';
import type { TextureResource } from '../lib/types';

/**
 * 获取纹理资源列表
 */
export async function getTextureResources(folderPath?: string): Promise<ApiResponse<TextureResource[]>> {
	return get<TextureResource[]>('/api/texture-resources', folderPath ? { folderPath } : undefined);
}

/**
 * 获取单个纹理资源
 */
export async function getTextureResource(id: string): Promise<ApiResponse<TextureResource>> {
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
	folderPath?: string;
}

export async function createTextureResource(params: CreateTextureResourceParams | any): Promise<ApiResponse<TextureResource>> {
	const formData = createFormData()
		.appendFile('file', params.file)
		.append('name', params.name)
		.append('description', params.description || '')
		.append('tags', params.tags || [])
		.append('isPublic', params.isPublic)
		.append('folderPath', params.folderPath || '')
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
	folderPath?: string,
	onProgress?: (progress: number) => void
): Promise<ApiResponse<TextureResource[]>> {
	const formData = createFormData()
		.appendFiles('files', files)
		.append('folderPath', folderPath || '')
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
export async function copyTextureResource(id: string, newFilePath: string): Promise<ApiResponse<TextureResource>> {
	const response = await fetch('/api/texture-resources', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			action: 'copy',
			sourceId: id,
			filePath: newFilePath,
		}),
	});

	return response.json();
}
