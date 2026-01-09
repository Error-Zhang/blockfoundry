import React from 'react';
import { Button, Card, Input, Popconfirm, Space, Table, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Material } from '../lib/types';
import styles from '../../../styles/ResourceTable.module.scss';

interface MaterialTableProps {
	materials: Material[];
	loading: boolean;
	searchText: string;
	onSearchChange: (value: string) => void;
	onEdit: (material: Material) => void;
	onDelete: (id: string) => void;
	onAdd: () => void;
}

const materialTypes = [
	{ label: '标准', value: 'standard' },
	{ label: '透明', value: 'transparent' },
	{ label: '发光', value: 'emissive' },
	{ label: '玻璃', value: 'glass' },
	{ label: '金属', value: 'metal' },
];

const MaterialTable: React.FC<MaterialTableProps> = ({ materials, loading, searchText, onSearchChange, onEdit, onDelete, onAdd }) => {
	const columns: ColumnsType<Material> = [
		{
			title: '名称',
			dataIndex: 'name',
			key: 'name',
			width: 200,
			render: (text: string, record: Material) => (
				<div>
					<div className={styles.resourceName}>{text}</div>
					<div className={styles.resourceFilename}>{record.description}</div>
				</div>
			),
		},
		{
			title: '类型',
			dataIndex: 'type',
			key: 'type',
			width: 120,
			render: (type: string) => {
				const typeConfig = materialTypes.find((t) => t.value === type);
				return <Tag color="blue">{typeConfig?.label || type}</Tag>;
			},
		},
		{
			title: '属性',
			key: 'properties',
			width: 300,
			render: (_: any, record: Material) => {
				const props = record.properties;
				return (
					<Space size="small" wrap>
						{props.opacity !== undefined && <Tag>透明度: {props.opacity}</Tag>}
						{props.metallic !== undefined && <Tag>金属度: {props.metallic}</Tag>}
						{props.roughness !== undefined && <Tag>粗糙度: {props.roughness}</Tag>}
						{props.emissiveIntensity !== undefined && props.emissiveIntensity > 0 && (
							<Tag color="orange">发光: {props.emissiveIntensity}</Tag>
						)}
					</Space>
				);
			},
		},
		{
			title: '操作',
			key: 'actions',
			width: 150,
			fixed: 'right' as const,
			render: (_: any, record: Material) => (
				<Space>
					<Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
					<Popconfirm title="确定要删除这个材质吗？" onConfirm={() => onDelete(record.id)} okText="确定" cancelText="取消">
						<Button type="text" danger icon={<DeleteOutlined />} />
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<Card
			title={
				<Input
					className={styles.search}
					placeholder="搜索材质名称..."
					prefix={<SearchOutlined />}
					value={searchText}
					onChange={(e) => onSearchChange(e.target.value)}
					allowClear
				/>
			}
			className={styles.resourceTableCard}
			extra={
				<Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
					新建材质
				</Button>
			}
		>
			<Table
				columns={columns}
				dataSource={materials}
				rowKey="id"
				loading={loading}
				scroll={{ x: 800 }}
				pagination={{
					defaultPageSize: 10,
					pageSizeOptions: ['10', '20', '50', '100'],
					showSizeChanger: true,
					showQuickJumper: true,
					showTotal: (total) => `共 ${total} 个材质`,
				}}
			/>
		</Card>
	);
};

export default MaterialTable;
