'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BaoCaoDatHoaPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [danhSachHoa, setDanhSachHoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc báo cáo
  const [tuNgay, setTuNgay] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; // Đầu tháng hiện tại
  });
  const [denNgay, setDenNgay] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]; // Cuối tháng hiện tại
  });
  const [chonPhong, setChonPhong] = useState<string>('TAT_CA');
  const [chonTrangThai, setChonTrangThai] = useState<string>('TAT_CA');

  function norm(val: any): string {
    return String(val || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: nvData } = await supabase.from('nhan_vien').select('*');
      if (nvData && nvData.length > 0) {
        const allRawStrings: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) allRawStrings.push(window.localStorage.getItem(k) || '');
        }
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k) allRawStrings.push(window.sessionStorage.getItem(k) || '');
        }
        if (typeof document !== 'undefined' && document.cookie) {
          allRawStrings.push(decodeURIComponent(document.cookie));
        }
        const joinedStorage = allRawStrings.join(' | ');
        const detectedUser = nvData.find(
          (nv) => nv.ma_nv && joinedStorage.includes(String(nv.ma_nv).trim())
        );
        if (detectedUser) setCurrentUser(detectedUser);
      }

      const { data: hoaData } = await supabase
        .from('kinh_doanh_dat_hoa')
        .select('*')
        .order('dau_thoi_gian', { ascending: false });

      if (hoaData) setDanhSachHoa(hoaData);
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo đặt hoa:', err);
    } finally {
      setLoading(false);
    }
  }

  // Kiểm tra quyền xem báo cáo
  function getQuyenBaoCao(user: any) {
    if (!user) return { isToanQuyen: true, isPGDKD: false, phongPGD: '' };
    const role = String(user.phan_quyen || '').toUpperCase().trim();
    const bp = norm(user.bo_phan);
    const vt = norm(user.vi_tri || user.chuc_vu || user.chuc_danh);
    const phong = norm(user.phong || user.phong_ban || user.ten_phong);

    const isAdmin = role === 'ADMIN';
    const isHCNS =
      bp === 'hcns' &&
      (vt === 'nhân viên hcns' || vt === 'nhân viên it' || vt === 'phó phòng hcns');
    const isPGDKD = bp === 'kinh doanh' && vt.includes('phó giám đốc kinh doanh');

    return {
      isToanQuyen: isAdmin || isHCNS,
      isPGDKD,
      phongPGD: phong,
    };
  }

  const { isToanQuyen, isPGDKD, phongPGD } = getQuyenBaoCao(currentUser);

  // Lọc dữ liệu theo Quyền + Khoảng ngày + Phòng + Trạng thái
  const duLieuLoc = danhSachHoa.filter((item) => {
    // 1. Phân quyền theo phòng nếu là PGĐKD
    if (!isToanQuyen && isPGDKD) {
      if (norm(item.phong_kinh_doanh) !== phongPGD) return false;
    }

    // 2. Lọc theo ngày tạo phiếu (dau_thoi_gian)
    const ngayTao = new Date(item.dau_thoi_gian).toISOString().split('T')[0];
    if (tuNgay && ngayTao < tuNgay) return false;
    if (denNgay && ngayTao > denNgay) return false;

    // 3. Lọc theo Phòng KD
    if (chonPhong !== 'TAT_CA' && norm(item.phong_kinh_doanh) !== norm(chonPhong)) {
      return false;
    }

    // 4. Lọc theo Trạng thái
    if (chonTrangThai !== 'TAT_CA' && item.trang_thai !== chonTrangThai) {
      return false;
    }

    return true;
  });

  // Tính toán các chỉ số KPI
  const tongDon = duLieuLoc.length;
  const daDuyet = duLieuLoc.filter((x) => x.trang_thai === 'DA_DUYET').length;
  const chuaDuyet = duLieuLoc.filter((x) => x.trang_thai === 'CHUA_DUYET').length;
  const tuChoi = duLieuLoc.filter((x) => x.trang_thai === 'TU_CHOI').length;
  const datSau16h30 = duLieuLoc.filter((x) => x.dat_sau_16h30 === true).length;

  // Thống kê nhóm theo Phòng Kinh Doanh
  const thongKePhongMap: Record<string, { tong: number; daDuyet: number; chuaDuyet: number; tuChoi: number; tre1630: number }> = {};
  duLieuLoc.forEach((item) => {
    const tenPhong = item.phong_kinh_doanh || 'Chưa phân phòng';
    if (!thongKePhongMap[tenPhong]) {
      thongKePhongMap[tenPhong] = { tong: 0, daDuyet: 0, chuaDuyet: 0, tuChoi: 0, tre1630: 0 };
    }
    thongKePhongMap[tenPhong].tong += 1;
    if (item.trang_thai === 'DA_DUYET') thongKePhongMap[tenPhong].daDuyet += 1;
    if (item.trang_thai === 'CHUA_DUYET') thongKePhongMap[tenPhong].chuaDuyet += 1;
    if (item.trang_thai === 'TU_CHOI') thongKePhongMap[tenPhong].tuChoi += 1;
    if (item.dat_sau_16h30) thongKePhongMap[tenPhong].tre1630 += 1;
  });

  // Thống kê nhóm theo Tư Vấn Bán Hàng
  const thongKeTVBHMap: Record<string, { ten: string; phong: string; tong: number; daDuyet: number; tre1630: number }> = {};
  duLieuLoc.forEach((item) => {
    const key = item.tu_van_ban_hang || 'Không rõ';
    if (!thongKeTVBHMap[key]) {
      thongKeTVBHMap[key] = {
        ten: key,
        phong: item.phong_kinh_doanh || '---',
        tong: 0,
        daDuyet: 0,
        tre1630: 0,
      };
    }
    thongKeTVBHMap[key].tong += 1;
    if (item.trang_thai === 'DA_DUYET') thongKeTVBHMap[key].daDuyet += 1;
    if (item.dat_sau_16h30) thongKeTVBHMap[key].tre1630 += 1;
  });
  const dsThongKeTVBH = Object.values(thongKeTVBHMap).sort((a, b) => b.tong - a.tong);

  // Xuất file Excel (CSV chuẩn UTF-8 BOM không lỗi font tiếng Việt)
  function handleExportCSV() {
    if (duLieuLoc.length === 0) {
      alert('Không có dữ liệu trong khoảng thời gian đã chọn để xuất!');
      return;
    }

    const headers = [
      'STT',
      'Thời gian đặt',
      'Phòng Kinh Doanh',
      'Tư vấn bán hàng',
      'Tên khách hàng',
      'Số hợp đồng',
      'Số VIN / Biển số',
      'Ngày giờ giao xe',
      'Đặt sau 16h30',
      'Trạng thái',
      'Người duyệt',
      'Ghi chú / Lý do',
    ];

    const rows = duLieuLoc.map((r, idx) => {
      const trangThaiText =
        r.trang_thai === 'DA_DUYET'
          ? 'Đã duyệt'
          : r.trang_thai === 'TU_CHOI'
          ? 'Từ chối'
          : 'Chờ duyệt';

      return [
        idx + 1,
        new Date(r.dau_thoi_gian).toLocaleString('vi-VN'),
        r.phong_kinh_doanh || '',
        r.tu_van_ban_hang || '',
        r.ten_khach_hang || '',
        r.hop_dong_so || '',
        r.so_vin_bien_so || '',
        new Date(r.ngay_gio_giao_xe).toLocaleString('vi-VN'),
        r.dat_sau_16h30 ? 'Có (Sau 16h30)' : 'Đúng giờ',
        trangThaiText,
        r.nguoi_duyet || '',
        r.trang_thai === 'TU_CHOI' ? r.ly_do_tu_choi || '' : r.ghi_chu || '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Dat_Hoa_${tuNgay}_den_${denNgay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header & Nút Xuất Excel */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
            📊 BÁO CÁO ĐẶT HOA GIAO XE
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Thống kê chi tiết số lượng hoa bàn giao xe theo Phòng Kinh Doanh, Tư vấn bán hàng và tỷ lệ đặt sau 16h30.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          style={{
            padding: '9px 16px',
            backgroundColor: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📥 Xuất Excel (CSV)
        </button>
      </div>

      {/* Thanh Bộ Lọc */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: '14px 16px',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'flex-end',
          marginBottom: '18px',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Từ ngày
          </label>
          <input
            type="date"
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Đến ngày
          </label>
          <input
            type="date"
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>

        {isToanQuyen && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
              Phòng Kinh Doanh
            </label>
            <select
              value={chonPhong}
              onChange={(e) => setChonPhong(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
            >
              <option value="TAT_CA">-- Tất cả phòng --</option>
              <option value="Kinh doanh 1">Kinh doanh 1</option>
              <option value="Kinh doanh 2">Kinh doanh 2</option>
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
            Trạng thái duyệt
          </label>
          <select
            value={chonTrangThai}
            onChange={(e) => setChonTrangThai(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="TAT_CA">-- Tất cả trạng thái --</option>
            <option value="DA_DUYET">✅ Đã duyệt</option>
            <option value="CHUA_DUYET">⏳ Chưa duyệt</option>
            <option value="TU_CHOI">❌ Từ chối</option>
          </select>
        </div>
      </div>

      {/* 5 Thẻ KPI Tổng Quan */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TỔNG PHIẾU ĐẶT HOA</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{tongDon}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>ĐÃ DUYỆT CẤP HOA</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{daDuyet}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>ĐANG CHỜ DUYỆT</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>{chuaDuyet}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TỪ CHỐI</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>{tuChoi}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #9333ea', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>ĐẶT SAU 16H30</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#7e22ce', marginTop: '4px' }}>{datSau16h30}</div>
        </div>
      </div>

      {/* 2 Bảng Tổng Hợp Theo Phòng KD & Theo TVBH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Bảng 1: Tổng hợp theo Phòng Kinh Doanh */}
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>🏢 Tổng hợp theo Phòng Kinh Doanh</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px' }}>Phòng KD</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Tổng</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>Đã duyệt</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#d97706' }}>Chờ</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#7e22ce' }}>Sau 16h30</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(thongKePhongMap).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td>
                </tr>
              ) : (
                Object.entries(thongKePhongMap).map(([phong, st]) => (
                  <tr key={phong} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{phong}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{st.tong}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{st.daDuyet}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#d97706' }}>{st.chuaDuyet}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#7e22ce' }}>{st.tre1630}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bảng 2: Tổng hợp theo Tư vấn bán hàng */}
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxHeight: '320px', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>👨‍💼 Thống kê theo Tư vấn bán hàng</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px' }}>Tư vấn bán hàng</th>
                <th style={{ padding: '8px' }}>Phòng</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Tổng</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>Đã duyệt</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#7e22ce' }}>Sau 16h30</th>
              </tr>
            </thead>
            <tbody>
              {dsThongKeTVBH.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td>
                </tr>
              ) : (
                dsThongKeTVBH.map((tv) => (
                  <tr key={tv.ten} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: '600' }}>{tv.ten}</td>
                    <td style={{ padding: '8px', fontSize: '12px', color: '#64748b' }}>{tv.phong}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{tv.tong}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{tv.daDuyet}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#7e22ce' }}>{tv.tre1630}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng 3: Chi tiết từng đơn đặt hoa trong kỳ */}
      <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>
          📋 Bảng kê chi tiết đơn đặt hoa ({duLieuLoc.length} phiếu)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px' }}>STT</th>
              <th style={{ padding: '10px' }}>Thời gian đặt</th>
              <th style={{ padding: '10px' }}>Phòng KD</th>
              <th style={{ padding: '10px' }}>TVBH</th>
              <th style={{ padding: '10px' }}>Khách hàng</th>
              <th style={{ padding: '10px' }}>Số HĐ</th>
              <th style={{ padding: '10px' }}>VIN / Biển số</th>
              <th style={{ padding: '10px' }}>Giờ giao xe</th>
              <th style={{ padding: '10px' }}>Trạng thái</th>
              <th style={{ padding: '10px' }}>Người duyệt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Đang tải báo cáo...</td>
              </tr>
            ) : duLieuLoc.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Không có dữ liệu trong kỳ báo cáo.</td>
              </tr>
            ) : (
              duLieuLoc.map((row, index) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>{index + 1}</td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    {new Date(row.dau_thoi_gian).toLocaleString('vi-VN')}
                    {row.dat_sau_16h30 && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Sau 16h30
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>{row.phong_kinh_doanh}</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{row.tu_van_ban_hang}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.ten_khach_hang}</td>
                  <td style={{ padding: '10px' }}>{row.hop_dong_so}</td>
                  <td style={{ padding: '10px' }}>{row.so_vin_bien_so || '---'}</td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    {new Date(row.ngay_gio_giao_xe).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {row.trang_thai === 'DA_DUYET' ? (
                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✅ Đã duyệt</span>
                    ) : row.trang_thai === 'TU_CHOI' ? (
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>❌ Từ chối</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 'bold' }}>⏳ Chờ duyệt</span>
                    )}
                  </td>
                  <td style={{ padding: '10px', fontSize: '12px', color: '#475569' }}>{row.nguoi_duyet || '---'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}