import { useEffect, useState } from 'react';
import { userLocalStore } from '@/app/store/user.store';

export const useSidebarWidth = (width?: number) => {
	// 侧边栏宽度状态
	const [sidebarWidth, setSidebarWidth] = useState(width || 287);

	// 从 localStorage 加载宽度
	useEffect(() => {
		if (userLocalStore.sidebarWidth) {
			setSidebarWidth(userLocalStore.sidebarWidth);
		}
	}, []);

	// 处理侧边栏宽度变化
	const handleSidebarWidthChange = (width: number) => {
		setSidebarWidth(width);
		userLocalStore.sidebarWidth = width;
	};

	return [sidebarWidth, handleSidebarWidthChange] as const;
};