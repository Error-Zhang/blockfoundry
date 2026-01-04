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
import { ClipboardData, ContextMenuItem, DragInfo, FileTree, TreeNode } from '@/app/components/common/FileTree/index';
import { FileManagerApiService, FileTreeOperations } from '@/app/components/common/FileTree/FileTreeOperations';
import { useErrorHandler } from '@/app/utils/errorHandler';
import { buildPath } from '@/app/components/common/FileTree/treeUtils';

/**
 * 虚拟文件夹基础接口
 */
export interface BaseVirtualFolder {
	id: string;
	name: string;
	path: string;
	parentId: string;
}

/**
 * 文件资源基础接口
 */
export interface BaseFileResource {
	id: string;
	name: string;
	folderId: string;
}

/**
 * 配置接口
 */
export interface FileManagerConfig<TFile extends BaseFileResource, TFolder extends BaseVirtualFolder> {
	// 数据源
	files: TFile[];

	// API 服务
	apiService: FileManagerApiService<TFile, TFolder>;

	// 选择回调
	onFileSelect?: (file: TFile) => void;
	onFolderSelect?: (folder: TFolder) => void;

	// 可选回调
	onNodeChange?: () => void;
	// 文件上传配置
	fileUploadConfig?: {
		accept?: string;
		validate?: (file: File) => boolean | Promise<boolean>;
		buildFileData: (file: File, folderId: string) => unknown;
	};

	// 自定义文件图标
	fileIcon?: React.ReactNode;

	// 自定义下载逻辑
	downloadFile?: (file: TFile) => void;

	// 自定义上下文菜单
	customContextMenu?: (node: TreeNode<TFile | TFolder>, defaultMenu: ContextMenuItem[]) => ContextMenuItem[];

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
	onNodeChange,
	apiService,
	onFileSelect,
	onFolderSelect,
	fileUploadConfig,
	fileIcon,
	downloadFile,
	customContextMenu,
	width = 300,
	onWidthChange,
	allowRootEdit = true,
}: FileManagerConfig<TFile, TFolder>) {
	const errorHandler = useErrorHandler();
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
	const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
	const [selectedFile, setSelectedFileNode] = useState<TreeNode<TFile> | null>(null);
	const [selectedFolder, setSelectedFolderNode] = useState<TreeNode<TFolder>>(null!);
	const [virtualFolders, setVirtualFolders] = useState<TFolder[]>([]);
	const [rootFolder, setRootFolder] = useState<TFolder>(null!);
	const [clipboard, setClipboard] = useState<ClipboardData<TFile | TFolder>>();
	const [isCreatingNewFolder, setIsCreatingNewFolder] = useState<boolean>(false);
	const [rightClickedFolder, setRightClickedFolder] = useState<TreeNode<TFolder> | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 加载虚拟文件夹
	const loadVirtualFolders = async () => {
		const data = await errorHandler.executeApi(() => apiService.getFolders());
		const root = data?.find((vf) => vf.parentId === null);
		if (!root) return errorHandler.error('根目录不存在');

		setVirtualFolders(data!);
		setRootFolder(root);
	};

	useEffect(() => {
		loadVirtualFolders();
	}, []);

	// 创建文件树操作实例
	const folderOperations = useMemo(
		() =>
			new FileTreeOperations<TFile, TFolder>({
				getFileId: (file) => file.id,
				getFileFolderId: (file) => file.folderId,
				getFilePath: (file) => {
					const folder = virtualFolders.find((f) => f.id === file.folderId)!;
					return folder.path === rootFolder.path ? file.name : `${folder.path}.${file.name}`;
				},
				getFolderId: (folder) => folder.id,
				getFolderName: (folder) => folder.name,
				getFolderParentId: (folder) => folder.parentId!,
				getFolderPath: (folder) => folder.path,
				files,
				folders: virtualFolders,
				api: apiService,
				onFileChange: async () => {
					await loadVirtualFolders();
					onNodeChange?.();
				},
				onFolderChange: async () => {
					await loadVirtualFolders();
					onNodeChange?.();
				},
				onFolderSelect,
				errorHandler,
			}),
		[files, virtualFolders, onNodeChange, onFolderSelect, errorHandler, apiService, rootFolder]
	);

	// 构建树数据
	const treeData = useMemo((): TreeNode<TFile | TFolder>[] => {
		if (!rootFolder) return [];
		const root: TreeNode<TFolder> = {
			key: 'root',
			title: rootFolder.name,
			nodeType: 'root',
			path: rootFolder.path,
			icon: <FolderOpenOutlined />,
			children: [],
			data: rootFolder,
		};

		const folderMap = new Map<string, TreeNode<TFile | TFolder>>();
		folderMap.set(rootFolder.id, root);

		// 创建文件夹节点
		virtualFolders
			.filter((vf) => vf.id !== rootFolder.id)
			.forEach((vFolder) => {
				const folderNode: TreeNode<TFolder> = {
					key: `folder-${vFolder.id}`,
					title: vFolder.name,
					nodeType: 'folder',
					path: vFolder.path,
					icon: <FolderOutlined />,
					children: [],
					data: vFolder,
				};

				folderMap.set(vFolder.id, folderNode);

				// 找到父节点并添加
				const parentNode = folderMap.get(vFolder.parentId || rootFolder.id);
				if (parentNode) {
					parentNode.children!.push(folderNode);
				}
			});

		// 创建文件节点
		files.forEach((file) => {
			const fileName = file.name;
			// 根据 folderId 找到父节点
			const folder = virtualFolders.find((f) => f.id === file.folderId);
			if (!folder) return;

			const fileNode: TreeNode<TFile> = {
				key: `file-${file.id}`,
				title: fileName,
				nodeType: 'file',
				path: buildPath(folder.path, fileName),
				icon: fileIcon,
				isLeaf: true,
				data: file,
			};

			const parentNode = folderMap.get(file.folderId || rootFolder.id);
			if (parentNode) {
				parentNode.children!.push(fileNode);
			}
		});

		// 添加临时新建文件夹节点
		if (isCreatingNewFolder && rightClickedFolder) {
			// 在当前构建的树中找到对应的父节点
			const parentFolderId = (rightClickedFolder.data as TFolder).id;
			const parentNode = folderMap.get(parentFolderId);

			if (parentNode) {
				const tempFolderNode: TreeNode<TFolder> = {
					key: 'temp-new-folder',
					title: '新文件夹',
					nodeType: 'folder',
					path: buildPath(rightClickedFolder.path, '新文件夹'),
					icon: <FolderOutlined />,
					children: [],
					isEditing: true,
					data: { parentId: parentFolderId } as TFolder,
				};
				parentNode.children!.unshift(tempFolderNode);
			}
		}

		return [root];
	}, [files, virtualFolders, rootFolder, isCreatingNewFolder, rightClickedFolder, fileIcon]);

	// 首次加载自动选择根节点
	useEffect(() => {
		if (treeData.length && !selectedFolder) {
			handleSelect(['root'], treeData[0]);
		}
	}, [treeData]);

	// 处理节点选择
	const handleSelect = useCallback((keys: string[], node: TreeNode<TFile | TFolder>) => {
		setSelectedKeys(keys);
		if (node.nodeType === 'file') {
			setSelectedFileNode(node as TreeNode<TFile>);
			onFileSelect?.(node.data as TFile);
		} else {
			setSelectedFolderNode(node as TreeNode<TFolder>);
			onFolderSelect?.(node.data as TFolder);
		}
	}, []);

	// 处理节点编辑
	const handleNodeEdit = useCallback(
		async (node: TreeNode<TFile | TFolder>, newName: string): Promise<boolean> => {
			if (!newName.trim()) {
				errorHandler.error('名称不能为空');
				return false;
			}

			// 处理新建文件夹
			if (node.key === 'temp-new-folder' && isCreatingNewFolder) {
				const success = await folderOperations.confirmCreateFolder(newName, (node.data as TFolder).parentId);

				if (success) {
					setIsCreatingNewFolder(false);
					setRightClickedFolder(null);
				}

				return success;
			}

			// 处理文件重命名
			if (node.nodeType === 'file' && node.data) {
				return await folderOperations.renameFile(node.data as TFile, newName);
			}

			// 处理文件夹重命名
			if (node.nodeType === 'folder' || node.nodeType === 'root') {
				const virtualFolder = virtualFolders.find((vf) => vf.path === node.path);
				if (!virtualFolder) {
					errorHandler.error('未找到对应的虚拟文件夹');
					return false;
				}

				return await folderOperations.renameFolder(virtualFolder, newName);
			}

			return false;
		},
		[isCreatingNewFolder, rightClickedFolder, selectedFolder, treeData, virtualFolders, rootFolder, folderOperations, errorHandler]
	);

	// 处理拖拽
	const handleDrop = useCallback(
		async (dragInfo: DragInfo<TFile | TFolder>) => {
			const { dragNode, dropNode, dropPosition } = dragInfo;

			// 处理文件拖拽
			if (dragNode.nodeType === 'file' && dropPosition !== 'before') {
				await folderOperations.moveFile(dragNode.data! as TFile, dropNode.data!.id);
			}

			// 处理文件夹拖拽
			if (dragNode.nodeType === 'folder' && dropPosition !== 'before') {
				await folderOperations.moveFolder(dragNode.data! as TFolder, dropNode.data!.id);
			}
		},
		[virtualFolders, rootFolder, folderOperations, errorHandler]
	);

	// 处理粘贴
	const handlePaste = async (node: TreeNode<TFile | TFolder>) => {
		if (!clipboard) {
			errorHandler.warning('剪贴板为空');
			return;
		}

		// 处理文件夹粘贴
		const targetId = node.data!.id;
		const sourceData = clipboard.node.data!;

		// 根据剪贴板类型执行对应操作
		const operations = {
			copy: () => folderOperations.copyFile(sourceData as TFile, targetId),
			copy_folder: () => folderOperations.copyFolder(sourceData as TFolder, targetId),
			cut: () => folderOperations.moveFile(sourceData as TFile, targetId),
			cut_folder: () => folderOperations.moveFolder(sourceData as TFolder, targetId),
		};

		await operations[clipboard.type]?.();

		// 剪切操作后清空剪贴板(只能粘贴一次)
		if (clipboard.type === 'cut' || clipboard.type === 'cut_folder') {
			setClipboard(undefined);
		}
	};

	// 处理删除
	const handleDelete = async (node: TreeNode<TFile | TFolder>) => {
		if (node.nodeType === 'file') {
			await folderOperations.deleteFile(node.data as TFile);
		} else if (node.nodeType === 'folder') {
			await folderOperations.deleteFolder(node.data as TFolder);
		}
	};

	// 处理文件上传
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!fileUploadConfig?.buildFileData) {
			errorHandler.warning('buildFileData未实现');
			return;
		}

		// 自定义验证
		if (fileUploadConfig?.validate) {
			const isValid = await fileUploadConfig.validate(file);
			if (!isValid) return;
		}

		await folderOperations.uploadFile(file, rightClickedFolder!.data!.id, async (file, folderId) => {
			return apiService.createFile(fileUploadConfig!.buildFileData(file, folderId));
		});

		fileInputRef.current = null;
		setRightClickedFolder(null);
	};

	// 构建上下文菜单
	const buildContextMenu = useCallback(
		(node: TreeNode<TFile | TFolder>): ContextMenuItem[] => {
			const menu: ContextMenuItem[] = [];

			const isRootNode = node.nodeType === 'root';

			if (node.nodeType === 'root' || node.nodeType === 'folder') {
				menu.push(
					{ key: 'new_folder', label: '新建文件夹', icon: <FolderAddOutlined /> },
					{ key: 'upload', label: '上传文件', icon: <FileAddOutlined /> }
				);

				if (clipboard) {
					menu.push({ key: 'divider-1', type: 'divider' });
					menu.push({ key: 'paste', label: '粘贴', icon: <SnippetsOutlined /> });
				}

				// 根据配置决定是否允许根节点重命名
				if (allowRootEdit || !isRootNode) {
					menu.push({ key: 'rename', label: '重命名', icon: <EditOutlined /> });
				}

				if (!isRootNode) {
					menu.push(
						{ key: 'cut_folder', label: '移动文件夹', icon: <ScissorOutlined /> },
						{ key: 'copy_folder', label: '复制文件夹', icon: <CopyOutlined /> }
					);
				}

				menu.push({ key: 'divider-2', type: 'divider' });

				menu.push(
					{ key: 'download_folder', label: '下载文件夹', icon: <DownloadOutlined /> },
					{ key: 'clear_folder', label: '清空文件夹', icon: <ClearOutlined />, danger: true }
				);

				// 根据配置决定是否允许根节点删除
				if (!isRootNode) {
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
				return customContextMenu(node, menu);
			}

			return menu;
		},
		[clipboard, rootFolder, allowRootEdit, customContextMenu]
	);

	// 处理上下文菜单点击
	const handleContextMenuClick = useCallback(
		async (key: string, node: TreeNode<TFile | TFolder>) => {
			switch (key) {
				case 'new_folder':
					setRightClickedFolder(node as TreeNode<TFolder>);
					setExpandedKeys([...expandedKeys, node.key]);
					setTimeout(() => {
						setIsCreatingNewFolder(true);
					}, 0);
					break;

				case 'upload':
					setRightClickedFolder(node as TreeNode<TFolder>);
					fileInputRef.current?.click();
					break;

				case 'rename':
					node.isEditing = true;
					break;

				case 'copy':
				case 'copy_folder':
				case 'cut':
				case 'cut_folder':
					setClipboard({ type: key as any, node: node });
					errorHandler.success(key.includes('copy') ? '已复制' : '已剪切');
					break;

				case 'paste':
					await handlePaste(node);
					break;

				case 'download':
					if (downloadFile) {
						downloadFile(node.data as TFile);
						errorHandler.success('开始下载文件');
					} else {
						errorHandler.warning('downloadFile未实现');
					}
					break;

				case 'download_folder':
					await folderOperations.downloadFolder(node.data as TFolder);
					break;

				case 'clear_folder':
					await folderOperations.clearFolder(node.data as TFolder);
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
				treeData={treeData}
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
			<input ref={fileInputRef} type="file" accept={fileUploadConfig?.accept || '*'} style={{ display: 'none' }} onChange={handleFileUpload} />
		</>
	);
}
