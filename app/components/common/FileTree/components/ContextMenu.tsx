import React from 'react';
import { createPortal } from 'react-dom';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { ContextMenuItem, ContextMenuPosition } from '../types';
import styles from '../FileTree.module.scss';

interface ContextMenuProps {
    visible: boolean;
    position: ContextMenuPosition;
    items: ContextMenuItem[];
    onAction: (key: string) => void;
}

/**
 * 右键菜单组件
 */
export function ContextMenu({ visible, position, items, onAction }: ContextMenuProps) {
    if (!visible) return null;

    return createPortal(
        <div
            className={styles.contextMenu}
            style={{
                top: position.y,
                left: position.x,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <Menu onClick={({ key }) => onAction(key)} items={items as MenuProps['items']} />
        </div>,
        document.body
    );
}