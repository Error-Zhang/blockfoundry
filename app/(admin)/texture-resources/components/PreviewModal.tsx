import React from 'react';
import { Modal, Row, Col, Descriptions, Divider, Space, Tag, Image } from 'antd';
import { TextureResource } from '../lib/types';
import styles from '../../../styles/modals.module.scss';

interface PreviewModalProps {
	visible: boolean;
	resource: TextureResource | null;
	onCancel: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
	visible,
	resource,
	onCancel,
}) => {
	return (
		<Modal
			title={`预览纹理: ${resource?.name}`}
			open={visible}
			onCancel={onCancel}
			footer={null}
			width={800}
			centered
			className={styles.previewModal}
		>
			{resource && (
				<div>
					<Row gutter={16}>
						<Col span={12}>
							<div className={styles.previewImageContainer}>
								<Image src={resource.originalUrl} alt={resource.name} className={styles.previewImage} />
							</div>
						</Col>
						<Col span={12}>
							<Descriptions column={1} size="small">
								<Descriptions.Item label="文件名">{resource.fileName}</Descriptions.Item>
								<Descriptions.Item label="尺寸">
									{resource.width} × {resource.height}
								</Descriptions.Item>
								<Descriptions.Item label="格式">{resource.format}</Descriptions.Item>
								<Descriptions.Item label="文件大小">
									{(resource.fileSize / 1024).toFixed(1)} KB
								</Descriptions.Item>
								<Descriptions.Item label="使用次数">{resource.usageCount}</Descriptions.Item>
								<Descriptions.Item label="创建时间">{resource.createdAt}</Descriptions.Item>
								<Descriptions.Item label="更新时间">{resource.updatedAt}</Descriptions.Item>
							</Descriptions>

							{resource.tags.length > 0 && (
								<div className={styles.previewTags}>
									<Divider plain>标签</Divider>
									<Space wrap>
										{resource.tags.map((tag) => (
											<Tag key={tag}>{tag}</Tag>
										))}
									</Space>
								</div>
							)}
						</Col>
					</Row>
				</div>
			)}
		</Modal>
	);
};

export default PreviewModal;