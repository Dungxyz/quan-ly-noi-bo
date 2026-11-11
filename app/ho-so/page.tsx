'use client';

import { useAuth } from '@/context/AuthContext';

export default function HoSoCaNhanPage() {
  const { currentUser } = useAuth();

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

  return (
    <div style={{ padding: '28px 20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* BANNER THÔNG TIN ĐẦU TRANG */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 'bold',
              border: '2px solid #bae6fd'
            }}>
              {tenVietTat}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
                {currentUser.ho_ten}
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                  {currentUser.ma_nv}
                </span>
                {currentUser.vi_tri && (
                  <span style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    {currentUser.vi_tri}
                  </span>
                )}
                {currentUser.bo_phan && (
                  <span style={{ backgroundColor: '#475569', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                    {currentUser.bo_phan}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Trạng thái tài khoản</div>
            <span style={{
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              🛡️ Đang hoạt động
            </span>
          </div>
        </div>

        {/* NỘI DUNG 2 CỘT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0369a1', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              👤 THÔNG TIN CÁ NHÂN
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0284c7' }}>{currentUser.email_noi_bo || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>Email cá nhân:</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{currentUser.email_ca_nhan || '-'}</div>
              </div>
            </div>
          </div>

          {/* CỘT 2: TÀI KHOẢN HỆ THỐNG ĐƯỢC CẤP */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#047857', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              🔑 TÀI KHOẢN HỆ THỐNG ĐƯỢC CẤP
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
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
                  <div style={{
                    fontSize: '13px',
                    fontWeight: tk.value ? 'bold' : 'normal',
                    color: tk.value ? '#0284c7' : '#94a3b8',
                    fontStyle: tk.value ? 'normal' : 'italic',
                    wordBreak: 'break-all'
                  }}>
                    {tk.value || 'Chưa cấp'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}