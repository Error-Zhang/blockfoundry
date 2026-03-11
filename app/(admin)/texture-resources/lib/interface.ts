// 纹理资源接口定义
import { TextureResourceModel } from '@/app/api/texture-resources/interface';

export type ITextureResource = Exclude<TextureResourceModel, 'tags' | 'createdAt' | 'updatedAt'> & {
	tags: string[];
	url: string;
	folderPath: string;
	createdAt: string;
	updatedAt: string;
};
