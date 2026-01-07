'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Phone, Globe, ArrowUp, CheckCircle2 } from 'lucide-react';
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

  const features = [
    'AI-enhanced feedback loops',
    'Auto-evaluated coding practice',
    'Kanban project management',
    'Plagiarism detection',
    'Academic risk analytics with heat map',
    'Team collaboration tools'
  ];

  return (
    <footer className="bg-brand-blue text-gray-200">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-brand-yellow via-brand-yellow to-brand-yellow"></div>

      {/* Main footer content */}
      <div className="max-w-screen mx-auto px-4 md:px-8 lg:px-16 py-12">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-16">
          {/* About Section - Left */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-8">
              <p className="text-brand-yellow text-xs font-semibold uppercase tracking-widest mb-3">
                About Smart LMS
              </p>
              <h2 className="text-2xl md:text-[26px] font-bold text-white leading-tight">
                Smart LMS integrating project management, coding practice, assignments, and predictive 
learning analytics.
              </h2>
            </div>

            {/* Problem & Solution */}
            <div className="mb-8 mt-10">
              <h4 className="text-brand-yellow font-semibold text-lg   uppercase tracking-wide">The Challenge</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-5">
                Current platforms like Moodle and Google Classroom lack interactive feedback, live coding environments, and predictive analytics—essential for first and second-year students developing foundational skills.
              </p>
              
              <h4 className="text-brand-yellow font-semibold text-lg  uppercase tracking-wide">Our Solution</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Smart LMS integrates project management, coding practice, assignments, and predictive learning analytics in one comprehensive platform.
              </p>
            </div>

            {/* Key Features Grid */}
            <div className="mb-8">
              <h4 className="text-brand-yellow font-semibold text-lg mb-4 uppercase tracking-wide">What We Offer</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-yellow flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

           
          </div>

          {/* Calendar Section - Right */}
           {/* Calendar Section - Right */}
          <div className="w-full min-w-[30%] lg:w-auto flex flex-col justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Calendar</h3>
              <div className="bg-blue-900 rounded-lg overflow-hidden shadow-lg">
                {/* Calendar Header */}
                <div className="bg-blue-950 p-4 text-center border-b border-yellow-600">
                  <h4 className="text-brand-yellow font-semibold text-lg">
                    {monthName} {year}
                  </h4>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-blue-950 px-4 py-2">
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
                      className={`text-center text-sm py-2 ${day === null
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

            {/* CTA Button */}
            <button
              onClick={onFeedbackClick}
              className="w-full sm:w-auto mt-8 bg-brand-yellow text-brand-blue font-semibold py-3 px-8 rounded-lg hover:bg-white transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            >
              {feedbackButtonText}
            </button>
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
                  className="bg-brand-yellow text-brand-blue hover:bg-white rounded-full p-2 transition-all duration-300 hover:scale-110"
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
                  className="bg-brand-yellow text-brand-blue hover:bg-white rounded-full p-2 transition-all duration-300 hover:scale-110"
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
                  className="bg-brand-yellow text-brand-blue hover:bg-white rounded-full p-2 transition-all duration-300 hover:scale-110"
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
                  className="bg-brand-yellow text-brand-blue hover:bg-white rounded-full p-2 transition-all duration-300 hover:scale-110"
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
                  className="bg-brand-yellow text-brand-blue hover:bg-white rounded-full p-2 transition-all duration-300 hover:scale-110"
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