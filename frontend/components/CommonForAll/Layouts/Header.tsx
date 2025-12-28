'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown, LogOut } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

interface HeaderProps {
  logoText?: string;
  navItems?: NavItem[];
  showForgotPassword?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  logoText = 'Smart Learning Management System',
  navItems = [
    { label: 'Home', href: '/' },
    { label: 'Programmes', href: '/programmes', hasDropdown: true },
    { label: 'Support', href: '/support', hasDropdown: true },
    { label: 'Resources', href: '/resources', hasDropdown: true },
    { label: 'Libraries', href: '/libraries', hasDropdown: true },
    { label: 'Email', href: '/email', hasDropdown: true },
  ],
  showForgotPassword = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState(''); // Changed from 'name' to 'userName'
  const [userRole, setUserRole] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const role = localStorage.getItem('userRole');

      if (token) {
        try {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setIsAuthenticated(true);
            setUserName(data.data?.user?.name || 'User');
            setUserRole(role || '');
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Auth verification error:', error);
          setIsAuthenticated(false);
        }
      }
    };

    checkAuth();
  }, []);

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserName('');
    setUserRole('');
    setShowUserDropdown(false);
    router.push('/');
  };

  const getRoleColor = () => {
    if (userRole === 'student') return 'bg-green-500';
    if (userRole === 'lecture') return 'bg-blue-500';
    if (userRole === 'superadmin') return 'bg-purple-500';
    return 'bg-gray-500';
  };

  return (
    <>
      {/* Top accent bar */}
      <div className="h-1 bg-linear-to-r from-brand-yellow via-brand-yellow to-brand-yellow "></div>

      {/* Main header */}
      <header className=" bg-white shadow-sm ">
        <div className="max-w-screen mx-auto px-4 md:px-3 lg:px-16">
          {/* Top section with logo and login */}
          <div className="flex items-center justify-between h-20">
            {/* Logo section */}
            <div className="flex items-center gap-6">
              {/* Logo box */}
              <Link href="/" className="shrink-0">
                <div className="md:border-r-3 md:border-l-3 border-brand-blue   w-72 h-18 flex items-center justify-center ">
                  <img
                    src="/logo1.png"
                    alt="logo"
                    className="w-fit h-17 object-cover "
                  />
                </div>
              </Link>

              {/* Logo text */}
              <h1 className="text-3xl md:text-2xl lg:text-3xl font-bold text-brand-blue hidden sm:block">
                {logoText}
              </h1>
            </div>

            {/* Right section - Login/User info and mobile menu button */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                // User is logged in - Show user info
                <div className="hidden lg:block relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full ${getRoleColor()} flex items-center justify-center text-white font-semibold text-sm`}>
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">{userName}</div>
                      <div className="text-xs text-gray-500 capitalize">{userRole}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User dropdown menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // User is not logged in - Show login section
                <div className="hidden lg:flex flex-col items-end gap-1">
                  <div className="text-xs text-gray-600 font-medium">
                    LOG IN USING YOUR ACCOUNT ON:
                  </div>
                  <Link
                    href={'/login'}
                    className="flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold">
                      <img
                        src="/logo2.png"
                        alt="logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span>LMS Login</span>
                  </Link>
                  {showForgotPassword && (
                    <Link
                      href="/forgot-password"
                      className="text-xs text-brand-yellow hover:text-brand-yellow/80 font-medium mt-1"
                    >
                      Forgotten your password?
                    </Link>
                  )}
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-brand-blue hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation bar */}
          <nav className="hidden lg:flex items-center gap-0 border-t border-gray-200">
            {navItems.map((item) => (
              <div key={item.label} className="relative group">
                <button
                  onClick={() => item.hasDropdown && toggleDropdown(item.label)}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${item.label === 'Home'
                    ? 'bg-brand-yellow text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.hasDropdown && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Dropdown menu for desktop */}
                {item.hasDropdown && (
                  <div className="absolute left-0 mt-0 w-48 bg-white border border-gray-200 rounded-b shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link
                      href={item.href}
                      className="block px-6 py-3 text-sm text-gray-700 hover:bg-gray-100 first:rounded-b-none"
                    >
                      View {item.label}
                    </Link>
                    <div className="border-t border-gray-200"></div>
                    <a
                      href="#"
                      className="block px-6 py-3 text-sm text-gray-700 hover:bg-gray-100 last:rounded-b"
                    >
                      {item.label} Option
                    </a>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <div key={item.label}>
                  <button
                    onClick={() => item.hasDropdown && toggleDropdown(item.label)}
                    className={`w-full text-left px-4 py-2 text-sm font-medium rounded transition-colors ${item.label === 'Home'
                      ? 'bg-brand-yellow text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.hasDropdown && (
                        <svg
                          className={`w-4 h-4 transition-transform ${openDropdown === item.label ? 'rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Mobile dropdown */}
                  {item.hasDropdown && openDropdown === item.label && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-brand-yellow pl-4">
                      <Link
                        href={item.href}
                        className="block text-sm text-gray-600 hover:text-brand-blue py-1"
                      >
                        View {item.label}
                      </Link>
                      <a
                        href="#"
                        className="block text-sm text-gray-600 hover:text-brand-blue py-1"
                      >
                        {item.label} Option
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile login/user section */}
            {isAuthenticated ? (
              <div className="border-t border-gray-200 px-4 py-4 space-y-3">
                <div className="flex items-center gap-3 pb-3">
                  <div className={`w-10 h-10 rounded-full ${getRoleColor()} flex items-center justify-center text-white font-semibold text-sm`}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500 capitalize">{userRole}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-200 px-4 py-4 space-y-3">
                <div className="text-xs text-gray-600 font-medium">
                  LOG IN USING YOUR ACCOUNT ON:
                </div>
                <Link
                  href={'/login'}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-5 h-5 bg-brand-blue rounded flex items-center justify-center text-white text-xs font-bold">
                    <img
                      src="/logo2.png"
                      alt="logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span>LMS Login</span>
                </Link>
                {showForgotPassword && (
                  <Link
                    href="/forgot-password"
                    className="block text-center text-xs text-brand-yellow hover:text-brand-yellow/80 font-medium"
                  >
                    Forgotten your password?
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};

export default Header;