import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/app/api/lib/api-handler';

export const GET = apiHandler({
	handler: async ({ user }) => {
		const resources = await prisma.textureResource.findMany({
			where: {
				userId: user.id,
			},
			select: {
				tags: true,
			},
		});

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

		const allTags = Array.from(allTagsSet).sort();

		return NextResponse.json({
			success: true,
			data: allTags,
			count: allTags.length,
		});
	},
});
