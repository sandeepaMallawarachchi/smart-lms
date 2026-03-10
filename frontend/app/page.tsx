'use client';

import HeroSection from '@/components/CommonForAll/Home/Hero';
import Footer from '@/components/CommonForAll/Layouts/Footer';
import Header from '@/components/CommonForAll/Layouts/Header';

export default function Home() {

  return (
    <main>
      <Header
        logoText="Smart Learning Management System"
        showForgotPassword={true}
        navItems={[
          { label: 'Home', href: '/' },
          {
            label: 'Programmes',
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
        ]}
      />

      {/* Page content */}
      <div className="max-w-screen mx-auto px-4 sm:px-6 lg:px-16 py-8">
        <HeroSection />
      </div>

      <Footer
        supportEmail="support@smartlms.lk"
        supportPhone="+94 11 754 4801"
        supportWebsite="https://www.smartlms.lk"
        copyrightOwner="smartlms"
        socialLinks={{
          facebook: "https://facebook.com/...",
          twitter: "https://twitter.com/...",
          instagram: "https://instagram.com/...",
          youtube: "https://youtube.com/...",
          linkedin: "https://linkedin.com/..."
        }}
        onFeedbackClick={() => console.log('Feedback clicked')}
      />
    </main>
  );
}
