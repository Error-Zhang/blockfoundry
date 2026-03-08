import { useState } from 'react';
import { ApiResponse } from '@/lib/api';
import { App } from 'antd';

export function useAsyncAction<Fn extends (...args: any[]) => Promise<ApiResponse>>(
	action: Fn,
	options?: {
		showSuccessMessage?: boolean | string;
		showErrorMessage?: boolean | string;
		onSuccess?: (data: Awaited<ReturnType<Fn>>['data'], params: Parameters<Fn>) => void;
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
				onSuccess?.(result.data, args);
				showSuccessMessage && message.success(typeof showSuccessMessage === 'string' ? showSuccessMessage : '操作成功！');
			} else {
				setError(result.error || '未知错误');
				onError?.(result.data);
				showErrorMessage && message.error(typeof showErrorMessage === 'string' ? showErrorMessage : result.error || '未知错误');
			}
		} catch (err) {
			message.error('服务器错误');
		} finally {
			setLoading(false);
		}
	};

	return { handle, loading, setLoading, error, setError };
}
