'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function QuanLyDatHoaPage() {
  // Nhận diện màn hình di động (< 768px)
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Tab chính của phân hệ: 'DAT_HOA' | 'BAO_CAO'
  const [mainTab, setMainTab] = useState<'DAT_HOA' | 'BAO_CAO'>('DAT_HOA');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [danhSachHoa, setDanhSachHoa] = useState<any[]>([]);
  const [danhSachTVBH, setDanhSachTVBH] = useState<any[]>([]);
  const [danhSachPGD, setDanhSachPGD] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State của tab ĐẶT HOA GIAO XE
  const [search, setSearch] = useState('');
  const [tabTrangThai, setTabTrangThai] = useState<'CHUA_DUYET' | 'DA_DUYET' | 'TAT_CA'>('CHUA_DUYET');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAfter1630, setIsAfter1630] = useState(false);
  const [thoiGianHienTai, setThoiGianHienTai] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [form, setForm] = useState({
    ma_nv_tvbh: '',
    ten_khach_hang: '',
    hop_dong_so: '',
    so_vin_bien_so: '',
    ngay_gio_giao_xe: '',
    ghi_chu: '',
  });

  // State bộ lọc của tab BÁO CÁO
  const [tuNgay, setTuNgay] = useState<string>('');
  const [denNgay, setDenNgay] = useState<string>('');
  const [chonPhongBC, setChonPhongBC] = useState<string>('TAT_CA');
  const [chonTrangThaiBC, setChonTrangThaiBC] = useState<string>('TAT_CA');

  // Helper chuẩn hóa chuỗi
  function norm(val: any): string {
    return String(val || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function layPhongCuaNV(nv: any): string {
    if (!nv) return '';
    return String(nv.phong || nv.phong_ban || nv.ten_phong || '').trim();
  }

  function layBoPhanCuaNV(nv: any): string {
    if (!nv) return '';
    return String(nv.bo_phan || '').trim();
  }

  function layViTriCuaNV(nv: any): string {
    if (!nv) return '';
    return String(nv.vi_tri || nv.chuc_vu || nv.chuc_danh || '').trim();
  }

  // Kiểm tra giờ Việt Nam hiện tại có sau 16h30 không
  function checkSau16h30(): boolean {
    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const hours = vnTime.getHours();
    const minutes = vnTime.getMinutes();
    return hours > 16 || (hours === 16 && minutes >= 30);
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const now = new Date();
    const dauThang = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const cuoiThang = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setTuNgay(dauThang);
    setDenNgay(cuoiThang);

    loadData();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: nvData, error: nvError } = await supabase
        .from('nhan_vien')
        .select('*')
        .order('ma_nv', { ascending: true });

      if (nvError) {
        alert('❌ Lỗi truy vấn bảng nhan_vien: ' + nvError.message);
      }

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

        if (detectedUser) {
          setCurrentUser(detectedUser);
        }

        const nvHoatDong = nvData.filter(
          (nv) =>
            nv.phan_quyen !== 'LOCKED' &&
            nv.trang_thai !== 'LOCKED' &&
            norm(nv.tinh_trang) !== 'đã nghỉ việc'
        );

        const tvbhList = nvHoatDong.filter((nv) => {
          const vt = norm(layViTriCuaNV(nv));
          return vt.includes('tư vấn bán hàng') || vt === 'tvbh';
        });
        setDanhSachTVBH(tvbhList);

        const pgdList = nvHoatDong.filter((nv) => {
          const bp = norm(layBoPhanCuaNV(nv));
          const vt = norm(layViTriCuaNV(nv));
          return bp === 'kinh doanh' && (vt.includes('phó giám đốc kinh doanh') || vt.includes('phó giám đốc'));
        });
        setDanhSachPGD(pgdList);
      }

      const { data: hoaData } = await supabase
        .from('kinh_doanh_dat_hoa')
        .select('*')
        .order('dau_thoi_gian', { ascending: false });

      if (hoaData) setDanhSachHoa(hoaData);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu đặt hoa:', err);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // PHÂN QUYỀN XEM, TẠO & DUYỆT ĐƠN ĐẶT HOA
  // =========================================================================
  function getVaiTroUser(user: any) {
    if (!user) return { isToanQuyen: false, isPGDKD: false, phongPGD: '', maNV: '' };

    const role = String(user.phan_quyen || '').toUpperCase().trim();
    const bp = norm(layBoPhanCuaNV(user));
    const vt = norm(layViTriCuaNV(user));
    const phong = norm(layPhongCuaNV(user));
    const maNV = String(user.ma_nv || '').trim();

    const isAdmin = role === 'ADMIN';
    const isHCNSQuyen =
      bp === 'hcns' &&
      (vt === 'nhân viên hcns' || vt === 'nhân viên it' || vt === 'phó phòng hcns');

    const isPGDKD =
      bp === 'kinh doanh' &&
      (vt === 'phó giám đốc kinh doanh' || vt.includes('phó giám đốc kinh doanh'));

    return {
      isToanQuyen: isAdmin || isHCNSQuyen,
      isPGDKD,
      phongPGD: phong,
      maNV,
    };
  }

  const { isToanQuyen, isPGDKD, phongPGD, maNV } = getVaiTroUser(currentUser);
  const coQuyenChonTVBH = isToanQuyen;
  const coQuyenTaoPhieu = isToanQuyen || !isPGDKD;

  function coQuyenXemDon(don: any): boolean {
    if (!currentUser) return false;
    if (isToanQuyen) return true;

    if (isPGDKD) {
      const phongDon = norm(don.phong_kinh_doanh);
      return phongPGD !== '' && phongDon === phongPGD;
    }

    const maDon = String(don.ma_nv_tvbh || '').trim();
    const tenDon = String(don.tu_van_ban_hang || '').trim();
    return (maNV !== '' && maDon === maNV) || (maNV !== '' && tenDon.startsWith(maNV));
  }

  function coQuyenDuyetDon(don: any): boolean {
    if (!currentUser) return false;
    if (isToanQuyen) return true;

    if (isPGDKD) {
      const phongDon = norm(don.phong_kinh_doanh);
      return phongPGD !== '' && phongDon === phongPGD;
    }

    return false;
  }

  function handleOpenForm() {
    const sau1630 = checkSau16h30();
    setIsAfter1630(sau1630);
    setThoiGianHienTai(new Date().toLocaleString('vi-VN'));
    setImageFile(null);
    setImagePreview('');

    const maMacDinh = coQuyenChonTVBH ? '' : String(currentUser?.ma_nv || '').trim();

    setForm({
      ma_nv_tvbh: maMacDinh,
      ten_khach_hang: '',
      hop_dong_so: '',
      so_vin_bien_so: '',
      ngay_gio_giao_xe: '',
      ghi_chu: '',
    });
    setModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sau1630HienTai = checkSau16h30();
    setIsAfter1630(sau1630HienTai);

    const maNVChot = coQuyenChonTVBH ? form.ma_nv_tvbh : String(currentUser?.ma_nv || '').trim();

    if (!maNVChot || !form.ten_khach_hang.trim() || !form.hop_dong_so.trim() || !form.ngay_gio_giao_xe) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc (*)');
      return;
    }

    if (sau1630HienTai && !imageFile) {
      alert('⚠️ Hiện tại đã quá 16h30! Bạn bắt buộc phải chụp hoặc tải lên hình ảnh xác nhận để gửi duyệt.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedImageUrl = '';

      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${form.hop_dong_so.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('dat-hoa-images')
          .upload(fileName, imageFile);

        if (uploadErr) throw new Error('Lỗi tải ảnh lên: ' + uploadErr.message);

        const { data: pubUrl } = supabase.storage
          .from('dat-hoa-images')
          .getPublicUrl(fileName);
        uploadedImageUrl = pubUrl.publicUrl;
      }

      const tvbhObj = danhSachTVBH.find((x) => x.ma_nv === maNVChot) || currentUser;
      const tenHienThiTVBH = tvbhObj ? `${tvbhObj.ma_nv} ${tvbhObj.ho_ten}` : maNVChot;
      const phongKD = layPhongCuaNV(tvbhObj) || layBoPhanCuaNV(tvbhObj) || 'Kinh doanh';

      const pgdPhuTrach = danhSachPGD.find(
        (pgd) => norm(layPhongCuaNV(pgd)) === norm(phongKD)
      );
      const chatIdPGD =
        pgdPhuTrach?.id_chat_bot ||
        pgdPhuTrach?.id_zalo_bot ||
        pgdPhuTrach?.uid_zalo ||
        '';

      const { error: insertErr } = await supabase.from('kinh_doanh_dat_hoa').insert([
        {
          tu_van_ban_hang: tenHienThiTVBH,
          ma_nv_tvbh: maNVChot,
          phong_kinh_doanh: phongKD,
          ten_khach_hang: form.ten_khach_hang.trim(),
          hop_dong_so: form.hop_dong_so.trim(),
          so_vin_bien_so: form.so_vin_bien_so.trim(),
          ngay_gio_giao_xe: new Date(form.ngay_gio_giao_xe).toISOString(),
          ghi_chu: form.ghi_chu.trim(),
          dat_sau_16h30: sau1630HienTai,
          hinh_anh_url: uploadedImageUrl,
          trang_thai: 'CHUA_DUYET',
        },
      ]);

      if (insertErr) throw insertErr;

      const giaoXeStr = new Date(form.ngay_gio_giao_xe).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      await fetch('/api/zalo-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DAT_HOA',
          hanh_dong: 'TAO_MOI',
          tu_van_ban_hang: tenHienThiTVBH,
          phong_kinh_doanh: phongKD,
          ten_khach_hang: form.ten_khach_hang.trim(),
          hop_dong_so: form.hop_dong_so.trim(),
          so_vin_bien_so: form.so_vin_bien_so.trim(),
          ngay_gio_giao_xe: giaoXeStr,
          ghi_chu: form.ghi_chu.trim(),
          dat_sau_16h30: sau1630HienTai,
          hinh_anh_url: uploadedImageUrl,
          chat_id_pgd: chatIdPGD,
        }),
      });

      alert(
        `✅ Đã gửi yêu cầu đặt hoa cho khách ${form.ten_khach_hang}!\nChuyển duyệt tới: ${phongKD}${
          pgdPhuTrach ? ` (${pgdPhuTrach.ho_ten})` : ''
        }`
      );
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Lỗi lưu đơn đặt hoa: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleXuLyDuyet(don: any, trangThaiMoi: 'DA_DUYET' | 'TU_CHOI') {
    if (!coQuyenDuyetDon(don)) {
      alert('⛔ Bạn không có quyền duyệt đơn đặt hoa này!');
      return;
    }

    let lyDo = '';
    if (trangThaiMoi === 'TU_CHOI') {
      const inputLyDo = prompt('Nhập lý do từ chối đơn đặt hoa này:');
      if (inputLyDo === null) return;
      lyDo = inputLyDo;
    } else {
      if (!confirm(`Xác nhận DUYỆT đơn đặt hoa cho KH: ${don.ten_khach_hang} (HĐ: ${don.hop_dong_so})?`)) return;
    }

    try {
      const tenNguoiDuyet = currentUser
        ? `${currentUser.ma_nv || ''} ${currentUser.ho_ten || 'Admin'}`.trim()
        : 'Admin';

      const { error } = await supabase
        .from('kinh_doanh_dat_hoa')
        .update({
          trang_thai: trangThaiMoi,
          nguoi_duyet: tenNguoiDuyet,
          thoi_gian_duyet: new Date().toISOString(),
          ly_do_tu_choi: lyDo,
        })
        .eq('id', don.id);

      if (error) throw error;

      const tvbhObj = danhSachTVBH.find((x) => x.ma_nv === don.ma_nv_tvbh);
      const uidTVBH = tvbhObj?.id_chat_bot || tvbhObj?.id_zalo_bot || '';

      await fetch('/api/zalo-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DAT_HOA',
          hanh_dong: trangThaiMoi,
          tu_van_ban_hang: don.tu_van_ban_hang,
          ten_khach_hang: don.ten_khach_hang,
          hop_dong_so: don.hop_dong_so,
          ngay_gio_giao_xe: new Date(don.ngay_gio_giao_xe).toLocaleString('vi-VN'),
          nguoi_duyet: tenNguoiDuyet,
          ly_do_tu_choi: lyDo,
          chat_id_pgd: uidTVBH,
        }),
      });

      alert(trangThaiMoi === 'DA_DUYET' ? '✅ Đã duyệt đơn đặt hoa!' : '❌ Đã từ chối đơn đặt hoa!');
      loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật trạng thái: ' + err.message);
    }
  }

  // =========================================================================
  // DỮ LIỆU CHO TAB 1: ĐẶT HOA GIAO XE
  // =========================================================================
  const dsTheoQuyen = danhSachHoa.filter((item) => coQuyenXemDon(item));

  const dsHienThi = dsTheoQuyen.filter((item) => {
    const matchTab = tabTrangThai === 'TAT_CA' ? true : item.trang_thai === tabTrangThai;
    const kw = search.toLowerCase().trim();
    const matchSearch =
      !kw ||
      (item.ten_khach_hang || '').toLowerCase().includes(kw) ||
      (item.hop_dong_so || '').toLowerCase().includes(kw) ||
      (item.tu_van_ban_hang || '').toLowerCase().includes(kw) ||
      (item.so_vin_bien_so || '').toLowerCase().includes(kw);
    return matchTab && matchSearch;
  });

  const soLuongChuaDuyet = dsTheoQuyen.filter((x) => x.trang_thai === 'CHUA_DUYET').length;
  const soLuongDaDuyet = dsTheoQuyen.filter((x) => x.trang_thai === 'DA_DUYET').length;

  // =========================================================================
  // DỮ LIỆU CHO TAB 2: BÁO CÁO
  // =========================================================================
  const duLieuBaoCao = dsTheoQuyen.filter((item) => {
    const ngayTao = item.dau_thoi_gian ? new Date(item.dau_thoi_gian).toISOString().split('T')[0] : '';
    if (tuNgay && ngayTao && ngayTao < tuNgay) return false;
    if (denNgay && ngayTao && ngayTao > denNgay) return false;

    if (chonPhongBC !== 'TAT_CA' && norm(item.phong_kinh_doanh) !== norm(chonPhongBC)) {
      return false;
    }

    if (chonTrangThaiBC !== 'TAT_CA' && item.trang_thai !== chonTrangThaiBC) {
      return false;
    }

    return true;
  });

  const bcTongDon = duLieuBaoCao.length;
  const bcDaDuyet = duLieuBaoCao.filter((x) => x.trang_thai === 'DA_DUYET').length;
  const bcChuaDuyet = duLieuBaoCao.filter((x) => x.trang_thai === 'CHUA_DUYET').length;
  const bcTuChoi = duLieuBaoCao.filter((x) => x.trang_thai === 'TU_CHOI').length;
  const bcSau1630 = duLieuBaoCao.filter((x) => x.dat_sau_16h30 === true).length;

  const thongKePhongMap: Record<string, { tong: number; daDuyet: number; chuaDuyet: number; tuChoi: number; tre1630: number }> = {};
  duLieuBaoCao.forEach((item) => {
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

  const thongKeTVBHMap: Record<string, { ten: string; phong: string; tong: number; daDuyet: number; tre1630: number }> = {};
  duLieuBaoCao.forEach((item) => {
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

  function handleExportCSV() {
    if (duLieuBaoCao.length === 0) {
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

    const rows = duLieuBaoCao.map((r, idx) => {
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
    <div
      style={{
        padding: isMobile ? '12px' : '20px',
        fontFamily: 'Segoe UI, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* HEADER CHUNG CỦA PHÂN HỆ QUẢN LÝ ĐẶT HOA & THANH CHUYỂN 2 MỤC CON */}
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
          <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', color: '#0f172a' }}>
            🌸 QUẢN LÝ ĐẶT HOA
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
            Quy định: Đặt hoa trước <b>16h30</b>. Sau 16h30 bắt buộc đính kèm hình ảnh xác nhận để Phó GĐKD từng phòng duyệt.
          </p>
        </div>

        {/* 2 Tab phân hệ con: ĐẶT HOA GIAO XE & BÁO CÁO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            backgroundColor: '#f1f5f9',
            padding: '5px',
            borderRadius: '10px',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          <button
            onClick={() => setMainTab('DAT_HOA')}
            style={{
              padding: isMobile ? '10px 8px' : '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: mainTab === 'DAT_HOA' ? '#0284c7' : 'transparent',
              color: mainTab === 'DAT_HOA' ? '#fff' : '#334155',
              fontWeight: 'bold',
              fontSize: isMobile ? '12px' : '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: mainTab === 'DAT_HOA' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            💐 ĐẶT HOA GIAO XE
          </button>
          <button
            onClick={() => setMainTab('BAO_CAO')}
            style={{
              padding: isMobile ? '10px 8px' : '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: mainTab === 'BAO_CAO' ? '#0284c7' : 'transparent',
              color: mainTab === 'BAO_CAO' ? '#fff' : '#334155',
              fontWeight: 'bold',
              fontSize: isMobile ? '12px' : '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: mainTab === 'BAO_CAO' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            📊 BÁO CÁO
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* NỘI DUNG 1: ĐẶT HOA GIAO XE                                           */}
      {/* ===================================================================== */}
      {mainTab === 'DAT_HOA' && (
        <>
          {/* Thanh công cụ tìm kiếm & Tạo phiếu */}
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Tabs trạng thái */}
            <div
              style={{
                display: isMobile ? 'grid' : 'flex',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : undefined,
                gap: '6px',
              }}
            >
              <button
                onClick={() => setTabTrangThai('CHUA_DUYET')}
                style={{
                  padding: isMobile ? '9px 4px' : '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #f59e0b',
                  backgroundColor: tabTrangThai === 'CHUA_DUYET' ? '#fef3c7' : '#fff',
                  color: '#b45309',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '11px' : '13px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                ⏳ CHỜ ({soLuongChuaDuyet})
              </button>
              <button
                onClick={() => setTabTrangThai('DA_DUYET')}
                style={{
                  padding: isMobile ? '9px 4px' : '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  backgroundColor: tabTrangThai === 'DA_DUYET' ? '#d1fae5' : '#fff',
                  color: '#047857',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '11px' : '13px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                ✅ DUYỆT ({soLuongDaDuyet})
              </button>
              <button
                onClick={() => setTabTrangThai('TAT_CA')}
                style={{
                  padding: isMobile ? '9px 4px' : '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: tabTrangThai === 'TAT_CA' ? '#e2e8f0' : '#fff',
                  color: '#334155',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '11px' : '13px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                📋 TẤT CẢ ({dsTheoQuyen.length})
              </button>
            </div>

            {/* Ô tìm kiếm + Nút tạo phiếu */}
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '8px',
                alignItems: 'stretch',
              }}
            >
              <input
                type="text"
                placeholder="🔍 Tìm KH, Số HĐ, TVBH, Biển số..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: isMobile ? '10px 12px' : '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: isMobile ? '15px' : '13px',
                  width: isMobile ? '100%' : '250px',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                }}
              />
              {coQuyenTaoPhieu && (
                <button
                  onClick={handleOpenForm}
                  style={{
                    padding: isMobile ? '11px 16px' : '9px 16px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: isMobile ? '14px' : '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Tạo Phiếu Đặt Hoa
                </button>
              )}
            </div>
          </div>

          {/* HIỂN THỊ DẠNG CARD TRÊN MOBILE / DẠNG BẢNG TRÊN DESKTOP */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? (
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#64748b' }}>
                  Đang tải danh sách đặt hoa...
                </div>
              ) : dsHienThi.length === 0 ? (
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#64748b' }}>
                  Không có dữ liệu phù hợp.
                </div>
              ) : (
                dsHienThi.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '10px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderLeft:
                        row.trang_thai === 'DA_DUYET'
                          ? '4px solid #16a34a'
                          : row.trang_thai === 'TU_CHOI'
                          ? '4px solid #dc2626'
                          : '4px solid #f59e0b',
                    }}
                  >
                    {/* Dòng 1: Tên khách + Phòng KD */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                        👤 {row.ten_khach_hang}
                      </div>
                      <span style={{ padding: '3px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {row.phong_kinh_doanh || '---'}
                      </span>
                    </div>

                    {/* Thông tin chi tiết */}
                    <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                      <div>
                        <b>TVBH:</b> {row.tu_van_ban_hang}
                      </div>
                      <div>
                        <b>Số HĐ:</b> {row.hop_dong_so} {row.so_vin_bien_so ? `| VIN/BS: ${row.so_vin_bien_so}` : ''}
                      </div>
                      <div style={{ color: '#0284c7', fontWeight: '600' }}>
                        🚗 Giao xe: {new Date(row.ngay_gio_giao_xe).toLocaleString('vi-VN')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        🕒 Đặt lúc: {new Date(row.dau_thoi_gian).toLocaleString('vi-VN')}{' '}
                        {row.dat_sau_16h30 && (
                          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>⚠️ (Sau 16h30)</span>
                        )}
                      </div>
                      {row.ghi_chu && (
                        <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
                          📝 {row.ghi_chu}
                        </div>
                      )}
                      {row.hinh_anh_url && (
                        <a
                          href={row.hinh_anh_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#0284c7', fontWeight: 'bold', fontSize: '13px', marginTop: '2px', display: 'inline-block' }}
                        >
                          🖼️ Xem hình ảnh đính kèm
                        </a>
                      )}
                    </div>

                    {/* Nút Duyệt / Trạng thái */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      {row.trang_thai === 'CHUA_DUYET' ? (
                        coQuyenDuyetDon(row) ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                              onClick={() => handleXuLyDuyet(row, 'DA_DUYET')}
                              style={{ padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              ✓ Duyệt đơn
                            </button>
                            <button
                              onClick={() => handleXuLyDuyet(row, 'TU_CHOI')}
                              style={{ padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: '12px' }}>
                            ⏳ Chờ PGĐ {row.phong_kinh_doanh} duyệt
                          </span>
                        )
                      ) : row.trang_thai === 'DA_DUYET' ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✅ Đã duyệt</span>
                          <span style={{ color: '#64748b' }}>Bởi: {row.nguoi_duyet}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>❌ Từ chối</span>
                          <div style={{ color: '#64748b', marginTop: '2px' }}>{row.ly_do_tu_choi}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Bảng danh sách đơn hoa trên Desktop */
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#334155', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px' }}>Dấu thời gian</th>
                    <th style={{ padding: '12px' }}>Tư vấn bán hàng</th>
                    <th style={{ padding: '12px' }}>Phòng KD</th>
                    <th style={{ padding: '12px' }}>Tên khách hàng</th>
                    <th style={{ padding: '12px' }}>Hợp đồng số</th>
                    <th style={{ padding: '12px' }}>Số VIN/Biển số</th>
                    <th style={{ padding: '12px' }}>Ngày/giờ giao xe</th>
                    <th style={{ padding: '12px' }}>Ảnh / Ghi chú</th>
                    <th style={{ padding: '12px' }}>Trạng thái / Duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        Đang tải danh sách đặt hoa...
                      </td>
                    </tr>
                  ) : dsHienThi.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        Không có dữ liệu phù hợp.
                      </td>
                    </tr>
                  ) : (
                    dsHienThi.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(row.dau_thoi_gian).toLocaleString('vi-VN')}
                          {row.dat_sau_16h30 && (
                            <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>⚠️ Sau 16h30</div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{row.tu_van_ban_hang}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '3px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {row.phong_kinh_doanh || '---'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{row.ten_khach_hang}</td>
                        <td style={{ padding: '12px' }}>{row.hop_dong_so}</td>
                        <td style={{ padding: '12px' }}>{row.so_vin_bien_so || '---'}</td>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#0284c7' }}>
                          {new Date(row.ngay_gio_giao_xe).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {row.hinh_anh_url && (
                            <a href={row.hinh_anh_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: '4px', color: '#0284c7', fontWeight: 'bold', fontSize: '12px' }}>
                              🖼️ Xem ảnh đính kèm
                            </a>
                          )}
                          <div style={{ color: '#475569', fontSize: '12px' }}>{row.ghi_chu || '---'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {row.trang_thai === 'CHUA_DUYET' ? (
                            coQuyenDuyetDon(row) ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleXuLyDuyet(row, 'DA_DUYET')}
                                  style={{ padding: '6px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  ✓ Duyệt
                                </button>
                                <button
                                  onClick={() => handleXuLyDuyet(row, 'TU_CHOI')}
                                  style={{ padding: '6px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  ✕ Từ chối
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: '12px' }}>
                                ⏳ Chờ PGĐ {row.phong_kinh_doanh} duyệt
                              </span>
                            )
                          ) : row.trang_thai === 'DA_DUYET' ? (
                            <div>
                              <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px' }}>✅ Đã duyệt</span>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Bởi: {row.nguoi_duyet}</div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '12px' }}>❌ Từ chối</span>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{row.ly_do_tu_choi}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* NỘI DUNG 2: BÁO CÁO ĐẶT HOA                                           */}
      {/* ===================================================================== */}
      {mainTab === 'BAO_CAO' && (
        <>
          {/* Thanh Bộ Lọc Báo Cáo */}
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
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, auto)',
                gap: '10px',
                alignItems: 'flex-end',
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
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
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
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {isToanQuyen && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    Phòng Kinh Doanh
                  </label>
                  <select
                    value={chonPhongBC}
                    onChange={(e) => setChonPhongBC(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}
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
                  value={chonTrangThaiBC}
                  onChange={(e) => setChonTrangThaiBC(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="TAT_CA">-- Tất cả --</option>
                  <option value="DA_DUYET">✅ Đã duyệt</option>
                  <option value="CHUA_DUYET">⏳ Chưa duyệt</option>
                  <option value="TU_CHOI">❌ Từ chối</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              style={{
                padding: isMobile ? '10px 16px' : '9px 16px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              📥 Xuất Excel (CSV)
            </button>
          </div>

          {/* 5 Thẻ KPI Tổng Quan */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TỔNG PHIẾU HOA</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{bcTongDon}</div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ĐÃ DUYỆT</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{bcDaDuyet}</div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>CHỜ DUYỆT</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>{bcChuaDuyet}</div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TỪ CHỐI</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>{bcTuChoi}</div>
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
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ĐẶT SAU 16H30</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#7e22ce', marginTop: '4px' }}>{bcSau1630}</div>
            </div>
          </div>

          {/* 2 Bảng Tổng Hợp Theo Phòng KD & Theo TVBH */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#0f172a' }}>🏢 Tổng hợp theo Phòng Kinh Doanh</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px' }}>Phòng KD</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Tổng</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>Duyệt</th>
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

            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxHeight: '320px', overflowY: 'auto', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#0f172a' }}>👨‍💼 Thống kê theo Tư vấn bán hàng</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px' }}>Tư vấn bán hàng</th>
                    <th style={{ padding: '8px' }}>Phòng</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Tổng</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>Duyệt</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: '#7e22ce' }}>Trễ</th>
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
                        <td style={{ padding: '8px', fontSize: '11px', color: '#64748b' }}>{tv.phong}</td>
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

          {/* Bảng kê chi tiết */}
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#0f172a' }}>
              📋 Bảng kê chi tiết đơn đặt hoa ({duLieuBaoCao.length} phiếu)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '680px' }}>
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
                ) : duLieuBaoCao.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Không có dữ liệu trong kỳ báo cáo.</td>
                  </tr>
                ) : (
                  duLieuBaoCao.map((row, index) => (
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
        </>
      )}

      {/* ===================================================================== */}
      {/* MODAL FORM ĐẶT HOA                                                    */}
      {/* ===================================================================== */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : '480px',
              backgroundColor: '#fff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 25px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#475569', padding: '4px' }}
                >
                  ✕
                </button>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>Đặt hoa Form</h3>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#0284c7', fontWeight: '600', cursor: 'pointer' }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  form="formDatHoa"
                  disabled={submitting}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: submitting ? 'wait' : 'pointer' }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>

            <form id="formDatHoa" onSubmit={handleSubmit} style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {isAfter1630 && (
                <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
                  🚨 <b>Đã qua 16h30:</b> Vui lòng chụp hoặc tải lên hình ảnh xác nhận xe/hợp đồng bên dưới để được duyệt đơn hoa!
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Dấu thời gian <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={thoiGianHienTai}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '15px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Tư vấn bán hàng <span style={{ color: '#ef4444' }}>*</span>
                </label>

                {coQuyenChonTVBH ? (
                  <select
                    required
                    value={form.ma_nv_tvbh}
                    onChange={(e) => setForm({ ...form, ma_nv_tvbh: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      backgroundColor: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">-- Chọn Tư vấn bán hàng --</option>
                    {danhSachTVBH.map((tv) => (
                      <option key={tv.ma_nv} value={tv.ma_nv}>
                        {tv.ma_nv} {tv.ho_ten}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={
                      currentUser
                        ? `${currentUser.ma_nv} ${currentUser.ho_ten}`
                        : 'Chưa xác định tài khoản'
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      fontWeight: '600',
                      fontSize: '15px',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Tên khách hàng <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.ten_khach_hang}
                  onChange={(e) => setForm({ ...form, ten_khach_hang: e.target.value })}
                  placeholder="Nhập họ tên khách hàng..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Hợp đồng số <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.hop_dong_so}
                  onChange={(e) => setForm({ ...form, hop_dong_so: e.target.value })}
                  placeholder="VD: 014-1126-BPF"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Số VIN/ Biển số
                </label>
                <input
                  type="text"
                  value={form.so_vin_bien_so}
                  onChange={(e) => setForm({ ...form, so_vin_bien_so: e.target.value })}
                  placeholder="Nhập số khung VIN hoặc biển số..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Ngày/giờ giao xe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.ngay_gio_giao_xe}
                  onChange={(e) => setForm({ ...form, ngay_gio_giao_xe: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: isAfter1630 ? '#dc2626' : '#475569', marginBottom: '6px' }}>
                  📷 Chụp hình / Tải ảnh xác nhận {isAfter1630 && <span style={{ color: '#ef4444' }}>* (Bắt buộc sau 16h30)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required={isAfter1630}
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isAfter1630 ? '1px solid #f87171' : '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ marginTop: '10px', width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={form.ghi_chu}
                  onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
                  placeholder="Nhập ghi chú nếu có..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}