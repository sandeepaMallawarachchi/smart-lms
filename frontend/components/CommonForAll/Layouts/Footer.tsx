'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Phone, Globe, ArrowUp } from 'lucide-react';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

interface FooterProps {
  supportEmail?: string;
  supportPhone?: string;
  supportWebsite?: string;
  feedbackButtonText?: string;
  copyrightYear?: number;
  copyrightOwner?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  onFeedbackClick?: () => void;
  onScrollToTop?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  supportEmail = 'support@smartlms.lk',
  supportPhone = '+94 11 754 4801',
  supportWebsite = 'https://www.smartlms.lk',
  feedbackButtonText = 'Provide Feedback to smartlms',
  copyrightYear = 2022,
  copyrightOwner = 'smartlms',
  socialLinks = {
    facebook: '#',
    twitter: '#',
    instagram: '#',
    youtube: '#',
    linkedin: '#',
  },
  onFeedbackClick,
  onScrollToTop,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    if (onScrollToTop) {
      onScrollToTop();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const isToday = (day: number | null) => {
    if (!day) return false;
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <footer className="bg-gray-800 text-gray-200">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-brand-yellow via-brand-yellow to-brand-yellow"></div>

      {/* Main footer content */}
      <div className="max-w-screen mx-auto px-4 md:px-8 lg:px-16 py-12">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-16 ">
          {/* Support Section - Left */}
          <div className="flex-1 ">
            <h3 className="text-gray-400 text-sm font-semibold mb-2">
              DO YOU NEED ANY
            </h3>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              SUPPORT ?
            </h2>

            <div className="space-y-4 mb-6">
              {/* Website link */}
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                <a
                  href={supportWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow hover:text-brand-yellow/80 transition-colors text-sm"
                >
                  {supportWebsite.replace('https://', '').replace('http://', '')}
                </a>
              </div>

              {/* Email link */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-brand-yellow hover:text-brand-yellow/80 transition-colors text-sm"
                >
                  {supportEmail}
                </a>
              </div>

              {/* Phone link */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-brand-yellow flex-shrink-0" />
                <a
                  href={`tel:${supportPhone}`}
                  className="text-brand-yellow hover:text-brand-yellow/80 transition-colors text-sm"
                >
                  {supportPhone}
                </a>
              </div>
            </div>

            {/* Feedback Button */}
            <button
              onClick={onFeedbackClick}
              className="w-full md:w-auto bg-brand-yellow text-white font-semibold py-2 px-6 rounded hover:bg-brand-yellow/90 transition-colors"
            >
              {feedbackButtonText}
            </button>
          </div>

          {/* Calendar Section - Right */}
          <div className="w-full min-w-[20%] lg:w-auto ">
            <h3 className="text-white font-semibold text-lg mb-4">Calendar</h3>
            <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
              {/* Calendar Header */}
              <div className="bg-gray-700 p-4 text-center border-b border-gray-600">
                <h4 className="text-brand-yellow font-semibold text-lg">
                  {monthName} {year}
                </h4>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 bg-gray-700 px-4 py-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-300 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0 px-4 py-3">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`text-center text-sm py-2 ${
                      day === null
                        ? ''
                        : isToday(day)
                        ? 'bg-brand-yellow text-gray-800 font-semibold rounded'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll to Top Button - Right */}
          <div className="hidden lg:flex items-start">
            {showScrollTop && (
              <button
                onClick={handleScrollToTop}
                className="bg-brand-yellow hover:bg-brand-yellow/90 text-gray-800 rounded-full p-4 shadow-lg transition-all duration-300 animate-bounce"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section with copyright and social links */}
      <div className="border-t border-gray-700">
        <div className="max-w-screen mx-auto px-4 md:px-8 lg:px-16 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Copyright and Links */}
            <div className="flex flex-col md:flex-row items-center gap-6 text-sm">
              <p className="text-gray-400">
                Copyright {copyrightYear} © {copyrightOwner}. All Rights Reserved.
              </p>

              <div className="space-y-2 md:flex items-center gap-6">
                <a
                  href={supportWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow hover:text-brand-yellow/80 transition-colors flex items-center gap-1"
                >
                  <Globe className="w-4 h-4" />
                  {supportWebsite.replace('https://', '').replace('http://', '')}
                </a>

                <a
                  href={`mailto:${supportEmail}`}
                  className="text-brand-yellow hover:text-brand-yellow/80 transition-colors flex items-center gap-1"
                >
                  <Mail className="w-4 h-4" />
                  {supportEmail}
                </a>

                <a
                  href={`tel:${supportPhone}`}
                  className="text-brand-yellow hover:text-brand-yellow/80 transition-colors flex items-center gap-1"
                >
                  <Phone className="w-4 h-4" />
                  {supportPhone}
                </a>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-4">
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full p-2 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full p-2 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full p-2 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full p-2 transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full p-2 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;