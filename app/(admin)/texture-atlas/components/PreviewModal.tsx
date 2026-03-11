import React from 'react';
import { Image, Modal, Space, Table, Tag } from 'antd';
import { ITextureAtlas } from '../services/textureAtlasService';
import styles from '../../../styles/Modals.module.scss';

interface PreviewModalProps {
	visible: boolean;
	atlas: (ITextureAtlas & { sprites?: any[] }) | null;
	onCancel: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ visible, atlas, onCancel }) => {
	return (
		<Modal
			title={atlas?.name}
			open={visible}
			onCancel={onCancel}
			footer={null}
			width={800}
			centered
			className={styles.resourceModal}
		>
			{atlas && (
				<div>
					<div style={{ marginBottom: 16 }}>
						<Space>
							<Tag color="blue">
								尺寸: {atlas.width} × {atlas.height}
							</Tag>
							<Tag color="green">精灵: {atlas.sprites ? atlas.sprites.length : atlas.spriteCount} 个</Tag>
							<Tag>格式: {atlas.format}</Tag>
						</Space>
					</div>

					<div style={{ textAlign: 'center', marginBottom: 16 }}>
						<Image src={atlas.imageUrl} alt={atlas.name} style={{ maxWidth: '100%', maxHeight: 400 }} />
					</div>

					{atlas.sprites && atlas.sprites.length > 0 && (
						<div>
							<h4>精灵列表</h4>
							<Table
								size="small"
								columns={[
									{ title: '名称', dataIndex: 'name', key: 'name' },
									{ title: 'X', dataIndex: 'x', key: 'x', width: 60 },
									{ title: 'Y', dataIndex: 'y', key: 'y', width: 60 },
									{ title: '宽度', dataIndex: 'width', key: 'width', width: 80 },
									{ title: '高度', dataIndex: 'height', key: 'height', width: 80 },
								]}
								dataSource={atlas.sprites}
								rowKey="id"
								pagination={false}
								scroll={{ y: 200 }}
							/>
						</div>
					)}
				</div>
			)}
		</Modal>
	);
};

export default PreviewModal;
