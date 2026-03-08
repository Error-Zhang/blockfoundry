import React, { useEffect, useState, useCallback } from 'react';
import { Form, Select, UploadFile, Progress } from 'antd';
import { App, Button, Modal, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

import { getTags } from '../services/textureResourceService';

import styles from '@/app/styles/Modals.module.scss';
import { useIngestQueue } from '@/app/(admin)/texture-resources/hooks/useIngestQueue';
import { useBatchUpload } from '@/app/(admin)/texture-resources/hooks/useBatchUpload';
import { VirtualList } from '@/app/(admin)/texture-resources/components/VirtualList';
import { ImageThumb } from '@/app/(admin)/texture-resources/components/ImageThumb';

interface BatchUploadModalProps {
	visible: boolean;
	onCancel: () => void;
	onUpload: (successCount: number, fileCount: number) => void;
	currentFolderId: string;
}

const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ visible, onCancel, onUpload, currentFolderId }) => {
	const { message } = App.useApp();

	const [tags, setTags] = useState<string[]>([]);
	const [allTags, setAllTags] = useState<string[]>([]);
	const [fileList, setFileList] = useState<UploadFile[]>([]);

	/**
	 * 文件导入队列（避免一次性 setState 卡顿）
	 */
	const ingest = useIngestQueue();

	/**
	 * 上传逻辑
	 */
	const { upload, uploading, progress } = useBatchUpload({
		fileList,
		setFileList,
		currentFolderId,
		tags,
	});

	/**
	 * 初始化标签
	 */
	useEffect(() => {
		if (!visible) {
			setFileList([]);
			setTags([]);
			ingest.reset();
			return;
		}

		getTags().then((res) => {
			setAllTags(res.data ?? []);
		});
	}, [visible]);

	/**
	 * 文件列表变化
	 */
	const handleFileListChange = useCallback(
		({ fileList: newFileList }: { fileList: UploadFile[] }) => {
			if (newFileList.length <= fileList.length) {
				setFileList(newFileList);
				return;
			}

			const added = newFileList.filter((f) => !fileList.some((x) => x.uid === f.uid));

			if (added.length) {
				ingest.enqueue(added, (chunk) => {
					setFileList((prev) => {
						const next = [...prev];

						for (const f of chunk) {
							if (!next.some((x) => x.uid === f.uid)) {
								next.push(f);
							}
						}

						return next;
					});
				});
			}
		},
		[fileList]
	);

	/**
	 * 执行上传
	 */
	const handleUpload = async () => {
		try {
			const result = await upload();

			if (result) {
				onUpload(result.successCount, result.failCount);
			}
		} catch (err) {
			console.error(err);
			message.error('执行出现错误');
		}
	};

	return (
		<Modal
			title="批量上传纹理"
			open={visible}
			onCancel={onCancel}
			mask={{ closable: false }}
			width={600}
			footer={
				<div style={{ textAlign: 'right' }}>
					<Space>
						<Button onClick={onCancel}>取消</Button>

						<Button type="primary" onClick={handleUpload} loading={uploading} disabled={!fileList.length || ingest.ingesting}>
							开始上传
						</Button>
					</Space>
				</div>
			}
		>
			<Form layout="vertical" colon={false} className={styles.batchUpload}>
				{/* 标签 */}
				<Form.Item label="标签">
					<Select
						mode="tags"
						placeholder="输入标签，按回车添加"
						value={tags}
						onChange={setTags}
						options={allTags.map((tag) => ({
							label: tag,
							value: tag,
						}))}
					/>
				</Form.Item>

				{/* 上传进度 */}
				{uploading && (
					<Form.Item label="上传进度" className={styles.progressRow}>
						<Progress percent={progress} size="small" />
					</Form.Item>
				)}

				{/* 导入进度 */}
				{ingest.ingesting && (
					<Form.Item label="正在导入文件" className={styles.ingestRow}>
						<Progress percent={ingest.total ? Math.floor((ingest.processed / ingest.total) * 100) : 0} size="small" />
					</Form.Item>
				)}

				{/* 文件选择 */}
				<Form.Item label="选择文件">
					<Upload.Dragger
						multiple
						fileList={fileList}
						onChange={handleFileListChange}
						beforeUpload={() => false}
						accept="image/*"
						listType="picture"
						showUploadList={false}
						previewFile={() => Promise.resolve('')}
					>
						<p className="ant-upload-drag-icon">
							<UploadOutlined />
						</p>

						<p className="ant-upload-text">点击或拖拽文件到此区域上传</p>

						<p className="ant-upload-hint">支持批量上传多个纹理文件，文件名将作为纹理名称</p>
					</Upload.Dragger>
				</Form.Item>

				{/* 文件列表 */}
				{fileList.length > 0 && (
					<Form.Item label="文件列表">
						<div className={styles.listWrapper}>
							<VirtualList
								items={fileList}
								height={320}
								itemHeight={72}
								className={styles.virtualList}
								renderItem={(file) => (
									<div className={styles.uploadListItem}>
										<div className={styles.itemRow}>
											<div className={styles.itemLabel}>
												<ImageThumb file={file} />
											</div>

											<div className={styles.itemContent}>
												<div className={styles.itemName}>{file.name}</div>

												<div className={styles.itemStatus}>
													{file.status === 'uploading' && '上传中'}

													{file.status === 'done' && '已完成'}

													{file.error && (
														<span className={styles.itemError}>
															上传失败：
															{file.error?.message ?? '未知原因'}
														</span>
													)}
												</div>
											</div>

											<Button
												size="small"
												className={styles.itemRemove}
												onClick={() => setFileList((prev) => prev.filter((f) => f.uid !== file.uid))}
											>
												移除
											</Button>
										</div>
									</div>
								)}
							/>
						</div>
					</Form.Item>
				)}
			</Form>
		</Modal>
	);
};

export default BatchUploadModal;
