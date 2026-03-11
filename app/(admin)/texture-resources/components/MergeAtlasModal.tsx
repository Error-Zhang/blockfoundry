import React, { useEffect, useState } from 'react';
import { App, Form, Input, InputNumber, Modal, Space, Typography, Checkbox, Select } from 'antd';

interface MergeAtlasModalProps {
	visible: boolean;
	selectedCount: number;
	onCancel: () => void;
	onSubmit: (values: {
		name: string;
		width: number;
		height?: number;
		padding: number;
		gridSize?: number;
		alignPowerOfTwo?: boolean;
	}) => void | Promise<void>;
}

const MergeAtlasModal: React.FC<MergeAtlasModalProps> = ({ visible, selectedCount, onCancel, onSubmit }) => {
	const { message } = App.useApp();
	const [form] = Form.useForm();
	const [submitting, setSubmitting] = useState(false);

	const handleOk = async () => {
		if (submitting) return;
		const values = await form.validateFields();
		try {
			setSubmitting(true);
			await onSubmit(values);
		} finally {
			setSubmitting(false);
		}
	};

	useEffect(() => {
		if (visible) form.resetFields();
	}, [visible]);

	return (
		<Modal
			title="合并为纹理图集"
			open={visible}
			onCancel={onCancel}
			onOk={handleOk}
			okText="开始合并"
			confirmLoading={submitting}
			width={520}
			mask={{ closable: false }}
		>
			<Space orientation="vertical" style={{ width: '100%' }}>
				<Typography.Text>已选择 {selectedCount} 个纹理资源</Typography.Text>
				<Form
					form={form}
					layout="vertical"
					initialValues={{
						name: '',
						width: 1024,
						padding: 0,
						format: 'png',
					}}
				>
					<Form.Item name="name" label="图集名称">
						<Input placeholder="可选：若无则自动生成" />
					</Form.Item>
					<Form.Item name="width" label="图集最大宽度" rules={[{ required: true, type: 'number', min: 64, max: 8192 }]}>
						<InputNumber style={{ width: '100%' }} placeholder="例如 1024" />
					</Form.Item>
					<Form.Item name="height" label="图集最大高度" rules={[{ type: 'number', min: 64, max: 8192 }]}>
						<InputNumber style={{ width: '100%' }} placeholder="可选，例如 1024" />
					</Form.Item>
					<Form.Item name="padding" label="纹理间距" rules={[{ required: true, type: 'number', min: 0, max: 32 }]}>
						<InputNumber style={{ width: '100%' }} placeholder="例如 2" />
					</Form.Item>
					<Form.Item name="gridSize" label="网格对齐像素" rules={[{ type: 'number', min: 0, max: 128 }]}>
						<InputNumber style={{ width: '100%' }} placeholder="可选，例如 4；0表示不对齐" />
					</Form.Item>
					<Form.Item name="format" label="输出格式" rules={[{ required: true }]}>
						<Select
							options={[
								{ label: 'PNG', value: 'png' },
								{ label: 'WebP', value: 'webp' },
							]}
							placeholder="选择图集文件格式"
						/>
					</Form.Item>
					<Form.Item name="alignPowerOfTwo" valuePropName="checked">
						<Checkbox>图集尺寸对齐到2的幂次</Checkbox>
					</Form.Item>
				</Form>
			</Space>
		</Modal>
	);
};

export default MergeAtlasModal;
