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
} from '../services/virtualFolderService';
import { copyTextureResource, createTextureResource, deleteTextureResource, updateTextureResource } from '../services/textureResourceService';
import { FileManagerApiService, GenericFileManager } from '@/app/components/common/FileTree';

interface DirectoryTreeProps {
	resources: TextureResource[];
	onResourceSelect: (resource: TextureResource | null) => void;
	onResourcesChange: (resources: TextureResource[]) => void;
	onFolderSelect: (folderPath: string) => void;
	onFolderCreated?: () => void;
	onFolderCountChange?: (count: number) => void;
	width?: number;
	onWidthChange?: (width: number) => void;
}

// 创建 API 服务适配器
const createTextureApiService = (): FileManagerApiService<TextureResource, VirtualFolder> => ({
	// 文件夹操作
	getFolders: getVirtualFolders,
	createFolder: createVirtualFolder,
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
	onResourcesChange,
	onFolderSelect,
	onFolderCreated,
	onFolderCountChange,
	width = 300,
	onWidthChange,
}) => {
	return (
		<GenericFileManager<TextureResource, VirtualFolder>
			files={resources}
			onFilesChange={onResourcesChange}
			apiService={createTextureApiService()}
			onFileSelect={onResourceSelect}
			onFolderSelect={onFolderSelect}
			onFolderCreated={onFolderCreated}
			onFolderCountChange={onFolderCountChange}
			fileUploadConfig={{
				accept: 'image/*',
				validate: (file) => {
					return file.type.startsWith('image/');
				},
				buildFileData: (file, folderPath) => {
					const fileName = file.name.replace(/\.[^/.]+$/, '');
					return {
						file,
						name: fileName,
						description: '',
						tags: [],
						isPublic: true,
						folderPath,
					};
				},
			}}
			fileIcon={<FileImageOutlined />}
			downloadFile={downloadTextureResource}
			width={width}
			onWidthChange={onWidthChange}
			allowRootEdit={false}
		/>
	);
};

export default DirectoryTree;
