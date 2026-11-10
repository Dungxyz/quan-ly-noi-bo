'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', color: '#1e293b' }}>
        <AuthProvider>
          {isLoginPage ? (
            <main style={{ minHeight: '100vh', width: '100vw' }}>{children}</main>
          ) : (
            <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
              <Sidebar />
              <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                {children}
              </main>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}