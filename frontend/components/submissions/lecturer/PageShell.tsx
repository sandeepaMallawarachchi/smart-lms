'use client';

import React from 'react';
import { RefreshCw, type LucideIcon } from 'lucide-react';

/* ─── Skeleton ─────────────────────────────────────────────── */
export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

/* ─── Page Header ──────────────────────────────────────────── */
export function PageHeader({
    title,
    subtitle,
    icon: Icon,
    iconColor = 'text-blue-600',
    loading,
    onRefresh,
    actions,
}: {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    iconColor?: string;
    loading?: boolean;
    onRefresh?: () => void;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {Icon && <Icon className={iconColor} size={28} />}
                    {title}
                </h1>
                <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
                {actions}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Error Banner ─────────────────────────────────────────── */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between gap-3">
            <span>{message}</span>
            {onRetry && (
                <button onClick={onRetry} className="shrink-0 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                    Retry
                </button>
            )}
        </div>
    );
}

/* ─── Stat Card ────────────────────────────────────────────── */
export function StatCard({
    label,
    value,
    gradient,
    bgClass,
    textClass,
    onClick,
    active,
}: {
    label: string;
    value: string | number;
    gradient?: string;
    bgClass?: string;
    textClass?: string;
    onClick?: () => void;
    active?: boolean;
}) {
    const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-all' : '';
    const ring = active ? 'ring-2 ring-blue-500 ring-offset-1' : '';

    if (gradient) {
        return (
            <div onClick={onClick} className={`${gradient} p-4 rounded-xl text-white shadow ${interactive} ${ring}`}>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs mt-1 opacity-80">{label}</div>
            </div>
        );
    }
    return (
        <div onClick={onClick} className={`${bgClass ?? 'bg-white border-gray-200'} p-4 rounded-xl border ${interactive} ${ring}`}>
            <div className={`text-2xl font-bold ${textClass ?? 'text-gray-900'}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}

/* ─── Filter Toolbar ───────────────────────────────────────── */
export function FilterToolbar({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-3 flex-wrap items-center">{children}</div>
        </div>
    );
}

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search…',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="flex-1 relative min-w-[200px]">
            <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
        </div>
    );
}

/* ─── Empty State ──────────────────────────────────────────── */
export function EmptyState({
    icon: Icon,
    message,
    onClear,
}: {
    icon: LucideIcon;
    message: string;
    onClear?: () => void;
}) {
    return (
        <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">{message}</p>
            {onClear && (
                <button onClick={onClear} className="mt-3 px-4 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    Clear filters
                </button>
            )}
        </div>
    );
}

/* ─── Section Card (white card with title) ─────────────────── */
export function SectionCard({
    title,
    icon: Icon,
    iconColor = 'text-blue-600',
    action,
    children,
}: {
    title: string;
    icon?: LucideIcon;
    iconColor?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    {Icon && <Icon className={iconColor} size={18} />}
                    {title}
                </h2>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

/* ─── Helpers ──────────────────────────────────────────────── */
export function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
