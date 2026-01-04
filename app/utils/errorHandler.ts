import { App } from 'antd';
import { ApiResponse } from '@/lib/api';

/**
 * 通用错误处理工具
 */
export class ErrorHandler {
	private message: ReturnType<typeof App.useApp>['message'];
	private modal: ReturnType<typeof App.useApp>['modal'];

	constructor(message: ReturnType<typeof App.useApp>['message'], modal: ReturnType<typeof App.useApp>['modal']) {
		this.message = message;
		this.modal = modal;
	}

	/**
	 * 执行异步操作并处理错误
	 */
	async execute<T>(
		operation: () => Promise<T>,
		options?: {
			key?: string;
			successMessage?: string;
			errorMessage?: string;
			onSuccess?: (data: T) => void | Promise<void>;
			onError?: (error: any) => void;
		}
	): Promise<T | null> {
		try {
			const result = await operation();

			if (options?.successMessage) {
				this.message.success({ content: options.successMessage, key: options.key });
			}

			if (options?.onSuccess) {
				await options.onSuccess(result);
			}

			return result;
		} catch (error) {
			console.error(error);
			const errorMsg = options?.errorMessage || '操作失败';
			this.message.error({ content: errorMsg, key: options?.key });

			if (options?.onError) {
				options.onError(error);
			}

			return null;
		}
	}

	/**
	 * 执行 API 调用并处理响应
	 */
	async executeApi<T = undefined>(
		apiCall: () => Promise<ApiResponse<T>>,
		options?: {
			key?: string;
			successMessage?: string;
			errorMessage?: string;
			onSuccess?: (data: T) => void | Promise<void>;
			onError?: (error: string) => void;
		}
	): Promise<T | null> {
		const result = await apiCall();

		if (result.success) {
			if (options?.successMessage) {
				this.message.success({ content: options.successMessage, key: options.key });
			}

			if (options?.onSuccess) {
				await options.onSuccess(result.data!);
			}

			return result.data!;
		} else {
			const errorMsg = result.error || options?.errorMessage || '操作失败';
			this.message.error({ content: errorMsg, key: options?.key });

			if (options?.onError) {
				options.onError(errorMsg);
			}

			return null;
		}
	}

	/**
	 * 显示确认对话框
	 */
	confirm(options: {
		title: string;
		content: React.ReactNode;
		onOk: () => void | Promise<void>;
		okText?: string;
		cancelText?: string;
		danger?: boolean;
	}): void {
		this.modal.confirm({
			title: options.title,
			content: options.content,
			okText: options.okText || '确定',
			cancelText: options.cancelText || '取消',
			okType: options.danger ? 'danger' : 'primary',
			onOk: options.onOk,
		});
	}

	/**
	 * 显示加载消息
	 */
	loading(content: string, key?: string): void {
		this.message.loading({ content, key });
	}

	/**
	 * 显示成功消息
	 */
	success(content: string, key?: string): void {
		this.message.success({ content, key });
	}

	/**
	 * 显示错误消息
	 */
	error(content: string, key?: string): void {
		this.message.error({ content, key });
	}

	/**
	 * 显示警告消息
	 */
	warning(content: string): void {
		this.message.warning(content);
	}

	/**
	 * 显示信息消息
	 */
	info(content: string): void {
		this.message.info(content);
	}
}

/**
 * 创建错误处理器 Hook
 */
export function useErrorHandler() {
	const { message, modal } = App.useApp();
	return new ErrorHandler(message, modal);
}
