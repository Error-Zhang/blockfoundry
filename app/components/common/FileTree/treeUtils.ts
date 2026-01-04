/**
 * 构建新路径
 */
export function buildPath(parentPath: string, name: string): string {
	return parentPath ? `${parentPath}.${name}` : name;
}

/**
 * 触发浏览器下载文件
 */
export function triggerDownload(blob: Blob, filename: string): void {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(url);
}
