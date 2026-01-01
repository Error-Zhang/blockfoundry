import { TreeNode } from '@/app/components/common/FileTree/index';

/**
 * 查找树节点
 */
export function findTreeNode<T = any>(nodes: TreeNode<T>[], targetKey: string): TreeNode<T> | null {
	for (const node of nodes) {
		if (node.key === targetKey) {
			return node;
		}
		if (node.children) {
			const found = findTreeNode(node.children, targetKey);
			if (found) return found;
		}
	}
	return null;
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string): void {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(url);
}

/**
 * 生成唯一的复制名称
 */
export function generateCopyName(baseName: string, existingNames: string[]): string {
	let newName = `${baseName}_copy`;
	let counter = 1;

	while (existingNames.includes(newName)) {
		newName = `${baseName}_copy${counter}`;
		counter++;
	}

	return newName;
}

/**
 * 检查路径是否存在
 */
export function checkPathExists<T = any>(items: T[], path: string, getPath: (item: T) => string): boolean {
	return items.some((item) => getPath(item) === path);
}

/**
 * 获取路径的父路径
 */
export function getParentPath(path: string): string {
	const lastDotIndex = path.lastIndexOf('.');
	return lastDotIndex === -1 ? '' : path.substring(0, lastDotIndex);
}

/**
 * 获取路径的名称部分
 */
export function getPathName(path: string): string {
	const parts = path.split('.');
	return parts[parts.length - 1] || '';
}

/**
 * 构建新路径
 */
export function buildPath(parentPath: string, name: string): string {
	return parentPath ? `${parentPath}.${name}` : name;
}

/**
 * 检查是否为子路径
 */
export function isSubPath(childPath: string, parentPath: string): boolean {
	return childPath.startsWith(parentPath + '.') || childPath === parentPath;
}
