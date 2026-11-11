'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function KhachHangHenPage() {
  const [danhSach, setDanhSach] = useState<any[]>([]);
  const [tuKhoa, setTuKhoa] = useState('');

  async function loadData() {
    const { data } = await supabase
      .from('dich_vu_khach_hang')
      .select('*')
      .order('id', { ascending: false });
    if (data) setDanhSach(data);
  }

  useEffect(() => {
    loadData();
  }, []);

  const ketQuaLoc = danhSach.filter((kh) => {
    const q = tuKhoa.toLowerCase();
    return (
      kh.bien_so?.toLowerCase().includes(q) ||
      kh.ten_khach_hang?.toLowerCase().includes(q) ||
      kh.so_dien_thoai?.includes(q)
    );
  });

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', margin: '20px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span> DANH SÁCH KHÁCH HÀNG HẸN
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="🔍 Tìm biển số, tên, SĐT..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', width: '220px' }}
          />
          <button style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
            ➕ Thêm hẹn mới
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>BIỂN SỐ</th>
            <th style={{ padding: '10px' }}>KHÁCH HÀNG</th>
            <th style={{ padding: '10px' }}>HẠNG MỤC DỰ KIẾN</th>
            <th style={{ padding: '10px' }}>TRẠNG THÁI</th>
            <th style={{ padding: '10px' }}>SỐ ĐIỆN THOẠI</th>
            <th style={{ padding: '10px' }}>CỐ VẤN</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>HÀNH ĐỘNG</th>
          </tr>
        </thead>
        <tbody>
          {ketQuaLoc.map((kh) => (
            <tr key={kh.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px', color: '#0284c7', fontWeight: 'bold' }}>{kh.bien_so}</td>
              <td style={{ padding: '10px', fontWeight: '600' }}>{kh.ten_khach_hang}</td>
              <td style={{ padding: '10px' }}>{kh.hang_muc_du_kien || '---'}</td>
              <td style={{ padding: '10px' }}>
                <span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  {kh.trang_thai || '24H'}
                </span>
              </td>
              <td style={{ padding: '10px', color: '#475569' }}>{kh.so_dien_thoai}</td>
              <td style={{ padding: '10px' }}>{kh.co_van || '---'}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button style={{ border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0284c7', borderRadius: '4px', padding: '4px 6px', marginRight: '6px', cursor: 'pointer' }}>✏️</button>
                <button style={{ border: '1px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer' }}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}