import React, { useRef, useState, useEffect, useMemo } from 'react';
import { TagImage } from '../types';
import { ImageCard, ListItem } from './ItemViews';

// Virtual List Component (For List View)
export const VirtualList = ({
    items,
    selectedId,
    multiSelection,
    onCardPointerDown,
    onCardPointerEnter,
    onRemove,
    onDoubleClick
}: {
    items: { image: TagImage, projectId: string }[],
    selectedId: string | null,
    multiSelection: Set<string>,
    onCardPointerDown: (id: string, e: React.PointerEvent) => void,
    onCardPointerEnter: (id: string, e: React.PointerEvent) => void,
    onRemove: (id: string, e: React.MouseEvent) => void,
    onDoubleClick?: (id: string) => void
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(800);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onScroll = () => requestAnimationFrame(() => setScrollTop(el.scrollTop));
        const onResize = () => setContainerHeight(el.clientHeight);

        el.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onResize);

        setContainerHeight(el.clientHeight);

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    const rowHeight = 104; // 96px (h-24) + 8px gap
    const totalHeight = items.length * rowHeight;

    const buffer = 4;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endRow = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

    const visibleItems = useMemo(() => {
        return items.slice(startRow, endRow).map((item, index) => ({
            ...item,
            absoluteIndex: startRow + index
        }));
    }, [items, startRow, endRow]);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar relative outline-none" tabIndex={-1}>
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div
                    className="flex flex-col gap-2"
                    style={{
                        position: 'absolute',
                        top: startRow * rowHeight,
                        left: 0,
                        right: 0,
                    }}
                >
                    {visibleItems.map(({ image }) => (
                        <ListItem
                            key={image.id}
                            img={image}
                            isSelected={selectedId === image.id}
                            isMultiSelected={multiSelection.has(image.id)}
                            onPointerDown={(e) => onCardPointerDown(image.id, e)}
                            onPointerEnter={(e) => onCardPointerEnter(image.id, e)}
                            onRemove={(e) => onRemove(image.id, e)}
                            onDoubleClick={onDoubleClick ? () => onDoubleClick(image.id) : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

interface VirtualGridProps {
    items: { image: TagImage, projectId: string }[];
    selectedId: string | null;
    multiSelection: Set<string>;
    onCardPointerDown: (id: string, e: React.PointerEvent) => void;
    onCardPointerEnter: (id: string, e: React.PointerEvent) => void;
    onRemove: (id: string, e: React.MouseEvent) => void;
    columnCount: number;
    onSelect?: (id: string, multi: boolean, range: boolean) => void;
    selectedIds?: Set<string>;
    onDoubleClick?: (id: string) => void;
}

// Virtual Grid Component
export const VirtualGrid = ({
    items,
    selectedId,
    multiSelection,
    onCardPointerDown,
    onCardPointerEnter,
    onRemove,
    columnCount,
    onDoubleClick
}: VirtualGridProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(800);
    const [clientWidth, setClientWidth] = useState(1000);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onScroll = () => requestAnimationFrame(() => setScrollTop(el.scrollTop));
        const onResize = () => {
            setContainerHeight(el.clientHeight);
            setClientWidth(el.clientWidth);
        };

        el.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onResize);

        // Initial measurement
        setContainerHeight(el.clientHeight);
        setClientWidth(el.clientWidth);

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Calculate accurate row height based on column count and spacing
    const gap = 16;
    const itemWidth = (clientWidth - (gap * (columnCount - 1))) / columnCount;
    const rowHeight = itemWidth + gap;

    const totalRows = Math.ceil(items.length / columnCount);
    const totalHeight = Math.max(0, totalRows * rowHeight);

    // Buffer rows to render
    const buffer = 4;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

    const visibleItems = useMemo(() => {
        const startIndex = startRow * columnCount;
        const endIndex = endRow * columnCount;
        return items.slice(startIndex, endIndex).map((item, index) => ({
            ...item,
            absoluteIndex: startIndex + index
        }));
    }, [items, startRow, endRow, columnCount]);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar relative outline-none" tabIndex={-1}>
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div
                    className="grid gap-4"
                    style={{
                        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                        position: 'absolute',
                        top: startRow * rowHeight,
                        left: 0,
                        right: 0,
                    }}
                >
                    {visibleItems.map(({ image }) => (
                        <ImageCard
                            key={image.id}
                            img={image}
                            isSelected={selectedId === image.id}
                            isMultiSelected={multiSelection.has(image.id)}
                            onPointerDown={(e) => onCardPointerDown(image.id, e)}
                            onPointerEnter={(e) => onCardPointerEnter(image.id, e)}
                            onRemove={(e) => onRemove(image.id, e)}
                            onDoubleClick={onDoubleClick ? () => onDoubleClick(image.id) : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};