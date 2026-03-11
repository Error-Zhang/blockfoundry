/**
 * 自动转换文件大小单位（B/KB/MB/GB/TB）
 * @param size 原始文件大小（字节数）
 * @param decimalPlaces 保留的小数位数，默认 1 位
 * @returns 格式化后的大小字符串（如：2.5 KB、10.8 MB）
 */
export function formatFileSize(size: number, decimalPlaces: number = 1): string {
	// 定义单位换算级别和对应的单位名称
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	// 计算对应的单位级别（Math.log2(size) / 10 等价于 Math.log(size) / Math.log(1024)）
	const unitIndex = Math.min(
		Math.floor(Math.log2(size) / 10),
		units.length - 1 // 限制最大单位为 TB
	);

	// 计算对应单位下的大小值
	const convertedSize = size / Math.pow(1024, unitIndex);

	// 保留指定小数位并拼接单位
	return `${convertedSize.toFixed(decimalPlaces)} ${units[unitIndex]}`;
}
