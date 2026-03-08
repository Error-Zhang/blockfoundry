import { useRef, useState } from 'react';
import { UploadFile } from 'antd';
import { batchUploadTextureResources } from '@/app/(admin)/texture-resources/services/textureResourceService';

export interface UseBatchUploadOptions {
	fileList: UploadFile[];
	setFileList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
	currentFolderId: string;
	tags: string[];
	limit?:number;
}

export interface UseBatchUploadReturn {
	upload: () => Promise<
		| {
				successCount: number;
				failCount: number;
		  }
		| undefined
	>;
	uploading: boolean;
	progress: number;
}

export function useBatchUpload({ fileList, setFileList, currentFolderId, tags, limit=10 }: UseBatchUploadOptions): UseBatchUploadReturn {
	const [uploading, setUploading] = useState<boolean>(false);
	const [progress, setProgress] = useState<number>(0);

	const lastProgress = useRef<number>(0);

	const upload = async () => {
		if (!fileList.length) return;

		setUploading(true);

		try {
			const files = fileList.map((f) => f.originFileObj).filter(Boolean) as File[];

			const chunks: File[][] = [];

			for (let i = 0; i < files.length; i += limit) {
				chunks.push(files.slice(i, i + limit));
			}

			let successCount = 0;
			let failCount = 0;

			const errorMap = new Map<string, string>();

			for (let i = 0; i < chunks.length; i++) {
				const res = await batchUploadTextureResources(chunks[i], { folderId: currentFolderId, tags }, (p: number) => {
					const now = Date.now();

					if (now - lastProgress.current > 150) {
						lastProgress.current = now;

						const base = (i / chunks.length) * 100;
						setProgress(base + p / chunks.length);
					}
				});

				if (res.data) {
					successCount += res.data.successCount;
					failCount += res.data.failCount;

					res.data.results.forEach((r) => {
						if (r.error) errorMap.set(r.fileName, r.error);
					});
				}
			}

			setProgress(100);

			setFileList((prev) =>
				prev.map((file) => {
					const err = errorMap.get(file.name);

					if (err) {
						return {
							...file,
							status: 'error',
							error: { message: err },
						};
					}

					return { ...file, status: 'done' };
				})
			);

			return { successCount, failCount };
		} finally {
			setUploading(false);
		}
	};

	return {
		upload,
		uploading,
		progress,
	};
}
