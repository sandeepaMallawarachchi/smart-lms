'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Home,
    FolderKanban,
    Code2,
    FileText,
    LineChart,
    X,
    Menu,
    Settings,
    ExpandIcon
} from 'lucide-react';

interface Position {
    x: number;
    y: number;
}

const FloatingNavMenu = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
    const [alwaysExpanded, setAlwaysExpanded] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const userRole = localStorage.getItem('userRole');

    // Navigation items
    const navItems = [
        {
            icon: Home,
            label: 'Home',
            path: '/',
            color: 'from-blue-500 to-blue-600',
            shortcut: '1'
        },
        {
            icon: FolderKanban,
            label: 'Projects & Tasks',
            path: `/projects-and-tasks/${userRole === 'student' ? 'student' : 'lecturer'}`,
            color: 'from-amber-500 to-amber-600',
            shortcut: '2'
        },
        {
            icon: Code2,
            label: 'Code Engine',
            path: `/code-engine/${userRole === 'student' ? 'student' : 'lecturer'}`,
            color: 'from-green-500 to-green-600',
            shortcut: '3'
        },
        {
            icon: FileText,
            label: 'Submissions',
            path: `/submissions/${userRole === 'student' ? 'student' : 'lecturer'}`,
            color: 'from-purple-500 to-purple-600',
            shortcut: '4'
        },
        {
            icon: LineChart,
            label: 'Learning Analytics',
            path: `/learning-analytics/${userRole === 'student' ? 'student' : 'lecturer'}`,
            color: 'from-blue-500 to-cyan-600',
            shortcut: '5'
        }
    ];

    const isModulePage = navItems.some(item => pathname.startsWith(item.path));

    // Load saved position and preferences on mount
    useEffect(() => {
        const savedPos = localStorage.getItem('floatingMenuPos');
        const savedExpanded = localStorage.getItem('floatingMenuAlwaysExpanded');

        if (savedPos) {
            try {
                setPosition(JSON.parse(savedPos));
            } catch (e) {
                console.error('Failed to parse saved position');
            }
        }

        if (savedExpanded === 'true') {
            setAlwaysExpanded(true);
            setIsExpanded(true);
        }
    }, []);

    // Save position when it changes
    useEffect(() => {
        if (!isDragging) {
            localStorage.setItem('floatingMenuPos', JSON.stringify(position));
        }
    }, [position, isDragging]);

    // Save always expanded preference
    useEffect(() => {
        localStorage.setItem('floatingMenuAlwaysExpanded', alwaysExpanded.toString());
        if (alwaysExpanded) {
            setIsExpanded(true);
        }
    }, [alwaysExpanded]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ctrl + number for quick navigation
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                const shortcut = e.key;
                const item = navItems.find(i => i.shortcut === shortcut);
                if (item) {
                    e.preventDefault();
                    router.push(item.path);
                }
            }

            // Ctrl + M to toggle menu
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                setIsExpanded(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [router, navItems]);

    // Handle mouse down for dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.menu-toggle')) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    // Handle dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragOffset.x));
                const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Handle navigation
    const handleNavigate = (path: string) => {
        router.push(path);
        if (!alwaysExpanded) {
            setIsExpanded(false);
        }
    };

    // Reset position to default
    const resetPosition = () => {
        setPosition({ x: 20, y: 100 });
        setShowSettings(false);
    };

    if (!isModulePage) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Main Toggle Button */}
            <div className="relative">
                <button
                    onClick={() => !alwaysExpanded && setIsExpanded(!isExpanded)}
                    className="menu-toggle cursor-pointer w-14 h-14 rounded-full bg-linear-to-br from-blue-500 to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white group relative"
                >
                    {isExpanded ? (
                        <X className="w-6 h-6 transition-transform group-hover:rotate-90" />
                    ) : (
                        <Menu className="w-6 h-6 transition-transform group-hover:scale-110" />
                    )}

                    {/* Badge showing shortcut hint */}
                    <div className="absolute -top-1 right-0 bg-white text-blue-600 text-[10px] font-bold p-1 rounded-full shadow-sm">
                        <ExpandIcon size={10} />
                    </div>
                </button>

                {/* Expanded Menu */}
                {isExpanded && (
                    <div className="absolute left-16 top-0 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-left duration-200">
                        {/* Settings Header */}
                        <div className="px-3 py-2 bg-linear-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600">Quick Nav</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSettings(!showSettings);
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <Settings className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Settings Panel */}
                        {showSettings && (
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={alwaysExpanded}
                                        onChange={(e) => setAlwaysExpanded(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Keep expanded</span>
                                </label>
                                <button
                                    onClick={resetPosition}
                                    className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
                                >
                                    Reset Position
                                </button>
                            </div>
                        )}

                        {/* Navigation Items */}
                        <div className="p-2 space-y-1 min-w-72">
                            {navItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = pathname.startsWith(item.path);

                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => handleNavigate(item.path)}
                                        className={`w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-linear-to-r ' + item.color + ' text-white shadow-md'
                                            : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        style={{
                                            animationDelay: `${index * 50}ms`
                                        }}
                                    >
                                        <div className={`p-2 rounded-lg ${isActive
                                            ? 'bg-white/20'
                                            : 'bg-gray-100 group-hover:bg-gray-200'
                                            } transition-colors`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <span className="font-medium text-sm block">{item.label}</span>
                                            <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                                                Ctrl + {item.shortcut}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer Info */}
                        <div className="px-4 py-2 bg-linear-to-r from-gray-50 to-white border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 text-center">
                                Drag button to move • Ctrl+M to toggle
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Drag Indicator */}
            {!isExpanded && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-50">
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                </div>
            )}
        </div>
    );
};

export default FloatingNavMenu;