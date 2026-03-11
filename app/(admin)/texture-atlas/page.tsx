'use client';

import React, { useState } from 'react';
import { App } from 'antd';

import AtlasTable from './components/AtlasTable';
import PreviewModal from './components/PreviewModal';
import {
	ITextureAtlas,
	getTextureAtlases,
	deleteTextureAtlas,
	downloadTextureAtlas,
	uploadTextureAtlas,
} from './services/textureAtlasService';
import { useAsyncAction } from '@/app/hooks/useAsyncAction';
import { useConstructor } from '@/app/hooks/useConstructor';
import { request } from '@/lib/api';
import { triggerDownload } from '@/app/components/common/FileTree/treeUtils';

export default function TextureAtlasManagementPage() {
	const { message } = App.useApp();
	const [atlases, setAtlases] = useState<ITextureAtlas[]>([]);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewAtlas, setPreviewAtlas] = useState<(ITextureAtlas & { sprites?: any[] }) | null>(null);

	const { handler: handleGetTextureAtlases, loading } = useAsyncAction(getTextureAtlases, {
		onSuccess: (data) => {
			setAtlases(data || []);
		},
	});

	useConstructor(async () => {
		await handleGetTextureAtlases();
	});

	const { handler: handleUploadTextureAtlas, loading: uploading } = useAsyncAction(uploadTextureAtlas, {
		showSuccessMessage: '上传成功',
		onSuccess: handleGetTextureAtlases,
	});

	const handleUpload = async (file: File) => {
		message.loading({ content: '上传中...', key: 'uploadAtlas', duration: 0 });
		await handleUploadTextureAtlas(file);
		message.destroy('uploadAtlas');
	};

	const { handler: handleDelete } = useAsyncAction(deleteTextureAtlas, {
		onSuccess: handleGetTextureAtlases,
	});

	const handlePreview = async (atlas: ITextureAtlas) => {
		try {
			const { sprites } = await request<{ sprites?: any[] }>(atlas.jsonUrl);
			setPreviewAtlas({ ...atlas, sprites });
			setPreviewVisible(true);
		} catch (e) {
			console.error(e);
			message.error('图集解析失败');
		}
	};

	const handleDownload = async (atlas: ITextureAtlas) => {
		const blob = await downloadTextureAtlas(atlas.id);
		triggerDownload(blob, `${atlas.name}.zip`);
	};

	const handleEdit = async (atlas: ITextureAtlas) => {};

	return (
		<div>
			<AtlasTable
				atlases={atlases}
				loading={loading}
				uploading={uploading}
				onUpload={handleUpload}
				onPreview={handlePreview}
				onEdit={handleEdit}
				onDownload={handleDownload}
				onDelete={handleDelete}
			/>

			<PreviewModal visible={previewVisible} atlas={previewAtlas} onCancel={() => setPreviewVisible(false)} />
		</div>
	);
}
