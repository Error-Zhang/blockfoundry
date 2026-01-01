import { ReactNode } from 'react';

/**
 * 通用树节点类型
 */
export type TreeNodeType = 'folder' | 'file' | 'root';

/**
 * 通用树节点数据接口
 */
export interface TreeNode<T = any> {
    key: string;
    title: string;
    nodeType: TreeNodeType;
    path: string;
    icon?: ReactNode;
    isLeaf?: boolean;
    children?: TreeNode<T>[];
    data?: T; // 节点关联的业务数据
    isEditing?: boolean; // 是否处于编辑状态
}

/**
 * 右键菜单配置项
 */
export interface ContextMenuItem {
    key: string;
    label?: string;
    icon?: ReactNode;
    danger?: boolean;
    type?: 'divider';
}

/**
 * 右键菜单位置
 */
export interface ContextMenuPosition {
    x: number;
    y: number;
}

/**
 * 剪贴板数据
 */
export interface ClipboardData<T = any> {
    type: 'copy' | 'cut' | 'copy_folder';
    nodeKey: string;
    nodeData: TreeNode<T>;
}

/**
 * 拖拽信息
 */
export interface DragInfo<T = any> {
    dragNode: TreeNode<T>;
    dropNode: TreeNode<T>;
    dropPosition: 'before' | 'inside' | 'after' | number;
}