'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { dangNhap } = useAuth();
  const [taiKhoan, setTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [thongBaoLoi, setThongBaoLoi] = useState('');
  const [thanhCong, setThanhCong] = useState<any>(null);

  // Hàm xác định trang đích và chuyển hướng
  function dieuHuongTheoQuyen(user: any) {
    window.location.href = '/ho-so';
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setThongBaoLoi('');
    setDangXuLy(true);

    try {
      const user = await dangNhap(taiKhoan, matKhau);
      setThanhCong(user);

      // Chờ 1.2 giây để người dùng thấy thông báo chào mừng trước khi chuyển trang
      setTimeout(() => {
        dieuHuongTheoQuyen(user);
      }, 1200);
    } catch (err: any) {
      setThongBaoLoi(err.message || 'Đăng nhập không thành công');
      setDangXuLy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Segoe UI, sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header Form */}
        <div
          style={{
            backgroundColor: '#0284c7',
            padding: '30px 24px',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '22px',
              margin: '0 auto 12px auto',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          >
            BPF
          </div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            BÌNH PHƯỚC FORD
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
            Hệ thống Quản trị Nội bộ & Điều hành Showroom
          </p>
        </div>

        {/* Trạng thái chào mừng đăng nhập thành công */}
        {thanhCong ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎉</div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d', margin: '0 0 6px 0' }}>
              Xin chào, {thanhCong?.ho_ten || 'Bạn'}!
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0' }}>
              Chào mừng bạn đã quay trở lại hệ thống điều hành Bình Phước Ford.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0284c7',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              <span>🔄</span>
              <span>Đang mở giao diện phù hợp...</span>
            </div>
          </div>
        ) : (
          /* Form nhập liệu bình thường */
          <form onSubmit={handleFormSubmit} style={{ padding: '28px 24px' }}>
            {thongBaoLoi && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{thongBaoLoi}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                MÃ NHÂN VIÊN HOẶC SỐ ĐIỆN THOẠI
              </label>
              <input
                type="text"
                required
                placeholder="VD: FNV-113 hoặc 0988..."
                value={taiKhoan}
                onChange={(e) => setTaiKhoan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  MẬT KHẨU
                </label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Mặc định: 123456</span>
              </div>
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu..."
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={dangXuLy}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: dangXuLy ? 'not-allowed' : 'pointer',
              }}
            >
              {dangXuLy ? 'Đang xác thực...' : 'ĐĂNG NHẬP HỆ THỐNG'}
            </button>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
              Quên mật khẩu hoặc cần cấp quyền? Vui lòng liên hệ Admin / HCNS
            </div>
          </form>
        )}
      </div>
    </div>
  );
}