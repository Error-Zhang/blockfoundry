'use client';

import React, { useEffect, useState } from 'react';
import { App, Form } from 'antd';
import { AppstoreOutlined, BgColorsOutlined, ExperimentOutlined, TagsOutlined } from '@ant-design/icons';
import { Material } from '../lib/types';
import { createMaterial, deleteMaterial, getMaterials, updateMaterial } from '../services/materialService';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';
import StatisticsCards from '@/app/components/common/StatisticsCards/StatisticsCards';
import MaterialTable from './MaterialTable';
import MaterialEditModal from './MaterialEditModal';
import styles from '../../../styles/ResourceManagement.module.scss';

export default function MaterialManagement() {
	const { message } = App.useApp();
	const [materials, setMaterials] = useState<Material[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
	const [searchText, setSearchText] = useState('');
	const [form] = Form.useForm();

	const { loading, handle: loadMaterials } = useAsyncAction(getMaterials, {
		onSuccess: (_, data) => setMaterials(data!),
	});

	useEffect(() => {
		loadMaterials();
	}, []);

	const { loading: saving, handle: handleSave } = useAsyncAction(
		async (values: any) => {
			if (editingMaterial) {
				return await updateMaterial(editingMaterial.id, values);
			} else {
				return await createMaterial(values);
			}
		},
		{
			onSuccess: () => {
				message.success(editingMaterial ? '材质更新成功' : '材质创建成功');
				setModalVisible(false);
				setEditingMaterial(null);
				form.resetFields();
				loadMaterials();
			},
		}
	);

	const { handle: handleDelete } = useAsyncAction(deleteMaterial, {
		onSuccess: () => {
			message.success('材质删除成功');
			loadMaterials();
		},
	});

	const handleAdd = () => {
		setEditingMaterial(null);
		form.resetFields();
		form.setFieldsValue({
			type: 'standard',
			properties: {
				opacity: 1,
				metallic: 0,
				roughness: 0.5,
				emissiveIntensity: 0,
				refractionIntensity: 0,
			},
		});
		setModalVisible(true);
	};

	const handleEdit = (material: Material) => {
		setEditingMaterial(material);
		form.setFieldsValue(material);
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

	// 过滤材质
	const filteredMaterials = materials.filter((material) => {
		return (
			material.name.toLowerCase().includes(searchText.toLowerCase()) ||
			material.description?.toLowerCase().includes(searchText.toLowerCase()) ||
			material.type.toLowerCase().includes(searchText.toLowerCase())
		);
	});

	// 统计材质类型分布
	const materialTypeCount = materials.reduce(
		(acc, material) => {
			acc[material.type] = (acc[material.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	// 统计数据卡片配置
	const cardConfigs = [
		{
			key: 'totalMaterials',
			title: '总材质数',
			value: materials.length,
			prefix: <ExperimentOutlined />,
		},
		{
			key: 'types',
			title: '材质类型',
			value: Object.keys(materialTypeCount).length,
			prefix: <AppstoreOutlined />,
		},
		{
			key: 'standard',
			title: '标准材质',
			value: materialTypeCount['standard'] || 0,
			prefix: <TagsOutlined />,
		},
		{
			key: 'special',
			title: '特殊材质',
			value:
				(materialTypeCount['transparent'] || 0) +
				(materialTypeCount['emissive'] || 0) +
				(materialTypeCount['glass'] || 0) +
				(materialTypeCount['metal'] || 0),
			prefix: <BgColorsOutlined />,
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
					<MaterialTable
						materials={filteredMaterials}
						loading={loading}
						searchText={searchText}
						onSearchChange={setSearchText}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onAdd={handleAdd}
					/>
				</div>
			</div>

			{/* 模态框 */}
			<MaterialEditModal
				visible={modalVisible}
				editingMaterial={editingMaterial}
				form={form}
				loading={saving}
				onCancel={() => {
					setModalVisible(false);
					setEditingMaterial(null);
					form.resetFields();
				}}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
