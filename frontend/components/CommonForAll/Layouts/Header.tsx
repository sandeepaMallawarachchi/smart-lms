'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

interface HeaderProps {
  logoText?: string;
  navItems?: NavItem[];
  onLoginClick?: () => void;
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
  onLoginClick,
  showForgotPassword = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  return (
    <>
      {/* Top accent bar */}
      <div className="h-1 bg-linear-to-r from-brand-yellow via-brand-yellow to-brand-yellow rounded-t-4xl"></div>

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

            {/* Right section - Login and mobile menu button */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end gap-1">
                <div className="text-xs text-gray-600 font-medium">
                  LOG IN USING YOUR ACCOUNT ON:
                </div>
                <button
                  onClick={onLoginClick}
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
                </button>
                {showForgotPassword && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-brand-yellow hover:text-brand-yellow/80 font-medium mt-1"
                  >
                    Forgotten your password?
                  </Link>
                )}
              </div>

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
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    item.label === 'Home'
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
                    className={`w-full text-left px-4 py-2 text-sm font-medium rounded transition-colors ${
                      item.label === 'Home'
                        ? 'bg-brand-yellow text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.hasDropdown && (
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            openDropdown === item.label ? 'rotate-180' : ''
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

            {/* Mobile login section */}
            <div className="border-t border-gray-200 px-4 py-4 space-y-3">
              <div className="text-xs text-gray-600 font-medium">
                LOG IN USING YOUR ACCOUNT ON:
              </div>
              <button
                onClick={onLoginClick}
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
              </button>
              {showForgotPassword && (
                <Link
                  href="/forgot-password"
                  className="block text-center text-xs text-brand-yellow hover:text-brand-yellow/80 font-medium"
                >
                  Forgotten your password?
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;