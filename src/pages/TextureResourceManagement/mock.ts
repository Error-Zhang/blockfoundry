import { TextureResource } from '@/pages/TextureResourceManagement/types.ts';

export const mockResources: TextureResource[] = [
	{
		id: '1',
		name: '主角基础纹理',
		description: '主角角色的基础颜色纹理',
		fileName: 'player_base.png',
		filePath: '/textures/character/player_base.png',
		fileSize: 128000,
		width: 256,
		height: 256,
		format: 'PNG',
		isMainTexture: true,
		bundledTextures: {
			normal: '1_normal',
			roughness: '1_roughness',
		},
		tags: ['角色', '主角', '基础'],
		thumbnailUrl: '/api/placeholder/256/256',
		originalUrl: '/api/placeholder/256/256',
		createdAt: '2024-01-15',
		updatedAt: '2024-01-20',
		usageCount: 5,
		isPublic: true,
	},
];
