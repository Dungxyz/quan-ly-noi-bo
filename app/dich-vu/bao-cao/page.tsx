'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BaoCaoDichVuPage() {
  const [tuNgay, setTuNgay] = useState('2026-11-11');
  const [denNgay, setDenNgay] = useState('2026-11-11');
  const [coVan, setCoVan] = useState('');
  const [hangMuc, setHangMuc] = useState('');
  const [duLieuBaoCao, setDuLieuBaoCao] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleLoc() {
    setLoading(true);
    let query = supabase
      .from('dich_vu_tiep_nhan')
      .select('*')
      .gte('thoi_gian', `${tuNgay}T00:00:00`)
      .lte('thoi_gian', `${denNgay}T23:59:59`);

    if (coVan) query = query.ilike('ten_co_van', `%${coVan}%`);
    if (hangMuc) query = query.eq('hang_muc', hangMuc);

    const { data } = await query.order('thoi_gian', { ascending: false });
    setDuLieuBaoCao(data || []);
    setLoading(false);
  }

  function handleXuatExcel() {
    if (duLieuBaoCao.length === 0) return alert('Không có dữ liệu để xuất!');
    // Chuyển sang CSV hỗ trợ tiếng Việt
    const headers = ['NO', 'Thời Gian', 'Biển Số', 'Khách Hàng', 'Cố Vấn', 'Hạng Mục', 'Trạng Thái', 'SĐT', 'Ghi Chú'];
    const rows = duLieuBaoCao.map((r) => [
      r.no_id,
      new Date(r.thoi_gian).toLocaleString('vi-VN'),
      r.bien_so,
      `"${r.ten_khach_hang}"`,
      `"${r.ten_co_van}"`,
      r.hang_muc,
      r.trang_thai_hen,
      r.so_dien_thoai,
      `"${r.ghi_chu || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Dich_Vu_${tuNgay}_den_${denNgay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
        {/* HEADER TOOLBAR LỌC */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚲</span> TRÍCH XUẤT BÁO CÁO DỊCH VỤ
          </h2>
          <span style={{ backgroundColor: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px' }}>
            Kết quả lọc: {duLieuBaoCao.length} xe
          </span>
        </div>

        {/* INPUT BỘ LỌC */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Từ ngày</label>
            <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} style={filterInputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Đến ngày</label>
            <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} style={filterInputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Cố vấn viên</label>
            <input type="text" placeholder="-- Tất cả cố vấn --" value={coVan} onChange={(e) => setCoVan(e.target.value)} style={filterInputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Hạng mục</label>
            <select value={hangMuc} onChange={(e) => setHangMuc(e.target.value)} style={filterInputStyle}>
              <option value="">-- Tất cả hạng mục --</option>
              <option value="BDĐK">BDĐK</option>
              <option value="ĐSBH">ĐSBH</option>
              <option value="FSA">FSA</option>
              <option value="KT 20HM">KT 20HM</option>
            </select>
          </div>
        </div>

        {/* CÁC NÚT THAO TÁC */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={handleLoc} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔍 Lọc
          </button>
          <button onClick={handleXuatExcel} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📗 Xuất Excel
          </button>
          <button style={{ backgroundColor: '#eab308', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📊 BC Ngày (Mẫu)
          </button>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>NO.</th>
              <th style={{ padding: '10px' }}>THỜI GIAN</th>
              <th style={{ padding: '10px' }}>BIỂN SỐ</th>
              <th style={{ padding: '10px' }}>KHÁCH HÀNG</th>
              <th style={{ padding: '10px' }}>CỐ VẤN VIÊN</th>
              <th style={{ padding: '10px' }}>HẠNG MỤC THỰC HIỆN</th>
              <th style={{ padding: '10px' }}>TRẠNG THÁI HẸN</th>
              <th style={{ padding: '10px' }}>SỐ ĐIỆN THOẠI</th>
              <th style={{ padding: '10px' }}>GHI CHÚ</th>
            </tr>
          </thead>
          <tbody>
            {duLieuBaoCao.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  {loading ? 'Đang trích xuất...' : 'Chưa có dữ liệu phù hợp.'}
                </td>
              </tr>
            ) : (
              duLieuBaoCao.map((r) => (
                <tr key={r.no_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{r.no_id}</td>
                  <td style={{ padding: '10px' }}>{new Date(r.thoi_gian).toLocaleString('vi-VN')}</td>
                  <td style={{ padding: '10px', color: '#0284c7', fontWeight: 'bold' }}>{r.bien_so}</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{r.ten_khach_hang}</td>
                  <td style={{ padding: '10px' }}>{r.ten_co_van}</td>
                  <td style={{ padding: '10px' }}>{r.hang_muc}</td>
                  <td style={{ padding: '10px' }}>{r.trang_thai_hen}</td>
                  <td style={{ padding: '10px' }}>{r.so_dien_thoai}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{r.ghi_chu}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const filterInputStyle = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  marginTop: '4px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};