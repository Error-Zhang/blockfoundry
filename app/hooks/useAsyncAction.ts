import { useState } from 'react';
import { ApiResponse } from '@/lib/api';
import { App } from 'antd';

export function useAsyncAction<Fn extends (...args: any[]) => Promise<ApiResponse>>(
	action: Fn,
	options?: {
		showSuccessMessage?: boolean;
		showErrorMessage?: boolean;
		onSuccess?: (params: Parameters<Fn>, data: Awaited<ReturnType<Fn>>['data']) => void;
		onError?: (data: Awaited<ReturnType<Fn>>['data']) => void;
	}
) {
	const { onSuccess, onError, showSuccessMessage = false, showErrorMessage = true } = options || {};
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const { message } = App.useApp();

	const handle = async (...args: Parameters<Fn>) => {
		setError('');
		setLoading(true);

		try {
			const result = await action(...args);

			if (result.success) {
				onSuccess?.(args, result.data);
				showSuccessMessage && message.success('操作成功！');
			} else {
				setError(result.error || '请求被拒绝');
				onError?.(result.data);
				showErrorMessage && message.error(error);
			}
		} catch (err) {
			message.error('服务器错误');
		} finally {
			setLoading(false);
		}
	};

	return { handle, loading, setLoading, error, setError };
}
