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
import {
	getTextureResources,
	createTextureResource,
	updateTextureResource,
	deleteTextureResource,
} from './services/textureResourceService';
import styles from '../../styles/textureResourceManagement.module.scss';
import { mockResources } from './lib/mock';
import { CloudUploadOutlined, FileImageOutlined, FolderOutlined, TagsOutlined } from '@ant-design/icons';

export default function TextureResourceManagementPage() {
	const { message } = App.useApp();
	const [resources, setResources] = useState<TextureResource[]>([]);
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingResource, setEditingResource] = useState<TextureResource | null>(null);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewResource, setPreviewResource] = useState<TextureResource | null>(null);
	const [batchUploadVisible, setBatchUploadVisible] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [currentFolderPath, setCurrentFolderPath] = useState('');

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
	const loadResources = async () => {
		setLoading(true);
		try {
			const result = await getTextureResources(currentFolderPath);
			if (result.success && result.data) {
				setResources(result.data);
			} else {
				message.error(result.error || '加载纹理资源失败');
			}
		} catch (error) {
			console.error('加载纹理资源失败:', error);
			message.error('加载纹理资源失败');
		} finally {
			setLoading(false);
		}
	};

	// 初始化和文件夹切换时加载数据
	useEffect(() => {
		loadResources();
	}, [currentFolderPath]);

	// 过滤资源
	const filteredResources = resources.filter((resource) => {
		const matchSearch =
			resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
			resource.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));
		return matchSearch;
	});

	// 处理上传
	const handleUpload = () => {
		setEditingResource(null);
		form.resetFields();
		setModalVisible(true);
	};

	// 处理新建/编辑
	const handleSubmit = async (values: any) => {
		setLoading(true);
		try {
			if (editingResource) {
				// 更新资源
				const result = await updateTextureResource(editingResource.id, values);
				if (result.success) {
					message.success('纹理资源更新成功！');
					loadResources();
				} else {
					message.error(result.error || '更新失败');
				}
			} else {
				// 创建新资源
				const fileList = values.file?.fileList || [];
				if (fileList.length === 0 || !fileList[0].originFileObj) {
					message.error('请选择文件');
					return;
				}

				const result = await createTextureResource({
					file: fileList[0].originFileObj,
					name: values.name,
					description: values.description,
					tags: values.tags,
					isPublic: values.isPublic,
					folderPath: currentFolderPath,
				});

				if (result.success) {
					message.success('纹理资源创建成功！');
					loadResources();
				} else {
					message.error(result.error || '创建失败');
				}
			}
			setModalVisible(false);
			setEditingResource(null);
			form.resetFields();
		} catch (error) {
			console.error('操作失败:', error);
			message.error('操作失败，请重试');
		} finally {
			setLoading(false);
		}
	};

	// 处理编辑
	const handleEdit = (resource: TextureResource) => {
		setEditingResource(resource);
		form.setFieldsValue(resource);
		setModalVisible(true);
	};

	// 处理删除
	const handleDelete = async (id: string) => {
		try {
			const result = await deleteTextureResource(id);
			if (result.success) {
				message.success('纹理资源删除成功！');
				loadResources();
			} else {
				message.error(result.error || '删除失败');
			}
		} catch (error) {
			console.error('删除失败:', error);
			message.error('删除失败，请重试');
		}
	};

	// 处理预览
	const handlePreview = (resource: TextureResource) => {
		setPreviewResource(resource);
		setPreviewVisible(true);
	};

	// 处理下载
	const handleDownload = (resource: TextureResource) => {
		message.info('开始下载纹理资源...');
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
			}
			// 无论成功还是部分失败，都刷新资源列表
			loadResources();
		} catch (error) {
			message.error('批量上传失败，请重试');
		}
	};

	const handleBundleManage = (resource: TextureResource) => {
		// 暂时不需要
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
			value: resources.length,
			prefix: <FileImageOutlined />,
		},
		{
			key: 'texturePacks',
			title: '纹理包数',
			value: 0,
			prefix: <FolderOutlined />,
		},
		{
			key: 'categories',
			title: '分类数量',
			value: 0,
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
			<StatisticsCards cardConfigs={cardConfigs} />

			{/* 主要内容区域 */}
			<div className={styles.mainContentArea}>
					<DirectoryTree
					resources={resources}
					onResourcesChange={setResources}
					onResourceSelect={() => {}}
					onFolderSelect={setCurrentFolderPath}
					onFolderCreated={loadResources}
					width={sidebarWidth}
					onWidthChange={handleSidebarWidthChange}
				/>
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
							onCreateNew={() => {
								setEditingResource(null);
								form.resetFields();
								setModalVisible(true);
							}}
							onBundleManage={handleBundleManage}
						/>
				</div>
			</div>

			{/* 模态框 */}
			<EditModal
				visible={modalVisible}
				editingResource={editingResource}
				form={form}
				loading={loading}
				onCancel={() => {
					setModalVisible(false);
					setEditingResource(null);
					form.resetFields();
				}}
				onSubmit={handleSubmit}
			/>

			<PreviewModal
				visible={previewVisible}
				resource={previewResource}
				onCancel={() => setPreviewVisible(false)}
			/>

			<BatchUploadModal
				visible={batchUploadVisible}
				onCancel={() => setBatchUploadVisible(false)}
				onUpload={handleBatchUpload}
				currentFolderPath={currentFolderPath}
			/>
		</div>
	);
}
