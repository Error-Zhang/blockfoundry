import React, { useEffect, useRef } from 'react';
import { Input } from 'antd';
import { TreeNode } from '../types';

interface TreeNodeTitleProps<T = any> {
    node: TreeNode<T>;
    isEditing: boolean;
    editingValue: string;
    onEditChange: (value: string) => void;
    onEditSave: () => void;
    onEditCancel: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
    className?: string;
}

/**
 * 树节点标题组件
 */
export function TreeNodeTitle<T = any>({
	node,
	isEditing,
	editingValue,
	onEditChange,
	onEditSave,
	onEditCancel,
	onContextMenu,
	onDoubleClick,
	className,
}: TreeNodeTitleProps<T>) {
	const inputRef = useRef<any>(null);

	useEffect(() => {
		if (isEditing) {
			// 延迟聚焦，避开 Tree 的内部滚动逻辑报错
			inputRef.current?.focus();
		}
	}, [isEditing]);

	if (isEditing) {
		return (
			<Input
				ref={inputRef}
				value={editingValue}
				onChange={(e) => onEditChange(e.target.value)}
				onPressEnter={onEditSave}
				onBlur={onEditCancel}
				onClick={(e) => e.stopPropagation()}
			/>
		);
	}

	return (
		<span onContextMenu={onContextMenu} onDoubleClick={onDoubleClick} className={className}>
			{node.title}
		</span>
	);
}