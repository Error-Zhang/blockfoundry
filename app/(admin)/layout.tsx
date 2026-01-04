import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import ClientLayout from './client-layout';

export default async function AdminLayout({ children }: { children: ReactNode }) {
	const session = await auth();

	if (!session) redirect('/auth');

	return <ClientLayout session={session}>{children}</ClientLayout>;
}
