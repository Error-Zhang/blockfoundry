export interface TextureResourceModel {
	id: string;
	name: string;
	fileName: string;
	fileHash: string;
	width: number;
	height: number;
	format: string;
	fileSize: number;
	isPublic: boolean;
	tags: string;
	folderId: string;
	usageCount: number;
	createdAt:Date;
	updatedAt:Date;
}


export interface UploadTextureParams {
	file: File;
	name: string;
	tags: string;
	isPublic: boolean;
	folderId: string;
}

export interface UploadSuccess {
	success: true;
	data: any;
	fileName: string;
}

export interface UploadFail {
	success: false;
	error: string;
	fileName: string;
}

export type UploadResult = UploadSuccess | UploadFail;
