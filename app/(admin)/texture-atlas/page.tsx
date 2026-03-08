'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Upload, Table, Space, Modal, Form, Input, App, Popconfirm, Image, Tag, Drawer, Empty, Row, Col } from 'antd';
import { UploadOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, LockOutlined, UnlockOutlined, FolderOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';

import {
	TextureAtlasListItem,
	getTextureAtlases,
	deleteTextureAtlas,
	downloadTextureAtlas,
	uploadTextureAtlas,
	editTextureAtlas,
	AtlasEditData,
} from './services/textureAtlasService';
import { FALLBACK_URL } from '@/lib/constants';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';
import { useConstructor } from '@/app/hooks/useConstructor';

export default function TextureAtlasManagementPage() {
	const { message } = App.useApp();
	const [atlases, setAtlases] = useState<TextureAtlasListItem[]>([]);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewAtlas, setPreviewAtlas] = useState<(TextureAtlasListItem & { sprites?: any[] }) | null>(null);
	const [editDrawerVisible, setEditDrawerVisible] = useState(false);
	const [editData, setEditData] = useState<AtlasEditData | null>(null);
	const [lockedFolders, setLockedFolders] = useState<Set<string>>(new Set());
	const [form] = Form.useForm();

	const { handle: handleGetTextureAtlases, loading } = useAsyncAction(getTextureAtlases, {
		onSuccess: (data) => {
			setAtlases(data || []);
		},
	});

	useConstructor(async () => {
		await handleGetTextureAtlases();
	});

	const { handle: handleUploadTextureAtlas, loading: uploading } = useAsyncAction(uploadTextureAtlas, {
		showSuccessMessage: '上传成功',
		onSuccess: () => {
			handleGetTextureAtlases();
		},
		onError: () => {},
	});

	const { handle: handleEditAtlas } = useAsyncAction(
		async (folderId: string, folderName: string) => {
			return editTextureAtlas(folderId, folderName);
		},
		{
			onSuccess: (data) => {
				if (data) {
					setEditData(data);
					setEditDrawerVisible(true);
				}
			},
		}
	);

	const handleBeforeUpload = (file: File) => {
		message.loading({ content: '正在上传图集...', key: 'uploadAtlas', duration: 0 });
		handleUploadTextureAtlas(file);
		return false;
	};

	const handleDelete = async (id: string) => {
		const res = await deleteTextureAtlas(id);
		if (res.success) {
			setAtlases((prev) => prev.filter((a) => a.id !== id));
			message.success('图集删除成功!');
		} else {
			message.error(res.error || '删除图集失败');
		}
	};

	const handlePreview = async (atlas: TextureAtlasListItem) => {
		const preview: TextureAtlasListItem & { sprites?: any[] } = { ...atlas };
		try {
			const resp = await fetch(atlas.jsonUrl);
			if (resp.ok) {
				const data = await resp.json();
				if (data && Array.isArray(data.sprites)) {
					preview.sprites = data.sprites;
				} else {
					message.error('资源格式存在错误');
				}
			}
		} catch (e) {
			console.error(e);
			message.error('资源不存在');
		}
		setPreviewAtlas(preview);
		setPreviewVisible(true);
	};

	const handleDownload = async (atlas: TextureAtlasListItem) => {
		try {
			const blob = await downloadTextureAtlas(atlas.id);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${atlas.name}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			message.success('图集下载成功!');
		} catch (error) {
			message.error('图集下载失败');
		}
	};

	const handleEdit = async (atlas: TextureAtlasListItem) => {
		message.loading({ content: '正在生成图集...', key: 'generateAtlas', duration: 0 });
		
		const folderName = atlas.name;
		const folderId = `folder_${atlas.id}`;
		
		try {
			const res = await editTextureAtlas(folderId, folderName);
			message.destroy('generateAtlas');
			
			if (res.success && res.data) {
				setEditData(res.data);
				setEditDrawerVisible(true);
			} else {
				message.error(res.error || '生成图集失败');
			}
		} catch (error) {
			message.destroy('generateAtlas');
			message.error('生成图集失败');
		}
	};

	const columns: ColumnsType<TextureAtlasListItem> = [
		{
			title: '预览',
			dataIndex: 'imageUrl',
			key: 'preview',
			width: 80,
			render: (imageUrl: string, record: TextureAtlasListItem) => (
				<Image width={50} height={50} src={imageUrl} style={{ objectFit: 'contain', borderRadius: 4 }} fallback={FALLBACK_URL} />
			),
		},
		{
			title: '名称',
			dataIndex: 'name',
			key: 'name',
			render: (text: string, record: TextureAtlasListItem) => (
				<div>
					<div style={{ fontWeight: 500 }}>{text}</div>
					{record.description && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{record.description}</div>}
				</div>
			),
		},
		{
			title: '尺寸',
			key: 'size',
			render: (_, record: TextureAtlasListItem) => (
				<Tag color="blue">
					{record.width} × {record.height}
				</Tag>
			),
		},
		{
			title: '精灵数量',
			key: 'spriteCount',
			render: (_, record: TextureAtlasListItem) => <Tag color="green">{record.spriteCount} 个</Tag>,
		},
		{
			title: '文件大小',
			key: 'fileSize',
			render: (_, record: TextureAtlasListItem) => <span>{(record.fileSize / 1024).toFixed(1)} KB</span>,
		},
		{
			title: '格式',
			dataIndex: 'format',
			key: 'format',
			render: (format: string) => <Tag>{format}</Tag>,
		},
		{
			title: '更新时间',
			dataIndex: 'updatedAt',
			key: 'updatedAt',
		},
		{
			title: '操作',
			key: 'actions',
			width: 200,
			fixed: 'right' as const,
			render: (_, record: TextureAtlasListItem) => {
				const isLocked = lockedFolders.has(record.id);
				return (
					<Space>
						<Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
						<Button 
							type="text" 
							icon={isLocked ? <LockOutlined /> : <EditOutlined />} 
							onClick={() => handleEdit(record)}
							disabled={isLocked}
						/>
						<Button type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} />
						<Popconfirm title="确定要删除这个图集吗?" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
							<Button type="text" danger icon={<DeleteOutlined />} />
						</Popconfirm>
					</Space>
				);
			},
		},
	];

	return (
		<div>
			<Card
				title="图集纹理管理"
				extra={
					<Space>
						<Upload accept=".zip" showUploadList={false} beforeUpload={handleBeforeUpload}>
							<Button icon={<UploadOutlined />} loading={uploading}>
								上传图集
							</Button>
						</Upload>
					</Space>
				}
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

			<Modal title={previewAtlas?.name} open={previewVisible} onCancel={() => setPreviewVisible(false)} footer={null} width={800} centered>
				{previewAtlas && (
					<div>
						<div style={{ marginBottom: 16 }}>
							<Space>
								<Tag color="blue">
									尺寸: {previewAtlas.width} × {previewAtlas.height}
								</Tag>
								<Tag color="green">精灵: {previewAtlas.sprites ? previewAtlas.sprites.length : previewAtlas.spriteCount} 个</Tag>
								<Tag>格式: {previewAtlas.format}</Tag>
							</Space>
						</div>

						<div style={{ textAlign: 'center', marginBottom: 16 }}>
							<Image src={previewAtlas.imageUrl} alt={previewAtlas.name} style={{ maxWidth: '100%', maxHeight: 400 }} />
						</div>

						{previewAtlas.sprites && previewAtlas.sprites.length > 0 && (
							<div>
								<h4>精灵列表</h4>
								<Table
									size="small"
									columns={[
										{ title: '名称', dataIndex: 'name', key: 'name' },
										{ title: 'X', dataIndex: 'x', key: 'x', width: 60 },
										{ title: 'Y', dataIndex: 'y', key: 'y', width: 60 },
										{ title: '宽度', dataIndex: 'width', key: 'width', width: 80 },
										{ title: '高度', dataIndex: 'height', key: 'height', width: 80 },
									]}
									dataSource={previewAtlas.sprites}
									rowKey="id"
									pagination={false}
									scroll={{ y: 200 }}
								/>
							</div>
						)}
					</div>
				)}
			</Modal>

			<Drawer
				title={editData ? `图集详情 - ${editData.folderName}` : '图集详情'}
				placement="right"
				width={600}
				open={editDrawerVisible}
				onClose={() => setEditDrawerVisible(false)}
			>
				{editData ? (
					<div>
						<div style={{ marginBottom: 16 }}>
							<Row gutter={[16, 16]}>
								<Col span={12}>
									<Tag color="blue">尺寸: {editData.width} × {editData.height}</Tag>
								</Col>
								<Col span={12}>
									<Tag color="green">纹理: {editData.spriteCount} 个</Tag>
								</Col>
							</Row>
						</div>

						<div style={{ marginBottom: 16, textAlign: 'center' }}>
							<Image 
								src={editData.imageUrl} 
								alt={editData.folderName} 
								style={{ maxWidth: '100%', maxHeight: 300, border: '1px solid #eee', borderRadius: 4 }} 
								fallback={FALLBACK_URL}
							/>
						</div>

						<div style={{ marginBottom: 16 }}>
							<h4>纹理列表</h4>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
							{editData.textures.map((texture) => (
								<div
									key={texture.id}
									style={{
										border: '1px solid #eee',
										borderRadius: 4,
										padding: 8,
										textAlign: 'center',
									}}
								>
									<Image
										width={60}
										height={60}
										src={texture.url}
										alt={texture.name}
										style={{ objectFit: 'contain' }}
										fallback={FALLBACK_URL}
									/>
									<div style={{ fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{texture.name}
									</div>
									<div style={{ fontSize: 10, color: '#999' }}>
										{texture.width}×{texture.height}
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<Empty description="暂无数据" />
				)}
			</Drawer>
		</div>
	);
}
