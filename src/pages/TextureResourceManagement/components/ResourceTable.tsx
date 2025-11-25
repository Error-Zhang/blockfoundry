import React from 'react';
import { Card, Table, Space, Button, Tooltip, Popconfirm, Image, Tag, Row, Col, Input } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, SearchOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TextureResource, TextureBundle } from '../types.ts';
import '../styles/ResourceTable.less';

interface ResourceTableProps {
	resources: TextureResource[];
	loading: boolean;
	searchText: string;
	onSearchChange: (value: string) => void;
	onPreview: (resource: TextureResource) => void;
	onEdit: (resource: TextureResource) => void;
	onDelete: (id: string) => void;
	onDownload: (resource: TextureResource) => void;
	onUpload: () => void;
	onCreateNew: () => void;
	onBundleManage: (resource: TextureResource) => void;
}

const ResourceTable: React.FC<ResourceTableProps> = ({
	resources,
	loading,
	searchText,
	onSearchChange,
	onPreview,
	onEdit,
	onDelete,
	onDownload,
	onUpload,
	onCreateNew,
	onBundleManage,
}) => {
	// 表格列定义
	const columns: ColumnsType<TextureResource> = [
		{
			title: '预览',
			dataIndex: 'thumbnailUrl',
			key: 'preview',
			width: 80,
			render: (thumbnailUrl: string, record: TextureResource) => (
				<Image
					width={50}
					height={50}
					src={thumbnailUrl}
					alt={record.name}
					className="resource-thumbnail"
					fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
				/>
			),
		},
		{
			title: '名称',
			dataIndex: 'name',
			key: 'name',
			render: (text: string, record: TextureResource) => (
				<div>
					<div className="resource-name">{text}</div>
					<div className="resource-filename">{record.fileName}</div>
				</div>
			),
		},
		{
			title: '尺寸',
			key: 'size',
			width: 100,
			render: (_, record: TextureResource) => (
				<Tag color="blue">
					{record.width} × {record.height}
				</Tag>
			),
		},
		{
			title: '格式',
			dataIndex: 'format',
			key: 'format',
			width: 80,
			render: (format: string) => <Tag>{format}</Tag>,
		},
		{
			title: '捆绑贴图',
			key: 'bundledTextures',
			width: 150,
			render: (_: any, record: TextureResource) => {
				if (!record.isMainTexture || !record.bundledTextures) {
					return <Tag color="default">无捆绑</Tag>;
				}

				const bundledTypes = Object.keys(record.bundledTextures).filter(
					(key) => record.bundledTextures && record.bundledTextures[key as keyof TextureBundle]
				);

				if (bundledTypes.length === 0) {
					return <Tag color="blue">主纹理</Tag>;
				}

				return (
					<Space wrap>
						<Tag color="blue">主纹理</Tag>
						{bundledTypes.map((type) => (
							<Tag key={type} color="purple">
								{type}
							</Tag>
						))}
						<Button type="link" size="small" onClick={() => onBundleManage(record)}>
							管理
						</Button>
					</Space>
				);
			},
		},

		{
			title: '标签',
			dataIndex: 'tags',
			key: 'tags',
			width: 120,
			render: (tags: string[]) => (
				<Space wrap>
					{tags.slice(0, 1).map((tag) => (
						<Tag key={tag}>{tag}</Tag>
					))}
					{tags.length > 1 && <Tag>+{tags.length - 1}</Tag>}
				</Space>
			),
		},
		{
			title: '大小',
			key: 'fileSize',
			width: 80,
			render: (_, record: TextureResource) => <span>{(record.fileSize / 1024).toFixed(1)} KB</span>,
		},
		{
			title: '使用',
			dataIndex: 'usageCount',
			key: 'usageCount',
			width: 70,
			render: (count: number) => <Tag color={count > 10 ? 'red' : count > 5 ? 'orange' : 'default'}>{count}</Tag>,
		},
		{
			title: '状态',
			dataIndex: 'isPublic',
			key: 'isPublic',
			width: 80,
			render: (isPublic: boolean) => <Tag color={isPublic ? 'green' : 'orange'}>{isPublic ? '公开' : '私有'}</Tag>,
		},
		{
			title: '操作',
			key: 'actions',
			width: 160,
			fixed: 'right' as const,
			render: (_, record: TextureResource) => (
				<Space>
					<Tooltip title="预览">
						<Button type="text" icon={<EyeOutlined />} onClick={() => onPreview(record)} />
					</Tooltip>
					<Tooltip title="编辑">
						<Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
					</Tooltip>
					<Tooltip title="下载">
						<Button type="text" icon={<DownloadOutlined />} onClick={() => onDownload(record)} />
					</Tooltip>
					<Popconfirm title="确定要删除这个纹理资源吗？" onConfirm={() => onDelete(record.id)} okText="确定" cancelText="取消">
						<Tooltip title="删除">
							<Button type="text" danger icon={<DeleteOutlined />} />
						</Tooltip>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<Card
			title={
				<Input
					className="search"
					placeholder="搜索纹理名称或标签..."
					prefix={<SearchOutlined />}
					value={searchText}
					onChange={(e) => onSearchChange(e.target.value)}
					allowClear
				/>
			}
			className="resource-table-card"
			extra={
				<Space>
					<Button icon={<UploadOutlined />} loading={loading} onClick={onUpload}>
						上传纹理
					</Button>
					<Button icon={<UploadOutlined />} onClick={onUpload}>
						批量上传
					</Button>
				</Space>
			}
		>
			<div>
				<Table
					columns={columns}
					dataSource={resources}
					rowKey="id"
					loading={loading}
					scroll={{ x: 1200 }}
					pagination={{
						pageSize: 10,
						showSizeChanger: true,
						showQuickJumper: true,
						showTotal: (total) => `共 ${total} 个纹理资源`,
					}}
				/>
			</div>
		</Card>
	);
};

export default ResourceTable;
