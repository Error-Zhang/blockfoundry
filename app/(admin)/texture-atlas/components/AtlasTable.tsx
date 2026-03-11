import React from 'react';
import { Button, Card, Image, Popconfirm, Space, Table, Tag } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ITextureAtlas } from '../services/textureAtlasService';
import { FALLBACK_URL } from '@/lib/constants';
import styles from '../../../styles/ResourceTable.module.scss';

interface AtlasTableProps {
	atlases: ITextureAtlas[];
	loading: boolean;
	uploading: boolean;
	onUpload: (file: File) => void;
	onPreview: (atlas: ITextureAtlas) => void;
	onEdit: (atlas: ITextureAtlas) => void;
	onDownload: (atlas: ITextureAtlas) => void;
	onDelete: (id: string) => void;
}

const AtlasTable: React.FC<AtlasTableProps> = ({
	atlases,
	loading,
	uploading,
	onUpload,
	onPreview,
	onEdit,
	onDownload,
	onDelete,
}) => {
	const columns: ColumnsType<ITextureAtlas> = [
		{
			title: '预览',
			dataIndex: 'imageUrl',
			key: 'preview',
			width: 80,
			render: (imageUrl: string, record: ITextureAtlas) => (
				<Image width={50} height={50} src={imageUrl} style={{ objectFit: 'contain', borderRadius: 4 }} fallback={FALLBACK_URL} />
			),
		},
		{
			title: '名称',
			dataIndex: 'name',
			key: 'name',
			render: (text: string, record: ITextureAtlas) => (
				<div>
					<div style={{ fontWeight: 500 }}>{text}</div>
					{record.description && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{record.description}</div>}
				</div>
			),
		},
		{
			title: '尺寸',
			key: 'size',
			render: (_, record: ITextureAtlas) => (
				<Tag color="blue">
					{record.width} × {record.height}
				</Tag>
			),
		},
		{
			title: '精灵数量',
			key: 'spriteCount',
			render: (_, record: ITextureAtlas) => <Tag color="green">{record.spriteCount} 个</Tag>,
		},
		{
			title: '文件大小',
			key: 'fileSize',
			render: (_, record: ITextureAtlas) => <span>{(record.fileSize / 1024).toFixed(1)} KB</span>,
		},
		{
			title: '格式',
			dataIndex: 'format',
			key: 'format',
			render: (format: string) => <Tag>{format}</Tag>,
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			key: 'createdAt',
		},
		{
			title: '操作',
			key: 'actions',
			width: 200,
			fixed: 'right' as const,
			render: (_, record: ITextureAtlas) => {
				return (
					<Space>
						<Button type="text" icon={<EyeOutlined />} onClick={() => onPreview(record)} />
						<Button
							type="text"
							icon={<EditOutlined />}
							onClick={() => onEdit(record)}
						/>
						<Button type="text" icon={<DownloadOutlined />} onClick={() => onDownload(record)} />
						<Popconfirm title="确定要删除这个图集吗?" onConfirm={() => onDelete(record.id)} okText="确定" cancelText="取消">
							<Button type="text" danger icon={<DeleteOutlined />} />
						</Popconfirm>
					</Space>
				);
			},
		},
	];

	const handleBeforeUpload = (file: File) => {
		onUpload(file);
		return false;
	};

	return (
		<Card
			title="纹理图集管理"
			extra={
				<Space>
					<input
						type="file"
						accept=".zip"
						style={{ display: 'none' }}
						id="atlas-upload-input"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								handleBeforeUpload(file);
							}
							e.target.value = '';
						}}
					/>
					<Button
						icon={<UploadOutlined />}
						loading={uploading}
						onClick={() => document.getElementById('atlas-upload-input')?.click()}
					>
						上传图集
					</Button>
				</Space>
			}
			className={styles.resourceTableCard}
		>
			<Table
				columns={columns}
				dataSource={atlases}
				rowKey="id"
				loading={loading}
				scroll={{ x: 1000, y: '90vh' }}
				pagination={{
					pageSize: 10,
					showSizeChanger: true,
					showQuickJumper: true,
					showTotal: (total) => `共 ${total} 个图集`,
				}}
			/>
		</Card>
	);
};

export default AtlasTable;
