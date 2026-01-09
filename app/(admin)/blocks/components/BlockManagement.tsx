'use client';

import React, { useEffect, useState } from 'react';
import { App, Form } from 'antd';
import { CodeSandboxOutlined, FolderOutlined, TagsOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { BlockDefinition } from '../lib/types';
import { createBlock, deleteBlock, getBlocks, updateBlock } from '../services/blockService';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';
import StatisticsCards from '@/app/components/common/StatisticsCards/StatisticsCards';
import BlockTable from './BlockTable';
import BlockEditModal from './BlockEditModal';
import styles from '../../../styles/ResourceManagement.module.scss';

export default function BlockManagement() {
	const { message } = App.useApp();
	const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingBlock, setEditingBlock] = useState<BlockDefinition | null>(null);
	const [searchText, setSearchText] = useState('');
	const [form] = Form.useForm();

	const { loading, handle: loadBlocks } = useAsyncAction(getBlocks, {
		onSuccess: (_, data) => setBlocks(data!.blocks),
	});

	useEffect(() => {
		loadBlocks();
	}, []);

	const { loading: saving, handle: handleSave } = useAsyncAction(
		async (values: any) => {
			if (editingBlock) {
				return await updateBlock(editingBlock.id, values);
			} else {
				return await createBlock(values);
			}
		},
		{
			onSuccess: () => {
				message.success(editingBlock ? '方块更新成功' : '方块创建成功');
				setModalVisible(false);
				setEditingBlock(null);
				form.resetFields();
				loadBlocks();
			},
		}
	);

	const { handle: handleDelete } = useAsyncAction(deleteBlock, {
		onSuccess: () => {
			message.success('方块删除成功');
			loadBlocks();
		},
	});

	const handleAdd = () => {
		setEditingBlock(null);
		form.resetFields();
		form.setFieldsValue({
			properties: {
				lightLevel: 0,
				transparent: false,
				solid: true,
				collidable: true,
			},
		});
		setModalVisible(true);
	};

	const handleEdit = (block: BlockDefinition) => {
		setEditingBlock(block);
		form.setFieldsValue(block);
		setModalVisible(true);
	};

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();
			await handleSave(values);
		} catch (error) {
			console.error('Validation failed:', error);
		}
	};

	// 统计数据卡片配置
	const cardConfigs = [
		{
			key: 'totalBlocks',
			title: '总方块数',
			value: blocks.length,
			prefix: <CodeSandboxOutlined />,
		},
		{
			key: 'withTextures',
			title: '已配置纹理',
			value: blocks.filter((b) => b.textures && Object.keys(b.textures).length > 0).length,
			prefix: <TagsOutlined />,
		},
		{
			key: 'withModel',
			title: '已配置模型',
			value: blocks.filter((b) => b.model).length,
			prefix: <FolderOutlined />,
		},
		{
			key: 'withAnimation',
			title: '已配置动画',
			value: blocks.filter((b) => b.animation).length,
			prefix: <ThunderboltOutlined />,
		},
	];

	return (
		<div className={styles.management}>
			{/* 统计卡片 */}
			<div className={styles.statisticsCards}>
				<StatisticsCards cardConfigs={cardConfigs} />
			</div>

			{/* 主要内容区域 */}
			<div className={styles.mainContentArea}>
				<div className={styles.tableContainer}>
					<BlockTable
						blocks={blocks}
						loading={loading}
						searchText={searchText}
						onSearchChange={setSearchText}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onCreate={handleAdd}
					/>
				</div>
			</div>

			{/* 模态框 */}
			<BlockEditModal
				visible={modalVisible}
				editingBlock={editingBlock}
				form={form}
				loading={saving}
				onCancel={() => {
					setModalVisible(false);
					setEditingBlock(null);
					form.resetFields();
				}}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
