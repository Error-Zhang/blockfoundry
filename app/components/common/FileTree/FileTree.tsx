import React, { useCallback, useState } from 'react';
import { Button, Card, Tree } from 'antd';
import { ExpandOutlined, ShrinkOutlined } from '@ant-design/icons';
import { ContextMenuItem, DragInfo, TreeNode, TreeNodeType } from './types';
import { ContextMenu, TreeNodeTitle } from './components';
import { findNode, getAllExpandableKeys, useContextMenu, useNodeEdit, useResizable } from './hooks';
import styles from './FileTree.module.scss';

export interface FileTreeProps<T = any> {
	// 树数据
	treeData: TreeNode<T>[];

	// 选中状态
	selectedKeys?: string[];
	onSelect?: (keys: string[], node: TreeNode<T> | null) => void;

	// 展开状态
	expandedKeys?: string[];
	onExpand?: (keys: string[]) => void;
	defaultExpandAll?: boolean;

	// 右键菜单
	contextMenuItems?: (nodeType: TreeNodeType, node: TreeNode<T>) => ContextMenuItem[];
	onContextMenuAction?: (action: string, node: TreeNode<T>) => void;

	// 节点编辑
	onNodeEdit?: (node: TreeNode<T>, newValue: string) => Promise<boolean>;

	// 拖拽
	draggable?: boolean;
	onDrop?: (info: DragInfo<T>) => void;
	allowDrop?: (info: { dropNode: TreeNode<T>; dropPosition: number }) => boolean;

	// 宽度调整
	width?: number;
	onWidthChange?: (width: number) => void;
	resizable?: boolean;
	minWidth?: number;
	maxWidth?: number;

	// 样式
	title?: string;
	className?: string;
	showExpandButton?: boolean;
}

/**
 * 通用文件树组件
 */
export function FileTree<T = any>({
	treeData,
	selectedKeys: controlledSelectedKeys,
	onSelect,
	expandedKeys: controlledExpandedKeys,
	onExpand,
	defaultExpandAll = true,
	contextMenuItems,
	onContextMenuAction,
	onNodeEdit,
	draggable = true,
	onDrop,
	allowDrop,
	width = 300,
	onWidthChange,
	resizable = true,
	minWidth = 200,
	maxWidth = 600,
	title = '目录',
	className,
	showExpandButton = true,
}: FileTreeProps<T>) {
	// 内部状态
	const [internalSelectedKeys, setInternalSelectedKeys] = useState<React.Key[]>([]);
	const [internalExpandedKeys, setInternalExpandedKeys] = useState<React.Key[]>([]);

	// 使用受控或非受控模式
	const selectedKeys = controlledSelectedKeys ?? internalSelectedKeys;
	const expandedKeys = controlledExpandedKeys ?? internalExpandedKeys;

	const setSelectedKeys = (keys: React.Key[]) => {
		setInternalSelectedKeys(keys);
	};

	const setExpandedKeys = (keys: React.Key[]) => {
		if (onExpand) {
			onExpand(keys as string[]);
		} else {
			setInternalExpandedKeys(keys);
		}
	};

	// Hooks
	const { editingNode, editingValue, startEdit, cancelEdit, updateValue } = useNodeEdit();
	const {
		visible: contextMenuVisible,
		position: contextMenuPosition,
		selectedNodeKey,
		show: showContextMenu,
		hide: hideContextMenu,
	} = useContextMenu();
	const { isResizing, containerRef, resizeRef, handleMouseDown } = useResizable(width, minWidth, maxWidth, onWidthChange);

	// 构建 Antd Tree 数据
	const buildAntdTreeData = useCallback(
		(nodes: TreeNode<T>[]): any[] => {
			return nodes.map((node) => {
				// 如果节点标记为编辑状态，自动开始编辑
				if (node.isEditing && editingNode !== node.key) {
					setTimeout(() => {
						startEdit(node.key, node.title);
					}, 0);
				}

				return {
					title: (
						<TreeNodeTitle
							node={node}
							isEditing={editingNode === node.key || !!node.isEditing}
							editingValue={editingValue}
							onEditChange={updateValue}
							onEditSave={async () => {
								if (!editingValue.trim()) return;

								if (onNodeEdit) {
									const success = await onNodeEdit(node, editingValue);
									if (success) {
										cancelEdit();
									}
								} else {
									cancelEdit();
								}
							}}
							onEditCancel={() => {
								node.isEditing = false;
								cancelEdit();
							}}
							onContextMenu={(e) => showContextMenu(e, node.key)}
							onDoubleClick={() => startEdit(node.key, node.title)}
							className={styles.treeNodeTitle}
						/>
					),
					key: node.key,
					icon: node.icon,
					isLeaf: node.isLeaf,
					children: node.nodeType === 'folder' || node.nodeType === 'root' ? buildAntdTreeData(node.children || []) : undefined,
					nodeData: node,
					draggable: node.nodeType !== 'root' && draggable,
				};
			});
		},
		[editingNode, editingValue, updateValue, onNodeEdit, cancelEdit, showContextMenu, startEdit, draggable]
	);

	// 处理节点选择
	const handleSelect = useCallback(
		(keys: React.Key[], info: any) => {
			setSelectedKeys(keys);
			const nodeData = info.node?.nodeData as TreeNode<T> | undefined;
			onSelect?.(keys as string[], nodeData || null);
		},
		[onSelect]
	);

	// 处理拖拽
	const handleDrop = useCallback(
		(info: any) => {
			const dragNode = info.dragNode?.nodeData as TreeNode<T>;
			const dropNode = info.node?.nodeData as TreeNode<T>;

			if (!dragNode || !dropNode) return;

			// 转换 dropPosition: 0 表示内部, -1 表示之前, 1 表示之后
			let dropPosition: 'before' | 'inside' | 'after' = 'inside';
			if (info.dropPosition === -1) {
				dropPosition = 'before';
			} else if (info.dropPosition === 1) {
				dropPosition = 'after';
			} else if (info.dropPosition === 0) {
				dropPosition = 'inside';
			}

			onDrop?.({
				dragNode,
				dropNode,
				dropPosition,
			});
		},
		[onDrop]
	);

	// 处理拖拽放置规则
	const handleAllowDrop = useCallback(
		(info: { dropNode: any; dropPosition: number }) => {
			const dropNode = info.dropNode?.nodeData as TreeNode<T>;

			if (allowDrop) {
				return allowDrop({ dropNode, dropPosition: info.dropPosition });
			}

			// 默认规则：只允许拖拽到文件夹内部
			if ((dropNode?.nodeType === 'folder' || dropNode?.nodeType === 'root') && info.dropPosition === 0) {
				return true;
			}

			return false;
		},
		[allowDrop]
	);

	// 处理右键菜单操作
	const handleContextMenuAction = useCallback(
		(action: string) => {
			if (!selectedNodeKey) return;

			hideContextMenu();

			const node = findNode(treeData, selectedNodeKey);
			if (!node) return;

			onContextMenuAction?.(action, node);
		},
		[selectedNodeKey, treeData, hideContextMenu, onContextMenuAction]
	);

	// 切换展开/折叠所有节点
	const handleToggleExpandAll = useCallback(() => {
		const allKeys = getAllExpandableKeys(treeData);
		if (expandedKeys.length === allKeys.length) {
			setExpandedKeys([]);
		} else {
			setExpandedKeys(allKeys);
		}
	}, [treeData, expandedKeys, setExpandedKeys]);

	// 判断是否所有节点都已展开
	const allExpandableKeys = getAllExpandableKeys(treeData);
	const isAllExpanded = expandedKeys.length === allExpandableKeys.length && allExpandableKeys.length > 0;

	// 获取当前节点的右键菜单项
	const currentContextMenuItems = selectedNodeKey
		? (() => {
				const node = findNode(treeData, selectedNodeKey);
				return node && contextMenuItems ? contextMenuItems(node.nodeType, node) : [];
			})()
		: [];

	return (
		<div
			ref={containerRef}
			className={`${styles.fileTreeWrapper} ${isResizing ? styles.resizing : ''} ${className || ''}`}
			style={{ width: resizable ? `${width}px` : undefined }}
		>
			<Card
				title={title}
				className={styles.fileTreeCard}
				extra={
					showExpandButton ? (
						<Button
							size="small"
							icon={isAllExpanded ? <ShrinkOutlined /> : <ExpandOutlined />}
							onClick={handleToggleExpandAll}
							title={isAllExpanded ? '折叠所有' : '展开所有'}
						/>
					) : null
				}
			>
				<Tree
					treeData={buildAntdTreeData(treeData)}
					selectedKeys={selectedKeys}
					expandedKeys={expandedKeys}
					onExpand={(keys) => setExpandedKeys(keys)}
					onSelect={handleSelect}
					draggable={draggable}
					allowDrop={handleAllowDrop}
					onDrop={handleDrop}
					showIcon
					defaultExpandAll={defaultExpandAll}
				/>

				{/* 右键菜单 */}
				<ContextMenu
					visible={contextMenuVisible}
					position={contextMenuPosition}
					items={currentContextMenuItems}
					onAction={handleContextMenuAction}
				/>
			</Card>

			{/* 拖拽手柄 */}
			{resizable && <div ref={resizeRef} className={styles.resizeHandle} onMouseDown={handleMouseDown} />}
		</div>
	);
}
