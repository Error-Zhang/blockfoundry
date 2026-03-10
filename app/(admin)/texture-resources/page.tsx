'use client';

import React, { useEffect, useRef, useState } from 'react';
import { App, Form } from 'antd';
import StatisticsCards from '@/app/components/common/StatisticsCards/StatisticsCards';
import DirectoryTree from './components/DirectoryTree';
import ResourceTable from './components/ResourceTable';
import EditModal from './components/EditModal';
import PreviewModal from './components/PreviewModal';
import BatchUploadModal from './components/BatchUploadModal';
import { TextureResource } from './lib/types';
import { downloadTextureResource } from './lib/utils';
import {
	createTextureResource,
	deleteTextureResource,
	getTextureResources,
	updateTextureResource
} from './services/textureResourceService';
import styles from '../../styles/ResourceManagement.module.scss';
import { CloudUploadOutlined, FileImageOutlined, FileOutlined, TagsOutlined } from '@ant-design/icons';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';
import MergeAtlasModal from './components/MergeAtlasModal';
import { useReactiveSet } from '@/app/hooks/useReactiveSet';
import { generateTextureAtlas } from '@/app/(admin)/texture-atlas/services/textureAtlasService';

export default function TextureResourceManagementPage() {
	const { message } = App.useApp();
	const [resources, setResources] = useState<TextureResource[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingResource, setEditingResource] = useState<TextureResource | null>(null);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewResource, setPreviewResource] = useState<TextureResource | null>(null);
	const [batchUploadVisible, setBatchUploadVisible] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [currentFolderId, setCurrentFolderId] = useState<string>(null!);
	const [totalCount, setTotalCount] = useState(0);
	const [tagCount, setTagCount] = useState(0);
	const [isExpanded, setIsExpanded] = useState(false);
	const highlightSet = useReactiveSet<string>();
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [selectedRows, setSelectedRows] = useState<TextureResource[]>([]);
	const [mergeAtlasVisible, setMergeAtlasVisible] = useState(false);

	// 侧边栏宽度状态
	const [sidebarWidth, setSidebarWidth] = useState(300);

	// 从 localStorage 加载宽度
	useEffect(() => {
		const saved = localStorage.getItem('texture-sidebar-width');
		if (saved) {
			setSidebarWidth(parseInt(saved, 10));
		}
	}, []);

	const [form] = Form.useForm();

	// 加载纹理资源
	const { loading, handle: loadResources } = useAsyncAction(getTextureResources, {
		onSuccess: (data) => {
			setResources(data!.resources);
			setTotalCount(data!.totalCount);
		},
	});

	// 初始化和文件夹切换时加载数据
	useEffect(() => {
		if(!currentFolderId) return;
		loadResources(currentFolderId);
	}, [currentFolderId]);

	// 计算标签数量
	useEffect(() => {
		const allTags = new Set<string>();
		resources.forEach((resource) => {
			resource.tags.forEach((tag) => {
				if (tag) allTags.add(tag);
			});
		});
		setTagCount(allTags.size);
	}, [resources]);

	// 过滤资源
	const filteredResources = resources.filter((resource) => {
		return (
			resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
			resource.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()))
		);
	});

	useEffect(() => {
		const validIds = new Set(filteredResources.map((r) => r.id));
		const nextKeys = selectedRowKeys.filter((key) => validIds.has(String(key)));
		if (nextKeys.length !== selectedRowKeys.length) {
			setSelectedRowKeys(nextKeys);
			setSelectedRows(filteredResources.filter((r) => nextKeys.includes(r.id)));
		}
	}, [filteredResources]);

	// 处理上传
	const handleUpload = () => {
		setEditingResource(null);
		form.resetFields();
		setModalVisible(true);
	};

	const onSuccess = () => {
		loadResources(currentFolderId)
		setModalVisible(false);
		setEditingResource(null);
		form.resetFields();
	}

	// 处理新建/编辑
	const { loading: modelLoadingUpdate, handle: handleEditResource } = useAsyncAction(updateTextureResource, {
		onSuccess,
	});

	const { loading: modelLoadingCreate, handle: handleCreateResource } = useAsyncAction(createTextureResource, {
		onSuccess,
	});

	// 共享Loading
	const modelLoading = modelLoadingUpdate || modelLoadingCreate;

	const handleSubmit = async (values: any) => {
		if (editingResource) {
			// 更新资源
			await handleEditResource(editingResource.id, values);
		} else {
			// 创建新资源
			const fileList = values.file?.fileList || [];
			if (!fileList.length) {
				message.error('请选择文件');
				return;
			}

			await handleCreateResource({
				...values,
				file: fileList[0].originFileObj,
				folderId: currentFolderId,
			});
		}

	};

	// 处理编辑
	const handleEdit = (resource: TextureResource) => {
		setEditingResource(resource);
		form.setFieldsValue(resource);
		setModalVisible(true);
	};

	// 处理删除
	const { handle: handleDelete } = useAsyncAction(deleteTextureResource, {
		onSuccess: () => loadResources(currentFolderId),
	});

	// 处理预览
	const handlePreview = (resource: TextureResource) => {
		setPreviewResource(resource);
		setPreviewVisible(true);
	};

	// 处理下载
	const handleDownload = (resource: TextureResource) => {
		downloadTextureResource(resource);
		message.success('开始下载文件');
	};

	// 处理批量上传
	const handleBatchUploadOpen = () => {
		setBatchUploadVisible(true);
	};

	const handleBatchUpload = async (successCount: number, failCount: number) => {
		if (failCount === 0) {
			message.success(`成功上传 ${successCount} 个纹理资源！`);
			setBatchUploadVisible(false);
			loadResources(currentFolderId);
		}
	};

	const handleOpenMergeAtlasModal = () => {
		if (!selectedRowKeys.length) {
			message.warning('请先选择要合并的纹理资源');
			return;
		}
		const filters = selectedRows.filter((row) => {
			if (!row.isPublic) highlightSet?.add(row.id);
			return row.isPublic;
		});
		if (filters.length !== selectedRows.length) {
			message.warning({
				content: `${selectedRows.length - filters.length}项不可用`,
				duration: 3,
				onClose: () => {
					highlightSet?.clear();
				},
			});
			return;
		}
		setMergeAtlasVisible(true);
	};

	const handleGenerateAtlas = async (values: { name: string; width: number; height?: number; padding: number; gridSize?: number; alignPowerOfTwo?: boolean; format?: 'png' | 'webp' | 'jpeg' }) => {

		try {
			const atlasName = values.name || `纹理图集_${Date.now()}`;
			const result = await generateTextureAtlas({
				textureIds: selectedRowKeys.map(String),
				name: atlasName,
				padding: values.padding,
				maxWidth: values.width,
				maxHeight: values.height,
				gridSize: values.gridSize,
				alignPowerOfTwo: values.alignPowerOfTwo,
				format: values.format,
			});
			if (!result.success || !result.data) {
				message.error(result.error || '生成纹理图集失败');
				return;
			}
			message.success(`已生成图集: ${atlasName}`);
			setSelectedRowKeys([]);
			setSelectedRows([]);
			setMergeAtlasVisible(false);
		} catch (e) {
			message.error('生成纹理图集过程中发生错误');
		}
	};

	// 处理侧边栏宽度变化
	const handleSidebarWidthChange = (width: number) => {
		setSidebarWidth(width);
		localStorage.setItem('texture-sidebar-width', width.toString());
	};

	// 统计数据卡片配置
	const cardConfigs = [
		{
			key: 'totalTextures',
			title: '资源总数',
			value: totalCount,
			prefix: <FileOutlined />,
		},
		{
			key: 'selectTextures',
			title: '选中纹理数',
			value: selectedRowKeys.length,
			prefix: <FileImageOutlined />,
		},
		{
			key: 'tags',
			title: '标签数量',
			value: tagCount,
			prefix: <TagsOutlined />,
		},
		{
			key: 'totalFileSize',
			title: '总文件大小',
			value: (resources.reduce((sum, r) => sum + r.fileSize, 0) / 1024 / 1024).toFixed(2),
			suffix: 'MB',
			prefix: <CloudUploadOutlined />,
		},
	];

	return (
		<div className={styles.management}>
			{/* 统计卡片 */}
			<div className={`${styles.statisticsCards} ${isExpanded ? styles.hidden : styles.visible}`}>
				<StatisticsCards cardConfigs={cardConfigs} />
			</div>

			{/* 主要内容区域 */}
			<div className={styles.mainContentArea}>
				<div className={`${styles.directoryTree} ${isExpanded ? styles.hidden : styles.visible}`}>
					<DirectoryTree
						resources={resources}
						onResourceSelect={(resource) => {
							if (resource) {
								highlightSet.add(resource.id);
								// 3秒后清除高亮
								setTimeout(() => highlightSet.delete(resource.id), 3000);
							}
						}}
						onFolderSelect={(folder) => setCurrentFolderId(folder.id)}
						onResourceChange={() => loadResources(currentFolderId)}
						width={sidebarWidth}
						onWidthChange={handleSidebarWidthChange}
					/>
				</div>
				<div className={styles.tableContainer}>
					<ResourceTable
						resources={filteredResources}
						loading={loading}
						searchText={searchText}
						onSearchChange={setSearchText}
						selectedRowKeys={selectedRowKeys}
						onSelectedRowKeysChange={(keys, rows) => {
							setSelectedRows(rows);
							setSelectedRowKeys(keys);
						}}
						onOpenMergeAtlasModal={handleOpenMergeAtlasModal}
						onPreview={handlePreview}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onDownload={handleDownload}
						onUpload={handleUpload}
						onBatchUpload={handleBatchUploadOpen}
						isExpanded={isExpanded}
						onExpandToggle={() => setIsExpanded(!isExpanded)}
						highlightSet={highlightSet}
					/>
				</div>
			</div>

			{/* 模态框 */}
			<EditModal
				visible={modalVisible}
				editingResource={editingResource}
				form={form}
				loading={modelLoading}
				onCancel={() => {
					setModalVisible(false);
					setEditingResource(null);
					form.resetFields();
				}}
				onSubmit={handleSubmit}
			/>

			<PreviewModal visible={previewVisible} resource={previewResource} onCancel={() => setPreviewVisible(false)} />

			<BatchUploadModal
				visible={batchUploadVisible}
				onCancel={() => setBatchUploadVisible(false)}
				onUpload={handleBatchUpload}
				currentFolderId={currentFolderId}
			/>
			<MergeAtlasModal
				visible={mergeAtlasVisible}
				selectedCount={selectedRowKeys.length}
				onCancel={() => setMergeAtlasVisible(false)}
				onSubmit={(values) => handleGenerateAtlas(values)}
			/>
		</div>
	);
}
