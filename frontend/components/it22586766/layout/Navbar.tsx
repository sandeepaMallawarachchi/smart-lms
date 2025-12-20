'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    FileText,
    GitBranch,
    Brain,
    Shield,
    BookOpen,
    User,
    LogOut
} from 'lucide-react';
import { useAuthStore } from '@/store/it22586766/useAuthStore';
import { Button } from '@/components/it22586766/ui/Button';

export const Navbar: React.FC = () => {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Submissions', href: '/submissions', icon: FileText },
        { name: 'Versions', href: '/versions', icon: GitBranch },
        { name: 'Feedback', href: '/feedback', icon: Brain },
        { name: 'Integrity', href: '/integrity', icon: Shield },
        { name: 'Rubrics', href: '/rubrics', icon: BookOpen },
    ];

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <Brain className="h-8 w-8 text-primary-600" />
                                <span className="ml-2 text-xl font-bold text-gray-900">
                  Smart LMS
                </span>
                            </div>
                        </Link>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            isActive(item.href)
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 mr-2" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <div className="flex items-center space-x-2">
                                    <User className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<LogOut className="h-4 w-4" />}
                                    onClick={logout}
                                >
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <Link href="/login">
                                <Button size="sm">Login</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className="sm:hidden border-t border-gray-200">
                <div className="pt-2 pb-3 space-y-1 px-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                    isActive(item.href)
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="h-5 w-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};