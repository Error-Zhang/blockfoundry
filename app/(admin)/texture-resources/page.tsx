'use client';

import React, { useEffect, useRef, useState } from 'react';
import { App, Form } from 'antd';
import StatisticsCards from '@/app/components/common/StatisticsCards/StatisticsCards';
import DirectoryTree from './components/DirectoryTree';
import ResourceTable from './components/ResourceTable';
import EditModal from './components/EditModal';
import PreviewModal from './components/PreviewModal';
import BatchUploadModal from './components/BatchUploadModal';
import { ITextureResource } from './lib/interface';
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
import { useSidebarWidth } from '@/app/(admin)/texture-resources/hooks/useSidebarWidth';
import { triggerDownload } from '@/app/components/common/FileTree/treeUtils';
import { formatFileSize } from '@/app/(admin)/texture-resources/lib/utils';

export default function TextureResourceManagementPage() {
	const { message } = App.useApp();
	const [resources, setResources] = useState<ITextureResource[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingResource, setEditingResource] = useState<ITextureResource | null>(null);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewResource, setPreviewResource] = useState<ITextureResource | null>(null);
	const [batchUploadVisible, setBatchUploadVisible] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [currentFolderId, setCurrentFolderId] = useState<string>(null!);
	const [totalCount, setTotalCount] = useState(0);
	const [tagCount, setTagCount] = useState(0);
	const [isExpanded, setIsExpanded] = useState(false);
	const highlightSet = useReactiveSet<string>();
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [selectedRows, setSelectedRows] = useState<ITextureResource[]>([]);
	const [mergeAtlasVisible, setMergeAtlasVisible] = useState(false);

	const [sidebarWidth, setSidebarWidth] = useSidebarWidth();

	const [form] = Form.useForm();

	// 加载纹理资源
	const { loading, handler: loadResources } = useAsyncAction(getTextureResources, {
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
	const { loading: modelLoadingUpdate, handler: handleEditResource } = useAsyncAction(updateTextureResource, {
		onSuccess,
	});

	const { loading: modelLoadingCreate, handler: handleCreateResource } = useAsyncAction(createTextureResource, {
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
	const handleEdit = (resource: ITextureResource) => {
		setEditingResource(resource);
		form.setFieldsValue(resource);
		setModalVisible(true);
	};

	// 处理删除
	const { handler: handleDelete } = useAsyncAction(deleteTextureResource, {
		onSuccess: () => loadResources(currentFolderId),
	});

	// 处理预览
	const handlePreview = (resource: ITextureResource) => {
		setPreviewResource(resource);
		setPreviewVisible(true);
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
		const filters = selectedRows.filter((row) => {
			if (!row.isPublic) highlightSet?.add(row.id);
			return row.isPublic;
		});
		if (filters.length !== selectedRows.length) {
			message.warning({
				content: `${selectedRows.length - filters.length}项资源不可用`,
				duration: 3,
				onClose: () => {
					highlightSet?.clear();
				},
			});
			return;
		}
		setMergeAtlasVisible(true);
	};

	const { handler: handleGenerateTextureAtlas } = useAsyncAction(generateTextureAtlas, {
		showSuccessMessage: '图集创建成功',
		onSuccess: () => {
			setSelectedRowKeys([]);
			setSelectedRows([]);
			setMergeAtlasVisible(false);
		},
	});

	const handleGenerateAtlas = async (values: { name: string; width: number; height?: number; padding: number; gridSize?: number; alignPowerOfTwo?: boolean; format?: 'png' | 'webp' | 'jpeg' }) => {
		await handleGenerateTextureAtlas({
			textureIds: selectedRowKeys.map(String),
			name: values.name || `纹理图集_${Date.now()}`,
			padding: values.padding,
			maxWidth: values.width,
			maxHeight: values.height,
			gridSize: values.gridSize,
			alignPowerOfTwo: values.alignPowerOfTwo,
			format: values.format,
		});
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
			value: formatFileSize(resources.reduce((sum, r) => sum + r.fileSize, 0)),
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
							highlightSet.add(resource.id);
							setTimeout(() => highlightSet.delete(resource.id), 3000);
						}}
						onFolderSelect={(folder) => setCurrentFolderId(folder.id)}
						onResourceChange={() => loadResources(currentFolderId)}
						width={sidebarWidth}
						onWidthChange={setSidebarWidth}
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
						onDownload={(resource) => {
							triggerDownload(resource.url, resource.fileName);
						}}
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
