import { useRef, useState } from 'react';

type MutableSetMethods = 'add' | 'delete' | 'clear';

export function useReactiveSet<T>(initial?: Iterable<T>): Set<T> {
	const [, forceUpdate] = useState({});

	// 真正的数据
	const setRef = useRef(new Set<T>(initial));

	// 只创建一次 proxy
	const proxyRef = useRef<Set<T>>(
		new Proxy(setRef.current, {
			get(target, prop, receiver) {
				const value = Reflect.get(target, prop, receiver);

				if (typeof value !== 'function') {
					return value;
				}

				return (...args: unknown[]) => {
					let changed = false;

					switch (prop) {
						case 'add': {
							const beforeSize = target.size;
							const result = (value as Function).apply(target, args);
							changed = target.size !== beforeSize;
							if (changed) forceUpdate({});
							return result;
						}

						case 'delete': {
							const result = (value as Function).apply(target, args);
							changed = result === true;
							if (changed) forceUpdate({});
							return result;
						}

						case 'clear': {
							const changed = target.size > 0;
							const result = (value as Function).apply(target, args);
							if (changed) forceUpdate({});
							return result;
						}

						default:
							return (value as Function).apply(target, args);
					}
				};
			},
		})
	);

	return proxyRef.current;
}