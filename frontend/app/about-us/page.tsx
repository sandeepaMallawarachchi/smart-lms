'use client';

import Header from '@/components/CommonForAll/Layouts/Header';
import Footer from '@/components/CommonForAll/Layouts/Footer';
import { CheckCircle2, Lightbulb, Target, Users } from 'lucide-react';

const mainNavItems = [
  { label: 'Home', href: '/' },
  {
    label: 'Main Components',
    href: '/code-engine/ide',
    hasDropdown: true,
    dropdownItems: [
      { label: 'Code Engine', href: '/code-engine/ide' },
      { label: 'Submission & Feedback', href: '/submissions' },
      { label: 'Projects & Tasks', href: '/projects-and-tasks' },
      { label: 'Learning Progress & Insights', href: '/learning-analytics' },
    ],
  },
  { label: 'About Us', href: '/about-us' },
  { label: 'Support', href: '/support' },
];

const pillars = [
  {
    title: 'Unified Learning Flow',
    description:
      'Smart LMS brings coding practice, submissions, projects, and analytics into one connected experience.',
    icon: <Lightbulb className="h-6 w-6 text-brand-yellow" />,
  },
  {
    title: 'Student-Centered Progress',
    description:
      'We focus on helping learners build confidence early with clearer feedback loops and actionable progress signals.',
    icon: <Target className="h-6 w-6 text-brand-yellow" />,
  },
  {
    title: 'Support for Teaching Teams',
    description:
      'Lecturers get better visibility into engagement, workload, at-risk students, and task progression.',
    icon: <Users className="h-6 w-6 text-brand-yellow" />,
  },
];

const highlights = [
  'Project and task tracking with guided progress updates',
  'Submission workflows with feedback and revision history',
  'Code practice spaces for skill-building',
  'Learning analytics that surface patterns early',
  'A cleaner experience for both students and lecturers',
];

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header
        logoText="Smart Learning Management System"
        navItems={mainNavItems}
      />

      <section className="bg-linear-to-br from-brand-blue via-brand-blue to-cyan-700 text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-16 py-20">
          <p className="text-brand-yellow text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            About Smart LMS
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-4xl leading-tight">
            A learning platform designed to connect teaching, practice, feedback, and insight.
          </h1>
          <p className="mt-6 max-w-3xl text-white/80 text-lg leading-relaxed">
            Smart LMS is built to support the day-to-day academic workflow with tools that feel connected,
            practical, and easier to act on for both students and lecturers.
          </p>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-16 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-start">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow mb-3">
              Our Story
            </p>
            <h2 className="text-3xl font-bold text-brand-blue mb-5">
              Built around the real gaps students and lecturers face
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Many learning platforms handle content delivery, but leave practical learning workflows scattered
                across separate tools. Smart LMS aims to reduce that fragmentation.
              </p>
              <p>
                The platform combines coursework management, coding-focused practice, submission handling, and
                learning analytics so users can move through their academic work in one place.
              </p>
              <p>
                The result is a simpler experience: students can focus on progress, and lecturers can spend less
                time chasing context across disconnected systems.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue mb-3">
              Platform Highlights
            </p>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand-yellow mt-0.5 shrink-0" />
                  <p className="text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-16 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow mb-3">
              What Matters
            </p>
            <h2 className="text-3xl font-bold text-brand-blue mb-4">
              Core ideas behind the platform
            </h2>
            <p className="text-gray-600 leading-relaxed">
              The design direction stays simple: reduce friction, improve visibility, and make progress easier to understand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center mb-4">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-semibold text-brand-blue mb-3">{pillar.title}</h3>
                <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-16 py-16">
        <div className="rounded-3xl bg-linear-to-r from-brand-yellow to-amber-300 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue mb-3">
            Looking Ahead
          </p>
          <h2 className="text-3xl font-bold text-brand-blue mb-4">
            Smart LMS will continue growing around real academic needs
          </h2>
          <p className="max-w-3xl text-brand-blue/90 leading-relaxed">
            This page is intentionally simple for now, but it establishes the structure and visual direction for a
            fuller About Us section later without drifting away from the existing Smart LMS theme.
          </p>
        </div>
      </section>

      <Footer
        supportEmail="support@smartlms.lk"
        supportPhone="+94 11 754 4801"
        supportWebsite="https://www.smartlms.lk"
        copyrightOwner="smartlms"
        socialLinks={{
          facebook: 'https://facebook.com/...',
          twitter: 'https://twitter.com/...',
          instagram: 'https://instagram.com/...',
          youtube: 'https://youtube.com/...',
          linkedin: 'https://linkedin.com/...',
        }}
        onFeedbackClick={() => console.log('Feedback clicked')}
      />
    </main>
  );
}
