import { useEffect } from 'react';

export function useConstructor(callback: () => void) {
	useEffect(() => {
		callback();
	}, []);
}
