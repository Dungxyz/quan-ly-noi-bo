'use client';

import { useEffect, useState } from 'react';
import { getLichSuXe } from '@/services/xeDemoService';

export default function ModalLichSuXe({ isOpen, onClose, xe }) {
  const [lichSu, setLichSu] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Format ngày giờ: DD/MM/YYYY HH:mm:ss
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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
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
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⏱</span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                NHẬT KÝ HOẠT ĐỘNG: {xe.bien_so} ({xe.loai_xe})
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              ODO hiện tại: <strong>{Number(xe.so_km || 0).toLocaleString()} km</strong> • Tổng cộng: {lichSu.length} lượt ghi nhận
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Bảng danh sách log */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
              Đang tải lịch sử xe...
            </div>
          ) : lichSu.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontSize: '13px' }}>
              Chưa có dữ liệu hành trình nào cho xe này.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e3a8a', color: '#fff', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Mã log</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Hành động</th>
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
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: isDangDi ? '#fef3c7' : '#dcfce7',
                              color: isDangDi ? '#b45309' : '#15803d',
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
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
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