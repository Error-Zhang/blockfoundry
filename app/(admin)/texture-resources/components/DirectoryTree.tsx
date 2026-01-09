import React from 'react';
import { FileImageOutlined } from '@ant-design/icons';
import { TextureResource } from '../lib/types';
import { downloadTextureResource } from '../lib/utils';
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
import { copyTextureResource, createTextureResource, deleteTextureResource, updateTextureResource } from '../services/textureResourceService';
import { FileManagerApiService, GenericFileManager } from '@/app/components/common/FileTree';

interface DirectoryTreeProps {
	resources: TextureResource[];
	onResourceSelect?: (resource: TextureResource) => void;
	onResourceChange?: () => void;
	onFolderSelect?: (folder: VirtualFolder) => void;
	width?: number;
	onWidthChange?: (width: number) => void;
}

// 创建 API 服务适配器
const createTextureApiService = (): FileManagerApiService<TextureResource, VirtualFolder> => ({
	// 文件夹操作
	getFolders: (parentId?: string) => getVirtualFolders('texture', parentId),
	createFolder: (name: string, parentId: string) => createVirtualFolder(name, parentId, 'texture'),
	renameFolder: renameVirtualFolder,
	deleteFolder: deleteVirtualFolder,
	moveFolder: moveVirtualFolder,
	copyFolder: copyVirtualFolder,
	clearFolder: clearVirtualFolder,
	downloadFolder: downloadVirtualFolder,
	createFile: createTextureResource,
	updateFile: updateTextureResource,
	deleteFile: deleteTextureResource,
	copyFile: copyTextureResource,
});

const DirectoryTree: React.FC<DirectoryTreeProps> = ({
	resources,
	onResourceSelect,
	onResourceChange,
	onFolderSelect,
	width = 300,
	onWidthChange,
}) => {
	return (
		<GenericFileManager<TextureResource, VirtualFolder>
			files={resources}
			apiService={createTextureApiService()}
			onFileSelect={onResourceSelect}
			onNodeChange={onResourceChange}
			onFolderSelect={onFolderSelect}
			fileUploadConfig={{
				accept: 'image/*',
				validate: (file) => {
					return file.type.startsWith('image/');
				},
				buildFileData: (file, folderId) => {
					const fileName = file.name.replace(/\.[^/.]+$/, '');
					return {
						file,
						name: fileName,
						description: '',
						tags: [],
						isPublic: true,
						folderId,
					};
				},
			}}
			fileIcon={<FileImageOutlined />}
			downloadFile={downloadTextureResource}
			width={width}
			onWidthChange={onWidthChange}
		/>
	);
};

export default DirectoryTree;
