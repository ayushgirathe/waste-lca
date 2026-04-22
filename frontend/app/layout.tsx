'use client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/register';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>WasteLCA AI - Smart Recycling Platform</title>
        <meta name="description" content="AI-powered waste recycling recommendation system" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-300 dark:via-dark-200 dark:to-dark-300 min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          {/* Only show navbar on non-auth pages */}
          {!isAuthPage && <Navbar />}
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </ThemeProvider>
      </body>
    </html>
  );
}