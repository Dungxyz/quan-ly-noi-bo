'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface KhachHangHenItem {
  id?: number;
  ngay_hen: string;
  bien_so: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  hang_muc_du_kien?: string;
  co_van?: string;
  trang_thai_hen: '24H' | 'H';
}

interface KhachHangTongItem {
  id?: number;
  bien_so: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
}

function getThongTinThoiGianVN() {
  const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const gio = vnTime.getUTCHours();
  const phut = vnTime.getUTCMinutes();

  const formatDBDate = (d: Date) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDisplayDate = (d: Date) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  };

  const ngayMai = new Date(vnTime.getTime() + 24 * 60 * 60 * 1000);

  return {
    homNayStr: formatDBDate(vnTime),
    ngayMaiStr: formatDBDate(ngayMai),
    homNayDisplay: formatDisplayDate(vnTime),
    ngayMaiDisplay: formatDisplayDate(ngayMai),
    daKhoa23h: gio >= 23,
    gioHienTai: `${String(gio).padStart(2, '0')}:${String(phut).padStart(2, '0')}`,
  };
}

function chuanHoaBienSo(bs: string) {
  return String(bs || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

export default function KhachHangHenPage() {
  const { currentUser, kiemTraQuyen } = useAuth();
  const [screenWidth, setScreenWidth] = useState(1200);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallMobile = screenWidth < 640;
  const isMobile = screenWidth < 768;

  const [activeTab, setActiveTab] = useState<'24H' | 'H' | 'TONG'>('24H');

  const [thoiGian, setThoiGian] = useState({
    homNayStr: '',
    ngayMaiStr: '',
    homNayDisplay: '',
    ngayMaiDisplay: '',
    daKhoa23h: false,
    gioHienTai: '',
  });

  useEffect(() => {
    setThoiGian(getThongTinThoiGianVN());
    const timer = setInterval(() => {
      setThoiGian(getThongTinThoiGianVN());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const [dsHen24H, setDsHen24H] = useState<KhachHangHenItem[]>([]);
  const [dsHenH, setDsHenH] = useState<KhachHangHenItem[]>([]);
  const [dsKhachTong, setDsKhachTong] = useState<KhachHangTongItem[]>([]);
  const [tongSoKhach, setTongSoKhach] = useState(0);

  // Danh mục Hạng mục & Cố vấn
  const [danhSachCoVan, setDanhSachCoVan] = useState<any[]>([]);
  const [dsHangMuc, setDsHangMuc] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tuKhoa, setTuKhoa] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
    ngay_hen: '',
    bien_so: '',
    ten_khach_hang: '',
    so_dien_thoai: '',
    hang_muc_du_kien: 'BDĐK',
    co_van: '',
    trang_thai_hen: 'H' as '24H' | 'H',
  });

  // Phân quyền
  const role = currentUser?.phan_quyen || '';
  const isAdmin = role === 'ADMIN' || role === 'ALL';
  const canAdd =
    isAdmin || role.includes('HEN_ADD') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('HEN_ADD'));
  const canEdit =
    isAdmin || role.includes('HEN_EDIT') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('HEN_EDIT'));
  const canDelete =
    isAdmin || role.includes('HEN_DELETE') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('HEN_DELETE'));

  // Nạp danh mục Cố vấn & Hạng mục
  async function loadDanhMuc() {
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
      console.error('Lỗi nạp danh mục:', err);
    }
  }

  useEffect(() => {
    loadDanhMuc();
  }, []);

  // 1. Nạp dữ liệu theo Tab
  async function loadDuLieu(searchKeyword = tuKhoa) {
    setLoading(true);
    const tg = getThongTinThoiGianVN();
    setThoiGian(tg);
    const k = searchKeyword.trim();

    try {
      if (activeTab === '24H') {
        let query = supabase
          .from('dich_vu_khach_hang_hen')
          .select('id, ngay_hen, bien_so, ten_khach_hang, so_dien_thoai, hang_muc_du_kien, co_van, trang_thai_hen')
          .eq('ngay_hen', tg.ngayMaiStr)
          .eq('trang_thai_hen', '24H')
          .order('id', { ascending: false });

        if (k) {
          query = query.or(`bien_so.ilike.%${k}%,ten_khach_hang.ilike.%${k}%,so_dien_thoai.ilike.%${k}%,co_van.ilike.%${k}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setDsHen24H((data as KhachHangHenItem[]) || []);
      } else if (activeTab === 'H') {
        let query = supabase
          .from('dich_vu_khach_hang_hen')
          .select('id, ngay_hen, bien_so, ten_khach_hang, so_dien_thoai, hang_muc_du_kien, co_van, trang_thai_hen')
          .eq('ngay_hen', tg.homNayStr)
          .eq('trang_thai_hen', 'H')
          .order('id', { ascending: false });

        if (k) {
          query = query.or(`bien_so.ilike.%${k}%,ten_khach_hang.ilike.%${k}%,so_dien_thoai.ilike.%${k}%,co_van.ilike.%${k}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setDsHenH((data as KhachHangHenItem[]) || []);
      } else {
        const { count } = await supabase
          .from('dich_vu_khach_hang')
          .select('*', { count: 'exact', head: true });
        if (count !== null) setTongSoKhach(count);

        let query = supabase
          .from('dich_vu_khach_hang')
          .select('id, bien_so, ten_khach_hang, so_dien_thoai');

        if (k) {
          query = query
            .or(`bien_so.ilike.%${k}%,ten_khach_hang.ilike.%${k}%,so_dien_thoai.ilike.%${k}%`)
            .limit(100);
        } else {
          query = query.order('id', { ascending: false }).limit(50);
        }
        const { data, error } = await query;
        if (error) throw error;
        setDsKhachTong((data as KhachHangTongItem[]) || []);
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDuLieu(tuKhoa);
    }, 300);
    return () => clearTimeout(timer);
  }, [tuKhoa, activeTab]);

  // 2. Tải file Excel mẫu ĐÚNG 6 CỘT
  function handleTaiFileMau() {
    const tg = getThongTinThoiGianVN();
    const mauData = [
      {
        'Biển số': '51M00162',
        'Khách hàng': 'Bùi Đức Huy',
        'Hạng mục thực hiện': 'BDĐK',
        'Trạng thái hẹn': '24H',
        'Số điện thoại': '0974737864',
        'Cố vấn viên': 'FNV-070 Lê Phạm Anh Tuấn',
      },
      {
        'Biển số': '60K96532',
        'Khách hàng': 'ANH XUYÊN',
        'Hạng mục thực hiện': 'BDĐK',
        'Trạng thái hẹn': '24H',
        'Số điện thoại': '0867733105',
        'Cố vấn viên': 'FNV-070 Lê Phạm Anh Tuấn',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(mauData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KhachHen24H');
    XLSX.writeFile(wb, `Mau_Khach_Hen_24H_${tg.ngayMaiStr}.xlsx`);
  }

  // 3. Import Excel Khách hẹn 24H (Bắt luôn Hạng mục & Cố vấn viên từ bảng 6 cột)
  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const tgCheck = getThongTinThoiGianVN();
    setThoiGian(tgCheck);

    if (tgCheck.daKhoa23h) {
      alert(`⛔ Đã qua 23:00 (hiện tại là ${tgCheck.gioHienTai}). Hệ thống đã khóa chức năng import khách hẹn 24H cho ngày mai!`);
      e.target.value = '';
      return;
    }

    try {
      setImporting(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const matrix: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: '',
      });

      if (!matrix || matrix.length === 0) {
        alert('File Excel không có dữ liệu!');
        return;
      }

      const mapHen = new Map<string, KhachHangHenItem>();
      const mapKhachTong = new Map<string, KhachHangTongItem>();

      for (const cells of matrix) {
        if (!cells || cells.length < 2) continue;

        const rawBienSo = String(cells[0] ?? '').trim();
        const rawTen = String(cells[1] ?? '').trim();

        if (!rawBienSo || rawBienSo.toLowerCase().includes('biển số') || rawBienSo.toLowerCase() === 'bien_so') {
          continue;
        }

        const bs = chuanHoaBienSo(rawBienSo);
        if (!bs || !rawTen) continue;

        let hangMuc = '';
        let sdt = '';
        let coVan = '';

        for (let i = 2; i < cells.length; i++) {
          const rawCell = String(cells[i] ?? '').replace(/\s+/g, ' ').trim();
          if (!rawCell) continue;

          const digits = rawCell.replace(/[\s.-]/g, '');
          if (!sdt && /^\d{9,11}$/.test(digits)) {
            sdt = /^[35789]\d{8}$/.test(digits) ? '0' + digits : digits;
          } else if (rawCell.toUpperCase() === '24H' || rawCell.toUpperCase() === 'H') {
            continue;
          } else if (!coVan && /^FNV-/i.test(rawCell)) {
            coVan = rawCell;
          } else if (!hangMuc && i === 2) {
            hangMuc = rawCell;
          }
        }

        mapHen.set(bs, {
          ngay_hen: tgCheck.ngayMaiStr,
          bien_so: bs,
          ten_khach_hang: rawTen,
          so_dien_thoai: sdt,
          hang_muc_du_kien: hangMuc || undefined,
          co_van: coVan || undefined,
          trang_thai_hen: '24H',
        });

        mapKhachTong.set(bs, {
          bien_so: bs,
          ten_khach_hang: rawTen,
          so_dien_thoai: sdt,
        });
      }

      const danhSachImport = Array.from(mapHen.values());
      if (danhSachImport.length === 0) {
        alert('Không đọc được dòng hợp lệ nào trong file Excel!');
        return;
      }

      const { error: errHen } = await supabase
        .from('dich_vu_khach_hang_hen')
        .upsert(danhSachImport, { onConflict: 'ngay_hen,bien_so' });
      if (errHen) throw errHen;

      await supabase
        .from('dich_vu_khach_hang')
        .upsert(Array.from(mapKhachTong.values()), { onConflict: 'bien_so' });

      alert(`✅ Đã import thành công ${danhSachImport.length} khách hẹn 24H cho ngày mai (${tgCheck.ngayMaiDisplay})!`);
      loadDuLieu();
    } catch (err: any) {
      alert('Lỗi import file Excel: ' + (err.message || JSON.stringify(err)));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  // 4. Tự động tra thông tin từ dich_vu_khach_hang khi gõ biển số trong Form thêm hẹn H
  async function handleTraCuuNhanhBienSo(bienSoNhap: string) {
    const bs = chuanHoaBienSo(bienSoNhap);
    if (bs.length < 6) return;

    const { data } = await supabase
      .from('dich_vu_khach_hang')
      .select('ten_khach_hang, so_dien_thoai')
      .eq('bien_so', bs)
      .maybeSingle();

    if (data) {
      setFormData((prev) => ({
        ...prev,
        ten_khach_hang: prev.ten_khach_hang || data.ten_khach_hang || '',
        so_dien_thoai: prev.so_dien_thoai || data.so_dien_thoai || '',
      }));
    }
  }

  // 5. Mở modal thêm khách hẹn H (trong ngày)
  function handleOpenAddH() {
    const tg = getThongTinThoiGianVN();
    setIsEditing(false);
    setFormData({
      id: undefined,
      ngay_hen: tg.homNayStr,
      bien_so: '',
      ten_khach_hang: '',
      so_dien_thoai: '',
      hang_muc_du_kien: dsHangMuc[0]?.ma_hang_muc || 'BDĐK',
      co_van: '',
      trang_thai_hen: 'H',
    });
    setModalOpen(true);
  }

  // 6. Mở modal sửa
  function handleOpenEditHen(item: KhachHangHenItem) {
    setIsEditing(true);
    setFormData({
      id: item.id,
      ngay_hen: item.ngay_hen,
      bien_so: item.bien_so,
      ten_khach_hang: item.ten_khach_hang,
      so_dien_thoai: item.so_dien_thoai || '',
      hang_muc_du_kien: item.hang_muc_du_kien || 'BDĐK',
      co_van: item.co_van || '',
      trang_thai_hen: item.trang_thai_hen,
    });
    setModalOpen(true);
  }

  function handleOpenEditKhachTong(item: KhachHangTongItem) {
    const tg = getThongTinThoiGianVN();
    setIsEditing(true);
    setFormData({
      id: item.id,
      ngay_hen: tg.homNayStr,
      bien_so: item.bien_so,
      ten_khach_hang: item.ten_khach_hang,
      so_dien_thoai: item.so_dien_thoai || '',
      hang_muc_du_kien: 'BDĐK',
      co_van: '',
      trang_thai_hen: 'H',
    });
    setModalOpen(true);
  }

  // 7. Lưu Form
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const bsChuan = chuanHoaBienSo(formData.bien_so);
    const tenChuan = formData.ten_khach_hang.trim();
    const sdtChuan = formData.so_dien_thoai.trim();

    if (!bsChuan || !tenChuan) {
      alert('Vui lòng nhập Biển số và Tên khách hàng!');
      return;
    }

    try {
      setSaving(true);

      if (activeTab === 'TONG' && isEditing) {
        const { error } = await supabase
          .from('dich_vu_khach_hang')
          .update({
            ten_khach_hang: tenChuan,
            so_dien_thoai: sdtChuan || null,
          })
          .eq('bien_so', bsChuan);
        if (error) throw error;
        alert(`Đã cập nhật khách hàng xe ${bsChuan}!`);
      } else {
        const tg = getThongTinThoiGianVN();
        const payloadHen = {
          ngay_hen: formData.ngay_hen || tg.homNayStr,
          bien_so: bsChuan,
          ten_khach_hang: tenChuan,
          so_dien_thoai: sdtChuan || null,
          hang_muc_du_kien: formData.hang_muc_du_kien || null,
          co_van: formData.co_van || null,
          trang_thai_hen: isEditing ? formData.trang_thai_hen : 'H',
        };

        const { error: errHen } = await supabase
          .from('dich_vu_khach_hang_hen')
          .upsert([payloadHen], { onConflict: 'ngay_hen,bien_so' });
        if (errHen) throw errHen;

        await supabase
          .from('dich_vu_khach_hang')
          .upsert(
            [{ bien_so: bsChuan, ten_khach_hang: tenChuan, so_dien_thoai: sdtChuan || null }],
            { onConflict: 'bien_so' }
          );

        alert(isEditing ? `Đã cập nhật lịch hẹn xe ${bsChuan}!` : `Đã thêm khách hẹn H (trong ngày) xe ${bsChuan}!`);
      }

      setModalOpen(false);
      loadDuLieu();
    } catch (err: any) {
      alert('Lỗi lưu dữ liệu: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  }

  // 8. Xóa bản ghi
  async function handleDeleteHen(item: KhachHangHenItem) {
    if (!confirm(`Xóa khách hẹn xe "${item.bien_so}" (${item.ten_khach_hang})?`)) return;
    try {
      const { error } = await supabase.from('dich_vu_khach_hang_hen').delete().eq('id', item.id);
      if (error) throw error;
      loadDuLieu();
    } catch (err: any) {
      alert('Lỗi xóa lịch hẹn: ' + err.message);
    }
  }

  async function handleDeleteKhachTong(item: KhachHangTongItem) {
    if (!confirm(`Xóa xe "${item.bien_so}" khỏi danh sách khách hàng?`)) return;
    try {
      const { error } = await supabase.from('dich_vu_khach_hang').delete().eq('bien_so', item.bien_so);
      if (error) throw error;
      loadDuLieu();
    } catch (err: any) {
      alert('Lỗi xóa khách hàng: ' + err.message);
    }
  }

  const responsiveInputStyle = {
    ...inputStyle,
    fontSize: isSmallMobile ? '15px' : '13px',
    padding: isSmallMobile ? '10px 11px' : '8px 10px',
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: isMobile ? '9px 12px' : '9px 16px',
    borderRadius: '6px',
    border: isActive ? '1px solid #0284c7' : '1px solid #e2e8f0',
    backgroundColor: isActive ? '#0284c7' : '#f8fafc',
    color: isActive ? '#fff' : '#334155',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

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
        {/* 3 TAB CHUYỂN ĐỔI */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '14px',
            marginBottom: '16px',
          }}
        >
          <button type="button" onClick={() => setActiveTab('24H')} style={tabButtonStyle(activeTab === '24H')}>
            📅 Khách hẹn 24H {thoiGian.ngayMaiDisplay ? `(Ngày mai: ${thoiGian.ngayMaiDisplay})` : ''}
          </button>
          <button type="button" onClick={() => setActiveTab('H')} style={tabButtonStyle(activeTab === 'H')}>
            ⏰ Khách hẹn H {thoiGian.homNayDisplay ? `(Trong ngày: ${thoiGian.homNayDisplay})` : ''}
          </button>
          <button type="button" onClick={() => setActiveTab('TONG')} style={tabButtonStyle(activeTab === 'TONG')}>
            🚗 Danh sách khách hàng
          </button>
        </div>

        {/* THÔNG BÁO KHÓA SỔ 23H00 CHO TAB 24H */}
        {activeTab === '24H' && thoiGian.ngayMaiDisplay && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              backgroundColor: thoiGian.daKhoa23h ? '#fef2f2' : '#f0f9ff',
              border: `1px solid ${thoiGian.daKhoa23h ? '#fecaca' : '#bae6fd'}`,
              color: thoiGian.daKhoa23h ? '#b91c1c' : '#0369a1',
            }}
          >
            {thoiGian.daKhoa23h
              ? `🔒 Đã quá 23:00 (Hiện tại ${thoiGian.gioHienTai}) — Hệ thống đã khóa import file khách hẹn 24H cho ngày ${thoiGian.ngayMaiDisplay}.`
              : `🟢 Đang mở import file Excel khách hẹn 24H cho ngày mai (${thoiGian.ngayMaiDisplay}). Tự động khóa lúc 23:00 (Hiện tại: ${thoiGian.gioHienTai}).`}
          </div>
        )}

        {/* HEADER TOOLBAR */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            marginBottom: '18px',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              {activeTab === '24H'
                ? 'DANH SÁCH KHÁCH HẸN 24H'
                : activeTab === 'H'
                ? 'DANH SÁCH KHÁCH HẸN H (TRONG NGÀY)'
                : 'DANH SÁCH KHÁCH HÀNG'}
            </h1>
            <span
              style={{
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '3px 9px',
                borderRadius: '12px',
              }}
            >
              {activeTab === '24H'
                ? `${dsHen24H.length} xe`
                : activeTab === 'H'
                ? `${dsHenH.length} xe`
                : `Tổng: ${tongSoKhach || dsKhachTong.length} khách`}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '8px',
              alignItems: isMobile ? 'stretch' : 'center',
            }}
          >
            <input
              type="text"
              placeholder="🔍 Tìm biển số, tên, SĐT, cố vấn..."
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              style={{
                padding: isMobile ? '10px 12px' : '7px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: isMobile ? '15px' : '12px',
                outline: 'none',
                width: isMobile ? '100%' : '250px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activeTab === '24H' && canAdd && (
                <>
                  <button
                    type="button"
                    onClick={handleTaiFileMau}
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: isMobile ? '10px 12px' : '7px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    📥 File mẫu
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportExcel}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    disabled={thoiGian.daKhoa23h || importing}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundColor: thoiGian.daKhoa23h ? '#94a3b8' : '#059669',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: isMobile ? '10px 14px' : '7px 16px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: thoiGian.daKhoa23h || importing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {thoiGian.daKhoa23h
                      ? '🔒 Đã khóa sau 23h'
                      : importing
                      ? '⏳ Đang import...'
                      : '📤 Import Excel 24H'}
                  </button>
                </>
              )}

              {activeTab === 'H' && canAdd && (
                <button
                  type="button"
                  onClick={handleOpenAddH}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: isMobile ? '10px 14px' : '7px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Thêm hẹn H
                </button>
              )}

              <button
                type="button"
                onClick={() => loadDuLieu()}
                title="Làm mới bảng"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '6px',
                  padding: isMobile ? '10px 14px' : '7px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* HIỂN THỊ DỮ LIỆU */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : activeTab === '24H' || activeTab === 'H' ? (
          (() => {
            const listHienThi = activeTab === '24H' ? dsHen24H : dsHenH;
            if (listHienThi.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                  Chưa có khách hẹn nào trong danh sách này.
                </div>
              );
            }
            return (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                      <th style={{ padding: '12px 14px' }}>BIỂN SỐ</th>
                      <th style={{ padding: '12px 14px' }}>KHÁCH HÀNG</th>
                      <th style={{ padding: '12px 14px' }}>HẠNG MỤC</th>
                      <th style={{ padding: '12px 14px' }}>TRẠNG THÁI</th>
                      <th style={{ padding: '12px 14px' }}>SỐ ĐIỆN THOẠI</th>
                      <th style={{ padding: '12px 14px' }}>CỐ VẤN</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listHienThi.map((kh) => (
                      <tr key={kh.id || kh.bien_so} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#0284c7', whiteSpace: 'nowrap' }}>{kh.bien_so}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>{kh.ten_khach_hang}</td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {kh.hang_muc_du_kien ? (
                            <span
                              style={{
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                              }}
                            >
                              {kh.hang_muc_du_kien}
                            </span>
                          ) : (
                            '---'
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              backgroundColor: kh.trang_thai_hen === '24H' ? '#dcfce7' : '#e0f2fe',
                              color: kh.trang_thai_hen === '24H' ? '#15803d' : '#0369a1',
                              border: `1px solid ${kh.trang_thai_hen === '24H' ? '#bbf7d0' : '#bae6fd'}`,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            {kh.trang_thai_hen}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{kh.so_dien_thoai || '---'}</td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '500' }}>{kh.co_van || '---'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditHen(kh)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #bae6fd',
                                  color: '#0284c7',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                ✏️
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteHen(kh)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : dsKhachTong.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
            Không tìm thấy khách hàng nào.
          </div>
        ) : (
          /* TAB 3: DANH SÁCH KHÁCH HÀNG TỔNG */
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                  <th style={{ padding: '12px 14px' }}>BIỂN SỐ</th>
                  <th style={{ padding: '12px 14px' }}>KHÁCH HÀNG</th>
                  <th style={{ padding: '12px 14px' }}>SỐ ĐIỆN THOẠI</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {dsKhachTong.map((kh) => (
                  <tr key={kh.bien_so} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#0284c7' }}>{kh.bien_so}</td>
                    <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>{kh.ten_khach_hang}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{kh.so_dien_thoai || '---'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditKhachTong(kh)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#fff',
                              border: '1px solid #bae6fd',
                              color: '#0284c7',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteKhachTong(kh)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#fff',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THÊM KHÁCH HẸN H / SỬA THÔNG TIN */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: isSmallMobile ? '10px' : '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                {isEditing ? `✏️ Cập Nhật: ${formData.bien_so}` : '➕ Thêm Khách Hẹn H (Trong Ngày)'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>
                  Biển số xe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 93C14919"
                  value={formData.bien_so}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormData({ ...formData, bien_so: val });
                    if (!isEditing) handleTraCuuNhanhBienSo(val);
                  }}
                  disabled={isEditing}
                  required
                  style={{
                    ...responsiveInputStyle,
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                    backgroundColor: isEditing ? '#f1f5f9' : '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isSmallMobile ? '1fr' : '1.2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>
                    Tên khách hàng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Anh Cơ"
                    value={formData.ten_khach_hang}
                    onChange={(e) => setFormData({ ...formData, ten_khach_hang: e.target.value })}
                    required
                    style={responsiveInputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="VD: 0935291293"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    style={responsiveInputStyle}
                  />
                </div>
              </div>

              {/* Chỉ hiện Hạng mục & Cố vấn khi thêm/sửa lịch hẹn (không hiện khi sửa ở Tab Khách tổng) */}
              {!(activeTab === 'TONG' && isEditing) && (
                <div style={{ display: 'grid', gridTemplateColumns: isSmallMobile ? '1fr' : '1fr 1.2fr', gap: '10px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Hạng mục dự kiến</label>
                    <select
                      value={formData.hang_muc_du_kien}
                      onChange={(e) => setFormData({ ...formData, hang_muc_du_kien: e.target.value })}
                      style={responsiveInputStyle}
                    >
                      <option value="">-- Chọn hạng mục --</option>
                      {dsHangMuc.map((item, idx) => (
                        <option key={item.id || item.ma_hang_muc || idx} value={item.ma_hang_muc}>
                          {item.ma_hang_muc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Cố vấn viên (CVDV)</label>
                    <select
                      value={formData.co_van}
                      onChange={(e) => setFormData({ ...formData, co_van: e.target.value })}
                      style={responsiveInputStyle}
                    >
                      <option value="">-- Chưa chỉ định --</option>
                      {danhSachCoVan.map((nv) => (
                        <option key={nv.ma_nv} value={`${nv.ma_nv} ${nv.ho_ten}`}>
                          {nv.ma_nv} - {nv.ho_ten}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : '➕ Thêm hẹn H'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box' as const,
  outline: 'none',
};