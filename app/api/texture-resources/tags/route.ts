import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取所有使用过的标签
export async function GET() {
	try {
		// 从数据库获取所有纹理资源
		const resources = await prisma.textureResource.findMany({
			select: {
				tags: true,
			},
		});

		// 收集所有标签
		const allTagsSet = new Set<string>();
		resources.forEach((resource) => {
			if (resource.tags) {
				try {
					const tags = JSON.parse(resource.tags);
					if (Array.isArray(tags)) {
						tags.forEach((tag) => {
							if (tag && typeof tag === 'string') {
								allTagsSet.add(tag.trim());
							}
						});
					}
				} catch (error) {
					console.error('解析标签失败:', error);
				}
			}
		});

		// 转换为数组并排序
		const allTags = Array.from(allTagsSet).sort();

		return NextResponse.json({
			success: true,
			data: allTags,
			count: allTags.length,
		});
	} catch (error) {
		console.error('获取标签列表失败:', error);
		return NextResponse.json(
			{ success: false, error: '获取标签列表失败' },
			{ status: 500 }
		);
	}
}