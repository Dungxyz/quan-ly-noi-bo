'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function QuanLyDatHoaPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [danhSachHoa, setDanhSachHoa] = useState<any[]>([]);
  const [danhSachTVBH, setDanhSachTVBH] = useState<any[]>([]);
  const [danhSachPGD, setDanhSachPGD] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabTrangThai, setTabTrangThai] = useState<'CHUA_DUYET' | 'DA_DUYET' | 'TAT_CA'>('CHUA_DUYET');

  // State Form tạo đơn đặt hoa
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAfter1630, setIsAfter1630] = useState(false);
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

  // Helper chuẩn hóa chuỗi để so sánh không lệch dấu/khoảng trắng
  function norm(val: any): string {
    return String(val || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper lấy giá trị cột Phòng của nhân viên (VD: "Kinh doanh 1", "Kinh doanh 2")
  function layPhongCuaNV(nv: any): string {
    if (!nv) return '';
    return String(nv.phong || nv.phong_ban || nv.ten_phong || '').trim();
  }

  // Helper lấy giá trị cột Bộ Phận (VD: "Kinh doanh", "HCNS")
  function layBoPhanCuaNV(nv: any): string {
    if (!nv) return '';
    return String(nv.bo_phan || '').trim();
  }

  // Helper lấy giá trị cột Vị Trí / Chức Vụ
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
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Lấy toàn bộ nhân sự từ bảng nhan_vien
      const { data: nvData, error: nvError } = await supabase
        .from('nhan_vien')
        .select('*')
        .order('ma_nv', { ascending: true });

      if (nvError) {
        alert('❌ Lỗi truy vấn bảng nhan_vien: ' + nvError.message);
        console.error('Lỗi tải bảng nhan_vien:', nvError);
      }

      if (nvData && nvData.length > 0) {
        // --- TỰ ĐỘNG NHẬN DIỆN NGƯỜI ĐĂNG NHẬP TỪ STORAGE / COOKIE ---
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
        // -------------------------------------------------------------

        // Lọc bỏ tài khoản bị khóa (LOCKED) và đã nghỉ việc
        const nvHoatDong = nvData.filter(
          (nv) =>
            nv.phan_quyen !== 'LOCKED' &&
            nv.trang_thai !== 'LOCKED' &&
            norm(nv.tinh_trang) !== 'đã nghỉ việc'
        );

        // Lấy đúng những người có Vị trí là "Tư vấn bán hàng" hoặc "TVBH"
        const tvbhList = nvHoatDong.filter((nv) => {
          const vt = norm(layViTriCuaNV(nv));
          return vt.includes('tư vấn bán hàng') || vt === 'tvbh';
        });
        setDanhSachTVBH(tvbhList);

        // Lọc Phó Giám đốc Kinh doanh (của các phòng)
        const pgdList = nvHoatDong.filter((nv) => {
          const bp = norm(layBoPhanCuaNV(nv));
          const vt = norm(layViTriCuaNV(nv));
          return bp === 'kinh doanh' && (vt.includes('phó giám đốc kinh doanh') || vt.includes('phó giám đốc'));
        });
        setDanhSachPGD(pgdList);
      }

      // 2. Lấy danh sách đơn đặt hoa
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
  // PHÂN QUYỀN XEM & DUYỆT ĐƠN ĐẶT HOA
  // =========================================================================
  function getVaiTroUser(user: any) {
    if (!user) return { isToanQuyen: false, isPGDKD: false, phongPGD: '', maNV: '' };

    const role = String(user.phan_quyen || '').toUpperCase().trim();
    const bp = norm(layBoPhanCuaNV(user));
    const vt = norm(layViTriCuaNV(user));
    const phong = norm(layPhongCuaNV(user));
    const maNV = String(user.ma_nv || '').trim();

    // 1. Admin hoặc HCNS có thẩm quyền (Nhân viên HCNS, Nhân viên IT, Phó phòng HCNS)
    const isAdmin = role === 'ADMIN';
    const isHCNSQuyen =
      bp === 'hcns' &&
      (vt === 'nhân viên hcns' || vt === 'nhân viên it' || vt === 'phó phòng hcns');

    // 2. Kinh doanh / Phó Giám đốc Kinh doanh
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

  // Kiểm tra user có được PHÉP NHÌN THẤY đơn này trong danh sách không
  function coQuyenXemDon(don: any): boolean {
    if (!currentUser) return false;
    const { isToanQuyen, isPGDKD, phongPGD, maNV } = getVaiTroUser(currentUser);

    // Admin và HCNS được phân quyền: thấy tất cả đơn
    if (isToanQuyen) return true;

    // Phó Giám đốc Kinh doanh: chỉ thấy đơn của đúng Phòng mình phụ trách (VD: Kinh doanh 1 / Kinh doanh 2)
    if (isPGDKD) {
      const phongDon = norm(don.phong_kinh_doanh);
      return phongPGD !== '' && phongDon === phongPGD;
    }

    // Các tài khoản còn lại (TVBH...): chỉ thấy đơn của chính tài khoản đó, không thấy của người khác
    const maDon = String(don.ma_nv_tvbh || '').trim();
    const tenDon = String(don.tu_van_ban_hang || '').trim();
    return (maNV !== '' && maDon === maNV) || (maNV !== '' && tenDon.startsWith(maNV));
  }

  // Kiểm tra user có được PHÉP BẤM NÚT DUYỆT / TỪ CHỐI trên đơn này không
  function coQuyenDuyetDon(don: any): boolean {
    if (!currentUser) return false;
    const { isToanQuyen, isPGDKD, phongPGD } = getVaiTroUser(currentUser);

    // Admin và HCNS (Nhân viên HCNS, Nhân viên IT, Phó phòng HCNS)
    if (isToanQuyen) return true;

    // Phó Giám đốc Kinh doanh: chỉ duyệt đơn của đúng Phòng mình
    if (isPGDKD) {
      const phongDon = norm(don.phong_kinh_doanh);
      return phongPGD !== '' && phongDon === phongPGD;
    }

    return false;
  }
  // Chỉ ADMIN hoặc HCNS (Nhân viên HCNS, Nhân viên IT, Phó phòng HCNS) mới được chọn TVBH khác
  const coQuyenChonTVBH = getVaiTroUser(currentUser).isToanQuyen;

  // Mở form tạo đơn đặt hoa
  function handleOpenForm() {
    const sau1630 = checkSau16h30();
    setIsAfter1630(sau1630);
    setImageFile(null);
    setImagePreview('');

    // Nếu không có quyền chọn TVBH khác -> khóa cứng theo chính tài khoản đang đăng nhập
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

  // Lưu đơn đặt hoa mới
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sau1630HienTai = checkSau16h30();
    setIsAfter1630(sau1630HienTai);

    if (!form.ma_nv_tvbh || !form.ten_khach_hang.trim() || !form.hop_dong_so.trim() || !form.ngay_gio_giao_xe) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc (*)');
      return;
    }

    // Bắt buộc chụp/đính kèm ảnh nếu đặt sau 16h30
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

      // Tìm thông tin TVBH & đúng tên Phòng (Kinh doanh 1 / Kinh doanh 2)
      const tvbhObj = danhSachTVBH.find((x) => x.ma_nv === form.ma_nv_tvbh);
      const tenHienThiTVBH = tvbhObj ? `${tvbhObj.ma_nv} ${tvbhObj.ho_ten}` : form.ma_nv_tvbh;
      const phongKD = layPhongCuaNV(tvbhObj) || layBoPhanCuaNV(tvbhObj) || 'Kinh doanh';

      // Tìm Phó Giám đốc Kinh doanh phụ trách đúng Phòng đó để lấy ID Zalo Bot
      const pgdPhuTrach = danhSachPGD.find(
        (pgd) => norm(layPhongCuaNV(pgd)) === norm(phongKD)
      );
      const chatIdPGD =
        pgdPhuTrach?.id_chat_bot ||
        pgdPhuTrach?.id_zalo_bot ||
        pgdPhuTrach?.uid_zalo ||
        '';

      // Insert vào Supabase
      const { error: insertErr } = await supabase.from('kinh_doanh_dat_hoa').insert([
        {
          tu_van_ban_hang: tenHienThiTVBH,
          ma_nv_tvbh: form.ma_nv_tvbh,
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

      // Bắn thông báo Zalo tới Phó GĐKD phòng đó & nhóm chung
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

  // Xử lý Duyệt hoặc Từ chối đơn
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

  // Bước 1: Lọc danh sách theo đúng quyền xem của tài khoản đang đăng nhập
  const dsTheoQuyen = danhSachHoa.filter((item) => coQuyenXemDon(item));

  // Bước 2: Lọc tiếp theo Tab trạng thái và ô Tìm kiếm
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Thanh tiêu đề & tìm kiếm */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
            💐 QUẢN LÝ ĐẶT HOA GIAO XE
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Quy định: Đặt hoa trước <b>16h30</b>. Sau 16h30 bắt buộc đính kèm hình ảnh xác nhận để Phó GĐKD từng phòng duyệt.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Tìm KH, Số HĐ, TVBH, Biển số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', width: '250px' }}
          />
          <button
            onClick={handleOpenForm}
            style={{
              padding: '9px 16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            + Tạo Phiếu Đặt Hoa
          </button>
        </div>
      </div>

      {/* Tabs trạng thái */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setTabTrangThai('CHUA_DUYET')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #f59e0b',
            backgroundColor: tabTrangThai === 'CHUA_DUYET' ? '#fef3c7' : '#fff',
            color: '#b45309',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ⏳ CHƯA DUYỆT ({soLuongChuaDuyet})
        </button>
        <button
          onClick={() => setTabTrangThai('DA_DUYET')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #10b981',
            backgroundColor: tabTrangThai === 'DA_DUYET' ? '#d1fae5' : '#fff',
            color: '#047857',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ✅ ĐÃ DUYỆT
        </button>
        <button
          onClick={() => setTabTrangThai('TAT_CA')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: tabTrangThai === 'TAT_CA' ? '#e2e8f0' : '#fff',
            color: '#334155',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          📋 TẤT CẢ ({dsTheoQuyen.length})
        </button>
      </div>

      {/* Bảng danh sách đơn hoa */}
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

      {/* MODAL / DRAWER FORM ĐẶT HOA GIỐNG MẪU APPSHEET */}
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
              maxWidth: '480px',
              backgroundColor: '#fff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 25px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header giống AppSheet */}
            <div
              style={{
                padding: '14px 20px',
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
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#475569' }}
                >
                  ✕
                </button>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>Đặt hoa Form</h3>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#0284c7', fontWeight: '600', cursor: 'pointer' }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  form="formDatHoa"
                  disabled={submitting}
                  style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: submitting ? 'wait' : 'pointer' }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>

            {/* Body Form */}
            <form id="formDatHoa" onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Cảnh báo nếu đặt sau 16h30 */}
              {isAfter1630 && (
                <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
                  🚨 <b>Đã qua 16h30:</b> Vui lòng chụp hoặc tải lên hình ảnh xác nhận xe/hợp đồng bên dưới để được duyệt đơn hoa!
                </div>
              )}

              {/* Dấu thời gian */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Dấu thời gian <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Date().toLocaleString('vi-VN')}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Tư vấn bán hàng */}
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
                      fontSize: '13px',
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
                      fontSize: '13px',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              {/* Tên khách hàng */}
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Hợp đồng số */}
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Số VIN/ Biển số */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Số VIN/ Biển số
                </label>
                <input
                  type="text"
                  value={form.so_vin_bien_so}
                  onChange={(e) => setForm({ ...form, so_vin_bien_so: e.target.value })}
                  placeholder="Nhập số khung VIN hoặc biển số..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Ngày/giờ giao xe */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Ngày/giờ giao xe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.ngay_gio_giao_xe}
                  onChange={(e) => setForm({ ...form, ngay_gio_giao_xe: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Chụp hình gửi nếu đặt sau 16h30 (hoặc đính kèm tự nguyện trước 16h30) */}
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
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: isAfter1630 ? '1px solid #f87171' : '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ marginTop: '10px', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                )}
              </div>

              {/* Ghi chú */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={form.ghi_chu}
                  onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
                  placeholder="Nhập ghi chú nếu có..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}