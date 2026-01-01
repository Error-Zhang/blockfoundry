import React from 'react';
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
    if (isEditing) {
        return (
            <Input
                value={editingValue}
                onChange={(e) => onEditChange(e.target.value)}
                onPressEnter={onEditSave}
                onBlur={onEditCancel}
                onClick={(e) => e.stopPropagation()}
                autoFocus
            />
        );
    }

    return (
        <span
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
            className={className}
        >
            {node.title}
        </span>
    );
}