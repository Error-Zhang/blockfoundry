import { ErrorHandler } from '@/app/utils/errorHandler';
import { ApiResponse } from '@/lib/api';

type ApiResponsePromise<T> = Promise<ApiResponse<T>>;

/**
 * API 服务接口定义
 */
export interface FileManagerApiService<TFile, TFolder> {
	// 文件夹操作
	getFolders: () => ApiResponsePromise<TFolder[]>;
	createFolder: (name: string, parentId: string) => ApiResponsePromise<TFolder>;
	renameFolder: (id: string, name: string) => ApiResponsePromise<TFolder>;
	deleteFolder: (id: string) => ApiResponsePromise<void>;
	moveFolder: (id: string, targetParentId: string) => ApiResponsePromise<TFolder>;
	copyFolder: (id: string, targetParentId: string, newName: string) => ApiResponsePromise<TFolder>;
	clearFolder: (id: string) => ApiResponsePromise<void>;
	downloadFolder: (id: string) => Promise<Blob>;

	// 文件操作
	createFile: (params: unknown) => ApiResponsePromise<TFile>;
	updateFile: (id: string, data: Partial<TFile>) => ApiResponsePromise<TFile>;
	deleteFile: (id: string) => ApiResponsePromise<void>;
	copyFile: (id: string, newFilePath: string) => ApiResponsePromise<TFile>;
}

/**
 * 文件树操作配置
 */
export interface FileTreeOperationsConfig<TData, TFolder> {
	// 数据源
	items: TData[];
	folders: TFolder[];

	// 数据访问器
	getItemPath: (item: TData) => string;
	getItemId: (item: TData) => string;
	getFolderPath: (folder: TFolder) => string;
	getFolderId: (folder: TFolder) => string;
	getFolderName: (folder: TFolder) => string;
	getFolderParentId: (folder: TFolder) => string | null;

	// API 服务接口
	api: FileManagerApiService<TData, TFolder>;

	// 回调
	onItemsChange: (items: TData[]) => void;
	onFoldersReload: () => Promise<void>;
	onFolderSelect?: (path: string) => void;

	// 错误处理
	errorHandler: ErrorHandler;
}

/**
 * 文件树通用操作类
 */
export class FileTreeOperations<TData, TFolder> {
	private config: FileTreeOperationsConfig<TData, TFolder>;

	constructor(config: FileTreeOperationsConfig<TData, TFolder>) {
		this.config = config;
	}

	/**
	 * 确认创建文件夹
	 */
	async confirmCreateFolder(name: string, parentPath: string): Promise<boolean> {
		const data = await this.config.errorHandler.executeApi(() => this.config.api.createFolder(name, parentPath), {
			successMessage: '文件夹创建成功',
			errorMessage: '创建文件夹失败',
			onSuccess: async () => {
				await this.config.onFoldersReload();
			},
		});

		return !!data;
	}

	/**
	 * 重命名文件
	 */
	async renameItem(item: TData, newName: string, buildNewPath: (item: TData, newName: string) => string): Promise<boolean> {
		const itemId = this.config.getItemId(item);
		const newPath = buildNewPath(item, newName);

		const data = await this.config.errorHandler.executeApi(
			() => this.config.api.updateFile(itemId, { name: newName, filePath: newPath } as any),
			{
				successMessage: '文件名更新成功',
				errorMessage: '更新文件名失败',
				onSuccess: (updatedItem) => {
					const updatedItems = this.config.items.map((i) => (this.config.getItemId(i) === itemId ? updatedItem : i));
					this.config.onItemsChange(updatedItems);
				},
			}
		);

		return !!data;
	}

	/**
	 * 删除文件
	 */
	async deleteItem(item: TData): Promise<void> {
		const itemId = this.config.getItemId(item);

		await this.config.errorHandler.executeApi(() => this.config.api.deleteFile(itemId), {
			successMessage: '文件删除成功',
			errorMessage: '删除文件失败',
			onSuccess: () => {
				const updatedItems = this.config.items.filter((i) => this.config.getItemId(i) !== itemId);
				this.config.onItemsChange(updatedItems);
			},
		});
	}

	/**
	 * 移动文件
	 */
	async moveItem(item: TData, targetParentPath: string, getItemName: (item: TData) => string): Promise<void> {
		const oldPath = this.config.getItemPath(item);
		const itemName = getItemName(item);
		const newPath = targetParentPath ? `${targetParentPath}.${itemName}` : itemName;

		if (oldPath === newPath) {
			this.config.errorHandler.info('文件位置未改变');
			return;
		}

		await this.config.errorHandler.executeApi(() => this.config.api.updateFile(this.config.getItemId(item), { filePath: newPath } as any), {
			successMessage: '文件移动成功',
			errorMessage: '移动文件失败',
			onSuccess: (updatedItem) => {
				const updatedItems = this.config.items.map((i) =>
					this.config.getItemId(i) === this.config.getItemId(item) ? updatedItem : i
				) as TData[];
				this.config.onItemsChange(updatedItems);
			},
		});
	}

	/**
	 * 复制文件
	 */
	async copyItem(item: TData, targetPath: string, checkExists: (path: string) => boolean): Promise<void> {
		if (checkExists(targetPath)) {
			this.config.errorHandler.error('目标路径已存在同名文件');
			return;
		}

		await this.config.errorHandler.executeApi(() => this.config.api.copyFile(this.config.getItemId(item), targetPath), {
			successMessage: '文件复制成功',
			errorMessage: '文件复制失败',
			onSuccess: (newItem) => {
				this.config.onItemsChange([...this.config.items, newItem]);
			},
		});
	}

	/**
	 * 上传文件
	 */
	async uploadItem(file: File, folderPath: string, createFileFn: (file: File, folderPath: string) => Promise<ApiResponse<TData>>): Promise<void> {
		await this.config.errorHandler.executeApi(() => createFileFn(file, folderPath), {
			successMessage: '文件上传成功',
			errorMessage: '文件上传失败',
			onSuccess: (newItem) => {
				this.config.onItemsChange([...this.config.items, newItem]);
			},
		});
	}

	/**
	 * 重命名文件夹
	 */
	async renameFolder(folder: TFolder, newName: string): Promise<boolean> {
		const oldPath = this.config.getFolderPath(folder);
		const folderId = this.config.getFolderId(folder);

		const data = await this.config.errorHandler.executeApi(() => this.config.api.renameFolder(folderId, newName), {
			successMessage: '文件夹名更新成功',
			errorMessage: '更新文件夹名失败',
			onSuccess: async () => {
				await this.config.onFoldersReload();

				// 更新选中状态
				const parentPath = oldPath.substring(0, oldPath.lastIndexOf('.'));
				const newPath = parentPath ? `${parentPath}.${newName}` : newName;
				this.config.onFolderSelect?.(newPath);
			},
		});

		return !!data;
	}

	/**
	 * 删除文件夹
	 */
	async deleteFolder(folder: TFolder, folderName: string): Promise<void> {
		const folderPath = this.config.getFolderPath(folder);
		const folderId = this.config.getFolderId(folder);

		const folderItems = this.config.items.filter((item) => {
			const path = this.config.getItemPath(item);
			return path.startsWith(`${folderPath}.`) || path === folderPath;
		});

		const subFolders = this.config.folders.filter((f) => {
			const path = this.config.getFolderPath(f);
			return path.startsWith(`${folderPath}.`);
		});

		// 空文件夹直接删除
		if (folderItems.length === 0 && subFolders.length === 0) {
			await this.config.errorHandler.executeApi(() => this.config.api.deleteFolder(folderId), {
				successMessage: '文件夹删除成功',
				errorMessage: '删除文件夹失败',
				onSuccess: async () => {
					await this.config.onFoldersReload();
				},
			});
			return;
		}

		// 非空文件夹需要确认
		this.config.errorHandler.confirm({
			title: '确认删除文件夹',
			content: (
				<div>
					<p>
						您确定要删除文件夹 <strong>{folderName}</strong> 吗？
					</p>
					<p style={{ marginTop: '12px', color: '#666' }}>此操作将删除：</p>
					<ul style={{ marginTop: '8px', color: '#666' }}>
						<li>{subFolders.length} 个子文件夹</li>
						<li>{folderItems.length} 个文件</li>
					</ul>
					<p style={{ marginTop: '12px', color: '#ff4d4f' }}>⚠️ 此操作不可恢复，但会保留被其他位置引用的物理文件</p>
				</div>
			),
			okText: '确定删除',
			danger: true,
			onOk: async () => {
				await this.config.errorHandler.executeApi(() => this.config.api.deleteFolder(folderId), {
					errorMessage: '删除文件夹失败',
					onSuccess: async (data: any) => {
						await this.config.onFoldersReload();

						if (data?.deletedFolders !== undefined) {
							this.config.errorHandler.success(
								`删除成功：${data.deletedFolders} 个文件夹，${data.deletedResources} 个资源记录，${data.deletedFiles} 个物理文件`
							);
						} else {
							this.config.errorHandler.success('文件夹删除成功');
						}
					},
				});
			},
		});
	}

	/**
	 * 移动文件夹
	 */
	async moveFolder(folder: TFolder, targetParentPath: string): Promise<void> {
		const oldPath = this.config.getFolderPath(folder);
		const folderName = this.config.getFolderName(folder);
		const newPath = targetParentPath ? `${targetParentPath}.${folderName}` : folderName;

		if (oldPath === newPath) {
			this.config.errorHandler.info('文件夹位置未改变');
			return;
		}

		if (targetParentPath.startsWith(oldPath + '.') || targetParentPath === oldPath) {
			this.config.errorHandler.warning('不能将文件夹移动到自己的子文件夹中');
			return;
		}

		await this.config.errorHandler.executeApi(() => this.config.api.moveFolder(this.config.getFolderId(folder), newPath), {
			successMessage: '文件夹移动成功',
			errorMessage: '移动文件夹失败',
			onSuccess: async () => {
				await this.config.onFoldersReload();
			},
		});
	}

	/**
	 * 复制文件夹
	 */
	async copyFolder(sourceFolder: TFolder, targetParentId: string): Promise<void> {
		const sourceName = this.config.getFolderName(sourceFolder);

		// 生成唯一名称
		const existingNames = this.config.folders
			.filter((f) => this.config.getFolderParentId(f) === targetParentId)
			.map((f) => this.config.getFolderName(f));

		let newName = `${sourceName}_copy`;
		let counter = 1;
		while (existingNames.includes(newName)) {
			newName = `${sourceName}_copy${counter}`;
			counter++;
		}

		await this.config.errorHandler.executeApi(() => this.config.api.copyFolder(this.config.getFolderId(sourceFolder), targetParentId, newName), {
			errorMessage: '粘贴文件夹失败',
			onSuccess: async (data: any) => {
				await this.config.onFoldersReload();

				if (data?.copiedFolders !== undefined) {
					this.config.errorHandler.success(`粘贴成功：${data.copiedFolders} 个文件夹，${data.copiedResources} 个文件（共享文件引用）`);
				} else {
					this.config.errorHandler.success('文件夹粘贴成功');
				}
			},
		});
	}

	/**
	 * 清空文件夹
	 */
	async clearFolder(folder: TFolder, folderName: string): Promise<void> {
		const folderPath = this.config.getFolderPath(folder);
		const folderId = this.config.getFolderId(folder);

		const folderItems = this.config.items.filter((item) => {
			const path = this.config.getItemPath(item);
			return path.startsWith(`${folderPath}.`) || path === folderPath;
		});

		const subFolders = this.config.folders.filter((f) => {
			const path = this.config.getFolderPath(f);
			return path.startsWith(`${folderPath}.`);
		});

		if (folderItems.length === 0 && subFolders.length === 0) {
			this.config.errorHandler.info('文件夹已经是空的');
			return;
		}

		this.config.errorHandler.confirm({
			title: '确认清空文件夹',
			content: (
				<div>
					<p>
						您确定要清空文件夹 <strong>{folderName}</strong> 吗？
					</p>
					<p style={{ marginTop: '12px', color: '#666' }}>此操作将删除：</p>
					<ul style={{ marginTop: '8px', color: '#666' }}>
						<li>{subFolders.length} 个子文件夹</li>
						<li>{folderItems.length} 个文件</li>
					</ul>
					<p style={{ marginTop: '12px', color: '#ff4d4f' }}>⚠️ 此操作不可恢复，但会保留被其他位置引用的物理文件</p>
				</div>
			),
			okText: '确定清空',
			danger: true,
			onOk: async () => {
				await this.config.errorHandler.executeApi(() => this.config.api.clearFolder(folderId), {
					errorMessage: '清空文件夹失败',
					onSuccess: async (data: any) => {
						await this.config.onFoldersReload();

						if (data?.deletedFolders !== undefined) {
							this.config.errorHandler.success(
								`清空成功：删除 ${data.deletedFolders} 个子文件夹，${data.deletedResources} 个文件，${data.deletedFiles} 个物理文件`
							);
						} else {
							this.config.errorHandler.success('文件夹清空成功');
						}
					},
				});
			},
		});
	}

	/**
	 * 下载文件夹
	 */
	async downloadFolder(folder: TFolder, folderName: string): Promise<void> {
		const folderPath = this.config.getFolderPath(folder);
		const folderItems = this.config.items.filter((item) => {
			const path = this.config.getItemPath(item);
			return path.startsWith(`${folderPath}.`) || path === folderPath;
		});

		if (folderItems.length === 0) {
			this.config.errorHandler.warning('文件夹为空，无法下载');
			return;
		}

		this.config.errorHandler.loading('正在准备下载...', 'download-folder');

		await this.config.errorHandler.execute(() => this.config.api.downloadFolder(this.config.getFolderId(folder)), {
			successMessage: '文件夹下载成功',
			errorMessage: '下载文件夹失败',
			onSuccess: (blob) => {
				const url = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `${folderName}.zip`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(url);
			},
		});
	}
}
