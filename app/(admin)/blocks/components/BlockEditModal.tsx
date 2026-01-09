import React from 'react';
import { Modal, Form, Input, Select, FormInstance } from 'antd';
import { BlockDefinition } from '../lib/types';

const { TextArea } = Input;
const { Option } = Select;

interface BlockEditModalProps {
	visible: boolean;
	editingBlock: BlockDefinition | null;
	form: FormInstance;
	loading: boolean;
	onCancel: () => void;
	onSubmit: (values: any) => void;
}

const BlockEditModal: React.FC<BlockEditModalProps> = ({ visible, editingBlock, form, loading, onCancel, onSubmit }) => {
	return (
		<Modal
			title={editingBlock ? '编辑方块' : '新建方块'}
			open={visible}
			onCancel={onCancel}
			onOk={() => form.submit()}
			confirmLoading={loading}
			width={800}
		>
			<Form form={form} layout="vertical" onFinish={onSubmit}>
				<Form.Item label="方块名称" name="name" rules={[{ required: true, message: '请输入方块名称' }]}>
					<Input placeholder="请输入方块名称" />
				</Form.Item>

				<Form.Item label="方块描述" name="description">
					<TextArea rows={3} placeholder="请输入方块描述" />
				</Form.Item>

				<Form.Item label="渲染类型" name={['renderProps', 'renderType']} rules={[{ required: true, message: '请选择渲染类型' }]}>
					<Select placeholder="请选择渲染类型">
						<Option value="none">无</Option>
						<Option value="cube">立方体</Option>
						<Option value="cross">交叉</Option>
						<Option value="model">模型</Option>
						<Option value="fluid">流体</Option>
					</Select>
				</Form.Item>

				<Form.Item label="渲染层" name={['renderProps', 'renderLayer']} rules={[{ required: true, message: '请选择渲染层' }]}>
					<Select placeholder="请选择渲染层">
						<Option value="solid">实心</Option>
						<Option value="cutout">镂空</Option>
						<Option value="translucent">半透明</Option>
					</Select>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default BlockEditModal;