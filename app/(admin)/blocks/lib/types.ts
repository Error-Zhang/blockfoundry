type TextureID = string;

export type BlockRenderType = 'none' | 'cube' | 'cross' | 'model' | 'fluid';

export type BlockRenderLayer = 'solid' | 'cutout' | 'translucent';

export interface Faces {
	up?: TextureID;
	down?: TextureID;
	left?: TextureID;
	right?: TextureID;
	front?: TextureID;
	back?: TextureID;
}

export interface BlockTextures {
	normal?: Faces;
	emissive?: Faces;
	roughness?: Faces;
	metallic?: Faces;
	albedo: TextureID; // 基础纹理，如果某面没有配置默认使用albedo
}

export interface ModelTransform {
	rotation?: [number, number, number];
	translation?: [number, number, number];
	scale?: [number, number, number];
}

export interface BlockModel {
	path: string;
	transform?: ModelTransform;
}

export interface BlockRenderProps {
	renderType: BlockRenderType;
	renderLayer: BlockRenderLayer;
}

export interface BlockAnimation {
	fames: TextureID[];
	frameDuration: number;
}

export interface BlockDefinition {
	id: string;
	name: string;
	description?: string;
	folderId: string;
	renderProps: BlockRenderProps;
	textures?: BlockTextures;
	model?: BlockModel;
	animation?: BlockAnimation;
	createdAt: string;
	updatedAt: string;
}

// API 响应类型
export interface BlockListResponse {
	totalCount: number;
	blocks: BlockDefinition[];
}
