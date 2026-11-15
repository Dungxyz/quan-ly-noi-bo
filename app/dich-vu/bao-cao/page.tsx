'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function BaoCaoDichVuPage() {
  const { currentUser, kiemTraQuyen } = useAuth();
  const [screenWidth, setScreenWidth] = useState(1200);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTinyMobile = screenWidth < 420;
  const isMobile = screenWidth < 768;

  // Kiểm tra quyền truy cập phân hệ Báo cáo dịch vụ
  const role = currentUser?.phan_quyen || '';
  const isAdmin = role === 'ADMIN' || role === 'ALL';
  const canView = isAdmin || role.includes('BC_VIEW') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('BC_VIEW'));
  const canExcel = isAdmin || role.includes('BC_EXCEL') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('BC_EXCEL'));
  const canMau = isAdmin || role.includes('BC_MAU') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('BC_MAU'));

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

  // 2. Tải toàn bộ dữ liệu theo khoảng ngày đã chọn
  async function handleLoc(startDate = tuNgay, endDate = denNgay) {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dich_vu_tiep_nhan')
        .select('*')
        .gte('thoi_gian', `${startDate}T00:00:00+07:00`)
        .lte('thoi_gian', `${endDate}T23:59:59+07:00`)
        .order('thoi_gian', { ascending: false });

      if (error) throw error;
      setDuLieuBaoCao(data || []);
    } catch (err: any) {
      alert('Lỗi nạp dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Lọc tức thì theo Cố vấn & Hạng mục ngay trên Client
  const duLieuHienThi = duLieuBaoCao.filter((r) => {
    if (coVan) {
      const tenCVTrongBang = (r.co_van_vien || r.ten_co_van || '').toLowerCase();
      if (!tenCVTrongBang.includes(coVan.toLowerCase())) {
        return false;
      }
    }

    if (hangMuc) {
      const hmTrongBang = (r.hang_muc_thuc_hien || r.hang_muc || '').toLowerCase();
      if (hmTrongBang !== hangMuc.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // 3. Khởi tạo ngày hiện tại và chạy lọc lần đầu ở Client
  useEffect(() => {
    const homNay = new Date().toISOString().split('T')[0];
    setTuNgay(homNay);
    setDenNgay(homNay);
    loadDanhMucLoc();
    if (canView) {
      handleLoc(homNay, homNay);
    }
  }, [canView]);

  // =========================================================================
  // TÍNH TOÁN KPI & BẢNG TỔNG HỢP (GIỐNG BÁO CÁO ĐẶT HOA)
  // =========================================================================
  const bcTongXe = duLieuHienThi.length;
  const bcHenTruoc = duLieuHienThi.filter((r) => {
    const tt = String(r.trang_thai_hen || r.trang_thai || '').toUpperCase().trim();
    return tt === '24H' || tt === 'H' || tt.includes('HẸN');
  }).length;
  const bcVangLai = duLieuHienThi.filter((r) => {
    const tt = String(r.trang_thai_hen || r.trang_thai || '').toUpperCase().trim();
    return tt === 'XVL' || tt.includes('VÃNG LAI');
  }).length;
  const bcYeuCau = duLieuHienThi.filter((r) => {
    const tt = String(r.trang_thai_hen || r.trang_thai || '').toUpperCase().trim();
    return tt === 'YC' || tt.includes('YÊU CẦU');
  }).length;
  const bcBDDK = duLieuHienThi.filter((r) => {
    const hm = String(r.hang_muc_thuc_hien || r.hang_muc || '').toUpperCase().trim();
    return hm === 'BDĐK' || hm.includes('BẢO DƯỠNG');
  }).length;

  // Bảng tổng hợp 1: Theo Cố vấn dịch vụ
  const thongKeCVMap: Record<
    string,
    { ten: string; tong: number; hen: number; xvl: number; yc: number }
  > = {};
  duLieuHienThi.forEach((r) => {
    const tenCV = String(r.co_van_vien || r.ten_co_van || 'Chưa phân cố vấn').trim();
    const tt = String(r.trang_thai_hen || r.trang_thai || '').toUpperCase().trim();

    if (!thongKeCVMap[tenCV]) {
      thongKeCVMap[tenCV] = { ten: tenCV, tong: 0, hen: 0, xvl: 0, yc: 0 };
    }
    thongKeCVMap[tenCV].tong += 1;
    if (tt === '24H' || tt === 'H' || tt.includes('HẸN')) {
      thongKeCVMap[tenCV].hen += 1;
    } else if (tt === 'XVL' || tt.includes('VÃNG LAI')) {
      thongKeCVMap[tenCV].xvl += 1;
    } else if (tt === 'YC' || tt.includes('YÊU CẦU')) {
      thongKeCVMap[tenCV].yc += 1;
    }
  });
  const dsThongKeCV = Object.values(thongKeCVMap).sort((a, b) => b.tong - a.tong);

  // Bảng tổng hợp 2: Theo Hạng mục thực hiện
  const thongKeHMMap: Record<string, { ten: string; tong: number; hen: number; xvl: number }> = {};
  duLieuHienThi.forEach((r) => {
    const tenHM = String(r.hang_muc_thuc_hien || r.hang_muc || 'Khác').trim();
    const tt = String(r.trang_thai_hen || r.trang_thai || '').toUpperCase().trim();

    if (!thongKeHMMap[tenHM]) {
      thongKeHMMap[tenHM] = { ten: tenHM, tong: 0, hen: 0, xvl: 0 };
    }
    thongKeHMMap[tenHM].tong += 1;
    if (tt === '24H' || tt === 'H' || tt.includes('HẸN')) {
      thongKeHMMap[tenHM].hen += 1;
    } else if (tt === 'XVL' || tt.includes('VÃNG LAI')) {
      thongKeHMMap[tenHM].xvl += 1;
    }
  });
  const dsThongKeHM = Object.values(thongKeHMMap).sort((a, b) => b.tong - a.tong);

  // 4. Xuất file Excel CSV thông thường
  function handleXuatExcel() {
    if (!canExcel) {
      alert('Tài khoản của bạn không có quyền xuất file Excel!');
      return;
    }
    if (duLieuHienThi.length === 0) return alert('Không có dữ liệu để xuất!');

    const headers = ['NO', 'Thời Gian', 'Biển Số', 'Khách Hàng', 'Cố Vấn Viên', 'Hạng Mục Thực Hiện', 'Trạng Thái Hẹn', 'Số Điện Thoại', 'Ghi Chú'];
    const rows = duLieuHienThi.map((r, idx) => {
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

  // 5. Xuất Báo Cáo Ngày đúng mẫu Excel đại lý
  function handleXuatBaoCaoNgayMau() {
    if (!canMau) {
      alert('Tài khoản của bạn không có quyền tải Báo cáo ngày (Mẫu)!');
      return;
    }
    if (duLieuHienThi.length === 0) {
      alert('Không có dữ liệu trong khoảng thời gian đã chọn để xuất báo cáo!');
      return;
    }

    const dParts = tuNgay.split('-');
    const ngayHienThi = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : tuNgay;
    const tongSoXe = duLieuHienThi.length;

    const tableRows = duLieuHienThi.map((r, idx) => {
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

  // Chặn hiển thị giao diện nếu tài khoản không có quyền BC_VIEW
  if (!canView) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', backgroundColor: '#fff', padding: '30px', borderRadius: '10px', border: '1px solid #fecaca', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 8px 0' }}>
            Truy Cập Bị Từ Chối
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
            Tài khoản của bạn chưa được cấp quyền <strong>Xem Báo cáo dịch vụ (BC_VIEW)</strong>. Vui lòng liên hệ quản trị viên để được phân quyền.
          </p>
        </div>
      </div>
    );
  }

  const responsiveFilterInput = {
    ...filterInputStyle,
    fontSize: isMobile ? '14px' : '13px',
    padding: isMobile ? '9px 10px' : '8px 10px',
  };

  return (
    <div
      style={{
        padding: isMobile ? '12px' : '20px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, sans-serif',
        boxSizing: 'border-box',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      {/* 1. HEADER CHUNG (ĐỒNG BỘ PHONG CÁCH BÁO CÁO ĐẶT HOA) */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: isMobile ? '14px' : '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: isMobile ? '17px' : '20px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> BÁO CÁO TIẾP NHẬN DỊCH VỤ
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Thống kê lượt xe vào xưởng theo Cố vấn dịch vụ, Hạng mục thực hiện và Trạng thái hẹn.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {canExcel && (
            <button
              type="button"
              onClick={handleXuatExcel}
              style={{
                flex: isMobile ? '1 1 auto' : 'none',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>📥</span> Xuất Excel (CSV)
            </button>
          )}

          {canMau && (
            <button
              type="button"
              onClick={handleXuatBaoCaoNgayMau}
              style={{
                flex: isMobile ? '1 1 auto' : 'none',
                backgroundColor: '#eab308',
                color: '#0f172a',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>📑</span> BC Ngày (Mẫu)
            </button>
          )}
        </div>
      </div>

      {/* 2. THANH BỘ LỌC */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: isMobile ? '12px' : '14px 16px',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isTinyMobile ? '1fr' : isMobile ? '1fr 1fr' : 'repeat(4, minmax(160px, 1fr))',
            gap: '10px',
            flex: 1,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Từ ngày</label>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              style={responsiveFilterInput}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Đến ngày</label>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              style={responsiveFilterInput}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Cố vấn viên</label>
            <select
              value={coVan}
              onChange={(e) => setCoVan(e.target.value)}
              style={{ ...responsiveFilterInput, backgroundColor: '#fff' }}
            >
              <option value="">-- Tất cả cố vấn --</option>
              {danhSachCoVan.map((nv) => (
                <option key={nv.ma_nv} value={nv.ho_ten}>
                  {nv.ma_nv} - {nv.ho_ten}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Hạng mục</label>
            <select
              value={hangMuc}
              onChange={(e) => setHangMuc(e.target.value)}
              style={{ ...responsiveFilterInput, backgroundColor: '#fff' }}
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

        <button
          type="button"
          onClick={() => handleLoc()}
          disabled={loading}
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            padding: isMobile ? '10px 16px' : '9px 20px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🔍</span> {loading ? 'Đang lọc...' : 'Lọc dữ liệu'}
        </button>
      </div>

      {/* 3. 5 THẺ KPI TỔNG QUAN */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TỔNG LƯỢT XE</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{bcTongXe}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>XE HẸN TRƯỚC (24H / H)</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{bcHenTruoc}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>XE VÃNG LAI (XVL)</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>{bcVangLai}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>XE YÊU CẦU (YC)</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>{bcYeuCau}</div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: '14px',
            borderRadius: '10px',
            borderLeft: '4px solid #9333ea',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            gridColumn: isMobile ? 'span 2' : 'auto',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>BẢO DƯỠNG ĐỊNH KỲ (BDĐK)</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#7e22ce', marginTop: '4px' }}>{bcBDDK}</div>
        </div>
      </div>

      {/* 4. 2 BẢNG TỔNG HỢP THEO CỐ VẤN VIÊN & HẠNG MỤC */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Bảng trái: Thống kê theo Cố vấn dịch vụ */}
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxHeight: '320px', overflowY: 'auto', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#0f172a' }}>👨‍🔧 Thống kê theo Cố vấn dịch vụ</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px' }}>Cố vấn dịch vụ</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Tổng xe</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>Hẹn (24H/H)</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#d97706' }}>XVL</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#dc2626' }}>YC</th>
              </tr>
            </thead>
            <tbody>
              {dsThongKeCV.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td>
                </tr>
              ) : (
                dsThongKeCV.map((cv) => (
                  <tr key={cv.ten} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: '600', color: '#0f172a' }}>{cv.ten}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{cv.tong}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{cv.hen}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#d97706', fontWeight: '600' }}>{cv.xvl}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>{cv.yc}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bảng phải: Tổng hợp theo Hạng mục thực hiện */}
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxHeight: '320px', overflowY: 'auto', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#0f172a' }}>🔧 Tổng hợp theo Hạng mục thực hiện</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px' }}>Hạng mục</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Số lượng</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>Hẹn</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#d97706' }}>XVL</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#0284c7' }}>Tỷ trọng</th>
              </tr>
            </thead>
            <tbody>
              {dsThongKeHM.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td>
                </tr>
              ) : (
                dsThongKeHM.map((hm) => {
                  const tyTrong = bcTongXe > 0 ? Math.round((hm.tong / bcTongXe) * 100) : 0;
                  return (
                    <tr key={hm.ten} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#0f172a' }}>{hm.ten}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{hm.tong}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{hm.hen}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#d97706' }}>{hm.xvl}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#0284c7', fontWeight: 'bold' }}>{tyTrong}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BẢNG KÊ CHI TIẾT LƯỢT XE */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          padding: isMobile ? '12px' : '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>
            📋 Bảng kê chi tiết xe tiếp nhận ({duLieuHienThi.length} xe)
          </h3>
        </div>

        {duLieuHienThi.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
            {loading ? 'Đang trích xuất dữ liệu...' : 'Không có dữ liệu trong khoảng thời gian này.'}
          </div>
        ) : isMobile ? (
          /* GIAO DIỆN THẺ (CARD) DỌC TRÊN ĐIỆN THOẠI */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {duLieuHienThi.map((r, index) => {
              const coVanHienThi = r.co_van_vien || r.ten_co_van || '---';
              const hangMucHienThi = r.hang_muc_thuc_hien || r.hang_muc || '---';
              const trangThaiHienThi = r.trang_thai_hen || r.trang_thai || '24H';

              return (
                <div
                  key={r.no_id || index}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #0284c7',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        #{r.no_id || index + 1}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7' }}>
                        {r.bien_so}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {hangMucHienThi}
                      </span>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {trangThaiHienThi}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                    👤 {r.ten_khach_hang || '---'}
                    {r.so_dien_thoai ? <span style={{ fontWeight: 'normal', color: '#475569' }}> • 📞 {r.so_dien_thoai}</span> : ''}
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>🧑‍💼 CVDV: <strong>{coVanHienThi}</strong></div>
                    <div>
                      🕒 {r.thoi_gian ? `${new Date(r.thoi_gian).toLocaleTimeString('vi-VN')} ${new Date(r.thoi_gian).toLocaleDateString('vi-VN')}` : '---'}
                    </div>
                  </div>

                  {r.ghi_chu && (
                    <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '5px 8px', borderRadius: '4px', marginTop: '6px' }}>
                      📝 {r.ghi_chu}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* BẢNG DỮ LIỆU ĐẦY ĐỦ TRÊN MÁY TÍNH */
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '720px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
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
                {duLieuHienThi.map((r, index) => {
                  const coVanHienThi = r.co_van_vien || r.ten_co_van || '---';
                  const hangMucHienThi = r.hang_muc_thuc_hien || r.hang_muc || '---';
                  const trangThaiHienThi = r.trang_thai_hen || r.trang_thai || '24H';

                  return (
                    <tr key={r.no_id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{r.no_id || index + 1}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.thoi_gian ? new Date(r.thoi_gian).toLocaleTimeString('vi-VN') + ' ' + new Date(r.thoi_gian).toLocaleDateString('vi-VN') : '---'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#0284c7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {r.bien_so}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>
                        {r.ten_khach_hang || '---'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '500' }}>
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold' as const,
  color: '#475569',
  marginBottom: '4px',
};

const filterInputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};