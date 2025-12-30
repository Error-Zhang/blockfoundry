/**
 * API 请求封装
 */

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	errors?: string[];
}

export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public response?: any
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * 基础请求方法
 */
async function request<T = any>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
	try {
		const response = await fetch(url, {
			...options,
			headers: {
				...options?.headers,
			},
		});

		// 检查响应的 content-type
		const contentType = response.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			const text = await response.text();
			throw new ApiError(`服务器返回非 JSON 响应: ${text.substring(0, 100)}`, response.status);
		}

		const result = await response.json();

		if (!response.ok) {
			throw new ApiError(result.error || '请求失败', response.status, result);
		}

		return result;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		if (error instanceof SyntaxError) {
			throw new ApiError('服务器返回的数据格式错误');
		}
		throw new ApiError(error instanceof Error ? error.message : '网络请求失败');
	}
}

/**
 * GET 请求
 */
export async function get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
	const searchParams = params ? new URLSearchParams(params).toString() : '';
	const fullUrl = searchParams ? `${url}?${searchParams}` : url;
	return request<T>(fullUrl, { method: 'GET' });
}

/**
 * POST 请求 (JSON)
 */
export async function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
	return request<T>(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});
}

/**
 * PUT 请求 (JSON)
 */
export async function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
	return request<T>(url, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});
}

/**
 * DELETE 请求
 */
export async function del<T = any>(url: string): Promise<ApiResponse<T>> {
	return request<T>(url, { method: 'DELETE' });
}

/**
 * 上传文件 (FormData)
 */
export async function upload<T = any>(
	url: string, 
	formData: FormData,
	onProgress?: (progress: number) => void
): Promise<ApiResponse<T>> {
	// 如果需要进度回调，使用 XMLHttpRequest
	if (onProgress) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			
			// 监听上传进度
			xhr.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) {
					const progress = Math.round((event.loaded / event.total) * 100);
					onProgress(progress);
				}
			});
			
			// 监听完成
			xhr.addEventListener('load', () => {
				try {
					const contentType = xhr.getResponseHeader('content-type');
					if (!contentType || !contentType.includes('application/json')) {
						reject(new ApiError(`服务器返回非 JSON 响应`, xhr.status));
						return;
					}
					
					const result = JSON.parse(xhr.responseText);
					
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(result);
					} else {
						reject(new ApiError(result.error || '请求失败', xhr.status, result));
					}
				} catch (error) {
					reject(new ApiError('解析响应失败'));
				}
			});
			
			// 监听错误
			xhr.addEventListener('error', () => {
				reject(new ApiError('网络请求失败'));
			});
			
			// 监听中断
			xhr.addEventListener('abort', () => {
				reject(new ApiError('请求已取消'));
			});
			
			// 发送请求
			xhr.open('POST', url);
			xhr.send(formData);
		});
	}
	
	// 不需要进度回调时使用 fetch
	return request<T>(url, {
		method: 'POST',
		body: formData,
	});
}

/**
 * FormData 构建器
 */
export class FormDataBuilder {
	private formData: FormData;

	constructor() {
		this.formData = new FormData();
	}

	/**
	 * 添加字段
	 */
	append(key: string, value: any): this {
		if (value === undefined || value === null) {
			return this;
		}

		if (value instanceof File || value instanceof Blob) {
			this.formData.append(key, value);
		} else if (Array.isArray(value)) {
			this.formData.append(key, value.join(','));
		} else if (typeof value === 'object') {
			this.formData.append(key, JSON.stringify(value));
		} else {
			this.formData.append(key, String(value));
		}

		return this;
	}

	/**
	 * 添加文件
	 */
	appendFile(key: string, file: File | Blob, filename?: string): this {
		this.formData.append(key, file, filename);
		return this;
	}

	/**
	 * 添加多个文件
	 */
	appendFiles(key: string, files: (File | Blob)[]): this {
		files.forEach((file) => {
			this.formData.append(key, file);
		});
		return this;
	}

	/**
	 * 批量添加字段
	 */
	appendAll(data: Record<string, any>): this {
		Object.entries(data).forEach(([key, value]) => {
			this.append(key, value);
		});
		return this;
	}

	/**
	 * 获取 FormData
	 */
	build(): FormData {
		return this.formData;
	}
}

/**
 * 创建 FormData 构建器
 */
export function createFormData(): FormDataBuilder {
	return new FormDataBuilder();
}