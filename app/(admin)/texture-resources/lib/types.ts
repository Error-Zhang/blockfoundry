// 纹理捆绑类型
import { ReactNode } from 'react';

export type TextureBundleType = 'normal' | 'roughness' | 'metallic' | 'emissive' | 'ao' | 'height';

// 纹理资源接口定义
export interface TextureResource {
	id: string;
	name: string;
	description?: string;
	fileName: string;
	filePath: string; // 后端存储的路径，格式如 "xxx.xxx.xxx"
	fileSize: number;
	width: number;
	height: number;
	format: string;
	tags: string[];
	thumbnailUrl: string;
	originalUrl: string;
	createdAt: string;
	updatedAt: string;
	usageCount: number;
	isPublic: boolean;
}

// 树节点类型
export type NodeType = 'folder' | 'file' | 'root';

// 右键菜单位置
export interface ContextMenuPosition {
	x: number;
	y: number;
}

// 树节点数据接口
export interface TreeNodeData {
	key: string;
	title: string;
	nodeType: NodeType;
	path: string; // 完整路径
	icon?: ReactNode;
	isLeaf?: boolean;
	children?: TreeNodeData[];
	// 如果是文件节点，包含资源数据
	resourceData?: TextureResource;
}
