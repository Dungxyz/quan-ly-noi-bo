'use client';

import { useEffect, useState } from 'react';
import { getLichSuXe } from '@/services/xeDemoService';

export default function ModalLichSuXe({ isOpen, onClose, xe }) {
  const [isMobile, setIsMobile] = useState(false);
  const [lichSu, setLichSu] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchLichSu() {
      if (!xe?.bien_so) return;
      setLoading(true);
      try {
        const data = await getLichSuXe(xe.bien_so);
        setLichSu(data);
      } catch (err) {
        console.error('Lỗi tải lịch sử xe:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && xe) {
      fetchLichSu();
    }
  }, [isOpen, xe]);

  if (!isOpen || !xe) return null;

  function formatNgayGio(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? '10px' : '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: isMobile ? '12px 14px' : '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '8px',
            backgroundColor: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>⏱</span>
              <h3 style={{ margin: 0, fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.35 }}>
                NHẬT KÝ HOẠT ĐỘNG: {xe.bien_so} ({xe.loai_xe})
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              ODO hiện tại: <strong>{Number(xe.so_km || 0).toLocaleString()} km</strong> • Tổng cộng: {lichSu.length} lượt
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Nội dung danh sách log */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
              Đang tải lịch sử xe...
            </div>
          ) : lichSu.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontSize: '13px' }}>
              Chưa có dữ liệu hành trình nào cho xe này.
            </div>
          ) : isMobile ? (
            /* HIỂN THỊ DẠNG THẺ (CARD) TRÊN ĐIỆN THOẠI */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lichSu.map((item, index) => {
                const isDangDi = item.loai_hanh_dong === 'Đang đi công tác' || item.loai_hanh_dong === 'Đang đi';
                return (
                  <div
                    key={item.ma_log || index}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderLeft: isDangDi ? '4px solid #f59e0b' : '4px solid #16a34a',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: isDangDi ? '#fffdf7' : '#fff',
                    }}
                  >
                    {/* Hàng 1: Nhãn hành động + Số KM */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: isDangDi ? '#fef3c7' : '#dcfce7',
                          color: isDangDi ? '#b45309' : '#15803d',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isDangDi ? '⚙ Đang đi công tác' : '🚘 Sẵn xe'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                        {Number(item.so_km || 0).toLocaleString()} km
                      </span>
                    </div>

                    {/* Hàng 2: Thời gian & Mã log */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                      <span>🕒 {formatNgayGio(item.thoi_gian)}</span>
                      <span style={{ fontFamily: 'monospace' }}>#{item.ma_log}</span>
                    </div>

                    {/* Hàng 3: Người đi & Khu vực */}
                    {(item.nguoi_di || item.khu_vuc) && (
                      <div style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px' }}>
                        👤 <strong>{item.nguoi_di || '—'}</strong>
                        {item.khu_vuc ? ` • 📍 ${item.khu_vuc}` : ''}
                      </div>
                    )}

                    {/* Hàng 4: Ghi chú */}
                    {item.ghi_chu && (
                      <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px' }}>
                        📝 {item.ghi_chu}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* HIỂN THỊ DẠNG BẢNG ĐẦY ĐỦ TRÊN MÁY TÍNH */
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e3a8a', color: '#fff', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Mã log</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>Hành động</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số KM</th>
                    <th style={{ padding: '10px 12px' }}>Người đi</th>
                    <th style={{ padding: '10px 12px' }}>Khu vực</th>
                    <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {lichSu.map((item, index) => {
                    const isDangDi = item.loai_hanh_dong === 'Đang đi công tác' || item.loai_hanh_dong === 'Đang đi';
                    return (
                      <tr
                        key={item.ma_log || index}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isDangDi ? '#fffdf7' : '#fff',
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b', fontSize: '11px' }}>
                          {item.ma_log}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155', whiteSpace: 'nowrap' }}>
                          {formatNgayGio(item.thoi_gian)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: isDangDi ? '#fef3c7' : '#dcfce7',
                              color: isDangDi ? '#b45309' : '#15803d',
                              display: 'inline-block',
                            }}
                          >
                            {isDangDi ? 'Đang đi công tác' : 'Sẵn xe'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                          {Number(item.so_km || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: isDangDi ? 'bold' : 'normal', color: isDangDi ? '#c2410c' : '#475569' }}>
                          {item.nguoi_di || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {item.khu_vuc || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: item.ghi_chu ? '#dc2626' : '#94a3b8' }}>
                          {item.ghi_chu || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', backgroundColor: '#f8fafc', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: isMobile ? '100%' : 'auto',
              padding: isMobile ? '10px 18px' : '8px 18px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}