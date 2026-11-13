'use client';

import { useEffect, useState } from 'react';

export default function BangNhanSu({
  danhSach,
  loading,
  tuKhoa,
  setTuKhoa,
  onReload,
  onEdit,
  onToggleKhoa,
  onDelete,
  onNotifyZalo,
  onDoiMatKhau,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ padding: isMobile ? '0 12px 20px 12px' : '0 24px 24px 24px' }}>
      {/* Tiêu đề & Thanh tìm kiếm */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: '14px',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 'bold', color: '#334155' }}>
              📋 DANH SÁCH NHÂN VIÊN
            </span>
            <span
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '3px 10px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {danhSach.length} nhân viên
            </span>
          </div>

          <button
            type="button"
            onClick={onReload}
            title="Tải lại danh sách"
            style={{
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#475569',
            }}
          >
            🔄
          </button>
        </div>

        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <input
            type="text"
            placeholder="🔍 Tìm Mã, Tên, SĐT, Bộ phận..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            style={{
              padding: isMobile ? '9px 12px' : '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: isMobile ? '15px' : '13px',
              width: isMobile ? '100%' : '280px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Hiển thị dữ liệu */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách...</div>
      ) : danhSach.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          Không tìm thấy dữ liệu phù hợp
        </div>
      ) : isMobile ? (
        /* GIAO DIỆN THẺ (CARD) DỌC TRÊN ĐIỆN THOẠI */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {danhSach.map((nv) => {
            const isLocked = nv.phan_quyen === 'LOCKED';
            return (
              <div
                key={nv.ma_nv}
                style={{
                  border: '1px solid #e2e8f0',
                  borderLeft: isLocked ? '4px solid #ef4444' : '4px solid #0284c7',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: isLocked ? '#fffbfb' : '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {/* Hàng 1: Họ tên + Mã NV */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                    {nv.ho_ten}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span
                      style={{
                        color: isLocked ? '#dc2626' : '#0284c7',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        textDecoration: isLocked ? 'line-through' : 'none',
                      }}
                    >
                      {nv.ma_nv}
                    </span>
                    {isLocked && (
                      <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                        LOCKED
                      </span>
                    )}
                  </div>
                </div>

                {/* Hàng 2: Bộ phận + Vị trí */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 9px',
                      borderRadius: '10px',
                    }}
                  >
                    {nv.bo_phan || 'N/A'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    {nv.vi_tri || '—'}
                  </span>
                </div>

                {/* Hàng 3: Số điện thoại */}
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
                  📞 SĐT / MK: <strong>{nv.so_dien_thoai || '—'}</strong>
                </div>

                {/* Hàng 4: Các nút thao tác */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(nv)}
                    style={{ ...btnMobileStyle, borderColor: '#38bdf8', color: '#0284c7', backgroundColor: '#f0f9ff' }}
                  >
                    ✏️ Sửa
                  </button>

                  {typeof onDoiMatKhau === 'function' && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => onDoiMatKhau(nv)}
                      style={{
                        ...btnMobileStyle,
                        borderColor: '#fed7aa',
                        color: '#c2410c',
                        backgroundColor: '#fff7ed',
                        opacity: isLocked ? 0.5 : 1,
                      }}
                    >
                      🔑 Mật khẩu
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNotifyZalo(nv)}
                    style={{ ...btnMobileStyle, borderColor: '#4ade80', color: '#15803d', backgroundColor: '#f0fdf4' }}
                  >
                    ✈️ Zalo
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleKhoa(nv.ma_nv, nv.phan_quyen)}
                    style={{ ...btnMobileStyle, borderColor: '#facc15', color: '#a16207', backgroundColor: '#fefce8' }}
                  >
                    {isLocked ? '🔓 Mở' : '🔒 Khóa'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(nv.ma_nv, nv.ho_ten)}
                    style={{ ...btnMobileStyle, borderColor: '#f87171', color: '#dc2626', backgroundColor: '#fef2f2' }}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GIAO DIỆN BẢNG ĐẦY ĐỦ TRÊN MÁY TÍNH */
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                <th style={{ padding: '10px 14px' }}>MÃ NV</th>
                <th style={{ padding: '10px 14px' }}>HỌ TÊN</th>
                <th style={{ padding: '10px 14px' }}>SĐT (MẬT KHẨU)</th>
                <th style={{ padding: '10px 14px' }}>BỘ PHẬN</th>
                <th style={{ padding: '10px 14px' }}>VỊ TRÍ</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {danhSach.map((nv) => {
                const isLocked = nv.phan_quyen === 'LOCKED';
                return (
                  <tr
                    key={nv.ma_nv}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isLocked ? '#fffbfb' : '#fff',
                    }}
                  >
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          color: isLocked ? '#dc2626' : '#0284c7',
                          fontWeight: 'bold',
                          textDecoration: isLocked ? 'line-through' : 'none',
                          marginRight: '6px',
                        }}
                      >
                        {nv.ma_nv}
                      </span>
                      {isLocked && (
                        <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                          LOCKED
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b' }}>
                      {nv.ho_ten}
                    </td>

                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {nv.so_dien_thoai}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          display: 'inline-block',
                        }}
                      >
                        {nv.bo_phan || 'N/A'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {nv.vi_tri || '—'}
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => onEdit(nv)}
                          title="Sửa thông tin"
                          style={{ ...btnThaoTacStyle, borderColor: '#38bdf8', color: '#0284c7' }}
                        >
                          ✏️
                        </button>

                        {typeof onDoiMatKhau === 'function' && (
                          <button
                            type="button"
                            disabled={nv.phan_quyen === 'LOCKED'}
                            onClick={() => onDoiMatKhau(nv)}
                            title={nv.phan_quyen === 'LOCKED' ? 'Tài khoản đang khóa' : 'Đổi mật khẩu'}
                            style={{
                              padding: '4px 6px',
                              border: '1px solid #fed7aa',
                              backgroundColor: '#fff7ed',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            🔑
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onNotifyZalo(nv)}
                          title="Gửi bot thông báo"
                          style={{ ...btnThaoTacStyle, borderColor: '#4ade80', color: '#16a34a' }}
                        >
                          ✈️
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleKhoa(nv.ma_nv, nv.phan_quyen)}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          style={{ ...btnThaoTacStyle, borderColor: '#facc15', color: '#ca8a04' }}
                        >
                          {isLocked ? '🔓' : '🔒'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(nv.ma_nv, nv.ho_ten)}
                          title="Xóa nhân viên"
                          style={{ ...btnThaoTacStyle, borderColor: '#f87171', color: '#dc2626' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const btnThaoTacStyle = {
  width: '30px',
  height: '28px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

const btnMobileStyle = {
  padding: '6px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
};