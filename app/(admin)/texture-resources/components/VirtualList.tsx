import { useState } from 'react';

export function VirtualList<T extends { uid?: string | number }>({
	items,
	height,
	itemHeight,
	renderItem,
	className,
}: {
	items: T[];
	height: number;
	itemHeight: number;
	renderItem: (item: T, index: number) => React.ReactNode;
	className?: string;
}) {
	const [scrollTop, setScrollTop] = useState(0);
	const visibleCount = Math.ceil(height / itemHeight) + 6;
	const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
	const end = Math.min(items.length, start + visibleCount);
	const topPad = start * itemHeight;
	const bottomPad = (items.length - end) * itemHeight;

	return (
		<div style={{ height }} className={className} onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
			<div style={{ paddingTop: topPad, paddingBottom: bottomPad }}>
				{items.slice(start, end).map((item, idx) => (
					<div key={item.uid ?? start + idx} style={{ height: itemHeight, boxSizing: 'border-box' }}>
						{renderItem(item, start + idx)}
					</div>
				))}
			</div>
		</div>
	);
}
