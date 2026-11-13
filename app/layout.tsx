'use client';

import './globals.css';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Tự động đóng menu di động khi chuyển sang trang khác
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', color: '#1e293b' }}>
        <AuthProvider>
          {isLoginPage ? (
            <main style={{ minHeight: '100vh', width: '100vw' }}>{children}</main>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                minHeight: '100vh',
                width: '100%',
              }}
            >
              {/* Thanh Header dành riêng cho Mobile */}
              {isMobile && (
                <header
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #1e293b',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>☰</span>
                    <span>Menu</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#0284c7',
                        padding: '3px 7px',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    >
                      BPF
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.3px' }}>
                      BÌNH PHƯỚC FORD
                    </span>
                  </div>
                </header>
              )}

              {/* Sidebar (Desktop cố định / Mobile dạng Drawer trượt) */}
              <Sidebar
                isMobile={isMobile}
                mobileOpen={mobileMenuOpen}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />

              {/* Khung nội dung chính */}
              <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, width: '100%' }}>
                {children}
              </main>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}