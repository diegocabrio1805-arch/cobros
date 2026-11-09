import React, { useState, useRef } from 'react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
}

const isEditingOrInteractive = (target: EventTarget | null): boolean => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return true;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, button')) return true;
    return false;
};

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled = false }) => {
    const startY = useRef(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const pullThreshold = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled || refreshing || isEditingOrInteractive(e.target)) {
            startY.current = 0;
            return;
        }
        if (containerRef.current && containerRef.current.scrollTop > 0) {
            startY.current = 0;
            return;
        }
        startY.current = e.touches[0].pageY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || refreshing || startY.current === 0 || isEditingOrInteractive(e.target)) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        // Zona muerta de 35px para no re-renderizar al tocar inputs o hacer scroll normal
        if (diff > 35 && (!containerRef.current || containerRef.current.scrollTop === 0)) {
            const distance = Math.min((diff - 35) * 0.4, 120);
            setPullDistance(distance);
            if (e.cancelable) e.preventDefault();
        } else if (diff < 0 && pullDistance > 0) {
            setPullDistance(0);
        }
    };

    const handleTouchEnd = async () => {
        if (disabled || refreshing || startY.current === 0) return;
        startY.current = 0;

        if (pullDistance > pullThreshold) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
                setPullDistance(0);
            }
        } else if (pullDistance > 0) {
            setPullDistance(0);
        }
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
