'use client';

import React, { useEffect, useState } from 'react';
import { App, Form } from 'antd';
import StatisticsCards from '@/app/components/common/StatisticsCards/StatisticsCards';
import BlockDirectoryTree from './components/BlockDirectoryTree';
import BlockTable from './components/BlockTable';
import BlockEditModal from './components/BlockEditModal';
import { BlockDefinition } from './lib/types';
import { createBlock, deleteBlock, getBlocks, updateBlock } from './services/blockService';
import styles from '../../styles/ResourceManagement.module.scss';
import { BlockOutlined, FolderOutlined } from '@ant-design/icons';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';

export default function BlockManagementPage() {
	const { message } = App.useApp();
	const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingBlock, setEditingBlock] = useState<BlockDefinition | null>(null);
	const [searchText, setSearchText] = useState('');
	const [currentFolderId, setCurrentFolderId] = useState<string>(null!);
	const [totalCount, setTotalCount] = useState(0);
	const [isExpanded, setIsExpanded] = useState(false);
	const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
	const [sidebarWidth, setSidebarWidth] = useState(300);

	useEffect(() => {
		const saved = localStorage.getItem('block-sidebar-width');
		if (saved) {
			setSidebarWidth(parseInt(saved, 10));
		}
	}, []);

	const [form] = Form.useForm();

	const { loading, handle: loadBlocks } = useAsyncAction(getBlocks, {
		onSuccess: (_, data) => {
			setBlocks(data!.blocks);
			setTotalCount(data!.totalCount);
		},
	});

	useEffect(() => {
		loadBlocks(currentFolderId);
	}, [currentFolderId]);

	const { loading: modelLoadingUpdate, handle: handleEditBlock } = useAsyncAction(updateBlock, {
		onSuccess: () => loadBlocks(currentFolderId),
	});
	const { loading: modelLoadingCreate, handle: handleCreateBlock } = useAsyncAction(createBlock, {
		onSuccess: () => loadBlocks(currentFolderId),
	});

	const modelLoading = modelLoadingUpdate || modelLoadingCreate;

	const handleSubmit = async (values: any) => {
		if (editingBlock) {
			await handleEditBlock(editingBlock.id, values);
		} else {
			await handleCreateBlock({
				...values,
				folderId: currentFolderId,
			});
		}
		setModalVisible(false);
		setEditingBlock(null);
		form.resetFields();
	};

	const handleCreate = () => {
		setEditingBlock(null);
		form.resetFields();
		setModalVisible(true);
	};

	const handleEdit = (block: BlockDefinition) => {
		setEditingBlock(block);
		form.setFieldsValue(block);
		setModalVisible(true);
	};

	const { handle: handleDelete } = useAsyncAction(deleteBlock, {
		onSuccess: () => loadBlocks(currentFolderId),
	});

	const handleSidebarWidthChange = (width: number) => {
		setSidebarWidth(width);
		localStorage.setItem('block-sidebar-width', width.toString());
	};

	// 过滤方块
	const filteredBlocks = blocks.filter((block) => {
		return block.name.toLowerCase().includes(searchText.toLowerCase()) || block.description?.toLowerCase().includes(searchText.toLowerCase());
	});

	const cardConfigs = [
		{
			key: 'totalBlocks',
			title: '总方块数',
			value: totalCount,
			prefix: <BlockOutlined />,
		},
		{
			key: 'selectBlocks',
			title: '所选方块数',
			value: blocks.length,
			prefix: <FolderOutlined />,
		},
	];

	return (
		<div className={styles.management}>
			{/* 统计卡片 */}
			<div className={`${styles.statisticsCards} ${isExpanded ? styles.hidden : styles.visible}`}>
				<StatisticsCards cardConfigs={cardConfigs} />
			</div>

			{/* 主要内容区域 */}
			<div className={styles.mainContentArea}>
				<div className={`${styles.directoryTree} ${isExpanded ? styles.hidden : styles.visible}`}>
					<BlockDirectoryTree
						blocks={blocks}
						onBlockSelect={(block) => {
							if (block) {
								setHighlightedBlockId(block.id);
								setTimeout(() => setHighlightedBlockId(null), 3000);
							}
						}}
						onFolderSelect={(folderId) => setCurrentFolderId(folderId)}
						onBlockChange={() => loadBlocks(currentFolderId)}
						width={sidebarWidth}
						onWidthChange={handleSidebarWidthChange}
					/>
				</div>
				<div className={styles.tableContainer}>
					<BlockTable
						blocks={filteredBlocks}
						loading={loading}
						searchText={searchText}
						onSearchChange={setSearchText}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onCreate={handleCreate}
						isExpanded={isExpanded}
						onExpandToggle={() => setIsExpanded(!isExpanded)}
						highlightedBlockId={highlightedBlockId}
					/>
				</div>
			</div>

			<BlockEditModal
				visible={modalVisible}
				editingBlock={editingBlock}
				form={form}
				loading={modelLoading}
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
