import React from 'react';
import { Button, Card, Image, Input, Popconfirm, Space, Table, Tag } from 'antd';
import {
	DeleteOutlined,
	DownloadOutlined,
	EditOutlined,
	ExpandOutlined,
	EyeOutlined,
	SearchOutlined,
	ShrinkOutlined,
	UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TextureResource } from '../lib/types';
import styles from '../../../styles/resourceTable.module.scss';

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
	onBatchUpload: () => void;
	isExpanded?: boolean;
	onExpandToggle?: () => void;
	highlightedResourceId?: string | null;
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
	onBatchUpload,
	isExpanded = false,
	onExpandToggle,
	highlightedResourceId,
}) => {
	// 表格列定义
	const columns: ColumnsType<TextureResource> = [
		{
			title: '预览',
			dataIndex: 'url',
			key: 'preview',
			width: 80,
			render: (url: string, record: TextureResource) => (
				<Image
					width={50}
					height={50}
					src={url}
					alt={record.name}
					className={styles.resourceThumbnail}
					fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
				/>
			),
		},
		{
			title: '名称',
			dataIndex: 'name',
			key: 'name',
			width: 160,
			render: (text: string, record: TextureResource) => {
				// 显示文件夹路径
				const displayPath = record.folderPath ? record.folderPath.replace(/\./g, '\\') : '';

				return (
					<div>
						<div className={styles.resourceName}>{text}</div>
						<div className={styles.resourceFilename}>{record.description || displayPath}</div>
					</div>
				);
			},
		},
		{
			title: '尺寸',
			key: 'size',
			width: 100,
			render: (_, record: TextureResource) => (
				<Tag>
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
			render: (isPublic: boolean) => <Tag color={isPublic ? 'green' : 'orange'}>{isPublic ? '可用' : '不可用'}</Tag>,
		},
		{
			title: '操作',
			key: 'actions',
			width: 140,
			fixed: 'right' as const,
			render: (_, record: TextureResource) => (
				<Space>
					<Button type="text" icon={<EyeOutlined />} onClick={() => onPreview(record)} />
					<Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
					<Button type="text" icon={<DownloadOutlined />} onClick={() => onDownload(record)} />
					<Popconfirm title="确定要删除这个纹理资源吗？" onConfirm={() => onDelete(record.id)} okText="确定" cancelText="取消">
						<Button type="text" danger icon={<DeleteOutlined />} />
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<Card
			title={
				<Space.Compact style={{ width: '100%' }}>
					<Button
						icon={isExpanded ? <ShrinkOutlined /> : <ExpandOutlined />}
						onClick={onExpandToggle}
						title={isExpanded ? '收起' : '展开'}
					/>
					<Input
						className={styles.search}
						placeholder="搜索纹理名称或标签..."
						prefix={<SearchOutlined />}
						value={searchText}
						onChange={(e) => onSearchChange(e.target.value)}
						allowClear
					/>
				</Space.Compact>
			}
			className={styles.resourceTableCard}
			extra={
				<Space>
					<Button icon={<UploadOutlined />} loading={loading} onClick={onUpload}>
						上传纹理
					</Button>
					<Button icon={<UploadOutlined />} onClick={onBatchUpload}>
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
						defaultPageSize: 10,
						pageSizeOptions: ['10', '20', '50', '100'],
						showSizeChanger: true,
						showQuickJumper: true,
						showTotal: (total) => `共 ${total} 个纹理资源`,
					}}
					rowClassName={(record) => (record.id === highlightedResourceId ? styles.highlightedRow : '')}
				/>
			</div>
		</Card>
	);
};

export default ResourceTable;
