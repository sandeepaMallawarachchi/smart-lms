import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import React from "react";

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
    title: 'Smart LMS - Intelligent Learning Management System',
    description: 'AI-powered LMS with version control and plagiarism detection',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>
            {children}
            <Toaster position="top-right" />
        </Providers>
        </body>
        </html>
    );
}