import React from 'react';
import { Card, Col, Form, Input, Modal, Row, Select, Slider } from 'antd';
import { Material } from '../lib/types';

interface MaterialEditModalProps {
	visible: boolean;
	editingMaterial: Material | null;
	form: any;
	loading: boolean;
	onCancel: () => void;
	onSubmit: () => void;
}

const materialTypes = [
	{ label: '标准', value: 'standard' },
	{ label: '透明', value: 'transparent' },
	{ label: '发光', value: 'emissive' },
	{ label: '玻璃', value: 'glass' },
	{ label: '金属', value: 'metal' },
];

const MaterialEditModal: React.FC<MaterialEditModalProps> = ({
	visible,
	editingMaterial,
	form,
	loading,
	onCancel,
	onSubmit,
}) => {
	return (
		<Modal
			title={editingMaterial ? '编辑材质' : '新建材质'}
			open={visible}
			onOk={onSubmit}
			onCancel={onCancel}
			confirmLoading={loading}
			width={600}
		>
			<Form form={form} layout="vertical">
				<Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入材质名称' }]}>
					<Input placeholder="输入材质名称" />
				</Form.Item>

				<Form.Item name="description" label="描述">
					<Input.TextArea placeholder="输入材质描述" rows={2} />
				</Form.Item>

				<Form.Item name="type" label="类型" rules={[{ required: true }]}>
					<Select options={materialTypes} />
				</Form.Item>

				<Card title="材质属性" size="small">
					<Form.Item name={['properties', 'opacity']} label="透明度">
						<Slider min={0} max={1} step={0.01} marks={{ 0: '0', 1: '1' }} />
					</Form.Item>

					<Form.Item name={['properties', 'metallic']} label="金属度">
						<Slider min={0} max={1} step={0.01} marks={{ 0: '0', 1: '1' }} />
					</Form.Item>

					<Form.Item name={['properties', 'roughness']} label="粗糙度">
						<Slider min={0} max={1} step={0.01} marks={{ 0: '0', 1: '1' }} />
					</Form.Item>

					<Form.Item name={['properties', 'emissiveColor']} label="发光颜色">
						<Input type="color" />
					</Form.Item>

					<Form.Item name={['properties', 'emissiveIntensity']} label="发光强度">
						<Slider min={0} max={1} step={0.01} marks={{ 0: '0', 1: '1' }} />
					</Form.Item>

					<Form.Item name={['properties', 'refractionIntensity']} label="折射强度">
						<Slider min={0} max={1} step={0.01} marks={{ 0: '0', 1: '1' }} />
					</Form.Item>
				</Card>
			</Form>
		</Modal>
	);
};

export default MaterialEditModal;