import { useRef, useState } from 'react';
import { UploadFile } from 'antd';

export function useIngestQueue(limit = 10) {
	const queueRef = useRef<UploadFile[]>([]);
	const runningRef = useRef(false);

	const [ingesting, setIngesting] = useState(false);
	const [total, setTotal] = useState(0);
	const [processed, setProcessed] = useState(0);

	const schedule = (fn: () => void) => {
		if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(fn, { timeout: 100 });
		} else {
			requestAnimationFrame(fn);
		}
	};

	const start = (push: (files: UploadFile[]) => void) => {
		if (runningRef.current) return;

		runningRef.current = true;
		setIngesting(true);

		const step = () => {
			if (queueRef.current.length === 0) {
				runningRef.current = false;
				setIngesting(false);
				return;
			}

			const chunk = queueRef.current.splice(0, limit);

			push(chunk);

			setProcessed((p) => p + chunk.length);

			schedule(step);
		};

		schedule(step);
	};

	const enqueue = (files: UploadFile[], push: (files: UploadFile[]) => void) => {
		queueRef.current.push(...files);
		setTotal((t) => t + files.length);
		start(push);
	};

	return {
		enqueue,
		ingesting,
		total,
		processed,
		reset() {
			queueRef.current = [];
			runningRef.current = false;
			setIngesting(false);
			setTotal(0);
			setProcessed(0);
		},
	};
}
