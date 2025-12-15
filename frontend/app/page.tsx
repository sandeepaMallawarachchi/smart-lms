'use client';

import Footer from '@/components/CommonForAll/Layouts/Footer';
import Header from '@/components/CommonForAll/Layouts/Header';

export default function Home() {
  const handleLogin = () => {
    console.log('Login clicked');
    // Handle login logic here
  };

  return (
    <main>
      <Header
        logoText="Smart Learning Management System"
        onLoginClick={handleLogin}
        showForgotPassword={true}
        navItems={[
          { label: 'Home', href: '/' },
          { label: 'Programmes', href: '/programmes', hasDropdown: true },
          { label: 'Support', href: '/support', hasDropdown: true },
          { label: 'Resources', href: '/resources', hasDropdown: true },
          { label: 'Libraries', href: '/libraries', hasDropdown: true },
          { label: 'Email', href: '/email', hasDropdown: true },
        ]}
      />

      {/* Page content */}
      <div className="max-w-screen mx-auto px-4 sm:px-6 lg:px-24 py-12">
        <h2 className="text-2xl font-bold text-brand-blue mb-4">Welcome</h2>
        <p className="text-gray-600">
          This is your main content area. The header component is fully customizable and responsive.
        </p>
      </div>

      <Footer
        supportEmail="support@sliit.lk"
        supportPhone="+94 11 754 4801"
        supportWebsite="https://www.sliit.lk"
        copyrightOwner="SLIIT"
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