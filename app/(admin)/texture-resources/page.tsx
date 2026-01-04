'use client';

import React, { useEffect, useState } from 'react';
import { App, Form } from 'antd';
import StatisticsCards from './components/StatisticsCards';
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
import styles from '../../styles/textureResourceManagement.module.scss';
import { CloudUploadOutlined, FileImageOutlined, FolderOutlined, TagsOutlined } from '@ant-design/icons';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';

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
	const [highlightedResourceId, setHighlightedResourceId] = useState<string | null>(null);

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
		onSuccess: (_, data) => {
			setResources(data!.resources);
			setTotalCount(data!.totalCount);
		},
	});

	// 初始化和文件夹切换时加载数据
	useEffect(() => {
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

	// 处理上传
	const handleUpload = () => {
		setEditingResource(null);
		form.resetFields();
		setModalVisible(true);
	};

	// 处理新建/编辑
	const { loading: modelLoadingUpdate, handle: handleEditResource } = useAsyncAction(updateTextureResource, {
		onSuccess: () => loadResources(),
	});
	const { loading: modelLoadingCreate, handle: handleCreateResource } = useAsyncAction(createTextureResource, {
		onSuccess: () => loadResources(),
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
		setModalVisible(false);
		setEditingResource(null);
		form.resetFields();
	};

	// 处理编辑
	const handleEdit = (resource: TextureResource) => {
		setEditingResource(resource);
		form.setFieldsValue(resource);
		setModalVisible(true);
	};

	// 处理删除
	const { handle: handleDelete } = useAsyncAction(deleteTextureResource, {
		onSuccess: () => loadResources(),
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

	const handleBatchUpload = async (uploadedResources: any[], errors?: string[]) => {
		try {
			// 只有全部成功时才显示成功消息并关闭模态框
			if (!errors || errors.length === 0) {
				message.success(`成功上传 ${uploadedResources.length} 个纹理资源！`);
				setBatchUploadVisible(false);
				loadResources();
			}
		} catch (error) {
			message.error('批量上传失败，请重试');
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
			title: '总纹理数',
			value: totalCount,
			prefix: <FileImageOutlined />,
		},
		{
			key: 'selectTextures',
			title: '所选纹理数',
			value: resources.length,
			prefix: <FolderOutlined />,
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
		<div className={styles.textureResourceManagement}>
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
								setHighlightedResourceId(resource.id);
								// 3秒后清除高亮
								setTimeout(() => setHighlightedResourceId(null), 3000);
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
						onPreview={handlePreview}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onDownload={handleDownload}
						onUpload={handleUpload}
						onBatchUpload={handleBatchUploadOpen}
						isExpanded={isExpanded}
						onExpandToggle={() => setIsExpanded(!isExpanded)}
						highlightedResourceId={highlightedResourceId}
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
		</div>
	);
}
