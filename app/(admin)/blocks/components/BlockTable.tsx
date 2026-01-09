import React from 'react';
import { Button, Card, Input, Popconfirm, Space, Table, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, ExpandOutlined, PlusOutlined, SearchOutlined, ShrinkOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { BlockDefinition } from '../lib/types';
import styles from '../../../styles/ResourceTable.module.scss';

interface BlockTableProps {
	blocks: BlockDefinition[];
	loading: boolean;
	searchText: string;
	onSearchChange: (value: string) => void;
	onEdit: (block: BlockDefinition) => void;
	onDelete: (id: string) => void;
	onCreate: () => void;
	isExpanded?: boolean;
	onExpandToggle?: () => void;
	highlightedBlockId?: string | null;
}

const BlockTable: React.FC<BlockTableProps> = ({
	blocks,
	loading,
	searchText,
	onSearchChange,
	onEdit,
	onDelete,
	onCreate,
	isExpanded = false,
	onExpandToggle,
	highlightedBlockId,
}) => {
	const columns: ColumnsType<BlockDefinition> = [
		{
			title: '名称',
			dataIndex: 'name',
			key: 'name',
			width: 200,
			render: (text: string, record: BlockDefinition) => (
				<div>
					<div className={styles.resourceName}>{text}</div>
					<div className={styles.resourceFilename}>{record.description}</div>
				</div>
			),
		},
		{
			title: '渲染类型',
			dataIndex: ['renderProps', 'renderType'],
			key: 'renderType',
			width: 120,
			render: (renderType: string) => {
				const typeMap: Record<string, { text: string; color: string }> = {
					none: { text: '无', color: 'default' },
					cube: { text: '立方体', color: 'blue' },
					cross: { text: '交叉', color: 'green' },
					model: { text: '模型', color: 'purple' },
					fluid: { text: '流体', color: 'cyan' },
				};
				const config = typeMap[renderType] || { text: renderType, color: 'default' };
				return <Tag color={config.color}>{config.text}</Tag>;
			},
		},
		{
			title: '渲染层',
			dataIndex: ['renderProps', 'renderLayer'],
			key: 'renderLayer',
			width: 120,
			render: (renderLayer: string) => {
				const layerMap: Record<string, { text: string; color: string }> = {
					solid: { text: '实心', color: 'blue' },
					cutout: { text: '镂空', color: 'orange' },
					translucent: { text: '半透明', color: 'cyan' },
				};
				const config = layerMap[renderLayer] || { text: renderLayer, color: 'default' };
				return <Tag color={config.color}>{config.text}</Tag>;
			},
		},
		{
			title: '纹理配置',
			key: 'textures',
			width: 100,
			render: (_, record: BlockDefinition) => {
				const hasTextures = record.textures && Object.keys(record.textures).length > 0;
				return <Tag color={hasTextures ? 'green' : 'default'}>{hasTextures ? '已配置' : '未配置'}</Tag>;
			},
		},
		{
			title: '模型',
			key: 'model',
			width: 100,
			render: (_, record: BlockDefinition) => {
				return <Tag color={record.model ? 'green' : 'default'}>{record.model ? '已配置' : '未配置'}</Tag>;
			},
		},
		{
			title: '动画',
			key: 'animation',
			width: 100,
			render: (_, record: BlockDefinition) => {
				return <Tag color={record.animation ? 'green' : 'default'}>{record.animation ? '已配置' : '未配置'}</Tag>;
			},
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 180,
			render: (date: string) => new Date(date).toLocaleString('zh-CN'),
		},
		{
			title: '操作',
			key: 'actions',
			width: 120,
			fixed: 'right' as const,
			render: (_, record: BlockDefinition) => (
				<Space>
					<Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
					<Popconfirm title="确定要删除这个方块吗？" onConfirm={() => onDelete(record.id)} okText="确定" cancelText="取消">
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
						placeholder="搜索方块名称或描述..."
						prefix={<SearchOutlined />}
						value={searchText}
						onChange={(e) => onSearchChange(e.target.value)}
						allowClear
					/>
				</Space.Compact>
			}
			className={styles.resourceTableCard}
			extra={
				<Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
					新建方块
				</Button>
			}
		>
			<Table
				columns={columns}
				dataSource={blocks}
				loading={loading}
				rowKey="id"
				pagination={{
					pageSize: 10,
					showSizeChanger: true,
					showTotal: (total) => `共 ${total} 个方块`,
				}}
				rowClassName={(record) => (record.id === highlightedBlockId ? styles.highlightedRow : '')}
			/>
		</Card>
	);
};

export default BlockTable;
