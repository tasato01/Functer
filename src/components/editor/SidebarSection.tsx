import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
    title,
    children,
    defaultOpen = true,
    icon,
    rightElement
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-t border-white/10 first:border-t-0">
            <div
                className="flex items-center justify-between p-4 gap-4 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <div className="flex items-center gap-2">
                        {icon}
                        <span>{title}</span>
                    </div>
                </div>
                {rightElement && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        {rightElement}
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="px-4 pb-4 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
};
