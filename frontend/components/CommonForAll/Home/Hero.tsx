'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroFeature {
    icon: React.ReactNode;
    label: string;
    route?: string;
}

interface Slide {
    headline: string;
    profileImage: string;
    backgroundImage: string;
}

const HeroSection: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const router = useRouter();

    // ===== EMBEDDED DATA - EDIT HERE =====
    const slides: Slide[] = [
        {
            headline: 'THE FUTURE AWAITS YOU!',
            profileImage: '/commonforall/hero/logo1.png',
            backgroundImage: '/commonforall/hero/1.webp',
        },
        {
            headline: 'TRANSFORM YOUR SKILLS TODAY!',
            profileImage: '/commonforall/hero/logo2.png',
            backgroundImage: '/commonforall/hero/2.webp',
        },
        {
            headline: 'REACH YOUR GOALS FASTER!',
            profileImage: '/commonforall/hero/logo1.png',
            backgroundImage: '/commonforall/hero/3.webp',
        },
        {
            headline: 'EMBRACE THE CHANGE!',
            profileImage: '/commonforall/hero/logo2.png',
            backgroundImage: '/commonforall/hero/4.webp',
        },
        {
            headline: 'GROW WITH US!',
            profileImage: '/commonforall/hero/logo1.png',
            backgroundImage: '/commonforall/hero/5.webp',
        },
        {
            headline: 'SUCCESS AWAITS!',
            profileImage: '/commonforall/hero/logo2.png',
            backgroundImage: '/commonforall/hero/6.webp',
        },
    ];

    const features: HeroFeature[] = [
        {
            icon: (
                <Image src="/commonforall/hero/1.svg" alt="Code Engine" width={48} height={48} />
            ),
            label: 'Code Engine',
            route: '/code-engine',
        },
        {
            icon: (
                <Image src="/commonforall/hero/2.svg" alt="Submission & Feedback" width={48} height={48} />
            ),
            label: 'Submission & Feedback',
            route: '/submissions',
        },
        {
            icon: (
                <Image src="/commonforall/hero/3.svg" alt="Projects & Tasks" width={48} height={48} />
            ),
            label: 'Projects & Tasks',
            route: '/projects-and-tasks',
        },
        {
            icon: (
                <Image src="/commonforall/hero/4.svg" alt="Learning Progress & Insights" width={48} height={48} />
            ),
            label: 'Learning Progress & Insights',
            route: '/learning-analytics',
        },
    ];
    // ===== END EMBEDDED DATA =====

    const currentSlideData = slides[currentSlide];

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('authToken');
            const role = localStorage.getItem('userRole');

            if (token) {
                try {
                    // Verify token with backend
                    const response = await fetch('/api/auth/verify', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    if (response.ok) {
                        setIsAuthenticated(true);
                        setUserRole(role);

                        const data = await response.json();
                        setIsVerified(data.data?.user?.isVerified || false);
                    } else {
                        // Token invalid, clear storage
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userRole');
                        setIsAuthenticated(false);
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Auth verification error:', error);
                    setIsAuthenticated(false);
                    setUserRole(null);
                }
            } else {
                setIsAuthenticated(false);
                setUserRole(null);
            }

            setIsCheckingAuth(false);
        };

        checkAuth();
    }, []);

    useEffect(() => {
        // Animate on mount
        if (containerRef.current) {
            containerRef.current.classList.add('animate-in');
        }
    }, []);

    useEffect(() => {
        // Auto-slide every 5 seconds
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length]);

    const handlePrev = () => {
        setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    };

    const handleFeatureClick = (route?: string) => {
        if (!route) return;

        // Check if user is authenticated
        if (!isAuthenticated) {
            // Redirect to login
            router.push('/login');
            return;
        }

        if (!isVerified) {
            // Redirect to login
            router.push('/login');
            return;
        }

        // Special handling for Projects & Tasks - role-based routing
        if (route === '/projects-and-tasks') {
            if (userRole === 'student') {
                router.push('/projects-and-tasks/student');
            } else if (userRole === 'lecture') {
                router.push('/projects-and-tasks/lecturer');
            } else {
                // Fallback
                router.push(route);
            }
            return;
        } else if (route === '/learning-analytics') {
            if (userRole === 'student') {
                router.push('/learning-analytics/student');
            } else if (userRole === 'lecture') {
                router.push('/learning-analytics/lecturer');
            } else {
                // Fallback
                router.push(route);
            }
            return;
        }

        // Navigate to the feature route for other features
        router.push(route);
    };

    return (
        <>
            <div
                ref={containerRef}
                className="relative bg-linear-to-br from-teal-600 via-transparent to-blue-500 overflow-hidden"
            >
                {/* Background Image Overlay */}
                {currentSlideData.backgroundImage && (
                    <div className="absolute inset-0">
                        <Image
                            src={currentSlideData.backgroundImage}
                            alt="Background"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}

                <div className="relative z-10 h-full flex flex-col">

                    {/* Main Content */}
                    <div className="flex-1 flex items-center justify-between px-4 md:px-12 lg:px-16 pt-12 pb-20 animate-fade-in-left">
                        {/* Left Content */}
                        <div className="w-full md:w-1/2 pr-0 md:pr-12">
                            <div className="max-w-lg">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-8 font-poppins drop-shadow-lg">
                                    {/* {currentSlideData.headline} */}
                                </h1>

                                {/* Decorative accent */}
                                <div className="h-1 w-24 bg-white rounded-full mb-8 opacity-80"></div>

                                <p className="text-white/80 text-base md:text-lg font-light leading-relaxed max-w-md">
                                    {/* Explore unlimited opportunities and unlock your potential with our comprehensive suite of resources. */}
                                </p>
                            </div>
                        </div>

                        {/* Right Content - Profile Image */}
                        {currentSlideData.profileImage && (
                            <div className="hidden md:flex md:w-1/3 items-center justify-center relative animate-fade-in-right">
                                <div className="relative w-80 h-88 md:h-56">

                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Arrows */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-8 pointer-events-auto z-20">
                        <button
                            onClick={handlePrev}
                            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-brand-yellow shadow-2xl backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:text-brand-blue"
                            aria-label="Previous"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-brand-yellow shadow-2xl  backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:text-brand-blue"
                            aria-label="Next"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Features Grid - Bottom */}
                    <div className="hidden md:block relative bg-white/95 backdrop-blur-md w-[90%] mb-4 mx-auto ">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 px-4 md:px-12 lg:px-16 py-12 mx-auto">
                            {features.map((feature, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleFeatureClick(feature.route)}
                                    disabled={!feature.route || isCheckingAuth}
                                    className="flex flex-col items-center justify-center text-center group cursor-pointer transition-all duration-300 hover:-translate-y-2 disabled:cursor-default disabled:opacity-50"
                                    style={{
                                        animation: `fadeInUp 0.6s ease-out forwards`,
                                        animationDelay: `${0.4 + index * 0.1}s`,
                                    }}
                                >
                                    <div className="group mb-4 text-brand-yellow group-hover:text-brand-blue transition-colors">
                                        {feature.icon}
                                    </div>
                                    <p className="font-medium text-xs md:text-sm text-brand-blue group-hover:text-brand-yellow font-sans tracking-wide">
                                        {feature.label}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Decorative gradient orb */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

            </div>
            {/* Features Grid - Mobile */}
            <div className="md:hidden relative  bg-black/10 backdrop-blur-md mb-4 mx-auto mt-2">
                <div className="grid grid-cols-4 md:grid-cols-5 gap-6 md:gap-8 px-4 md:px-12 lg:px-16 py-4">
                    {features.map((feature, index) => (
                        <button
                            key={index}
                            onClick={() => handleFeatureClick(feature.route)}
                            disabled={!feature.route || isCheckingAuth}
                            className="flex flex-col items-center justify-center text-center group cursor-pointer transition-all duration-300 hover:-translate-y-2 disabled:cursor-default disabled:opacity-50"
                            style={{
                                animation: `fadeInUp 0.6s ease-out forwards`,
                                animationDelay: `${0.4 + index * 0.1}s`,
                            }}
                        >
                            <div className="group mb-4 text-brand-yellow group-hover:text-brand-blue transition-colors">
                                {feature.icon}
                            </div>
                            <p className="font-medium text-xs md:text-sm text-brand-blue group-hover:text-brand-yellow font-sans tracking-wide">
                                {feature.label}
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default HeroSection;