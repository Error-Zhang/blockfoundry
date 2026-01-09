import React from 'react';
import { BlockOutlined } from '@ant-design/icons';
import { BlockDefinition } from '../lib/types';
import {
	clearVirtualFolder,
	copyVirtualFolder,
	createVirtualFolder,
	deleteVirtualFolder,
	downloadVirtualFolder,
	getVirtualFolders,
	moveVirtualFolder,
	renameVirtualFolder,
	VirtualFolder,
} from '@/app/services/virtualFolderService';
import { copyBlock, createBlock, deleteBlock, updateBlock } from '../services/blockService';
import { FileManagerApiService, GenericFileManager } from '@/app/components/common/FileTree';

interface BlockDirectoryTreeProps {
	blocks: BlockDefinition[];
	onBlockSelect?: (block: BlockDefinition) => void;
	onBlockChange?: () => void;
	onFolderSelect?: (folderId: string) => void;
	onFolderCountChange?: (count: number) => void;
	width?: number;
	onWidthChange?: (width: number) => void;
}

// 创建 API 服务适配器
const createBlockApiService = (): FileManagerApiService<BlockDefinition, VirtualFolder> => ({
	// 文件夹操作
	getFolders: (parenId?: string) => getVirtualFolders('block', parenId),
	createFolder: (name: string, parentId: string) => createVirtualFolder(name, parentId, 'block'),
	renameFolder: renameVirtualFolder,
	deleteFolder: deleteVirtualFolder,
	moveFolder: moveVirtualFolder,
	copyFolder: copyVirtualFolder,
	clearFolder: clearVirtualFolder,
	downloadFolder: downloadVirtualFolder,
	createFile: createBlock,
	updateFile: updateBlock,
	deleteFile: deleteBlock,
	copyFile: copyBlock,
});

const BlockDirectoryTree: React.FC<BlockDirectoryTreeProps> = ({
	blocks,
	onBlockSelect,
	onBlockChange,
	onFolderSelect,
	width = 300,
	onWidthChange,
}) => {
	return (
		<GenericFileManager<BlockDefinition, VirtualFolder>
			files={blocks}
			apiService={createBlockApiService()}
			onFileSelect={onBlockSelect}
			onNodeChange={onBlockChange}
			onFolderSelect={(folder) => onFolderSelect?.(folder.id)}
			fileIcon={<BlockOutlined />}
			width={width}
			onWidthChange={onWidthChange}
		/>
	);
};

export default BlockDirectoryTree;
