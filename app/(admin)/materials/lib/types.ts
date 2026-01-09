// 材质类型
export interface Material {
	id: string;
	name: string;
	description: string;
	type: 'standard' | 'transparent' | 'emissive' | 'glass' | 'metal';
	properties: MaterialProperties;
	userId: number;
	createdAt: string;
	updatedAt: string;
}

export interface MaterialProperties {
	opacity?: number; // 0-1
	metallic?: number; // 0-1
	roughness?: number; // 0-1
	emissiveColor?: string; // hex color
	emissiveIntensity?: number; // 0-1
	refractionIntensity?: number; // 0-1
}