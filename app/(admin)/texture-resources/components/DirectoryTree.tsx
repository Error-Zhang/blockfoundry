import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Card, Input, Menu, Modal, Tree } from 'antd';
import {
    ClearOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    ExpandOutlined,
    FileAddOutlined,
    FileImageOutlined,
    FolderAddOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    ScissorOutlined,
    ShrinkOutlined,
    SnippetsOutlined
} from '@ant-design/icons';
import { ContextMenuPosition, NodeType, TextureResource, TreeNodeData } from '../lib/types';
import { downloadTextureResource } from '../lib/utils';
import styles from '../../../styles/directoryTree.module.scss';
import {
	createVirtualFolder,
	deleteVirtualFolder,
	getVirtualFolders,
	moveVirtualFolder,
	renameVirtualFolder,
	VirtualFolder,
} from '../services/virtualFolderService';
import {
	createTextureResource,
	deleteTextureResource,
	updateTextureResource
} from '../services/textureResourceService';
import { createPortal } from 'react-dom';

interface DirectoryTreeProps {
	resources: TextureResource[]; // 纹理资源列表
	onResourceSelect: (resource: TextureResource | null) => void;
	onResourcesChange: (resources: TextureResource[]) => void;
	onFolderSelect: (folderPath: string) => void;
	onFolderCreated?: () => void; // 文件夹创建成功回调
	onFolderCountChange?: (count: number) => void; // 文件夹数量变化回调
	width?: number;
	onWidthChange?: (width: number) => void;
}

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
	const { message, modal } = App.useApp();
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
	const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
	const [editingNode, setEditingNode] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState<string>('');
	const [isCreatingNewFolder, setIsCreatingNewFolder] = useState<boolean>(false);
	const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false);
	const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
	const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
	const [selectedNodeType, setSelectedNodeType] = useState<NodeType>('root');
	const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [clipboard, setClipboard] = useState<{ type: 'copy' | 'cut' | 'copy_folder'; nodeKey: string; nodeData: TreeNodeData } | null>(null);

	// 拖拽调整宽度相关状态
	const [isResizing, setIsResizing] = useState(false);
	const resizeRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// 最小和最大宽度限制
	const MIN_WIDTH = 200;
	const MAX_WIDTH = 600;

	// 加载虚拟文件夹
	useEffect(() => {
		const loadVirtualFolders = async () => {
			try {
				const result = await getVirtualFolders();
				if (result.success && result.data) {
					setVirtualFolders(result.data);
				}
			} catch (error) {
				console.error('加载虚拟文件夹失败:', error);
			}
		};
		loadVirtualFolders();
	}, []);

	// 计算并更新当前文件夹下的子文件夹数量
	useEffect(() => {
		const calculateFolderCount = () => {
			const currentFolderPrefix = selectedNodeKey?.replace('folder-', '') || '';

			if (!currentFolderPrefix) {
				// 根目录：计算一级文件夹数量
				const rootFolders = virtualFolders.filter((vf) => !vf.path.includes('.'));
				onFolderCountChange?.(rootFolders.length);
			} else {
				// 子文件夹：计算直接子文件夹数量
				const childFolders = virtualFolders.filter((vf) => {
					const parentPath = vf.path.substring(0, vf.path.lastIndexOf('.'));
					return parentPath === currentFolderPrefix;
				});
				onFolderCountChange?.(childFolders.length);
			}
		};

		calculateFolderCount();
	}, [selectedNodeKey, virtualFolders, onFolderCountChange]);

	// 根据资源的filePath和虚拟文件夹构建树状结构
	const buildTreeFromResources = (): TreeNodeData[] => {
		const root: TreeNodeData = {
			key: 'root',
			title: '纹理资源',
			nodeType: 'root',
			path: '',
			icon: <FolderOpenOutlined />,
			children: [],
		};

		// 用于存储已创建的文件夹节点
		const folderMap = new Map<string, TreeNodeData>();
		folderMap.set('', root);

		// 第一步：从虚拟文件夹创建文件夹节点
		virtualFolders.forEach((vFolder) => {
			const pathParts = vFolder.path.split('.');
			let currentPath = '';
			let currentParent = root;

			// 逐级创建文件夹节点
			for (let i = 0; i < pathParts.length; i++) {
				const part = pathParts[i];
				const newPath = currentPath ? `${currentPath}.${part}` : part;

				if (!folderMap.has(newPath)) {
					const folderNode: TreeNodeData = {
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

		// 第二步：从资源创建文件夹层级和文件节点
		resources.forEach((resource) => {
			const pathParts = resource.filePath.split('.');
			let currentPath = '';
			let currentParent = root;

			// 创建文件夹层级（如果不存在）
			for (let i = 0; i < pathParts.length - 1; i++) {
				const part = pathParts[i];
				const newPath = currentPath ? `${currentPath}.${part}` : part;

				if (!folderMap.has(newPath)) {
					const folderNode: TreeNodeData = {
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

			// 创建文件节点
			const fileName = pathParts[pathParts.length - 1];
			const fileNode: TreeNodeData = {
				key: `file-${resource.id}`,
				title: fileName,
				nodeType: 'file',
				path: resource.filePath,
				icon: <FileImageOutlined />,
				isLeaf: true,
				resourceData: resource,
			};

			currentParent.children!.push(fileNode);
		});

		// 如果正在创建新文件夹，添加临时节点
		if (isCreatingNewFolder && selectedNodeKey) {
			const findParentNode = (nodes: TreeNodeData[], targetKey: string): TreeNodeData | null => {
				for (const node of nodes) {
					if (node.key === targetKey) {
						return node;
					}
					if (node.children) {
						const found = findParentNode(node.children, targetKey);
						if (found) return found;
					}
				}
				return null;
			};

			const parentNode = findParentNode([root], selectedNodeKey);
			if (parentNode) {
				const basePath = parentNode.nodeType === 'root' ? '' : parentNode.path;
				const newFolderPath = basePath ? `${basePath}.新文件夹` : '新文件夹';
				const tempFolderNode: TreeNodeData = {
					key: 'temp-new-folder',
					title: '新文件夹',
					nodeType: 'folder',
					path: newFolderPath,
					icon: <FolderOutlined />,
					children: [],
				};
				parentNode.children!.unshift(tempFolderNode);
			}
		}

		return [root];
	};

	// 递归构建Antd Tree组件所需的数据结构
	const buildAntdTreeData = (nodes: TreeNodeData[]): any[] => {
		return nodes.map((node) => ({
			title:
				editingNode === node.key ? (
					<Input
						value={editingValue}
						onChange={(e) => setEditingValue(e.target.value)}
						onPressEnter={() => handleEditSave(node.key, editingValue)}
						onBlur={() => handleEditCancel()}
						onClick={(e) => e.stopPropagation()}
						autoFocus
					/>
				) : (
					<span
						onContextMenu={(e) => handleContextMenu(e, node.key, node.nodeType)}
						onDoubleClick={() => handleNodeEdit(node.key, node.title)}
						className={styles.treeNodeTitle}
					>
						{node.title}
					</span>
				),
			key: node.key,
			icon: node.icon,
			isLeaf: node.isLeaf,
			// 文件夹节点即使为空也要设置 children 为空数组,否则无法拖拽到内部
			children:
				node.nodeType === 'folder' || node.nodeType === 'root'
					? node.children && node.children.length > 0
						? buildAntdTreeData(node.children)
						: []
					: undefined,
			// 保存原始数据引用
			nodeData: node,
			// 启用拖拽
			draggable: node.nodeType !== 'root',
		}));
	};

	// 处理节点编辑
	const handleNodeEdit = (key: string, currentValue: string) => {
		setEditingNode(key);
		setEditingValue(currentValue);
	};

	// 保存节点编辑
	const handleEditSave = async (key: string, newValue: string) => {
		if (!newValue.trim()) {
			message.error('名称不能为空');
			return;
		}

		// 处理新建文件夹的情况
		if (key === 'temp-new-folder' && isCreatingNewFolder) {
			const findNodeData = (nodes: TreeNodeData[], targetKey: string): TreeNodeData | null => {
				for (const node of nodes) {
					if (node.key === targetKey) {
						return node;
					}
					if (node.children) {
						const found = findNodeData(node.children, targetKey);
						if (found) return found;
					}
				}
				return null;
			};

			const treeData = buildTreeFromResources();
			const parentNode = findNodeData(treeData, selectedNodeKey!);

			if (parentNode) {
				const basePath = parentNode.nodeType === 'root' ? '' : parentNode.path;

				try {
					const result = await createVirtualFolder({
						name: newValue,
						parentPath: basePath,
					});

					if (result.success) {
						message.success('文件夹创建成功');
						setIsCreatingNewFolder(false);
						setEditingNode(null);
						setEditingValue('');
						// 重新加载虚拟文件夹
						const foldersResult = await getVirtualFolders();
						if (foldersResult.success && foldersResult.data) {
							setVirtualFolders(foldersResult.data);
						}
						onFolderCreated?.();
					} else {
						message.error(result.error || '创建文件夹失败');
					}
				} catch (error) {
					console.error('创建文件夹失败:', error);
					message.error('创建文件夹失败');
				}
			}
			return;
		}

		// 查找对应的节点数据
		const findNodeData = (nodes: TreeNodeData[], targetKey: string): TreeNodeData | null => {
			for (const node of nodes) {
				if (node.key === targetKey) {
					return node;
				}
				if (node.children) {
					const found = findNodeData(node.children, targetKey);
					if (found) return found;
				}
			}
			return null;
		};

		const treeData = buildTreeFromResources();
		const nodeData = findNodeData(treeData, key);

		if (!nodeData) {
			message.error('未找到对应的节点数据');
			return;
		}

		if (nodeData.nodeType === 'file' && nodeData.resourceData) {
			// 更新文件名
			const pathParts = nodeData.resourceData.filePath.split('.');
			pathParts[pathParts.length - 1] = newValue;
			const newPath = pathParts.join('.');

			try {
				const result = await updateTextureResource(nodeData.resourceData.id, {
					name: newValue,
					filePath: newPath,
				});

				if (result.success && result.data) {
					const updatedResources = resources.map((r) => (r.id === nodeData.resourceData!.id ? result.data! : r));
					onResourcesChange(updatedResources);
					message.success('文件名更新成功');
				} else {
					message.error(result.error || '更新文件名失败');
				}
			} catch (error) {
				console.error('更新文件名失败:', error);
				message.error('更新文件名失败');
			}
		} else if (nodeData.nodeType === 'folder') {
			// 更新文件夹名
			const oldPath = nodeData.path;
			const pathParts = oldPath.split('.');
			pathParts[pathParts.length - 1] = newValue;
			const newPath = pathParts.join('.');

			try {
				// 查找对应的虚拟文件夹
				const virtualFolder = virtualFolders.find((vf) => vf.path === oldPath);

				if (!virtualFolder) {
					message.error('未找到对应的虚拟文件夹');
					setEditingNode(null);
					return;
				}

				// 调用后端更新虚拟文件夹（会自动更新所有子文件夹和资源）
				const result = await renameVirtualFolder(virtualFolder.id, newValue);

				if (result.success) {
					// 重新加载虚拟文件夹列表
					const foldersResult = await getVirtualFolders();
					if (foldersResult.success && foldersResult.data) {
						setVirtualFolders(foldersResult.data);
					}

					// 更新选中节点的 key 为新路径
					const parentPath = oldPath.substring(0, oldPath.lastIndexOf('.'));
					const newNodePath = parentPath ? `${parentPath}.${newValue}` : newValue;
					const newNodeKey = `folder-${newNodePath}`;

					setSelectedNodeKey(newNodeKey);
					setSelectedNodeType('folder');
					setSelectedKeys([newNodeKey]);

					// 触发父组件刷新资源列表，传入新路径
					onFolderSelect?.(newNodePath);
					message.success('文件夹名更新成功');

					// 成功后退出编辑
					setEditingNode(null);
					setEditingValue('');
				} else {
					message.error(result.error || '更新文件夹名失败');
					// 失败时不退出编辑，让用户可以修改
				}
			} catch (error) {
				console.error('更新文件夹名失败:', error);
				message.error('更新文件夹名失败');
				// 失败时不退出编辑，让用户可以修改
			}
		} else {
			// 其他情况也退出编辑
			setEditingNode(null);
			setEditingValue('');
		}
	};

	// 取消节点编辑
	const handleEditCancel = () => {
		setEditingNode(null);
		setEditingValue('');
		if (isCreatingNewFolder) {
			setIsCreatingNewFolder(false);
		}
	};

	// 控制拖拽放置规则
	const handleAllowDrop = (info: { dropNode: any; dropPosition: number }) => {
		const dropNode = info.dropNode?.nodeData as TreeNodeData;
		const dropPosition = info.dropPosition;

		// dropPosition 说明:
		// -1: 拖拽到节点上方 (gap)
		//  0: 拖拽到节点内部
		//  1: 拖拽到节点下方 (gap)

		// 只允许拖拽到文件夹内部 (dropPosition === 0)
		if (dropNode?.nodeType === 'folder' && dropPosition === 0) {
			return true;
		}

		// 只允许拖拽到根节点内部
		if (dropNode?.nodeType === 'root' && dropPosition === 0) {
			return true;
		}

		// 禁止拖拽到节点之间的间隙
		return false;
	};

	// 处理拖拽放置
	const handleDrop = async (info: any) => {
		const dragNode = info.dragNode?.nodeData as TreeNodeData;
		const dropNode = info.node?.nodeData as TreeNodeData;

		if (!dragNode || !dropNode) return;

		// 不允许拖拽到自己或自己的子节点
		if (dragNode.key === dropNode.key) {
			message.warning('不能拖拽到自己');
			return;
		}

		// 确定目标父节点 - 只处理拖拽到文件夹/根节点内部的情况
		let targetParentPath = '';
		if (dropNode.nodeType === 'folder') {
			// 拖拽到文件夹内部
			targetParentPath = dropNode.path;
		} else if (dropNode.nodeType === 'root') {
			// 拖拽到根节点内部
			targetParentPath = '';
		} else {
			// 其他情况不应该发生(因为 allowDrop 已经限制了)
			message.warning('只能拖拽到文件夹内部');
			return;
		}

		// 处理文件拖拽
		if (dragNode.nodeType === 'file' && dragNode.resourceData) {
			const oldPath = dragNode.resourceData.filePath;
			const fileName = oldPath.split('.').pop() || dragNode.resourceData.name;
			const newPath = targetParentPath ? `${targetParentPath}.${fileName}` : fileName;

			if (oldPath === newPath) {
				message.info('文件位置未改变');
				return;
			}

			try {
				const result = await updateTextureResource(dragNode.resourceData.id, {
					filePath: newPath,
				});

				if (result.success && result.data) {
					const updatedResources = resources.map((r) => (r.id === dragNode.resourceData!.id ? result.data! : r));
					onResourcesChange(updatedResources);
					message.success('文件移动成功');
				} else {
					message.error(result.error || '移动文件失败');
				}
			} catch (error) {
				console.error('移动文件失败:', error);
				const errorMessage = error instanceof Error ? error.message : '移动文件失败';
				message.error(errorMessage);
			}
		}
		// 处理文件夹拖拽
		else if (dragNode.nodeType === 'folder') {
			const oldPath = dragNode.path;
			const folderName = oldPath.split('.').pop() || '';
			const newPath = targetParentPath ? `${targetParentPath}.${folderName}` : folderName;

			if (oldPath === newPath) {
				message.info('文件夹位置未改变');
				return;
			}

			// 检查是否拖拽到自己的子文件夹
			if (targetParentPath.startsWith(oldPath + '.') || targetParentPath === oldPath) {
				message.warning('不能将文件夹移动到自己的子文件夹中');
				return;
			}

			try {
				// 查找对应的虚拟文件夹
				const virtualFolder = virtualFolders.find((vf) => vf.path === oldPath);

				if (virtualFolder) {
					// 调用后端统一的移动接口
					const result = await moveVirtualFolder(virtualFolder.id, newPath);

					if (result.success) {
						// 重新加载虚拟文件夹列表
						const foldersResult = await getVirtualFolders();
						if (foldersResult.success && foldersResult.data) {
							setVirtualFolders(foldersResult.data);
						}

						// 触发父组件刷新资源列表
						onFolderCreated?.();
						message.success('文件夹移动成功');
					} else {
						message.error(result.error || '移动文件夹失败');
					}
				} else {
					message.error('未找到对应的虚拟文件夹');
				}
			} catch (error) {
				console.error('移动文件夹失败:', error);
				const errorMessage = error instanceof Error ? error.message : '移动文件夹失败';
				message.error(errorMessage);
			}
		}
	};

	// 处理右键菜单
	const handleContextMenu = (event: React.MouseEvent, nodeKey: string, nodeType: NodeType) => {
		event.preventDefault();

		// 如果正在创建新文件夹，取消创建状态
		if (isCreatingNewFolder) {
			setIsCreatingNewFolder(false);
			setEditingNode(null);
			setEditingValue('');
		}

		setSelectedNodeKey(nodeKey);
		setSelectedNodeType(nodeType);
		setContextMenuPosition({ x: event.clientX, y: event.clientY });
		setContextMenuVisible(true);
	};

	// 关闭右键菜单
	const closeContextMenu = () => {
		setContextMenuVisible(false);
	};

	// 处理右键菜单操作
	const handleContextMenuAction = async (action: string) => {
		if (!selectedNodeKey) return;
		closeContextMenu();
		// 查找对应的节点数据
		const findNodeData = (nodes: TreeNodeData[], targetKey: string): TreeNodeData | null => {
			for (const node of nodes) {
				if (node.key === targetKey) {
					return node;
				}
				if (node.children) {
					const found = findNodeData(node.children, targetKey);
					if (found) return found;
				}
			}
			return null;
		};

		const treeData = buildTreeFromResources();
		const nodeData = findNodeData(treeData, selectedNodeKey);

		switch (action) {
			case 'add_folder':
				if (nodeData) {
					// 设置创建新文件夹状态，显示可编辑的输入框
					setIsCreatingNewFolder(true);
					setEditingNode('temp-new-folder');
					setEditingValue('新文件夹');
					// 展开父节点
					if (!expandedKeys.includes(selectedNodeKey)) {
						setExpandedKeys([...expandedKeys, selectedNodeKey]);
					}
				}
				break;
			case 'add_file':
				closeContextMenu();
				// 触发文件选择
				if (fileInputRef.current) {
					fileInputRef.current.click();
				}
				break;
			case 'rename':
				closeContextMenu();
				if (nodeData) {
					handleNodeEdit(nodeData.key, nodeData.title);
				}
				break;
			case 'copy':
				closeContextMenu();
				if (nodeData && nodeData.nodeType === 'file') {
					setClipboard({ type: 'copy', nodeKey: selectedNodeKey, nodeData });
					message.success('已复制');
				}
				break;
			case 'copy_folder':
				closeContextMenu();
				if (nodeData?.nodeType === 'folder') {
					setClipboard({ type: 'copy_folder', nodeKey: selectedNodeKey, nodeData });
					message.success('已复制文件夹');
				}
				break;
			case 'cut':
                closeContextMenu();
                if (nodeData && nodeData.nodeType === 'file') {
                    setClipboard({ type: 'cut', nodeKey: selectedNodeKey, nodeData });
                    message.success('已剪切');
                }
                break;
            case 'download':
                closeContextMenu();
                if (nodeData?.nodeType === 'file' && nodeData.resourceData) {
                    handleDownloadFile(nodeData.resourceData);
                }
                break;
            case 'paste':
				closeContextMenu();
				if (!clipboard) {
					message.warning('剪贴板为空');
					return;
				}

				// 处理文件夹粘贴
				if (clipboard.type === 'copy_folder' && clipboard.nodeData.nodeType === 'folder') {
					try {
						// 确定目标路径
						let targetParentPath = '';
						let targetParentId: string | null = null;
						
						if (nodeData?.nodeType === 'folder') {
							targetParentPath = nodeData.path;
							const targetFolder = virtualFolders.find((vf) => vf.path === nodeData.path);
							targetParentId = targetFolder?.id || null;
						} else if (nodeData?.nodeType === 'root') {
							targetParentPath = '';
							targetParentId = null;
						}

						// 查找源文件夹
						const sourceFolder = virtualFolders.find((vf) => vf.path === clipboard.nodeData.path);
						if (!sourceFolder) {
							message.error('未找到源文件夹');
							return;
						}

						// 生成新的文件夹名称
						let newFolderName = `${sourceFolder.name}_copy`;
						let counter = 1;
						
						// 检查是否存在同名文件夹
						while (virtualFolders.some(vf => 
							vf.parentId === targetParentId && vf.name === newFolderName
						)) {
							newFolderName = `${sourceFolder.name}_copy${counter}`;
							counter++;
						}

						// 调用后端复制文件夹
						const response = await fetch('/api/virtual-folders/copy', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								folderId: sourceFolder.id,
								newName: newFolderName,
								targetParentId: targetParentId,
							}),
						});

						const result = await response.json();

						if (result.success) {
							// 重新加载虚拟文件夹列表
							const foldersResult = await getVirtualFolders();
							if (foldersResult.success && foldersResult.data) {
								setVirtualFolders(foldersResult.data);
							}

							// 触发父组件刷新资源列表
							onFolderCreated?.();
							
							// 显示详细的复制结果
							const data = result.data as any;
							if (data) {
								message.success(
									`粘贴成功：${data.copiedFolders} 个文件夹，${data.copiedResources} 个文件（共享文件引用）`
								);
							} else {
								message.success('文件夹粘贴成功');
							}
							
							// 清空剪贴板
							setClipboard(null);
						} else {
							message.error(result.error || '粘贴文件夹失败');
						}
					} catch (error) {
						console.error('粘贴文件夹失败:', error);
						message.error('粘贴文件夹失败');
					}
					return;
				}

				// 处理文件粘贴
				if (clipboard.nodeData.nodeType !== 'file' || !clipboard.nodeData.resourceData) {
					return;
				}

				// 确定目标路径
				let targetPath = '';
				if (nodeData?.nodeType === 'folder') {
					targetPath = nodeData.path;
				} else if (nodeData?.nodeType === 'root') {
					targetPath = '';
				}

				try {
					const resource = clipboard.nodeData.resourceData;
					const newFilePath = targetPath ? `${targetPath}.${resource.name}` : resource.name;

					// 检查目标路径是否已存在
					const exists = resources.some((r) => r.filePath === newFilePath);
					if (exists) {
						message.error('目标路径已存在同名文件');
						return;
					}

					if (clipboard.type === 'copy') {
						// 复制文件：在数据库中创建新记录
						const response = await fetch('/api/texture-resources', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								action: 'copy',
								sourceId: resource.id,
								filePath: newFilePath,
							}),
						});

						const result = await response.json();

						if (result.success && result.data) {
							onResourcesChange([...resources, result.data]);
							message.success('文件复制成功');
						} else {
							message.error(result.error || '文件复制失败');
						}
					} else {
						// 剪切文件：移动文件
						const result = await updateTextureResource(resource.id, {
							filePath: newFilePath,
						});

						if (result.success && result.data) {
							const updatedResources = resources.map((r) => (r.id === resource.id ? result.data! : r));
							onResourcesChange(updatedResources);
							message.success('文件移动成功');
							setClipboard(null);
						} else {
							message.error(result.error || '文件移动失败');
						}
					}
				} catch (error) {
					console.error('粘贴失败:', error);
					message.error('粘贴失败');
				}
				break;
			case 'delete':
				closeContextMenu();
				if (nodeData?.nodeType === 'file' && nodeData.resourceData) {
					// 删除文件资源
					try {
						const result = await deleteTextureResource(nodeData.resourceData.id);

						if (result.success) {
							const updatedResources = resources.filter((r) => r.id !== nodeData.resourceData!.id);
							onResourcesChange(updatedResources);
							message.success('文件删除成功');
						} else {
							message.error(result.error || '删除文件失败');
						}
					} catch (error) {
						console.error('删除文件失败:', error);
						message.error('删除文件失败');
					}
				} else if (nodeData?.nodeType === 'folder') {
				// 删除文件夹
				const folderPath = nodeData.path;

				try {
					// 查找对应的虚拟文件夹
					const virtualFolder = virtualFolders.find((vf) => vf.path === folderPath);

					if (!virtualFolder) {
						message.error('未找到对应的虚拟文件夹');
						return;
					}

					// 统计文件夹及其子文件夹下的资源数量
					const folderResources = resources.filter((r) => 
						r.filePath.startsWith(`${folderPath}.`) || r.filePath === folderPath
					);
					const subFolders = virtualFolders.filter((vf) => vf.path.startsWith(`${folderPath}.`));

					// 如果文件夹为空，直接删除不弹窗
					if (folderResources.length === 0 && subFolders.length === 0) {
						try {
							// 调用后端删除虚拟文件夹
							const result = await deleteVirtualFolder(virtualFolder.id);

							if (result.success) {
								// 重新加载虚拟文件夹列表
								const foldersResult = await getVirtualFolders();
								if (foldersResult.success && foldersResult.data) {
									setVirtualFolders(foldersResult.data);
								}

								// 触发父组件刷新资源列表
								onFolderCreated?.();
								message.success('文件夹删除成功');
							} else {
								message.error(result.error || '删除文件夹失败');
							}
						} catch (error) {
							console.error('删除文件夹失败:', error);
							message.error('删除文件夹失败');
						}
						return;
					}

					// 显示确认对话框
					modal.confirm({
						title: '确认删除文件夹',
						content: (
							<div>
								<p>您确定要删除文件夹 <strong>{nodeData.title}</strong> 吗？</p>
								<p style={{ marginTop: '12px', color: '#666' }}>
									此操作将删除：
								</p>
								<ul style={{ marginTop: '8px', color: '#666' }}>
									<li>{subFolders.length} 个子文件夹</li>
									<li>{folderResources.length} 个文件</li>
								</ul>
								<p style={{ marginTop: '12px', color: '#ff4d4f' }}>
									⚠️ 此操作不可恢复，但会保留被其他位置引用的物理文件
								</p>
							</div>
						),
						okText: '确定删除',
						cancelText: '取消',
						okType: 'danger',
						onOk: async () => {
							try {
								// 调用后端删除虚拟文件夹
								const result = await deleteVirtualFolder(virtualFolder.id);

								if (result.success) {
									// 重新加载虚拟文件夹列表
									const foldersResult = await getVirtualFolders();
									if (foldersResult.success && foldersResult.data) {
										setVirtualFolders(foldersResult.data);
									}

									// 触发父组件刷新资源列表
									onFolderCreated?.();
									
									// 显示详细的删除结果
									const data = result.data as any;
									if (data) {
										message.success(
											`删除成功：${data.deletedFolders} 个文件夹，${data.deletedResources} 个资源记录，${data.deletedFiles} 个物理文件`
										);
									} else {
										message.success('文件夹删除成功');
									}
								} else {
									message.error(result.error || '删除文件夹失败');
								}
							} catch (error) {
								console.error('删除文件夹失败:', error);
								message.error('删除文件夹失败');
							}
						},
					});
				} catch (error) {
					console.error('删除文件夹失败:', error);
					message.error('删除文件夹失败');
				}
			}
					break;
				
				case 'clear_folder':
					closeContextMenu();
					if (nodeData?.nodeType === 'folder') {
						await handleClearFolder(nodeData.path, nodeData.title);
					}
					break;
				
				case 'clear_root':
                    closeContextMenu();
                    await handleClearRoot();
                    break;
                
                case 'download_root':
                    closeContextMenu();
                    await handleDownloadRoot();
                    break;
                
                case 'download_folder':
                    closeContextMenu();
                    if (nodeData?.nodeType === 'folder') {
                        await handleDownloadFolder(nodeData.path, nodeData.title);
                    }
                    break;
            }
        };

		

		// 处理文件下载
        const handleDownloadFile = async (resource: TextureResource) => {
            try {
                downloadTextureResource(resource);
                message.success('开始下载文件');
            } catch (error) {
                console.error('下载文件失败:', error);
                message.error('下载文件失败');
            }
        };

        // 处理根目录下载
        const handleDownloadRoot = async () => {
            try {
                if (resources.length === 0) {
                    message.warning('根目录为空，无法下载');
                    return;
                }

                message.loading({ content: '正在准备下载...', key: 'download-root' });

                // 调用后端API下载根目录
                const response = await fetch('/api/virtual-folders/download-root', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                    throw new Error('下载失败');
                }

                // 下载文件
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = '纹理资源.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                message.success({ content: '根目录下载成功', key: 'download-root' });
            } catch (error) {
                console.error('下载根目录失败:', error);
                message.error({ content: '下载根目录失败', key: 'download-root' });
            }
        };

        // 处理文件夹下载
        const handleDownloadFolder = async (folderPath: string, folderName: string) => {
            try {
                // 查找对应的虚拟文件夹
                const virtualFolder = virtualFolders.find((vf) => vf.path === folderPath);
                if (!virtualFolder) {
                    message.error('未找到对应的虚拟文件夹');
                    return;
                }

                // 统计文件夹下的资源数量
                const folderResources = resources.filter((r) => 
                    r.filePath.startsWith(`${folderPath}.`) || r.filePath === folderPath
                );

                if (folderResources.length === 0) {
                    message.warning('文件夹为空，无法下载');
                    return;
                }

                message.loading({ content: '正在准备下载...', key: 'download-folder' });

                // 调用后端API下载文件夹
                const response = await fetch('/api/virtual-folders/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        folderId: virtualFolder.id,
                    }),
                });

                if (!response.ok) {
                    throw new Error('下载失败');
                }

                // 下载文件
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${folderName}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                message.success({ content: '文件夹下载成功', key: 'download-folder' });
            } catch (error) {
                console.error('下载文件夹失败:', error);
                message.error({ content: '下载文件夹失败', key: 'download-folder' });
            }
        };

        // 清空根目录
        const handleClearRoot = async () => {
			try {
				// 统计根目录下的所有资源和文件夹
				const rootResources = resources.filter((r) => !r.filePath.includes('.'));
				const allFolders = virtualFolders;

				// 如果根目录为空，提示信息不执行
				if (rootResources.length === 0 && allFolders.length === 0) {
					message.info('根目录已经是空的');
					return;
				}

				// 显示确认对话框
				modal.confirm({
					title: '确认清空根目录',
					content: (
						<div>
							<p>您确定要清空 <strong>根目录</strong> 吗？</p>
							<p style={{ marginTop: '12px', color: '#666' }}>
								此操作将删除：
							</p>
							<ul style={{ marginTop: '8px', color: '#666' }}>
								<li>{allFolders.length} 个文件夹（包括所有子文件夹）</li>
								<li>{resources.length} 个文件（包括所有子文件夹中的文件）</li>
							</ul>
							<p style={{ marginTop: '12px', color: '#ff4d4f' }}>
								⚠️ 此操作不可恢复，所有物理文件都将被删除
							</p>
						</div>
					),
					okText: '确定清空',
					cancelText: '取消',
					okType: 'danger',
					onOk: async () => {
						try {
							// 调用后端清空根目录
							const response = await fetch('/api/virtual-folders/clear-root', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
							});

							const result = await response.json();

							if (result.success) {
								// 重新加载虚拟文件夹列表
								const foldersResult = await getVirtualFolders();
								if (foldersResult.success && foldersResult.data) {
									setVirtualFolders(foldersResult.data);
								}

								// 触发父组件刷新资源列表
								onFolderCreated?.();
								
								// 显示详细的清空结果
								const data = result.data as any;
								if (data) {
									message.success(
										`清空成功：删除 ${data.deletedFolders} 个文件夹，${data.deletedResources} 个文件，${data.deletedFiles} 个物理文件`
									);
								} else {
									message.success('根目录清空成功');
								}
							} else {
								message.error(result.error || '清空根目录失败');
							}
						} catch (error) {
							console.error('清空根目录失败:', error);
							const errorMessage = error instanceof Error ? error.message : '清空根目录失败';
							message.error(errorMessage);
						}
					},
				});
			} catch (error) {
				console.error('清空根目录失败:', error);
				const errorMessage = error instanceof Error ? error.message : '清空根目录失败';
				message.error(errorMessage);
			}
		};

		// 清空文件夹
		const handleClearFolder = async (folderPath: string, folderName: string) => {
			try {
				// 查找对应的虚拟文件夹
				const virtualFolder = virtualFolders.find((vf) => vf.path === folderPath);
				if (!virtualFolder) {
					message.error('未找到对应的虚拟文件夹');
					return;
				}

				// 统计文件夹及其子文件夹下的资源数量
				const folderResources = resources.filter((r) => 
					r.filePath.startsWith(`${folderPath}.`) || r.filePath === folderPath
				);
				const subFolders = virtualFolders.filter((vf) => vf.path.startsWith(`${folderPath}.`));

				// 如果文件夹为空，提示信息不执行
				if (folderResources.length === 0 && subFolders.length === 0) {
					message.info('文件夹已经是空的');
					return;
				}

				// 显示确认对话框
				modal.confirm({
					title: '确认清空文件夹',
					content: (
						<div>
							<p>您确定要清空文件夹 <strong>{folderName}</strong> 吗？</p>
							<p style={{ marginTop: '12px', color: '#666' }}>
								此操作将删除：
							</p>
							<ul style={{ marginTop: '8px', color: '#666' }}>
								<li>{subFolders.length} 个子文件夹</li>
								<li>{folderResources.length} 个文件</li>
							</ul>
							<p style={{ marginTop: '12px', color: '#ff4d4f' }}>
								⚠️ 此操作不可恢复，但会保留被其他位置引用的物理文件
							</p>
						</div>
					),
					okText: '确定清空',
					cancelText: '取消',
					okType: 'danger',
					onOk: async () => {
						try {
							// 调用后端清空文件夹
							const response = await fetch('/api/virtual-folders/clear', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									folderId: virtualFolder.id,
								}),
							});

							const result = await response.json();

							if (result.success) {
								// 重新加载虚拟文件夹列表
								const foldersResult = await getVirtualFolders();
								if (foldersResult.success && foldersResult.data) {
									setVirtualFolders(foldersResult.data);
								}

								// 触发父组件刷新资源列表
								onFolderCreated?.();
								
								// 显示详细的清空结果
					const data = result.data as any;
					if (data) {
						message.success(
							`清空成功：删除 ${data.deletedFolders} 个子文件夹，${data.deletedResources} 个文件，${data.deletedFiles} 个物理文件`
						);
					} else {
						message.success('文件夹清空成功');
					}
							} else {
								message.error(result.error || '清空文件夹失败');
							}
						} catch (error) {
							console.error('清空文件夹失败:', error);
							message.error('清空文件夹失败');
						}
					},
				});
			} catch (error) {
				console.error('清空文件夹失败:', error);
				message.error('清空文件夹失败');
			}
		};

		// 处理拖拽开始
		const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		document.body.classList.add('resizing');
	}, []);

	// 处理拖拽过程
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing || !containerRef.current) return;

			const containerRect = containerRef.current.getBoundingClientRect();
			const newWidth = e.clientX - containerRect.left;

			// 限制宽度范围
			const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));

			if (onWidthChange) {
				onWidthChange(clampedWidth);
			}
		},
		[isResizing, onWidthChange]
	);

	// 处理拖拽结束
	const handleMouseUp = useCallback(() => {
		setIsResizing(false);
		document.body.classList.remove('resizing');
	}, []);

	// 监听鼠标事件
	useEffect(() => {
		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		} else {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.classList.remove('resizing');
		};
	}, [isResizing, handleMouseMove, handleMouseUp]);

	// 监听鼠标点击事件关闭右键菜单
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (contextMenuVisible) {
				closeContextMenu();
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	}, [contextMenuVisible]);

	// 处理文件上传
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		const file = files[0];

		// 验证是否为图片
		if (!file.type.startsWith('image/')) {
			message.error('只能上传图片文件');
			return;
		}

		// 查找选中节点的路径
		const findNodeData = (nodes: TreeNodeData[], targetKey: string): TreeNodeData | null => {
			for (const node of nodes) {
				if (node.key === targetKey) {
					return node;
				}
				if (node.children) {
					const found = findNodeData(node.children, targetKey);
					if (found) return found;
				}
			}
			return null;
		};

		const treeData = buildTreeFromResources();
		const nodeData = selectedNodeKey ? findNodeData(treeData, selectedNodeKey) : null;

		// 确定上传路径
		let folderPath = '';
		if (nodeData) {
			if (nodeData.nodeType === 'folder') {
				folderPath = nodeData.path;
			} else if (nodeData.nodeType === 'root') {
				folderPath = '';
			}
		}

		try {
			const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
			const result = await createTextureResource({
				file,
				name: fileName,
				description: '',
				tags: [],
				isPublic: true,
				folderPath,
			});

			if (result.success && result.data) {
				// 更新资源列表
				onResourcesChange([...resources, result.data]);
				message.success('文件上传成功');
			} else {
				message.error(result.error || '文件上传失败');
			}
		} catch (error) {
			console.error('文件上传失败:', error);
			message.error('文件上传失败');
		} finally {
			// 重置文件输入
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const treeData = buildTreeFromResources();

	// 获取所有可展开节点的key
	const getAllExpandableKeys = (nodes: TreeNodeData[]): string[] => {
		let keys: string[] = [];
		nodes.forEach((node) => {
			if (node.nodeType === 'folder' || node.nodeType === 'root') {
				keys.push(node.key);
				if (node.children) {
					keys = keys.concat(getAllExpandableKeys(node.children));
				}
			}
		});
		return keys;
	};

	// 切换展开/折叠所有节点
	const handleToggleExpandAll = () => {
		const allKeys = getAllExpandableKeys(treeData);
		// 如果当前展开的节点数量等于所有可展开节点数量，则折叠所有；否则展开所有
		if (expandedKeys.length === allKeys.length) {
			setExpandedKeys([]);
		} else {
			setExpandedKeys(allKeys);
		}
	};

	// 判断是否所有节点都已展开
	const allExpandableKeys = getAllExpandableKeys(treeData);
	const isAllExpanded = expandedKeys.length === allExpandableKeys.length && allExpandableKeys.length > 0;

	return (
		<div ref={containerRef} className={`${styles.directoryTreeCardWrapper} ${isResizing ? styles.resizing : ''}`} style={{ width: `${width}px` }}>
			<Card
				title="目录"
				className={styles.directoryTreeCard}
				extra={
					<Button
						size="small"
						icon={isAllExpanded ? <ShrinkOutlined /> : <ExpandOutlined />}
						onClick={handleToggleExpandAll}
						title={isAllExpanded ? '折叠所有' : '展开所有'}
					/>
				}
			>
				<Tree
					treeData={buildAntdTreeData(treeData)}
					selectedKeys={selectedKeys}
					expandedKeys={expandedKeys as string[]}
					onExpand={(keys) => setExpandedKeys(keys as string[])}
					onSelect={(keys, info) => {
						setSelectedKeys(keys as string[]);

						// 根据选中节点处理
						const nodeData = info.node?.nodeData as TreeNodeData;

						if (nodeData?.nodeType === 'file' && nodeData.resourceData) {
							setSelectedNodeKey(nodeData.key);
							setSelectedNodeType('file');
							onResourceSelect(nodeData.resourceData);
							onFolderSelect('');
						} else if (nodeData?.nodeType === 'folder') {
							setSelectedNodeKey(nodeData.key);
							setSelectedNodeType('folder');
							onResourceSelect(null);
							onFolderSelect(nodeData.path);
						} else {
							setSelectedNodeKey('root');
							setSelectedNodeType('root');
							onResourceSelect(null);
							onFolderSelect('');
						}
					}}
					draggable
					allowDrop={handleAllowDrop}
					onDrop={handleDrop}
					showIcon
					defaultExpandAll
				/>
				{/* 右键菜单 */}
				{contextMenuVisible &&
					createPortal(
						<div
							className={styles.contextMenu}
							style={{
								top: contextMenuPosition.y,
								left: contextMenuPosition.x,
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<Menu
								onClick={({ key }) => handleContextMenuAction(key as string)}
								items={(() => {
									const menuConfig = {
										root: [
											{ key: 'add_folder', label: '新建文件夹', icon: <FolderAddOutlined /> },
											{ key: 'add_file', label: '新建文件', icon: <FileAddOutlined /> },
											...(clipboard ? [{ type: 'divider' as const }, { key: 'paste', label: '粘贴', icon: <SnippetsOutlined /> }] : []),
											{ type: 'divider' as const },
											{ key: 'download_root', label: '下载根目录', icon: <DownloadOutlined /> },
											{ key: 'clear_root', label: '清空根目录', icon: <ClearOutlined />, danger: true },
										],
										folder: [
											{ key: 'add_folder', label: '新建文件夹', icon: <FolderAddOutlined /> },
											{ key: 'add_file', label: '新建文件', icon: <FileAddOutlined /> },
											...(clipboard ? [{ type: 'divider' as const }, { key: 'paste', label: '粘贴', icon: <SnippetsOutlined /> }] : []),
											{ type: 'divider' as const },
											{ key: 'download_folder', label: '下载文件夹', icon: <DownloadOutlined /> },
											{ key: 'copy_folder', label: '复制文件夹', icon: <CopyOutlined /> },
											{ key: 'clear_folder', label: '清空文件夹', icon: <ClearOutlined /> },
											{ type: 'divider' as const },
											{ key: 'rename', label: '重命名', icon: <EditOutlined /> },
											{ key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
										],
										file: [
											{ key: 'download', label: '下载', icon: <DownloadOutlined /> },
											{ type: 'divider' as const },
											{ key: 'copy', label: '复制', icon: <CopyOutlined /> },
											{ key: 'cut', label: '剪切', icon: <ScissorOutlined /> },
											{ type: 'divider' as const },
											{ key: 'rename', label: '重命名', icon: <EditOutlined /> },
											{ key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
										],
									};

									return menuConfig[selectedNodeType as keyof typeof menuConfig] || [];
								})()}
							/>
						</div>,
						document.body
					)}
			</Card>

			{/* 拖拽手柄 */}
			<div ref={resizeRef} className={styles.resizeHandle} onMouseDown={handleMouseDown} />

			{/* 隐藏的文件输入 */}
			<input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
		</div>
	);
};

export default DirectoryTree;
