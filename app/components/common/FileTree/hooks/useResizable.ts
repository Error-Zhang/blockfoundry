import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * 拖拽调整宽度 Hook
 */
export function useResizable(
    initialWidth: number,
    minWidth: number = 200,
    maxWidth: number = 600,
    onWidthChange?: (width: number) => void
) {
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.classList.add('resizing');
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            if (onWidthChange) {
                onWidthChange(clampedWidth);
            }
        },
        [isResizing, minWidth, maxWidth, onWidthChange]
    );

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        document.body.classList.remove('resizing');
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('resizing');
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return {
        isResizing,
        containerRef,
        resizeRef,
        handleMouseDown,
    };
}