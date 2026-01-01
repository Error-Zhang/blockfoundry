import { useMemo } from 'react';
import { TreeNode } from '../types';

/**
 * 树数据构建 Hook
 */
export function useTreeData<T = any>(
    buildTree: () => TreeNode<T>[]
) {
    return useMemo(() => buildTree(), [buildTree]);
}

/**
 * 查找节点工具函数
 */
export function findNode<T = any>(
    nodes: TreeNode<T>[],
    targetKey: string
): TreeNode<T> | null {
    for (const node of nodes) {
        if (node.key === targetKey) {
            return node;
        }
        if (node.children) {
            const found = findNode(node.children, targetKey);
            if (found) return found;
        }
    }
    return null;
}

/**
 * 获取所有可展开节点的key
 */
export function getAllExpandableKeys<T = any>(nodes: TreeNode<T>[]): string[] {
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
}