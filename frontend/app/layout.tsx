import type { Metadata } from "next";
import { Inter_Tight, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Smart Learning Management System",
  description: "SMART LMS - Streamlined Management and Automated Resources for Teaching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={[
          interTight.variable,
          poppins.variable,
          "antialiased",
        ].join(" ")}
      >
        <Toaster
                richColors
                position="top-right"
                closeButton
                duration={3000}
                toastOptions={{
                  classNames: {
                    toast:
                      "rounded-lg shadow-lg border border-gray-200 mt-18 font-medium text-sm",
                  },
                }}
              />
        {children}
      </body>
    </html>
  );
}
