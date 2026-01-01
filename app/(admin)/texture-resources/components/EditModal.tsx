import React, { useEffect, useState } from 'react';
import type { UploadFile } from 'antd';
import { Button, Form, Input, Modal, Select, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { TextureResource } from '../lib/types';
import styles from '../../../styles/modals.module.scss';
import { getTags } from '@/app/(admin)/texture-resources/services/textureResourceService';

interface EditModalProps {
	visible: boolean;
	editingResource: TextureResource | null;
	form: any;
	loading: boolean;
	onCancel: () => void;
	onSubmit: (values: any) => void;
}

const EditModal: React.FC<EditModalProps> = ({ visible, editingResource, form, loading, onCancel, onSubmit }) => {
	const [fileList, setFileList] = useState<UploadFile[]>([]);
	const [allTags, setAllTags] = useState<string[]>([]);

	// 加载所有已使用的标签
	useEffect(() => {
		if (visible) {
			getTags().then((result) => {
				setAllTags(result.data!);
			});
		}
	}, [visible]);

	useEffect(() => {
		if (!visible) {
			setFileList([]);
		} else if (!editingResource) {
			// 新建时设置默认值
			form.setFieldsValue({ isPublic: true });
		}
	}, [visible, editingResource, form]);

	const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
		setFileList(newFileList);

		// 自动填充纹理名称
		if (newFileList.length > 0 && !editingResource) {
			const file = newFileList[0];
			const fileName = file.name.replace(/\.[^/.]+$/, ''); // 去掉扩展名
			form.setFieldsValue({ name: fileName });
		}
	};

	return (
		<Modal
			title={editingResource ? '编辑纹理资源' : '新建纹理资源'}
			open={visible}
			onCancel={onCancel}
			footer={null}
			width={480}
			className={styles.resourceModal}
		>
			<Form form={form} layout="vertical" onFinish={onSubmit}>
				{!editingResource && (
					<Form.Item name="file" label="上传纹理" rules={[{ required: true, message: '请上传纹理' }]}>
						<Upload
							listType="picture-card"
							maxCount={1}
							fileList={fileList}
							onChange={handleFileChange}
							beforeUpload={() => false}
							accept="image/*"
						>
							{fileList.length === 0 && (
								<div>
									<UploadOutlined />
									<div style={{ marginTop: 8 }}>上传纹理</div>
								</div>
							)}
						</Upload>
					</Form.Item>
				)}

				<Form.Item name="name" label="纹理名称" rules={[{ required: true, message: '请输入纹理名称' }]}>
					<Input placeholder="请输入纹理名称" />
				</Form.Item>

				<Form.Item name="description" label="描述">
					<Input.TextArea placeholder="请输入纹理描述" rows={3} />
				</Form.Item>

				<Form.Item name="tags" label="标签">
					<Select
						mode="tags"
						placeholder="输入标签，按回车添加"
						className={styles.fullWidth}
						options={allTags.map((tag) => ({ label: tag, value: tag }))}
					/>
				</Form.Item>

				<Form.Item name="isPublic" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
					<Select placeholder="请选择状态">
						<Select.Option value={true}>可用</Select.Option>
						<Select.Option value={false}>不可用</Select.Option>
					</Select>
				</Form.Item>

				<Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
					<Space>
						<Button onClick={onCancel}>取消</Button>
						<Button type="primary" htmlType="submit" loading={loading}>
							{editingResource ? '更新' : '创建'}
						</Button>
					</Space>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default EditModal;
