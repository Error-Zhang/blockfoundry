import { useCallback, useState } from 'react';

/**
 * 节点编辑 Hook
 */
export function useNodeEdit<T = any>() {
	const [editingNode, setEditingNode] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState<string>('');

	const startEdit = useCallback((key: string, currentValue: string) => {
		setEditingNode(key);
		setEditingValue(currentValue);
	}, []);

	const cancelEdit = useCallback(() => {
		setEditingNode(null);
		setEditingValue('');
	}, []);

	const updateValue = useCallback((value: string) => {
		setEditingValue(value);
	}, []);

	return {
		editingNode,
		editingValue,
		startEdit,
		cancelEdit,
		updateValue,
	};
}
