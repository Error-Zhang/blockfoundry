import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ClearOutlined,
	CopyOutlined,
	DeleteOutlined,
	DownloadOutlined,
	EditOutlined,
	FileAddOutlined,
	FolderAddOutlined,
	FolderOpenOutlined,
	FolderOutlined,
	ScissorOutlined,
	SnippetsOutlined,
} from '@ant-design/icons';
import { ContextMenuItem, DragInfo, FileTree, TreeNode, TreeNodeType } from '@/app/components/common/FileTree/index';
import { FileManagerApiService, FileTreeOperations } from '@/app/components/common/FileTree/FileTreeOperations';
import { useErrorHandler } from '@/app/utils/errorHandler';
import { buildPath, findTreeNode, getPathName } from '@/app/components/common/FileTree/treeUtils';

/**
 * 虚拟文件夹基础接口
 */
export interface BaseVirtualFolder {
	id: string;
	name: string;
	path: string;
	parentId: string | null;
}

/**
 * 文件资源基础接口
 */
export interface BaseFileResource {
	id: string;
	name: string;
	filePath: string;
}

/**
 * 配置接口
 */
export interface FileManagerConfig<TFile extends BaseFileResource, TFolder extends BaseVirtualFolder> {
	// 数据源
	files: TFile[];
	onFilesChange: (files: TFile[]) => void;

	// API 服务
	apiService: FileManagerApiService<TFile, TFolder>;

	// 选择回调
	onFileSelect: (file: TFile | null) => void;
	onFolderSelect: (folderPath: string) => void;

	// 可选回调
	onFolderCreated?: () => void;
	onFolderCountChange?: (count: number) => void;

	// 文件上传配置
	fileUploadConfig?: {
		accept?: string;
		validate?: (file: File) => boolean | Promise<boolean>;
		buildFileData: (file: File, folderPath: string) => unknown;
	};

	// 自定义文件图标
	fileIcon?: React.ReactNode;

	// 自定义下载逻辑
	downloadFile?: (file: TFile) => void;

	// 自定义上下文菜单
	customContextMenu?: (nodeType: TreeNodeType, node: TreeNode<TFile>, defaultMenu: ContextMenuItem[]) => ContextMenuItem[];

	// 宽度控制
	width?: number;
	onWidthChange?: (width: number) => void;

	// 是否允许根节点重命名/删除
	allowRootEdit?: boolean;
}

/**
 * 通用文件管理器组件
 */
export function GenericFileManager<TFile extends BaseFileResource, TFolder extends BaseVirtualFolder>({
	files,
	onFilesChange,
	apiService,
	onFileSelect,
	onFolderSelect,
	onFolderCreated,
	onFolderCountChange,
	fileUploadConfig,
	fileIcon,
	downloadFile,
	customContextMenu,
	width = 300,
	onWidthChange,
	allowRootEdit = false,
}: FileManagerConfig<TFile, TFolder>) {
	const errorHandler = useErrorHandler();
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
	const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
	const [selectedNode, setSelectedNode] = useState<TreeNode<TFile> | null>(null);
	const [virtualFolders, setVirtualFolders] = useState<TFolder[]>([]);
	const [rootFolder, setRootFolder] = useState<TFolder | null>(null);
	const [clipboard, setClipboard] = useState<{
		type: 'copy' | 'cut' | 'copy_folder';
		nodeKey: string;
		nodeData: TreeNode<TFile>;
	} | null>(null);
	const [isCreatingNewFolder, setIsCreatingNewFolder] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 加载虚拟文件夹
	const loadVirtualFolders = async () => {
		const data = await errorHandler.executeApi(() => apiService.getFolders());
		if (data) {
			setVirtualFolders(data);
			const root = data.find((vf) => vf.parentId === null);
			setRootFolder(root || null);
		}
	};

	useEffect(() => {
		loadVirtualFolders();
	}, []);

	// 计算文件夹数量
	useEffect(() => {
		const currentFolderPath = selectedNode?.nodeType === 'folder' ? selectedNode.path : '';

		if (!currentFolderPath) {
			const rootFolders = virtualFolders.filter((vf) => !vf.path.includes('.'));
			onFolderCountChange?.(rootFolders.length);
		} else {
			const childFolders = virtualFolders.filter((vf) => {
				const parentPath = vf.path.substring(0, vf.path.lastIndexOf('.'));
				return parentPath === currentFolderPath;
			});
			onFolderCountChange?.(childFolders.length);
		}
	}, [selectedNode, virtualFolders, onFolderCountChange]);

	// 创建文件树操作实例
	const folderOperations = useMemo(
		() =>
			new FileTreeOperations<TFile, TFolder>({
				items: files,
				folders: virtualFolders,
				getItemPath: (item) => item.filePath,
				getItemId: (item) => item.id,
				getFolderPath: (folder) => folder.path,
				getFolderId: (folder) => folder.id,
				getFolderName: (folder) => folder.name,
				getFolderParentId: (folder) => folder.parentId,
				api: apiService,
				onItemsChange: onFilesChange,
				onFoldersReload: async () => {
					await loadVirtualFolders();
					onFolderCreated?.();
				},
				onFolderSelect,
				errorHandler,
			}),
		[files, virtualFolders, onFilesChange, onFolderCreated, onFolderSelect, errorHandler, apiService]
	);

	// 构建树数据
	const buildTreeFromResources = useCallback((): TreeNode<TFile>[] => {
		if (!rootFolder) {
			return [];
		}

		const root: TreeNode<TFile> = {
			key: 'root',
			title: rootFolder.name,
			nodeType: 'root',
			path: rootFolder.path,
			icon: <FolderOpenOutlined />,
			children: [],
		};

		const folderMap = new Map<string, TreeNode<TFile>>();
		folderMap.set(rootFolder.path, root);

		// 创建文件夹节点
		virtualFolders
			.filter((vf) => vf.id !== rootFolder.id)
			.forEach((vFolder) => {
				const pathParts = vFolder.path.split('.');
				let currentPath = '';
				let currentParent = root;

				for (let i = 0; i < pathParts.length; i++) {
					const part = pathParts[i];
					const newPath = currentPath ? `${currentPath}.${part}` : part;

					if (!folderMap.has(newPath)) {
						const folderNode: TreeNode<TFile> = {
							key: `folder-${newPath}`,
							title: part,
							nodeType: 'folder',
							path: newPath,
							icon: <FolderOutlined />,
							children: [],
						};

						folderMap.set(newPath, folderNode);
						currentParent.children!.push(folderNode);
					}

					currentParent = folderMap.get(newPath)!;
					currentPath = newPath;
				}
			});

		// 创建文件节点
		files.forEach((file) => {
			const fileName = getPathName(file.filePath);
			const fileNode: TreeNode<TFile> = {
				key: `file-${file.id}`,
				title: fileName,
				nodeType: 'file',
				path: file.filePath,
				icon: fileIcon,
				isLeaf: true,
				data: file,
			};

			let parentPath = file.filePath;
			if (parentPath.startsWith(rootFolder.path + '.')) {
				parentPath = parentPath.substring(rootFolder.path.length + 1);
			}

			if (parentPath.includes('.')) {
				parentPath = parentPath.substring(0, parentPath.lastIndexOf('.'));
				parentPath = rootFolder.path + '.' + parentPath;
			} else {
				parentPath = rootFolder.path;
			}

			const parentNode = folderMap.get(parentPath) || root;

			if (!parentNode.children) {
				parentNode.children = [];
			}

			parentNode.children.push(fileNode);
		});

		// 添加临时新建文件夹节点
		if (isCreatingNewFolder && selectedNode) {
			const parentNode = findTreeNode([root], selectedNode.key);
			if (parentNode) {
				if (!parentNode.children) {
					parentNode.children = [];
				}

				const basePath = parentNode.nodeType === 'root' ? rootFolder.path : parentNode.path;
				const tempFolderNode: TreeNode<TFile> = {
					key: 'temp-new-folder',
					title: '新文件夹',
					nodeType: 'folder',
					path: buildPath(basePath, '新文件夹'),
					icon: <FolderOutlined />,
					children: [],
					isEditing: true,
				};
				parentNode.children.unshift(tempFolderNode);
			}
		}

		return [root];
	}, [files, virtualFolders, rootFolder, isCreatingNewFolder, selectedNode, fileIcon]);

	// 处理节点选择
	const handleSelect = useCallback(
		(keys: string[], node: TreeNode<TFile> | null) => {
			setSelectedKeys(keys);
			setSelectedNode(node);

			if (node?.nodeType === 'file' && node.data) {
				onFileSelect(node.data);
				onFolderSelect('');
			} else if (node?.nodeType === 'folder') {
				onFileSelect(null);
				onFolderSelect(node.path);
			} else if (node?.nodeType === 'root' && rootFolder) {
				onFileSelect(null);
				onFolderSelect(rootFolder.path);
			} else {
				onFileSelect(null);
				onFolderSelect('');
			}
		},
		[onFileSelect, onFolderSelect, rootFolder]
	);

	// 处理节点编辑
	const handleNodeEdit = useCallback(
		async (node: TreeNode<TFile>, newValue: string): Promise<boolean> => {
			if (!newValue.trim()) {
				errorHandler.error('名称不能为空');
				return false;
			}

			// 处理新建文件夹
			if (node.key === 'temp-new-folder' && isCreatingNewFolder) {
				const treeData = buildTreeFromResources();
				const parentNode = selectedNode ? findTreeNode(treeData, selectedNode.key) : null;
				if (!parentNode || !rootFolder) return false;

				const basePath = parentNode.nodeType === 'root' ? rootFolder.path : parentNode.path;
				const success = await folderOperations.confirmCreateFolder(newValue, basePath);

				if (success) {
					setIsCreatingNewFolder(false);
				}

				return success;
			}

			// 处理文件重命名
			if (node.nodeType === 'file' && node.data) {
				return await folderOperations.renameItem(node.data, newValue, (item, name) => {
					const pathParts = item.filePath.split('.');
					pathParts[pathParts.length - 1] = name;
					return pathParts.join('.');
				});
			}

			// 处理文件夹重命名
			if (node.nodeType === 'folder' || node.nodeType === 'root') {
				const virtualFolder = virtualFolders.find((vf) => vf.path === node.path);
				if (!virtualFolder) {
					errorHandler.error('未找到对应的虚拟文件夹');
					return false;
				}

				return await folderOperations.renameFolder(virtualFolder, newValue);
			}

			return false;
		},
		[isCreatingNewFolder, selectedNode, buildTreeFromResources, virtualFolders, rootFolder, folderOperations, errorHandler]
	);

	// 处理拖拽
	const handleDrop = useCallback(
		async (dragInfo: DragInfo<TFile>) => {
			const { dragNode, dropNode, dropPosition } = dragInfo;

			if (dragNode.key === dropNode.key) {
				errorHandler.warning('不能拖拽到自己');
				return;
			}

			if (!rootFolder) return;

			let targetParentPath = '';
			if (dropPosition !== 'before') {
				targetParentPath = dropNode.nodeType === 'root' ? rootFolder.path : dropNode.path;
			} else {
				errorHandler.warning('只能拖拽到文件夹内部');
				return;
			}

			// 处理文件拖拽
			if (dragNode.nodeType === 'file' && dragNode.data) {
				await folderOperations.moveItem(dragNode.data, targetParentPath, (item) => getPathName(item.filePath));
			}
			// 处理文件夹拖拽
			else if (dragNode.nodeType === 'folder') {
				const virtualFolder = virtualFolders.find((vf) => vf.path === dragNode.path);
				if (!virtualFolder) {
					errorHandler.error('未找到对应的虚拟文件夹');
					return;
				}

				await folderOperations.moveFolder(virtualFolder, targetParentPath);
			}
		},
		[virtualFolders, rootFolder, folderOperations, errorHandler]
	);

	// 处理粘贴
	const handlePaste = async (node: TreeNode<TFile>) => {
		if (!clipboard) {
			errorHandler.warning('剪贴板为空');
			return;
		}

		// 处理文件夹粘贴
		if (clipboard.type === 'copy_folder' && clipboard.nodeData.nodeType === 'folder') {
			const targetFolder = virtualFolders.find((vf) => vf.path === node.path);

			const sourceFolder = virtualFolders.find((vf) => vf.path === clipboard.nodeData.path);
			if (!sourceFolder) {
				errorHandler.error('未找到源文件夹');
				return;
			}

			await folderOperations.copyFolder(sourceFolder, targetFolder!.id);
			setClipboard(null);
			return;
		}

		// 处理文件粘贴
		if (clipboard.nodeData.nodeType !== 'file' || !clipboard.nodeData.data) {
			return;
		}

		if (!rootFolder) return;

		let targetPath = '';
		if (node?.nodeType === 'folder') {
			targetPath = node.path;
		} else if (node?.nodeType === 'root') {
			targetPath = rootFolder.path;
		}

		const resource = clipboard.nodeData.data;
		const newFilePath = buildPath(targetPath, resource.name);

		if (clipboard.type === 'copy') {
			await folderOperations.copyItem(resource, newFilePath, (path) => files.some((r) => r.filePath === path));
		} else {
			await folderOperations.moveItem(resource, targetPath, (item) => item.name);
			setClipboard(null);
		}
	};

	// 处理删除
	const handleDelete = async (node: TreeNode<TFile>) => {
		if (node.nodeType === 'file' && node.data) {
			await folderOperations.deleteItem(node.data);
		} else if (node.nodeType === 'folder') {
			const virtualFolder = virtualFolders.find((vf) => vf.path === node.path);
			if (!virtualFolder) {
				errorHandler.error('未找到对应的虚拟文件夹');
				return;
			}

			await folderOperations.deleteFolder(virtualFolder, node.title);
		}
	};

	// 处理文件上传
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, folderPath: string) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// 自定义验证
		if (fileUploadConfig?.validate) {
			const isValid = await fileUploadConfig.validate(file);
			if (!isValid) {
				return;
			}
		}

		if (!fileUploadConfig?.buildFileData) {
			errorHandler.error('未配置文件上传数据构建函数');
			return;
		}

		await folderOperations.uploadItem(file, folderPath, async (file, folderPath) => {
			return apiService.createFile(fileUploadConfig.buildFileData(file, folderPath));
		});

		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	// 构建上下文菜单
	const buildContextMenu = useCallback(
		(nodeType: TreeNodeType, node: TreeNode<TFile>): ContextMenuItem[] => {
			const menu: ContextMenuItem[] = [];

			const isRootNode = node.nodeType === 'root' || (rootFolder && node.path === rootFolder.path);

			if (node.nodeType === 'root' || node.nodeType === 'folder') {
				menu.push(
					{ key: 'new_folder', label: '新建文件夹', icon: <FolderAddOutlined /> },
					{ key: 'upload', label: '上传文件', icon: <FileAddOutlined /> }
				);

				if (clipboard) {
					menu.push({ key: 'paste', label: '粘贴', icon: <SnippetsOutlined /> });
				}

				menu.push({ key: 'divider-1', type: 'divider' });

				// 根据配置决定是否允许根节点重命名
				if (allowRootEdit || !isRootNode) {
					menu.push({ key: 'rename', label: '重命名', icon: <EditOutlined /> });
				}

				if (!isRootNode) {
					menu.push({ key: 'copy_folder', label: '复制文件夹', icon: <CopyOutlined /> });
				}

				menu.push({ key: 'divider-2', type: 'divider' });

				menu.push(
					{ key: 'download_folder', label: '下载文件夹', icon: <DownloadOutlined /> },
					{ key: 'clear_folder', label: '清空文件夹', icon: <ClearOutlined /> }
				);

				// 根据配置决定是否允许根节点删除
				if (allowRootEdit || !isRootNode) {
					menu.push({ key: 'delete', label: '删除文件夹', icon: <DeleteOutlined />, danger: true });
				}
			} else if (node.nodeType === 'file') {
				menu.push(
					{ key: 'rename', label: '重命名', icon: <EditOutlined /> },
					{ key: 'copy', label: '复制', icon: <CopyOutlined /> },
					{ key: 'cut', label: '剪切', icon: <ScissorOutlined /> },
					{ key: 'divider-1', type: 'divider' },
					{ key: 'download', label: '下载', icon: <DownloadOutlined /> },
					{ key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true }
				);
			}

			// 应用自定义菜单
			if (customContextMenu) {
				return customContextMenu(nodeType, node, menu);
			}

			return menu;
		},
		[clipboard, rootFolder, allowRootEdit, customContextMenu]
	);

	// 处理上下文菜单点击
	const handleContextMenuClick = useCallback(
		async (key: string, node: TreeNode<TFile>) => {
			switch (key) {
				case 'new_folder':
					setSelectedNode(node);
					setExpandedKeys([...expandedKeys, node.key]);
					setTimeout(() => {
						setIsCreatingNewFolder(true);
					}, 0);
					break;

				case 'upload':
					setSelectedNode(node);
					fileInputRef.current?.click();
					break;

				case 'rename':
					node.isEditing = true;
					break;

				case 'copy':
					if (node.nodeType === 'file') {
						setClipboard({ type: 'copy', nodeKey: node.key, nodeData: node });
						errorHandler.success('已复制');
					}
					break;

				case 'copy_folder':
					if (node.nodeType === 'folder') {
						setClipboard({ type: 'copy_folder', nodeKey: node.key, nodeData: node });
						errorHandler.success('已复制文件夹');
					}
					break;

				case 'cut':
					if (node.nodeType === 'file') {
						setClipboard({ type: 'cut', nodeKey: node.key, nodeData: node });
						errorHandler.success('已剪切');
					}
					break;

				case 'paste':
					await handlePaste(node);
					break;

				case 'download':
					if (node.nodeType === 'file' && node.data) {
						if (downloadFile) {
							downloadFile(node.data);
						}
						errorHandler.success('开始下载文件');
					}
					break;

				case 'download_folder':
					if (node.nodeType === 'folder' || node.nodeType === 'root') {
						const virtualFolder = virtualFolders.find((vf) => vf.path === node.path);
						if (virtualFolder) {
							await folderOperations.downloadFolder(virtualFolder, node.title);
						}
					}
					break;

				case 'clear_folder':
					if (node.nodeType === 'folder' || node.nodeType === 'root') {
						const virtualFolder = virtualFolders.find((vf) => vf.path === node.path);
						if (virtualFolder) {
							await folderOperations.clearFolder(virtualFolder, node.title);
						}
					}
					break;

				case 'delete':
					await handleDelete(node);
					break;
			}
		},
		[expandedKeys, clipboard, errorHandler, virtualFolders, folderOperations, downloadFile]
	);

	return (
		<>
			<FileTree
				treeData={buildTreeFromResources()}
				selectedKeys={selectedKeys}
				expandedKeys={expandedKeys}
				onSelect={handleSelect}
				onExpand={(keys) => setExpandedKeys(keys)}
				onNodeEdit={handleNodeEdit}
				onDrop={handleDrop}
				contextMenuItems={buildContextMenu}
				onContextMenuAction={handleContextMenuClick}
				width={width}
				onWidthChange={onWidthChange}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept={fileUploadConfig?.accept || '*'}
				style={{ display: 'none' }}
				onChange={(e) => {
					handleFileUpload(e, selectedNode?.path ?? '');
				}}
			/>
		</>
	);
}
