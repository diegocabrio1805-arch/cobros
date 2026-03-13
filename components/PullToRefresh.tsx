import React, { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled = false }) => {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const pullThreshold = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled || refreshing || (containerRef.current && containerRef.current.scrollTop > 0)) return;
        setStartY(e.touches[0].pageY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || refreshing || startY === 0) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY;

        if (diff > 0) {
            // Resistivity
            const distance = Math.min(diff * 0.4, 120);
            setPullDistance(distance);

            // Prevent default only if pulling down from the top
            if (containerRef.current && containerRef.current.scrollTop === 0) {
                if (e.cancelable) e.preventDefault();
            }
        }
    };

    const handleTouchEnd = async () => {
        if (disabled || refreshing) return;

        if (pullDistance > pullThreshold) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
        setStartY(0);
    };

    return (
        <div
            ref={containerRef}
            className="relative h-full overflow-y-auto w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="absolute left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 z-[50]"
                style={{
                    height: pullDistance > 0 ? `${pullDistance}px` : (refreshing ? '50px' : '0px'),
                    opacity: pullDistance > 0 || refreshing ? 1 : 0
                }}
            >
                <div className="bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-slate-100">
                    {refreshing ? (
                        <i className="fa-solid fa-sync fa-spin text-emerald-600 text-sm"></i>
                    ) : (
                        <i
                            className="fa-solid fa-arrow-down text-emerald-600 text-sm transition-transform duration-200"
                            style={{ transform: `rotate(${pullDistance > pullThreshold ? 180 : 0}deg)` }}
                        ></i>
                    )}
                </div>
            </div>

            <div
                className="transition-transform duration-200"
                style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none' }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
