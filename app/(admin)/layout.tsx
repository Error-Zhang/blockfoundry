import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();

	if (!session) {
		redirect('/login');
	}

	// 动态导入客户端布局组件
	const { default: ClientLayout } = await import('./client-layout');

	return <ClientLayout session={session}>{children}</ClientLayout>;
}
