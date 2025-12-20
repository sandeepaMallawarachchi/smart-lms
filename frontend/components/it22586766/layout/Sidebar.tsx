'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/it22586766/utils';

interface SidebarItem {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
}

interface SidebarProps {
    items: SidebarItem[];
    title?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, title }) => {
    const pathname = usePathname();

    const isActive = (href: string) => pathname === href;

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-full">
            {title && (
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                </div>
            )}
            <nav className="p-4 space-y-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                                isActive(item.href)
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            <div className="flex items-center">
                                <Icon className="h-5 w-5 mr-3" />
                                {item.name}
                            </div>
                            {item.badge && (
                                <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};