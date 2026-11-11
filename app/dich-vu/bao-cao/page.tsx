'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BaoCaoDichVuPage() {
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [coVan, setCoVan] = useState('');
  const [hangMuc, setHangMuc] = useState('');
  
  const [danhSachCoVan, setDanhSachCoVan] = useState<any[]>([]);
  const [dsHangMuc, setDsHangMuc] = useState<any[]>([]);
  const [duLieuBaoCao, setDuLieuBaoCao] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Tải danh mục Cố vấn (CVDV) và Hạng mục dịch vụ
  async function loadDanhMucLoc() {
    try {
      const { data: nvData } = await supabase
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan, vi_tri')
        .or('bo_phan.eq.CVDV,vi_tri.ilike.%CVDV%,bo_phan.ilike.%Cố vấn%')
        .order('ma_nv', { ascending: true });

      if (nvData && nvData.length > 0) {
        setDanhSachCoVan(nvData);
      } else {
        const { data: allNv } = await supabase
          .from('nhan_vien')
          .select('ma_nv, ho_ten')
          .order('ma_nv', { ascending: true });
        if (allNv) setDanhSachCoVan(allNv);
      }

      const { data: hmData } = await supabase
        .from('cau_hinh_hang_muc')
        .select('*')
        .order('thu_tu', { ascending: true });

      if (hmData && hmData.length > 0) {
        setDsHangMuc(hmData);
      } else {
        setDsHangMuc([
          { ma_hang_muc: 'BDĐK', ten_hang_muc: 'BDĐK' },
          { ma_hang_muc: 'ĐSBH', ten_hang_muc: 'ĐSBH' },
          { ma_hang_muc: 'FSA', ten_hang_muc: 'FSA' },
          { ma_hang_muc: 'KT 20HM', ten_hang_muc: 'KT 20HM' },
          { ma_hang_muc: 'TTPT', ten_hang_muc: 'TTPT' },
          { ma_hang_muc: 'Thay nhớt', ten_hang_muc: 'Thay nhớt' },
          { ma_hang_muc: 'Kiểm tra xe', ten_hang_muc: 'Kiểm tra xe' },
        ]);
      }
    } catch (err) {
      console.error('Lỗi nạp danh mục lọc:', err);
    }
  }

  // 2. Hàm lọc dữ liệu báo cáo
  async function handleLoc(tuNgayVal = tuNgay, denNgayVal = denNgay) {
    const startDate = tuNgayVal || tuNgay;
    const endDate = denNgayVal || denNgay;
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      let query = supabase
        .from('dich_vu_tiep_nhan')
        .select('*')
        .gte('thoi_gian', `${startDate}T00:00:00+07:00`)
        .lte('thoi_gian', `${endDate}T23:59:59+07:00`);

      if (coVan) {
        query = query.or(`co_van_vien.ilike.%${coVan}%,ten_co_van.ilike.%${coVan}%,ma_co_van.ilike.%${coVan}%`);
      }

      if (hangMuc) {
        query = query.or(`hang_muc_thuc_hien.eq.${hangMuc},hang_muc.eq.${hangMuc}`);
      }

      const { data, error } = await query.order('thoi_gian', { ascending: false });
      if (error) throw error;
      setDuLieuBaoCao(data || []);
    } catch (err: any) {
      alert('Lỗi lọc dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. Khởi tạo ngày hiện tại và chạy lọc lần đầu ở Client
  useEffect(() => {
    const homNay = new Date().toISOString().split('T')[0];
    setTuNgay(homNay);
    setDenNgay(homNay);
    loadDanhMucLoc();
    handleLoc(homNay, homNay);
  }, []);

  // 4. Xuất file Excel CSV thông thường
  function handleXuatExcel() {
    if (duLieuBaoCao.length === 0) return alert('Không có dữ liệu để xuất!');
    
    const headers = ['NO', 'Thời Gian', 'Biển Số', 'Khách Hàng', 'Cố Vấn Viên', 'Hạng Mục Thực Hiện', 'Trạng Thái Hẹn', 'Số Điện Thoại', 'Ghi Chú'];
    const rows = duLieuBaoCao.map((r, idx) => {
      const tenCV = r.co_van_vien || r.ten_co_van || '';
      const hm = r.hang_muc_thuc_hien || r.hang_muc || '';
      const tt = r.trang_thai_hen || r.trang_thai || '';
      const sdt = r.so_dien_thoai || '';
      const gc = r.ghi_chu || '';

      return [
        r.no_id || idx + 1,
        new Date(r.thoi_gian).toLocaleString('vi-VN'),
        r.bien_so,
        `"${r.ten_khach_hang || ''}"`,
        `"${tenCV}"`,
        `"${hm}"`,
        `"${tt}"`,
        `\t${sdt}`,
        `"${gc}"`,
      ];
    });

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

  // 5. Xuất Báo Cáo Ngày đúng mẫu Excel đại lý (STT tự tăng + Font lớn)
  function handleXuatBaoCaoNgayMau() {
    if (duLieuBaoCao.length === 0) {
      alert('Không có dữ liệu trong khoảng thời gian đã chọn để xuất báo cáo!');
      return;
    }

    const dParts = tuNgay.split('-');
    const ngayHienThi = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : tuNgay;
    const tongSoXe = duLieuBaoCao.length;

    const tableRows = duLieuBaoCao.map((r, idx) => {
      let tenCoVanRaw = r.co_van_vien || r.ten_co_van || '';
      const parts = tenCoVanRaw.trim().split(' ');
      if (parts.length > 1 && parts[0].toUpperCase().startsWith('FNV')) {
        tenCoVanRaw = parts.slice(1).join(' ');
      }

      const hangMucVal = r.hang_muc_thuc_hien || r.hang_muc || '';
      const trangThaiVal = r.trang_thai_hen || r.trang_thai || '24H';

      return `
        <tr>
          <td style="border: 1px solid #000; text-align: center; mso-number-format:'0';">${idx + 1}</td>
          <td style="border: 1px solid #000; text-align: center; font-weight: bold; mso-number-format:'\\@';">${r.bien_so || ''}</td>
          <td style="border: 1px solid #000; text-align: left;">${r.ten_khach_hang || ''}</td>
          <td style="border: 1px solid #000; text-align: left; color: #dc2626; font-weight: 500;">${tenCoVanRaw}</td>
          <td style="border: 1px solid #000; text-align: center; color: #0284c7; font-weight: 500;">${hangMucVal}</td>
          <td style="border: 1px solid #000; text-align: center;">${trangThaiVal}</td>
        </tr>
      `;
    }).join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>BC_NGAY</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          td, th { font-family: 'Times New Roman', Arial, sans-serif; font-size: 11pt; vertical-align: middle; }
        </style>
      </head>
      <body>
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="height: 35px;">
            <td colspan="3" style="text-align: right; font-weight: 900; font-size: 16pt; font-family: 'Times New Roman', sans-serif;">BÁO CÁO NGÀY:</td>
            <td colspan="3" style="text-align: left; font-weight: 900; font-size: 16pt; color: #dc2626; font-family: 'Times New Roman', sans-serif;">${ngayHienThi}</td>
          </tr>
          <tr style="height: 32px;">
            <td colspan="3" style="text-align: right; font-weight: 900; font-size: 15pt; font-family: 'Times New Roman', sans-serif;">TỔNG SỐ XE THỰC HIỆN TRONG NGÀY:</td>
            <td colspan="3" style="text-align: left; font-weight: 900; font-size: 15pt; color: #dc2626; font-family: 'Times New Roman', sans-serif;">${tongSoXe}</td>
          </tr>
          <tr style="height: 8px;"><td colspan="6"></td></tr>
          
          <tr style="background-color: #FCD5B4; height: 38px;">
            <th style="border: 1px solid #000; width: 50px; text-align: center; font-weight: bold; font-size: 11pt;">STT</th>
            <th style="border: 1px solid #000; width: 130px; text-align: center; font-weight: bold; font-size: 11pt;">BIỂN SỐ</th>
            <th style="border: 1px solid #000; width: 220px; text-align: center; font-weight: bold; font-size: 11pt;">TÊN<br/>KHÁCH HÀNG</th>
            <th style="border: 1px solid #000; width: 180px; text-align: center; font-weight: bold; font-size: 11pt;">TÊN<br/>CỐ VẤN</th>
            <th style="border: 1px solid #000; width: 180px; text-align: center; font-weight: bold; font-size: 11pt;">HẠNG MỤC<br/>THỰC HIỆN</th>
            <th style="border: 1px solid #000; width: 130px; text-align: center; font-weight: bold; font-size: 11pt;">TRẠNG THÁI<br/>HẸN</th>
          </tr>

          ${tableRows}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Ngay_${ngayHienThi.replace(/\//g, '-')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        
        {/* HEADER TOOLBAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📍</span> TRÍCH XUẤT BÁO CÁO DỊCH VỤ
          </h2>
          <span style={{ backgroundColor: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px' }}>
            Kết quả lọc: {duLieuBaoCao.length} xe
          </span>
        </div>

        {/* INPUT BỘ LỌC 4 Ô */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Từ ngày</label>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Đến ngày</label>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Cố vấn viên</label>
            <select
              value={coVan}
              onChange={(e) => setCoVan(e.target.value)}
              style={filterInputStyle}
            >
              <option value="">-- Tất cả cố vấn --</option>
              {danhSachCoVan.map((nv) => (
                <option key={nv.ma_nv} value={nv.ho_ten}>
                  {nv.ma_nv} - {nv.ho_ten}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Hạng mục</label>
            <select
              value={hangMuc}
              onChange={(e) => setHangMuc(e.target.value)}
              style={filterInputStyle}
            >
              <option value="">-- Tất cả hạng mục --</option>
              {dsHangMuc.map((item, idx) => (
                <option key={item.id || item.ma_hang_muc || idx} value={item.ma_hang_muc}>
                  {item.ma_hang_muc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CÁC NÚT THAO TÁC */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleLoc()}
            disabled={loading}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔍</span> {loading ? 'Đang lọc...' : 'Lọc'}
          </button>

          <button
            type="button"
            onClick={handleXuatExcel}
            style={{
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📗</span> Xuất Excel
          </button>

          <button
            type="button"
            onClick={handleXuatBaoCaoNgayMau}
            style={{
              backgroundColor: '#eab308',
              color: '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📑</span> BC Ngày (Mẫu)
          </button>
        </div>

        {/* BẢNG DỮ LIỆU BÁO CÁO */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                <th style={{ padding: '10px 12px' }}>NO.</th>
                <th style={{ padding: '10px 12px' }}>THỜI GIAN</th>
                <th style={{ padding: '10px 12px' }}>BIỂN SỐ</th>
                <th style={{ padding: '10px 12px' }}>KHÁCH HÀNG</th>
                <th style={{ padding: '10px 12px' }}>CỐ VẤN VIÊN</th>
                <th style={{ padding: '10px 12px' }}>HẠNG MỤC THỰC HIỆN</th>
                <th style={{ padding: '10px 12px' }}>TRẠNG THÁI HẸN</th>
                <th style={{ padding: '10px 12px' }}>SỐ ĐIỆN THOẠI</th>
                <th style={{ padding: '10px 12px' }}>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {duLieuBaoCao.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    {loading ? 'Đang trích xuất dữ liệu...' : 'Không có dữ liệu trong khoảng thời gian này.'}
                  </td>
                </tr>
              ) : (
                duLieuBaoCao.map((r, index) => {
                  const coVanHienThi = r.co_van_vien || r.ten_co_van || '---';
                  const hangMucHienThi = r.hang_muc_thuc_hien || r.hang_muc || '---';
                  const trangThaiHienThi = r.trang_thai_hen || r.trang_thai || '24H';

                  return (
                    <tr key={r.no_id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{r.no_id || index + 1}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {r.thoi_gian ? new Date(r.thoi_gian).toLocaleTimeString('vi-VN') + ' ' + new Date(r.thoi_gian).toLocaleDateString('vi-VN') : '---'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#0284c7', fontWeight: 'bold' }}>
                        {r.bien_so}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>
                        {r.ten_khach_hang || '---'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {coVanHienThi}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {hangMucHienThi}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {trangThaiHienThi}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {r.so_dien_thoai || '---'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {r.ghi_chu || ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#334155',
  marginBottom: '5px',
};

const filterInputStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};