'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function HoSoCaNhanPage() {
  const { currentUser, doiMatKhauCaNhan } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // State cho form đổi mật khẩu
  const [matKhauCu, setMatKhauCu] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; noiDung: string } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDoiMatKhau = async (e: React.FormEvent) => {
    e.preventDefault();
    setThongBao(null);

    if (matKhauMoi !== xacNhanMatKhau) {
      setThongBao({ loai: 'loi', noiDung: 'Xác nhận mật khẩu mới không trùng khớp!' });
      return;
    }

    try {
      setDangLuu(true);
      await doiMatKhauCaNhan(matKhauCu, matKhauMoi);
      setThongBao({
        loai: 'ok',
        noiDung: 'Đổi mật khẩu thành công! Các thiết bị khác (nếu có) đã được tự động đăng xuất.',
      });
      setMatKhauCu('');
      setMatKhauMoi('');
      setXacNhanMatKhau('');
    } catch (err: any) {
      setThongBao({ loai: 'loi', noiDung: err.message || 'Có lỗi xảy ra khi đổi mật khẩu!' });
    } finally {
      setDangLuu(false);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        Đang nạp hồ sơ người dùng...
      </div>
    );
  }

  const dsTaiKhoan = [
    { label: 'Cyber (Phần mềm DMS)', icon: '🖥️', value: currentUser.cyber },
    { label: 'AppSheet', icon: '📱', value: currentUser.appsheet },
    { label: 'SPS ID', icon: '🌐', value: currentUser.sps_id },
    { label: 'Stars ID', icon: '⭐', value: currentUser.stars_id },
    { label: 'Synology Drive', icon: '💾', value: currentUser.synology },
    { label: 'VPN Ford', icon: '🛡️', value: currentUser.vpn },
    { label: 'LMS Đào tạo', icon: '🎓', value: currentUser.lms },
    { label: 'Servis2', icon: '🔧', value: currentUser.servis2 },
    { label: 'DSG / Wingspan', icon: '✈️', value: currentUser.wingspan || currentUser.dsg },
    { label: 'ID Zalo Bot', icon: '💬', value: currentUser.id_doan_chat_bot },
  ];

  const tenVietTat = currentUser.ho_ten
    ? currentUser.ho_ten.trim().split(' ').slice(-2).map((x: string) => x[0]).join('').toUpperCase()
    : 'NV';

  const isLocked = currentUser.phan_quyen === 'LOCKED';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div
      style={{
        padding: isMobile ? '16px 12px' : '28px 20px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* BANNER THÔNG TIN ĐẦU TRANG */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: isMobile ? '18px 16px' : '24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Khối Avatar + Họ tên + Huy hiệu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '20px', minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? '56px' : '64px',
                height: isMobile ? '56px' : '64px',
                borderRadius: '50%',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '22px',
                fontWeight: 'bold',
                border: '2px solid #bae6fd',
                flexShrink: 0,
              }}
            >
              {tenVietTat}
            </div>

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: isMobile ? '19px' : '22px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  margin: '0 0 8px 0',
                  lineHeight: 1.25,
                }}
              >
                {currentUser.ho_ten}
              </h1>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUser.ma_nv}
                </span>
                {currentUser.vi_tri && (
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentUser.vi_tri}
                  </span>
                )}
                {currentUser.bo_phan && (
                  <span
                    style={{
                      backgroundColor: '#475569',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentUser.bo_phan}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Khối Trạng thái tài khoản */}
          <div
            style={
              isMobile
                ? {
                    width: '100%',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }
                : {
                    textAlign: 'right',
                    flexShrink: 0,
                  }
            }
          >
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: isMobile ? 0 : '6px', whiteSpace: 'nowrap' }}>
              Trạng thái tài khoản
            </div>
            <span
              style={{
                backgroundColor: isLocked ? '#fee2e2' : '#dcfce7',
                color: isLocked ? '#dc2626' : '#15803d',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              {isLocked ? '🔴 Đã khóa' : '🛡️ Đang hoạt động'}
            </span>
          </div>
        </div>

        {/* NỘI DUNG 2 CỘT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '16px' }}>
          
          {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: isMobile ? '18px 16px' : '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 'bold',
                color: '#0369a1',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '12px',
              }}
            >
              👤 THÔNG TIN CÁ NHÂN
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Họ và Tên:</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{currentUser.ho_ten || '-'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Mã nhân viên:</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7' }}>{currentUser.ma_nv || '-'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Số điện thoại:</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{currentUser.so_dien_thoai || '-'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Ngày sinh:</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{currentUser.ngay_sinh || '-'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Giới tính:</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{currentUser.gioi_tinh || 'Nam'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Phòng ban:</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{currentUser.phong || currentUser.bo_phan || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Email nội bộ:</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0284c7', wordBreak: 'break-all' }}>{currentUser.email_noi_bo || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Email cá nhân:</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', wordBreak: 'break-all' }}>{currentUser.email_ca_nhan || '-'}</div>
              </div>
            </div>
          </div>

          {/* CỘT 2: TÀI KHOẢN HỆ THỐNG ĐƯỢC CẤP */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: isMobile ? '18px 16px' : '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 'bold',
                color: '#047857',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '12px',
              }}
            >
              🔑 TÀI KHOẢN HỆ THỐNG ĐƯỢC CẤP
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: '12px' }}>
              {dsTaiKhoan.map((tk, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: tk.value ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{tk.icon}</span>
                    <span>{tk.label}</span>
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: tk.value ? 'bold' : 'normal',
                      color: tk.value ? '#0284c7' : '#94a3b8',
                      fontStyle: tk.value ? 'normal' : 'italic',
                      wordBreak: 'break-all',
                    }}
                  >
                    {tk.value || 'Chưa cấp'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* KHỐI 3: ĐỔI MẬT KHẨU ĐĂNG NHẬP */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: isMobile ? '18px 16px' : '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 'bold',
                color: '#b45309',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🔒 ĐỔI MẬT KHẨU ĐĂNG NHẬP HỆ THỐNG
            </h2>

            <label
              style={{
                fontSize: '12px',
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={hienMatKhau}
                onChange={(e) => setHienMatKhau(e.target.checked)}
              />
              Hiện mật khẩu
            </label>
          </div>

          {thongBao && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: thongBao.loai === 'ok' ? '#dcfce7' : '#fee2e2',
                color: thongBao.loai === 'ok' ? '#15803d' : '#dc2626',
                border: `1px solid ${thongBao.loai === 'ok' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {thongBao.loai === 'ok' ? '✅ ' : '⚠️ '}
              {thongBao.noiDung}
            </div>
          )}

          <form onSubmit={handleDoiMatKhau}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '14px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Mật khẩu hiện tại *
                </label>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  required
                  value={matKhauCu}
                  onChange={(e) => setMatKhauCu(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Mật khẩu mới (tối thiểu 6 ký tự) *
                </label>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={matKhauMoi}
                  onChange={(e) => setMatKhauMoi(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Xác nhận mật khẩu mới *
                </label>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={xacNhanMatKhau}
                  onChange={(e) => setXacNhanMatKhau(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                ℹ️ Trường hợp quên mật khẩu hiện tại, vui lòng liên hệ <strong style={{ color: '#0f172a' }}>Bộ phận IT</strong> để được cấp lại.
              </span>

              <button
                type="submit"
                disabled={dangLuu}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: dangLuu ? 'not-allowed' : 'pointer',
                  opacity: dangLuu ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {dangLuu ? 'Đang lưu...' : '💾 Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}