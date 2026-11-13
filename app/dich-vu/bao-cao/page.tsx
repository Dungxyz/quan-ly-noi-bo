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
    fontSize: isMobile ? '14px' : '12px',
    padding: isMobile ? '9px 10px' : '7px 10px',
  };

  return (
    <div
      style={{
        padding: isMobile ? '14px 12px 24px 12px' : '24px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: isMobile ? '16px 14px' : '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* HEADER TOOLBAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 'bold', color: '#0284c7', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📍</span> TRÍCH XUẤT BÁO CÁO DỊCH VỤ
          </h2>
          <span
            style={{
              backgroundColor: '#0f172a',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            Kết quả lọc: {duLieuHienThi.length} xe
          </span>
        </div>

        {/* INPUT BỘ LỌC */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isTinyMobile ? '1fr' : isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? '10px' : '14px',
            marginBottom: '16px',
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
              style={responsiveFilterInput}
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
              style={responsiveFilterInput}
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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() => handleLoc()}
            disabled={loading}
            style={{
              flex: isMobile ? '1 1 auto' : 'none',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: isMobile ? '10px 14px' : '8px 16px',
              borderRadius: '6px',
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
            <span>🔍</span> {loading ? 'Đang lọc...' : 'Lọc'}
          </button>

          {canExcel && (
            <button
              type="button"
              onClick={handleXuatExcel}
              style={{
                flex: isMobile ? '1 1 auto' : 'none',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                padding: isMobile ? '10px 14px' : '8px 16px',
                borderRadius: '6px',
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
              <span>📗</span> Xuất Excel
            </button>
          )}

          {canMau && (
            <button
              type="button"
              onClick={handleXuatBaoCaoNgayMau}
              style={{
                flex: isMobile ? '1 1 100%' : 'none',
                backgroundColor: '#eab308',
                color: '#000',
                border: 'none',
                padding: isMobile ? '10px 14px' : '8px 16px',
                borderRadius: '6px',
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

        {/* HIỂN THỊ KẾT QUẢ BÁO CÁO */}
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
                  {/* Hàng 1: STT + Biển số + Hạng mục & Trạng thái */}
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

                  {/* Hàng 2: Khách hàng + SĐT */}
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                    👤 {r.ten_khach_hang || '---'}
                    {r.so_dien_thoai ? <span style={{ fontWeight: 'normal', color: '#475569' }}> • 📞 {r.so_dien_thoai}</span> : ''}
                  </div>

                  {/* Hàng 3: Cố vấn + Thời gian */}
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>🧑‍💼 CVDV: <strong>{coVanHienThi}</strong></div>
                    <div>
                      🕒 {r.thoi_gian ? `${new Date(r.thoi_gian).toLocaleTimeString('vi-VN')} ${new Date(r.thoi_gian).toLocaleDateString('vi-VN')}` : '---'}
                    </div>
                  </div>

                  {/* Hàng 4: Ghi chú (nếu có) */}
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