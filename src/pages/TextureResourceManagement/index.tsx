import React, { useState, useEffect } from 'react';
import { Row, Col, Form, message } from 'antd';
import StatisticsCards from './components/StatisticsCards.tsx';
import DirectoryTree from './components/DirectoryTree.tsx';
import ResourceTable from './components/ResourceTable.tsx';
import Modals from './components/Modals.tsx';
import { TextureResource } from './types.ts';
import './styles/TextureResourceManagement.less';
import { mockResources } from './mock.ts';
import { CloudUploadOutlined, FileImageOutlined, FolderOutlined, TagsOutlined } from '@ant-design/icons';

const TextureResourceManagement: React.FC = () => {
	const [resources, setResources] = useState<TextureResource[]>([]);
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingResource, setEditingResource] = useState<TextureResource | null>(null);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewResource, setPreviewResource] = useState<TextureResource | null>(null);
	const [bundleModalVisible, setBundleModalVisible] = useState(false);
	const [currentMainTexture, setCurrentMainTexture] = useState<TextureResource | null>(null);
	const [searchText, setSearchText] = useState('');

	// 侧边栏宽度状态
	const [sidebarWidth, setSidebarWidth] = useState(() => {
		const saved = localStorage.getItem('texture-sidebar-width');
		return saved ? parseInt(saved, 10) : 300;
	});

	const [form] = Form.useForm();

	// 模拟数据
	useEffect(() => {
		setResources(mockResources);
	}, []);

	// 过滤资源
	const filteredResources = resources.filter((resource) => {
		const matchSearch =
			resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
			resource.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));
		return matchSearch;
	});

	// 处理上传
	const handleUpload = () => {
		setLoading(true);
		setTimeout(() => {
			message.success('纹理资源上传成功！');
			setLoading(false);
		}, 2000);
	};

	// 处理新建/编辑
	const handleSubmit = async (values: any) => {
		try {
			setLoading(true);
			if (editingResource) {
				const updatedResources = resources.map((resource) =>
					resource.id === editingResource.id ? { ...resource, ...values, updatedAt: new Date().toISOString().split('T')[0] } : resource
				);
				setResources(updatedResources);
				message.success('纹理资源更新成功！');
			} else {
				const newResource: TextureResource = {
					id: Date.now().toString(),
					...values,
					fileName: values.name + '.png',
					filePath: `/textures/${values.category}/${values.name}.png`,
					thumbnailUrl: '/api/placeholder/256/256',
					originalUrl: '/api/placeholder/256/256',
					createdAt: new Date().toISOString().split('T')[0],
					updatedAt: new Date().toISOString().split('T')[0],
					usageCount: 0,
					fileSize: 128000,
				};
				setResources([...resources, newResource]);
				message.success('纹理资源创建成功！');
			}
			setModalVisible(false);
			setEditingResource(null);
			form.resetFields();
		} catch (error) {
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
	const handleDelete = (id: string) => {
		setResources(resources.filter((resource) => resource.id !== id));
		message.success('纹理资源删除成功！');
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

	// 处理捆绑贴图管理
	const handleBundleManage = (resource: TextureResource) => {
		setCurrentMainTexture(resource);
		setBundleModalVisible(true);
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
		<div className="texture-resource-management">
			{/* 统计卡片 */}
			<StatisticsCards cardConfigs={cardConfigs} />

			{/* 主要内容区域 */}
			<div className="main-content-area" style={{ display: 'flex', gap: '16px' }}>
				<DirectoryTree
					resources={resources}
					onResourcesChange={setResources}
					onResourceSelect={() => {}}
					width={sidebarWidth}
					onWidthChange={handleSidebarWidthChange}
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
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
			<Modals
				modalVisible={modalVisible}
				editingResource={editingResource}
				form={form}
				loading={loading}
				onModalCancel={() => {
					setModalVisible(false);
					setEditingResource(null);
					form.resetFields();
				}}
				onSubmit={handleSubmit}
				previewVisible={previewVisible}
				previewResource={previewResource}
				onPreviewCancel={() => setPreviewVisible(false)}
				bundleModalVisible={bundleModalVisible}
				currentMainTexture={currentMainTexture}
				resources={resources}
				onBundleModalCancel={() => {
					setBundleModalVisible(false);
					setCurrentMainTexture(null);
				}}
				onResourcesChange={setResources}
			/>
		</div>
	);
};

export default TextureResourceManagement;
