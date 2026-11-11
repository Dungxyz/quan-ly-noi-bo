'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, kiemTraQuyen, dangXuat } = useAuth();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const menuItems = [
    {
      title: 'Hồ Sơ Của Tôi',
      icon: '🪪',
      path: '/ho-so',
      moduleKey: 'HO_SO',
      moTa: 'Tài khoản hệ thống & thông tin',
      isPublic: true, // Mục chung dành cho mọi nhân sự có tài khoản
    },
    {
      title: 'Quản lý Nhân sự',
      icon: '👤',
      path: '/',
      moduleKey: 'NHAN_SU',
      moTa: 'Hồ sơ, tài khoản & khai báo',
    },
    {
      title: 'Phân Quyền Tài Khoản',
      icon: '🔐',
      path: '/phan-quyen',
      moduleKey: 'NHAN_SU',
      moTa: 'Cấp quyền chi tiết theo chức năng',
    },
    {
      title: 'Xe Demo & Lái thử',
      icon: '🚗',
      path: '/xe-demo',
      moduleKey: 'XE_DEMO',
      moTa: 'Lịch demo, xuất xe & bàn giao',
    },
    {
      title: 'Quản lý Đặt hoa',
      icon: '🌸',
      path: '/dat-hoa',
      moduleKey: 'DAT_HOA',
      moTa: 'Hoa bàn giao xe & duyệt chi',
    },
  ];

  function handleXacNhanDangXuat() {
    setShowConfirmLogout(false);
    dangXuat();
  }

  // Thêm cụm menu Dịch vụ vào danh sách Menu của Sidebar:
{
  title: 'Dịch Vụ Đại Lý',
  icon: '🔧',
  children: [
    {
      name: 'Tiếp nhận xe',
      path: '/dich-vu/tiep-nhan',
      icon: '🚗',
      desc: 'Nhập lượt xe vào & nhật ký xưởng',
      quyenKey: 'TN_VIEW',
    },
    {
      name: 'Khách hàng hẹn',
      path: '/dich-vu/khach-hang',
      icon: '📅',
      desc: 'Lịch hẹn & danh bạ xe vào xưởng',
      quyenKey: 'HEN_VIEW',
    },
    {
      name: 'Báo cáo dịch vụ',
      path: '/dich-vu/bao-cao',
      icon: '📊',
      desc: 'Trích xuất dữ liệu & xuất Excel',
      quyenKey: 'TN_VIEW',
    },
  ];
}

  return (
    <>
      <aside
        style={{
          width: '270px',
          backgroundColor: '#0f172a',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          borderRight: '1px solid #1e293b',
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
              }}
            >
              BPF
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>
                BÌNH PHƯỚC FORD
              </h2>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Internal Management System</span>
            </div>
          </div>
        </div>

        {/* Thông tin tài khoản đăng nhập */}
        <div style={{ padding: '16px 20px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
            Tài khoản đăng nhập
          </div>
          {currentUser ? (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#e2e8f0' }}>{currentUser.ho_ten}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#38bdf8' }}>{currentUser.ma_nv}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    backgroundColor:
                      currentUser.phan_quyen === 'LOCKED'
                        ? '#dc2626'
                        : currentUser.phan_quyen === 'ADMIN'
                        ? '#16a34a'
                        : '#0284c7',
                    color: '#fff',
                  }}
                >
                  {currentUser.phan_quyen}
                </span>
              </div>

              {/* Nút bấm mở xác nhận Đăng xuất */}
              <button
                type="button"
                onClick={() => setShowConfirmLogout(true)}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '7px 10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s',
                }}
              >
                <span>🚪</span>
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Đang nạp tài khoản...</div>
          )}
        </div>

        {/* Danh mục menu */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', padding: '0 8px 6px 8px' }}>
            Phân hệ chức năng
          </div>

          {menuItems.map((item) => {
            const duocPhep = item.isPublic || (typeof kiemTraQuyen === 'function' ? kiemTraQuyen(item.moduleKey) : false);
            const dangChon = pathname === item.path;

            if (!duocPhep) {
              return (
                <div
                  key={item.path}
                  title="Tài khoản không đủ quyền truy cập"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    color: '#475569',
                    cursor: 'not-allowed',
                    opacity: 0.5,
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>🔒 Bị khóa quyền</div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  color: dangChon ? '#fff' : '#cbd5e1',
                  backgroundColor: dangChon ? '#0284c7' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: dangChon ? 'bold' : '500' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: dangChon ? '#e0f2fe' : '#64748b' }}>{item.moTa}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
          Next.js + Supabase RBAC
        </div>
      </aside>

      {/* POPUP XÁC NHẬN ĐĂNG XUẤT */}
      {showConfirmLogout && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚪</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#0f172a', fontWeight: 'bold' }}>
              Xác nhận đăng xuất?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn rời khỏi phiên làm việc của nhân sự{' '}
              <strong style={{ color: '#0284c7' }}>{currentUser?.ho_ten}</strong> (
              {currentUser?.ma_nv}) không?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmLogout(false)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleXacNhanDangXuat}
                style={{
                  padding: '9px 20px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Đồng ý đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}