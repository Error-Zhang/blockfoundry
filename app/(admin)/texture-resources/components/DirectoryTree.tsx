import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App, Card, Input, Menu, Tree } from 'antd';
import { FileImageOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';
import { ContextMenuPosition, NodeType, TextureResource, TreeNodeData } from '../lib/types';
import styles from '../../../styles/directoryTree.module.scss';
import { createVirtualFolder, getVirtualFolders, VirtualFolder, updateVirtualFolder, moveVirtualFolder } from '../services/virtualFolderService';
import { updateTextureResource, deleteTextureResource } from '../services/textureResourceService';

interface DirectoryTreeProps {
	resources: TextureResource[]; // 纹理资源列表
	onResourceSelect: (resource: TextureResource | null) => void;
	onResourcesChange: (resources: TextureResource[]) => void;
	onFolderSelect: (folderPath: string) => void;
	onFolderCreated?: () => void; // 文件夹创建成功回调
	width?: number;
	onWidthChange?: (width: number) => void;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({
	resources,
	onResourceSelect,
	onResourcesChange,
	onFolderSelect,
	onFolderCreated,
	width = 300,
	onWidthChange,
}) => {
	const { message } = App.useApp();
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
			children: node.children && node.children.length > 0 ? buildAntdTreeData(node.children) : undefined,
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
					const updatedResources = resources.map((r) => 
						r.id === nodeData.resourceData!.id ? result.data! : r
					);
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
			// 更新文件夹名（需要更新所有子文件的路径）
			const oldPath = nodeData.path;
			const pathParts = oldPath.split('.');
			pathParts[pathParts.length - 1] = newValue;
			const newPath = pathParts.join('.');

			const filesToUpdate = resources.filter(
				(resource) => resource.filePath.startsWith(oldPath + '.') || resource.filePath === oldPath
			);

			try {
				// 批量更新所有文件的路径
				const updatePromises = filesToUpdate.map(resource => {
					const newFilePath = resource.filePath.replace(oldPath, newPath);
					return updateTextureResource(resource.id, {
						filePath: newFilePath,
					});
				});

				const results = await Promise.all(updatePromises);

				// 使用后端返回的最新数据更新资源列表
				const updatedResourcesMap = new Map(
					results
						.filter(r => r.success && r.data)
						.map(r => [r.data!.id, r.data!])
				);
				const updatedResources = resources.map((resource) => {
					if (updatedResourcesMap.has(resource.id)) {
						return updatedResourcesMap.get(resource.id)!;
					}
					return resource;
				});

				onResourcesChange(updatedResources);
				message.success(`文件夹名更新成功，共更新 ${filesToUpdate.length} 个文件`);
			} catch (error) {
				console.error('更新文件夹名失败:', error);
				message.error('更新文件夹名失败');
			}
		}

		setEditingNode(null);
		setEditingValue('');
	};

	// 取消节点编辑
	const handleEditCancel = () => {
		setEditingNode(null);
		setEditingValue('');
		if (isCreatingNewFolder) {
			setIsCreatingNewFolder(false);
		}
	};

	// 处理拖拽放置
	const handleDrop = async (info: any) => {
		const dragNode = info.dragNode?.nodeData as TreeNodeData;
		const dropNode = info.node?.nodeData as TreeNodeData;
		const dropToGap = info.dropToGap;

		if (!dragNode || !dropNode) return;

		// 不允许拖拽到自己或自己的子节点
		if (dragNode.key === dropNode.key) {
			message.warning('不能拖拽到自己');
			return;
		}

		// 确定目标父节点
		let targetParentPath = '';
		if (dropNode.nodeType === 'folder' && !dropToGap) {
			// 拖拽到文件夹内部
			targetParentPath = dropNode.path;
		} else if (dropNode.nodeType === 'root') {
			// 拖拽到根节点
			targetParentPath = '';
		} else {
			// 拖拽到文件旁边，使用文件的父路径
			const pathParts = dropNode.path.split('.');
			pathParts.pop();
			targetParentPath = pathParts.join('.');
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
					const updatedResources = resources.map((r) =>
						r.id === dragNode.resourceData!.id ? result.data! : r
					);
					onResourcesChange(updatedResources);
					message.success('文件移动成功');
				} else {
					message.error(result.error || '移动文件失败');
				}
			} catch (error) {
				console.error('移动文件失败:', error);
				message.error('移动文件失败');
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

			const filesToUpdate = resources.filter(
				(resource) => resource.filePath.startsWith(oldPath + '.') || resource.filePath === oldPath
			);

			try {
				// 查找对应的虚拟文件夹
				const virtualFolder = virtualFolders.find(vf => vf.path === oldPath);
				
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
				message.error('移动文件夹失败');
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
				message.info('新建文件功能开发中...');
				break;
			case 'rename':
				closeContextMenu();
				if (nodeData) {
					handleNodeEdit(nodeData.key, nodeData.title);
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
					// 删除文件夹及其所有子文件
					const folderPath = nodeData.path;
					const filesToDelete = resources.filter(
						(resource) => resource.filePath.startsWith(folderPath + '.') || resource.filePath === folderPath
					);
					
					try {
						// 批量删除所有文件
						const deletePromises = filesToDelete.map(file => 
							deleteTextureResource(file.id)
						);
						
						await Promise.all(deletePromises);
						
						const updatedResources = resources.filter(
							(resource) => !resource.filePath.startsWith(folderPath + '.') && resource.filePath !== folderPath
						);
						onResourcesChange(updatedResources);
						message.success(`文件夹删除成功，共删除 ${filesToDelete.length} 个文件`);
					} catch (error) {
						console.error('删除文件夹失败:', error);
						message.error('删除文件夹失败');
					}
				}
				break;

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

	const treeData = buildTreeFromResources();

	return (
		<div ref={containerRef} className={`${styles.directoryTreeCardWrapper} ${isResizing ? styles.resizing : ''}`} style={{ width: `${width}px` }}>
			<Card title="目录" className={styles.directoryTreeCard}>
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
							onResourceSelect(nodeData.resourceData);
							onFolderSelect('');
						} else if (nodeData?.nodeType === 'folder') {
							onResourceSelect(null);
							onFolderSelect(nodeData.path);
						} else {
							onResourceSelect(null);
							onFolderSelect('');
						}
					}}
					draggable
					onDrop={handleDrop}
					showIcon
					defaultExpandAll
				/>

				{/* 右键菜单 */}
				{contextMenuVisible && (
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
										{ key: 'add_folder', label: '新建文件夹' },
										{ key: 'add_file', label: '新建文件' },
									],
									folder: [
										{ key: 'add_folder', label: '新建文件夹' },
										{ key: 'add_file', label: '新建文件' },
										{ type: 'divider' as const },
										{ key: 'rename', label: '重命名' },
										{ key: 'delete', label: '删除' },
									],
									file: [
										{ key: 'rename', label: '重命名' },
										{ key: 'delete', label: '删除' },
									],
								};

								return menuConfig[selectedNodeType as keyof typeof menuConfig] || [];
							})()}
						/>
					</div>
				)}
			</Card>

			{/* 拖拽手柄 */}
			<div ref={resizeRef} className={styles.resizeHandle} onMouseDown={handleMouseDown} />
		</div>
	);
};

export default DirectoryTree;
