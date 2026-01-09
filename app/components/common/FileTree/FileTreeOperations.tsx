import { ErrorHandler } from '@/app/utils/errorHandler';
import { ApiResponse } from '@/lib/api';
import { triggerDownload } from '@/app/components/common/FileTree/treeUtils';

type ApiResponsePromise<T> = Promise<ApiResponse<T>>;

/**
 * API 服务接口定义
 */
export interface FileManagerApiService<TFile, TFolder> {
	// 文件夹操作
	getFolders: (parentId?: string) => ApiResponsePromise<TFolder[]>;
	createFolder: (name: string, parentId: string) => ApiResponsePromise<TFolder>;
	renameFolder: (id: string, name: string) => ApiResponsePromise<TFolder>;
	deleteFolder: (id: string) => ApiResponsePromise<void>;
	moveFolder: (id: string, targetParentId: string) => ApiResponsePromise<TFolder>;
	copyFolder: (id: string, targetParentId: string) => ApiResponsePromise<TFolder>;
	clearFolder: (id: string) => ApiResponsePromise<void>;
	downloadFolder: (id: string) => Promise<Blob>;

	// 文件操作
	createFile: (params: unknown) => ApiResponsePromise<TFile>;
	updateFile: (id: string, data: Partial<TFile>) => ApiResponsePromise<TFile>;
	deleteFile: (id: string) => ApiResponsePromise<void>;
	copyFile: (id: string, targetFolderId: string) => ApiResponsePromise<TFile>;
}

/**
 * 文件树操作配置
 */
export interface FileTreeOperationsConfig<TFile, TFolder> {
	// 数据源
	files: TFile[];
	folders: TFolder[];

	// 数据访问器
	getFilePath: (file: TFile) => string;
	getFileId: (file: TFile) => string;
	getFileFolderId: (file: TFile) => string;
	getFolderPath: (folder: TFolder) => string;
	getFolderId: (folder: TFolder) => string;
	getFolderName: (folder: TFolder) => string;
	getFolderParentId: (folder: TFolder) => string;

	// API 服务接口
	api: FileManagerApiService<TFile, TFolder>;

	// 回调
	onFileChange?: () => Promise<void>;
	onFolderChange?: () => Promise<void>;
	onFolderSelect?: (folder: TFolder) => void;
	// 错误处理
	errorHandler: ErrorHandler;
}

/**
 * 文件树通用操作类
 */
export class FileTreeOperations<TFile, TFolder> {
	private config: FileTreeOperationsConfig<TFile, TFolder>;

	constructor(config: FileTreeOperationsConfig<TFile, TFolder>) {
		this.config = config;
	}

	/**
	 * 确认创建文件夹
	 */
	async confirmCreateFolder(name: string, parentId: string): Promise<boolean> {
		const data = await this.config.errorHandler.executeApi(() => this.config.api.createFolder(name, parentId), {
			successMessage: '文件夹创建成功',
			errorMessage: '创建文件夹失败',
			onSuccess: async () => {
				await this.config.onFolderChange?.();
			},
		});

		return !!data;
	}

	/**
	 * 重命名文件
	 */
	async renameFile(file: TFile, newName: string): Promise<boolean> {
		const fileId = this.config.getFileId(file);

		const data = await this.config.errorHandler.executeApi(() => this.config.api.updateFile(fileId, { name: newName } as any), {
			successMessage: '文件名更新成功',
			errorMessage: '更新文件名失败',
			onSuccess: () => {
				this.config.onFileChange?.();
			},
		});

		return !!data;
	}

	/**
	 * 删除文件
	 */
	async deleteFile(file: TFile): Promise<void> {
		const fileId = this.config.getFileId(file);

		await this.config.errorHandler.executeApi(() => this.config.api.deleteFile(fileId), {
			successMessage: '文件删除成功',
			errorMessage: '删除文件失败',
			onSuccess: () => {
				this.config.onFileChange?.();
			},
		});
	}

	/**
	 * 移动文件
	 */
	async moveFile(file: TFile, targetFolderId: string): Promise<void> {
		const oldFolderId = this.config.getFileFolderId(file);

		if (oldFolderId === targetFolderId) {
			this.config.errorHandler.info('文件位置未改变');
			return;
		}

		await this.config.errorHandler.executeApi(
			() => this.config.api.updateFile(this.config.getFileId(file), { folderId: targetFolderId } as any),
			{
				successMessage: '文件移动成功',
				errorMessage: '移动文件失败',
				onSuccess: () => {
					this.config.onFileChange?.();
				},
			}
		);
	}

	/**
	 * 复制文件
	 */
	async copyFile(file: TFile, targetFolderId: string): Promise<void> {
		await this.config.errorHandler.executeApi(() => this.config.api.copyFile(this.config.getFileId(file), targetFolderId), {
			successMessage: '文件复制成功',
			errorMessage: '文件复制失败',
			onSuccess: () => {
				this.config.onFileChange?.();
			},
		});
	}

	/**
	 * 上传文件
	 */
	async uploadFile(file: File, folderId: string, createFileFn: (file: File, folderId: string) => Promise<ApiResponse<TFile>>): Promise<void> {
		await this.config.errorHandler.executeApi(() => createFileFn(file, folderId), {
			successMessage: '文件上传成功',
			errorMessage: '文件上传失败',
			onSuccess: () => {
				this.config.onFileChange?.();
			},
		});
	}

	/**
	 * 重命名文件夹
	 */
	async renameFolder(folder: TFolder, newName: string): Promise<boolean> {
		const folderId = this.config.getFolderId(folder);

		const data = await this.config.errorHandler.executeApi(() => this.config.api.renameFolder(folderId, newName), {
			successMessage: '文件夹名更新成功',
			errorMessage: '更新文件夹名失败',
			onSuccess: async () => {
				await this.config.onFolderChange?.();
				this.config.onFolderSelect?.(folder);
			},
		});

		return !!data;
	}

	/**
	 * 删除文件夹
	 */
	async deleteFolder(folder: TFolder): Promise<void> {
		const folderId = this.config.getFolderId(folder);
		const folderPath = this.config.getFolderPath(folder);

		// 检查是否只包含空文件夹
		const { isEmpty } = this.hasOnlyEmptySubFolders(folderId, folderPath);

		// 空文件夹或只包含空文件夹,直接删除
		if (isEmpty) {
			await this.config.errorHandler.executeApi(() => this.config.api.deleteFolder(folderId), {
				successMessage: '文件夹删除成功',
				errorMessage: '删除文件夹失败',
				onSuccess: async () => {
					await this.config.onFolderChange?.();
				},
			});
			return;
		}

		// 非空文件夹需要确认
		this.confirmFolderOperation(folder, 'delete', () => this.config.api.deleteFolder(folderId));
	}

	/**
	 * 移动文件夹
	 */
	async moveFolder(folder: TFolder, targetFolderId: string): Promise<void> {
		const folderId = this.config.getFolderId(folder);
		await this.config.errorHandler.executeApi(() => this.config.api.moveFolder(folderId, targetFolderId), {
			successMessage: '文件夹移动成功',
			errorMessage: '移动文件夹失败',
			onSuccess: async () => {
				await this.config.onFolderChange?.();
			},
		});
	}

	/**
	 * 复制文件夹
	 */
	async copyFolder(sourceFolder: TFolder, targetParentId: string): Promise<void> {
		await this.config.errorHandler.executeApi(() => this.config.api.copyFolder(this.config.getFolderId(sourceFolder), targetParentId), {
			errorMessage: '文件夹粘贴失败',
			onSuccess: async () => {
				await this.config.onFolderChange?.();
				this.config.errorHandler.success('文件夹粘贴成功');
			},
		});
	}

	/**
	 * 清空文件夹
	 */
	async clearFolder(folder: TFolder): Promise<void> {
		const folderId = this.config.getFolderId(folder);
		const folderPath = this.config.getFolderPath(folder);

		// 检查是否只包含空文件夹
		const { isEmpty, subFolders } = this.hasOnlyEmptySubFolders(folderId, folderPath);

		// 空文件夹或只包含空文件夹,直接清空
		if (isEmpty) {
			if (subFolders.length === 0) {
				this.config.errorHandler.info('文件夹已经是空的');
				return;
			}
			await this.config.errorHandler.executeApi(() => this.config.api.clearFolder(folderId), {
				successMessage: '文件夹清空成功',
				errorMessage: '清空文件夹失败',
				onSuccess: async () => {
					await this.config.onFolderChange?.();
				},
			});
			return;
		}

		// 非空文件夹需要确认
		this.confirmFolderOperation(folder, 'clear', () => this.config.api.clearFolder(folderId));
	}

	/**
	 * 下载文件夹
	 */
	async downloadFolder(folder: TFolder): Promise<void> {
		const folderPath = this.config.getFolderPath(folder);
		const folderItems = this.config.files.filter((file) => {
			const path = this.config.getFilePath(file);
			return path.startsWith(`${folderPath}.`) || path === folderPath;
		});

		if (folderItems.length === 0) {
			this.config.errorHandler.warning('文件夹为空，无法下载');
			return;
		}

		this.config.errorHandler.loading('正在准备下载...', 'download-folder');

		await this.config.errorHandler.execute(() => this.config.api.downloadFolder(this.config.getFolderId(folder)), {
			key: 'download-folder',
			successMessage: '文件夹下载成功',
			errorMessage: '下载文件夹失败',
			onSuccess: (blob) => {
				triggerDownload(blob, `${this.config.getFolderName(folder)}.zip`);
			},
		});
	}

	/**
	 * 获取文件夹下的所有文件
	 */
	private getFolderFiles(folderId: string): TFile[] {
		return this.config.files.filter((file) => {
			const fileFolderId = this.config.getFileFolderId?.(file);
			return fileFolderId === folderId;
		});
	}

	/**
	 * 获取文件夹下的所有子文件夹
	 */
	private getSubFolders(folderPath: string): TFolder[] {
		return this.config.folders.filter((f) => {
			const path = this.config.getFolderPath(f);
			return path.startsWith(`${folderPath}.`);
		});
	}

	/**
	 * 检查文件夹是否只包含空文件夹
	 */
	private hasOnlyEmptySubFolders(folderId: string, folderPath: string): { isEmpty: boolean; subFolders: TFolder[] } {
		const folderItems = this.getFolderFiles(folderId);
		const subFolders = this.getSubFolders(folderPath);

		// 检查子文件夹是否都为空
		const hasNonEmptySubFolder = subFolders.some((subFolder) => {
			const subFolderId = this.config.getFolderId(subFolder);
			return this.getFolderFiles(subFolderId).length > 0;
		});

		return {
			isEmpty: folderItems.length === 0 && !hasNonEmptySubFolder,
			subFolders,
		};
	}

	/**
	 * 递归计算文件夹及其所有子文件夹中的文件总数
	 */
	private getTotalFileCount(folderId: string, folderPath: string): number {
		// 当前文件夹的文件数
		let count = this.getFolderFiles(folderId).length;

		// 递归计算所有子文件夹的文件数
		const subFolders = this.getSubFolders(folderPath);
		subFolders.forEach((subFolder) => {
			const subFolderId = this.config.getFolderId(subFolder);
			const subFolderPath = this.config.getFolderPath(subFolder);
			count += this.getTotalFileCount(subFolderId, subFolderPath);
		});

		return count;
	}

	/**
	 * 确认文件夹操作（删除或清空）
	 */
	private confirmFolderOperation(folder: TFolder, operation: 'delete' | 'clear', apiCall: () => Promise<any>): void {
		const folderId = this.config.getFolderId(folder);
		const folderPath = this.config.getFolderPath(folder);
		const totalFileCount = this.getTotalFileCount(folderId, folderPath);

		const isDelete = operation === 'delete';
		const title = isDelete ? '确认删除文件夹' : '确认清空文件夹';
		const okText = isDelete ? '确定删除' : '确定清空';
		const successMessage = isDelete ? '文件夹删除成功' : '文件夹清空成功';
		const errorMessage = isDelete ? '删除文件夹失败' : '清空文件夹失败';

		this.config.errorHandler.confirm({
			title,
			content: (
				<div>
					<p>
						您确定要{isDelete ? '删除' : '清空'}文件夹 <strong>{this.config.getFolderName(folder)}</strong> 吗？
					</p>
					<p style={{ marginTop: '8px', color: '#666' }}>
						此操作将删除：<span style={{ color: '#ff4d4f' }}>{totalFileCount}</span> 个文件
					</p>
				</div>
			),
			okText,
			danger: true,
			onOk: async () => {
				await this.config.errorHandler.executeApi(apiCall, {
					errorMessage,
					onSuccess: async () => {
						this.config.errorHandler.success(successMessage);
						await this.config.onFolderChange?.();
					},
				});
			},
		});
	}
}
