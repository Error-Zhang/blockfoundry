import { createLocalStoreByKeys } from '@/app/store/index';

export const userLocalStore = createLocalStoreByKeys<{
	current: { email: string; password: string };
	sidebarWidth: number;
}>('userStore', ['current', 'sidebarWidth']);
