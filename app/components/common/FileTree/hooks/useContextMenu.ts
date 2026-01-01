import { useState, useCallback, useEffect } from 'react';
import { ContextMenuPosition } from '../types';

/**
 * 右键菜单 Hook
 */
export function useContextMenu() {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
    const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

    const show = useCallback((event: React.MouseEvent, nodeKey: string) => {
        event.preventDefault();
        setSelectedNodeKey(nodeKey);
        setPosition({ x: event.clientX, y: event.clientY });
        setVisible(true);
    }, []);

    const hide = useCallback(() => {
        setVisible(false);
    }, []);

    // 监听点击事件关闭右键菜单
    useEffect(() => {
        const handleClickOutside = () => {
            if (visible) {
                hide();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [visible, hide]);

    return {
        visible,
        position,
        selectedNodeKey,
        show,
        hide,
    };
}