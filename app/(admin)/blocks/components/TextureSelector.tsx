'use client';

import React, { useEffect, useState } from 'react';
import { Empty, Image, Input, Modal, Space } from 'antd';
import { TextureResource } from '../../texture-resources/lib/types';
import { getTextureResources } from '../../texture-resources/services/textureResourceService';
import styles from '../../../styles/TextureSelector.module.scss';

interface TextureSelectorProps {
	visible: boolean;
	onSelect: (textureId: string) => void;
	onCancel: () => void;
	selectedTextureId?: string;
}

export default function TextureSelector({ visible, onSelect, onCancel, selectedTextureId }: TextureSelectorProps) {
	const [textures, setTextures] = useState<TextureResource[]>([]);
	const [searchText, setSearchText] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (visible) {
			loadTextures();
		}
	}, [visible]);

	const loadTextures = async () => {
		setLoading(true);
		try {
			const response = await getTextureResources(null!);
			setTextures(response.data?.resources || []);
		} catch (error) {
			console.error('Failed to load textures:', error);
		} finally {
			setLoading(false);
		}
	};

	const filteredTextures = textures.filter((texture) => texture.name.toLowerCase().includes(searchText.toLowerCase()));

	return (
		<Modal
			title="选择纹理"
			open={visible}
			onCancel={onCancel}
			footer={null}
			width={800}
			styles={{ body: { maxHeight: '600px', overflow: 'auto' } }}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="large">
				<Input.Search placeholder="搜索纹理..." value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />

				{filteredTextures.length === 0 ? (
					<Empty description="暂无纹理" />
				) : (
					<div className={styles.textureGrid}>
						{filteredTextures.map((texture) => (
							<div
								key={texture.id}
								className={`${styles.textureItem} ${selectedTextureId === texture.id ? styles.selected : ''}`}
								onClick={() => {
									onSelect(texture.id);
									onCancel();
								}}
							>
								<Image src={texture.url} alt={texture.name} preview={false} />
								<div className={styles.textureName}>{texture.name}</div>
							</div>
						))}
					</div>
				)}
			</Space>
		</Modal>
	);
}
