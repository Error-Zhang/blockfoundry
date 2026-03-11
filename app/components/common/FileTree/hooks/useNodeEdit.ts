import { useCallback, useEffect, useState } from 'react';
import { TreeNode } from '@/app/components/common/FileTree';

/**
 * 节点编辑 Hook
 */
export function useNodeEdit<T = any>(editingNode?: TreeNode<T>) {
	const getEditingVal = ()=>{
		return {
			key: editingNode?.key || null,
			value: editingNode?.title || '',
		};
	}

	const [state, setState] = useState(getEditingVal());

	// 同步外部变化
	useEffect(() => {
		setState(getEditingVal());
	}, [editingNode]);

	const startEdit = useCallback((key: string, currentValue: string) => {
		setState({ key, value: currentValue });
	}, []);

	const cancelEdit = useCallback(() => {
		setState({ key: null, value: '' });
	}, []);

	const updateValue = useCallback((value: string) => {
		setState((prev) => ({ ...prev, value }));
	}, []);

	return {
		editing:state,
		startEdit,
		cancelEdit,
		updateValue,
	};
}
