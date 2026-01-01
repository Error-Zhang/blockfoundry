import store, { StoreType } from 'store2';

type Nullable<T> = T | null;

type ExtendStore<U> = {
	[K in keyof U as `set${Capitalize<string & K>}`]: (value: U[K]) => void;
} & {
	[K in keyof U as `del${Capitalize<string & K>}`]: () => void;
} & {
	[K in keyof U]: Nullable<U[K]>;
} & {
	[K in keyof U as `update${Capitalize<string & K>}`]: (partial: Partial<U[K]>) => void;
};

export function createLocalStore<T extends StoreType>(namespace: string, extend?: (ns: StoreType) => Omit<T, keyof StoreType>): T {
	const ns = store.namespace(namespace);
	const createdStore = extend ? Object.assign(ns, extend(ns)) : ns;
	return createdStore as T;
}

export function createLocalStoreByKeys<U extends Record<string, any>>(namespace: string, keys: (keyof U)[]) {
	const ns = store.namespace(namespace);

	const result: any = ns;

	keys.forEach((key) => {
		const capitalized = String(key)[0].toUpperCase() + String(key).slice(1);

		result[`set${capitalized}`] = (value: U[typeof key]) => {
			ns.set(key as string, value);
		};

		result[`del${capitalized}`] = () => {
			ns.remove(key as string);
		};

		Object.defineProperty(result, key, {
			get() {
				return ns.get(key as string) as Nullable<U[typeof key]>;
			},
			enumerable: true,
			configurable: true,
		});

		result[`update${capitalized}`] = (partial: Partial<U[typeof key]>) => {
			const current = ns.get(key as string) as Nullable<U[typeof key]>;
			if (!current) return;
			ns.set(key as string, { ...current, ...partial });
		};
	});

	type ExtendStoreType = StoreType & ExtendStore<U>;

	return result as ExtendStoreType;
}
