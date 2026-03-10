export interface TextureAtlasModel {
	id: string;
	name: string;
	width: number;
	height: number;
	spriteCount: number;
	format: string;
	fileSize: number;
	hash: string;
	folderId: string;
	userId: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface AtlasSprite {
	id: string;
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	u0?: number;
	v0?: number;
	u1?: number;
	v1?: number;
}