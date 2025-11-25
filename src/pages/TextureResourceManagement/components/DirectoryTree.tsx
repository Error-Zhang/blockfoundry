import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Input, Menu, message, Tree } from 'antd';
import { FileImageOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';
import { ContextMenuPosition, NodeType, TextureResource, TreeNodeData } from '../types.ts';
import '../styles/DirectoryTree.less';

interface DirectoryTreeProps {
	resources: TextureResource[]; // 纹理资源列表
	onResourceSelect: (resource: TextureResource | null) => void;
	onResourcesChange: (resources: TextureResource[]) => void;
	width?: number;
	onWidthChange?: (width: number) => void;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({ resources, onResourceSelect, onResourcesChange, width = 300, onWidthChange }) => {
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
	const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
	const [editingNode, setEditingNode] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState<string>('');
	const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false);
	const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
	const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
	const [selectedNodeType, setSelectedNodeType] = useState<NodeType>('root');

	// 拖拽调整宽度相关状态
	const [isResizing, setIsResizing] = useState(false);
	const resizeRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// 最小和最大宽度限制
	const MIN_WIDTH = 200;
	const MAX_WIDTH = 600;

	// 根据资源的filePath构建树状结构
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

		resources.forEach((resource) => {
			const pathParts = resource.filePath.split('.');
			let currentPath = '';
			let currentParent = root;

			// 创建文件夹层级
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
						autoFocus
					/>
				) : (
					<span
						onContextMenu={(e) => handleContextMenu(e, node.key, node.nodeType)}
						onDoubleClick={() => handleNodeEdit(node.key, node.title)}
						className="tree-node-title"
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
		}));
	};

	// 处理节点编辑
	const handleNodeEdit = (key: string, currentValue: string) => {
		setEditingNode(key);
		setEditingValue(currentValue);
	};

	// 保存节点编辑
	const handleEditSave = (key: string, newValue: string) => {
		if (!newValue.trim()) {
			message.error('名称不能为空');
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

			const updatedResource = {
				...nodeData.resourceData,
				fileName: newValue,
				filePath: newPath,
			};

			const updatedResources = resources.map((r) => (r.id === nodeData.resourceData!.id ? updatedResource : r));

			onResourcesChange(updatedResources);
			message.success('文件名更新成功');
		} else if (nodeData.nodeType === 'folder') {
			// 更新文件夹名（需要更新所有子文件的路径）
			const oldPath = nodeData.path;
			const pathParts = oldPath.split('.');
			pathParts[pathParts.length - 1] = newValue;
			const newPath = pathParts.join('.');

			const updatedResources = resources.map((resource) => {
				if (resource.filePath.startsWith(oldPath + '.') || resource.filePath === oldPath) {
					const newFilePath = resource.filePath.replace(oldPath, newPath);
					return { ...resource, filePath: newFilePath };
				}
				return resource;
			});

			onResourcesChange(updatedResources);
			message.success('文件夹名更新成功');
		}

		setEditingNode(null);
		setEditingValue('');
	};

	// 取消节点编辑
	const handleEditCancel = () => {
		setEditingNode(null);
		setEditingValue('');
	};

	// 处理右键菜单
	const handleContextMenu = (event: React.MouseEvent, nodeKey: string, nodeType: NodeType) => {
		event.preventDefault();

		setSelectedNodeKey(nodeKey);
		setSelectedNodeType(nodeType);
		setContextMenuPosition({ x: event.clientX, y: event.clientY });
		setContextMenuVisible(true);
	};

	// 关闭右键菜单
	const closeContextMenu = () => {
		setContextMenuVisible(false);
		setSelectedNodeKey(null);
		setSelectedNodeType('root');
	};

	// 处理右键菜单操作
	const handleContextMenuAction = (action: string) => {
		closeContextMenu();
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
					const basePath = nodeData.nodeType === 'root' ? '' : nodeData.path;
					const newFolderPath = basePath ? `${basePath}.新文件夹` : '新文件夹';

					// 创建一个临时资源来表示新文件夹（实际应用中可能需要不同的处理方式）
					message.info('新建文件夹功能需要配合后端实现');
				}
				break;
			case 'add_file':
				message.info('新建文件功能开发中...');
				break;
			case 'rename':
				if (nodeData) {
					handleNodeEdit(nodeData.key, nodeData.title);
				}
				break;
			case 'delete':
				if (nodeData?.nodeType === 'file' && nodeData.resourceData) {
					const updatedResources = resources.filter((r) => r.id !== nodeData.resourceData!.id);
					onResourcesChange(updatedResources);
					message.success('文件删除成功');
				} else if (nodeData?.nodeType === 'folder') {
					// 删除文件夹及其所有子文件
					const folderPath = nodeData.path;
					const updatedResources = resources.filter(
						(resource) => !resource.filePath.startsWith(folderPath + '.') && resource.filePath !== folderPath
					);
					onResourcesChange(updatedResources);
					message.success('文件夹删除成功');
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
		const handleClickOutside = () => {
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
		<div
			ref={containerRef}
			className={`directory-tree-card-wrapper ${isResizing ? 'resizing' : ''}`}
			style={{ width: `${width}px`, position: 'relative' }}
		>
			<Card title="目录结构" className="directory-tree-card">
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
						} else {
							onResourceSelect(null);
						}
					}}
					showIcon
					defaultExpandAll
				/>

				{/* 右键菜单 */}
				{contextMenuVisible && (
					<div
						className="context-menu"
						style={{
							top: contextMenuPosition.y,
							left: contextMenuPosition.x,
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<Menu onClick={({ key }) => handleContextMenuAction(key as string)} style={{ border: 'none', boxShadow: 'none' }}>
							{(() => {
								const menuConfig = {
									root: [
										{ key: 'add_folder', label: '新建文件夹' },
										{ key: 'add_file', label: '新建文件' },
									],
									folder: [
										{ key: 'add_folder', label: '新建文件夹' },
										{ key: 'add_file', label: '新建文件' },
										{ key: 'divider' },
										{ key: 'rename', label: '重命名' },
										{ key: 'delete', label: '删除' },
									],
									file: [
										{ key: 'rename', label: '重命名' },
										{ key: 'delete', label: '删除' },
									],
								};

								const items = menuConfig[selectedNodeType as keyof typeof menuConfig] || [];
								return items.map((item, index) =>
									item.key === 'divider' ? <Menu.Divider key={`divider-${index}`} /> : <Menu.Item key={item.key}>{item.label}</Menu.Item>
								);
							})()}
						</Menu>
					</div>
				)}
			</Card>

			{/* 拖拽手柄 */}
			<div ref={resizeRef} className="resize-handle" onMouseDown={handleMouseDown} />
		</div>
	);
};

export default DirectoryTree;
