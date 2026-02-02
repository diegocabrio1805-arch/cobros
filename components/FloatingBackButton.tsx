
import React from 'react';
import { Capacitor } from '@capacitor/core';

interface FloatingBackButtonProps {
    onClick: () => void;
    visible: boolean;
}

const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({ onClick, visible }) => {
    if (!visible || !Capacitor.isNativePlatform()) return null;

    return (
        <button
            onClick={onClick}
            className="fixed top-4 left-4 z-[200] w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-2xl flex items-center justify-center active:scale-95 transition-all animate-fadeIn"
            style={{ boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)' }}
        >
            <i className="fa-solid fa-chevron-left text-xl drop-shadow-md"></i>
        </button>
    );
};

export default FloatingBackButton;
