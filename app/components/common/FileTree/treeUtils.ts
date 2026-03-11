/**
 * 构建新路径
 */
export function buildPath(parentPath: string, name: string): string {
	return parentPath ? `${parentPath}.${name}` : name;
}

/**
 * 触发浏览器下载文件
 * @param source 可以是 Blob 对象或文件的 URL 字符串
 * @param filename 下载后的文件名
 */
export function triggerDownload(source: Blob | string, filename: string): void {
	let downloadUrl: string;
	let isBlob = false;

	// 区分处理 Blob 和 URL 两种情况
	if (source instanceof Blob) {
		downloadUrl = URL.createObjectURL(source);
		isBlob = true;
	} else {
		downloadUrl = source;
	}

	// 创建下载链接并触发下载
	const link = document.createElement('a');
	link.href = downloadUrl;
	link.download = filename;
	link.style.display = 'none';

	// 兼容部分浏览器的异步下载逻辑
	document.body.appendChild(link);
	const clickEvent = new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		view: window,
	});
	link.dispatchEvent(clickEvent);
	document.body.removeChild(link);

	if (isBlob) {
		URL.revokeObjectURL(downloadUrl);
	}
}
