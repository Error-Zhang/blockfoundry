import React, { useEffect, useState } from 'react';
import type { UploadFile } from 'antd';
import { App, Button, Modal, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { batchUploadTextureResources } from '../services/textureResourceService';

interface BatchUploadModalProps {
	visible: boolean;
	onCancel: () => void;
	onUpload: (resources: any[], errors?: string[]) => void;
	currentFolderId: string;
}

const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ visible, onCancel, onUpload, currentFolderId }) => {
	const { message } = App.useApp();
	const [fileList, setFileList] = useState<UploadFile[]>([]);
	const [uploading, setUploading] = useState(false);

	useEffect(() => {
		if (!visible) {
			setFileList([]);
			setUploading(false);
		}
	}, [visible]);

	const handleUpload = async () => {
		if (fileList.length === 0) return;
		setUploading(true);

		try {
			// 初始化所有文件为上传中状态
			const updatedFileList = fileList.map((file) => ({
				...file,
				status: 'uploading' as const,
				percent: 0,
			}));
			setFileList([...updatedFileList]);

			// 提取文件对象
			const files = fileList.map((file) => file.originFileObj).filter((f) => f !== null && f !== undefined) as File[];

			// 发送到后端，使用真实进度回调
			const result = await batchUploadTextureResources(files, currentFolderId, (progress) => {
				// 更新所有文件的进度
				const progressFileList = updatedFileList.map((file) => ({
					...file,
					percent: progress,
				}));
				setFileList([...progressFileList]);
			});

			if (!result.success && !result.data) {
				message.error(result.error || '上传失败');
			}

			// 根据后端返回的错误信息，创建文件名到错误信息的映射
			const errorMap = new Map<string, string>();
			(result.errors || []).forEach((err: string) => {
				// 匹配格式: 纹理 "文件名" 错误信息
				const match = err.match(/纹理 "(.+?)" (.+)/);
				if (match) {
					errorMap.set(match[1], err);
				}
			});

			// 标记文件状态并添加错误信息
			const finalFileList = updatedFileList.map((file) => {
				const fileName = file.name;
				const errorMsg = errorMap.get(fileName);

				if (errorMsg) {
					// 有错误的文件
					return {
						...file,
						status: 'error' as const,
						percent: 100,
						error: { message: <span style={{ color: 'black' }}>{errorMsg}</span> },
					};
				} else {
					// 成功的文件
					return {
						...file,
						status: 'done' as const,
						percent: 100,
					};
				}
			});
			setFileList(finalFileList);

			// 延迟一下让用户看到100%的进度
			await new Promise((resolve) => setTimeout(resolve, 500));

			// 调用回调，传递后端返回的资源数据
			onUpload(result.data || [], result.errors);
		} catch (error) {
			console.error('批量上传失败:', error);
			// 标记所有文件为失败
			const updatedFileList = fileList.map((file) => ({
				...file,
				status: 'error' as const,
			}));
			setFileList(updatedFileList);
		} finally {
			setUploading(false);
		}
	};

	return (
		<Modal
			title="批量上传纹理"
			open={visible}
			onCancel={onCancel}
			footer={
				<div style={{ textAlign: 'right' }}>
					<Space>
						<Button onClick={onCancel}>取消</Button>
						<Button type="primary" onClick={handleUpload} loading={uploading} disabled={fileList.length === 0}>
							开始上传
						</Button>
					</Space>
				</div>
			}
			width={600}
		>
			<Upload.Dragger
				multiple
				fileList={fileList}
				onChange={({ fileList: newFileList }) => setFileList(newFileList)}
				beforeUpload={() => false}
				accept="image/*"
				listType="picture"
				showUploadList={{
					showRemoveIcon: true,
				}}
			>
				<p className="ant-upload-drag-icon">
					<UploadOutlined />
				</p>
				<p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
				<p className="ant-upload-hint">支持批量上传多个纹理文件，文件名将作为纹理名称，默认状态为可用</p>
			</Upload.Dragger>
		</Modal>
	);
};

export default BatchUploadModal;
