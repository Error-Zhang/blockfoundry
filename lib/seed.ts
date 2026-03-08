import { prisma } from '@/lib/prisma';

/**
 * 初始化数据库数据相关代码
 */
async function main() {
	const user = await prisma.user.findFirst();

	if (!user) {
		await prisma.user.create({
			data: {
				username: 'root',
				email: 'root@qq.com',
				password: '$2b$10$ZpAsyD7nttXefvxULNRzauKs8Sl.MN3WOVL4HOutKAkKQensyeff6',
			},
		});
	}
}

main().finally(() => prisma.$disconnect());
