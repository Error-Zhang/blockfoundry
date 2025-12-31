import { TextureResource } from './types';

/**
 * 下载纹理资源文件
 * @param resource 纹理资源对象
 */
export const downloadTextureResource = (resource: TextureResource): void => {
    try {
        // 创建一个临时的 a 标签来触发下载
        const link = document.createElement('a');
        link.href = resource.originalUrl;
        link.download = resource.fileName || resource.name || 'download';
        link.target = '_blank';
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('下载文件失败:', error);
        throw error;
    }
};