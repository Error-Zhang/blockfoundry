import { ApiResponse, del, get, post } from '@/lib/api';
import { generateTextureUrl } from '@/lib/constants';

export interface TextureAtlasListItem {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  imageUrl: string;
  jsonUrl: string;
  spriteCount: number;
  createdAt: string;
  updatedAt: string;
  format: string;
  fileSize: number;
}

export async function getTextureAtlases(): Promise<ApiResponse<TextureAtlasListItem[]>> {
  return get<TextureAtlasListItem[]>('/api/texture-atlas');
}

export async function deleteTextureAtlas(id: string): Promise<ApiResponse<void>> {
  return del<void>(`/api/texture-atlas/${id}`);
}

export interface GenerateAtlasParams {
	textureIds: string[];
	name?: string;
	padding?: number;
	maxWidth?: number;
	maxHeight?: number;
	gridSize?: number;
	alignPowerOfTwo?: boolean;
	format?: 'png' | 'webp' | 'jpeg';
}

export async function generateTextureAtlas(params: GenerateAtlasParams): Promise<
	ApiResponse<{
		imageUrl: string;
		jsonUrl: string;
		width: number;
		height: number;
		spriteCount: number;
	}>
> {
	return post('/api/texture-atlas', params);
}


export async function downloadTextureAtlas(id: string): Promise<Blob> {
  const response = await fetch(`/api/texture-atlas/${id}/download`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '下载失败');
  }
  return response.blob();
}

export interface UploadAtlasResponse {
  folderId: string;
  folderName: string;
  importedCount: number;
  textures: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
  }>;
}

export async function uploadTextureAtlas(file: File): Promise<ApiResponse<UploadAtlasResponse>> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('/api/texture-atlas/upload', {
		method: 'POST',
		body: formData,
		credentials: 'include',
	});

	return await response.json();
}

export interface AtlasEditData {
  atlasId?: string;
  folderId: string;
  folderName: string;
  imageUrl: string;
  jsonUrl: string;
  width: number;
  height: number;
  spriteCount: number;
  textures: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    url: string;
  }>;
}

export async function editTextureAtlas(folderId: string, folderName: string): Promise<ApiResponse<AtlasEditData>> {
	return post<AtlasEditData>('/api/texture-atlas/generate', { folderId, folderName });
}
