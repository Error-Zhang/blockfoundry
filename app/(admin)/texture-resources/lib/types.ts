// 纹理捆绑类型

// 纹理资源接口定义
export interface TextureResource {
	id: string;
	name: string;
	description?: string;
	fileName: string;
	fileHash: string; // 文件哈希值，用于去重
	fileSize: number;
	width: number;
	height: number;
	format: string;
	tags: string[];
	folderId: string; // 关联虚拟文件夹ID
	userId: number;
	createdAt: string;
	updatedAt: string;
	usageCount: number;
	isPublic: boolean;
	url: string;
	folderPath?: string;
}
