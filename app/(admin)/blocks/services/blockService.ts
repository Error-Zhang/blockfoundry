/**
 * 方块资源 API 服务
 */

import { ApiResponse, del, get, post, put } from '@/lib/api';
import type { BlockDefinition, BlockListResponse } from '../lib/types';

/**
 * 获取方块列表
 */
export async function getBlocks(folderId?: string): Promise<ApiResponse<BlockListResponse>> {
	return get<BlockListResponse>('/api/blocks', { folderId });
}

/**
 * 获取单个方块
 */
export async function getBlock(id: string): Promise<ApiResponse<BlockDefinition>> {
	return get<BlockDefinition>(`/api/blocks/${id}`);
}

/**
 * 创建方块
 */
export async function createBlock(data: Partial<BlockDefinition> | any): Promise<ApiResponse<BlockDefinition>> {
	return post<BlockDefinition>('/api/blocks', data);
}

/**
 * 更新方块
 */
export async function updateBlock(id: string, data: Partial<BlockDefinition>): Promise<ApiResponse<BlockDefinition>> {
	return put<BlockDefinition>(`/api/blocks/${id}`, data);
}

/**
 * 删除方块
 */
export async function deleteBlock(id: string): Promise<ApiResponse<void>> {
	return del<void>(`/api/blocks/${id}`);
}

/**
 * 复制方块
 */
export async function copyBlock(id: string, targetFolderId?: string): Promise<ApiResponse<BlockDefinition>> {
	return post<BlockDefinition>('/api/blocks/copy', {
		sourceId: id,
		targetFolderId,
	});
}
