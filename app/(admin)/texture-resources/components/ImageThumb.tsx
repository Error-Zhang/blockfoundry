import { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import styles from '@/app/styles/Modals.module.scss';
export function ImageThumb({ file }: { file: UploadFile }) {
	const [url, setUrl] = useState<string | null>(null);
	useEffect(() => {
		let u: string | null = null;
		const obj = file.originFileObj as File | undefined;
		if (obj) {
			u = URL.createObjectURL(obj);
			setUrl(u);
		} else if ((file as any).url) {
			setUrl((file as any).url);
		} else if ((file as any).thumbUrl) {
			setUrl((file as any).thumbUrl);
		}
		return () => {
			if (u) URL.revokeObjectURL(u);
		};
	}, [file]);
	return (
		<div className={styles.thumb}>
			{url ? (
				<img src={url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
			) : (
				<UploadOutlined style={{ color: '#999', fontSize: 18 }} />
			)}
		</div>
	);
}
