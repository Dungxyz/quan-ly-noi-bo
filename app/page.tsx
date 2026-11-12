'use client';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useMemo } from 'react';
import { FORM_MAC_DINH } from '@/constants/nhanSuConfig';
import { useAuth } from '@/context/AuthContext';
import {
  getDanhSachNhanVien,
  insertNhanVien,
  updateNhanVien,
  toggleTrangThaiNhanVien,
  deleteNhanVien,
  subscribeNhanVienRealtime,
  doiMatKhauNhanSu,
} from '@/services/nhanSuService';
import Toast from '@/components/common/Toast';
import FormNhanSu from '@/components/nhan-su/FormNhanSu';
import BangNhanSu from '@/components/nhan-su/BangNhanSu';

// Hàm chuẩn hóa ngày sinh về định dạng YYYY-MM-DD cho input HTML5 type="date"
function chuanHoaNgayChoInput(dateVal: any): string {
  if (!dateVal) return '';

  if (typeof dateVal === 'string') {
    const val = dateVal.trim();
    // Nếu có chứa giờ ISO (VD: 1999-03-24T00:00:00)
    if (val.includes('T')) {
      return val.split('T')[0];
    }
    // Nếu trong DB lưu định dạng DD/MM/YYYY (VD: 24/03/1999)
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }
    // Nếu đã đúng định dạng YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
  }

  // Trường hợp kiểu Date
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    return '';
  }

  return '';
}

export default function NhanSuPage() {
  const authContext = useAuth();
  const currentUser = authContext?.currentUser || null;
  const kiemTraQuyen = authContext?.kiemTraQuyen;

  const [danhSach, setDanhSach] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState('');
  const [formData, setFormData] = useState(FORM_MAC_DINH);
  const [dangChinhSua, setDangChinhSua] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // State đổi mật khẩu cho Admin
  const [modalPass, setModalPass] = useState<{ open: boolean; nv: any }>({ open: false, nv: null });
  const [newPassword, setNewPassword] = useState('123456');
  const DANH_MUC_TAI_KHOAN = [
    { id: 'email_noi_bo', label: '📧 Email nội bộ', defaultLink: 'https://mail.binhduongford.com.vn/' },
    { id: 'cyber', label: '🖥️ Cyber (Phần mềm DMS)', defaultLink: '' },
    { id: 'app_sheet', label: '📱 AppSheet', defaultLink: 'https://www.appsheet.com/' },
    { id: 'sps_id', label: '🌐 SPS ID', defaultLink: '' },
    { id: 'stars_id', label: '⭐ Stars ID', defaultLink: 'https://www.starsxp.ford.com/' },
    { id: 'synology', label: '💾 Synology Drive', defaultLink: '' },
    { id: 'khac', label: '⚙️ Tài khoản khác...', defaultLink: '' },
  ];

  const [modalZalo, setModalZalo] = useState({
    open: false,
    ma_nv: '',
    loai_tk: 'email_noi_bo',
    chat_id: '',
    username: '',
    password: '',
    link: '',
    ghi_chu: '',
    dangGui: false,
  });

  const isAdmin = currentUser?.phan_quyen === 'ADMIN' || currentUser?.phan_quyen === 'ALL';

  function baoTin(message: any, type = 'success') {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  }

  async function loadData() {
    try {
      setLoading(true);
      const data = await getDanhSachNhanVien();
      setDanhSach(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setDanhSach([]);
      baoTin(err?.message || 'Không thể kết nối máy chủ dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    let unsubscribe: any = () => {};
    try {
      if (typeof subscribeNhanVienRealtime === 'function') {
        unsubscribe = subscribeNhanVienRealtime((payload: any) => {
          if (!payload) return;
          if (payload.eventType === 'INSERT') setDanhSach((prev) => [...(prev || []), payload.new]);
          if (payload.eventType === 'UPDATE') {
            setDanhSach((prev) => (prev || []).map((x) => (x.ma_nv === payload.new?.ma_nv ? payload.new : x)));
          }
          if (payload.eventType === 'DELETE') {
            setDanhSach((prev) => (prev || []).filter((x) => x.ma_nv !== payload.old?.ma_nv));
          }
        });
      }
    } catch (e) {
      console.warn('Realtime error:', e);
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!formData?.ma_nv?.trim() || !formData?.ho_ten?.trim()) {
      return baoTin('Vui lòng nhập Mã NV và Họ tên!', 'warning');
    }
    setDangLuu(true);
    try {
      if (dangChinhSua) {
        await updateNhanVien(formData.ma_nv, formData);
        baoTin(`Đã cập nhật hồ sơ ${formData.ho_ten}!`);
      } else {
        await insertNhanVien(formData);
        baoTin(`Đã thêm mới nhân sự ${formData.ho_ten}!`);
      }
      setFormData(FORM_MAC_DINH);
      setDangChinhSua(false);
    } catch (err: any) {
      baoTin(err?.message || 'Lỗi lưu thông tin', 'error');
    } finally {
      setDangLuu(false);
    }
  }

  async function handleToggleKhoa(ma_nv: any, phanQuyen: any) {
    const nextStatus = phanQuyen === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    setDanhSach((prev) => (prev || []).map((x) => (x.ma_nv === ma_nv ? { ...x, phan_quyen: nextStatus } : x)));
    try {
      await toggleTrangThaiNhanVien(ma_nv, phanQuyen);
      baoTin(`Đã ${nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${ma_nv}!`);
    } catch (err: any) {
      baoTin(err?.message || 'Lỗi cập nhật trạng thái', 'error');
      loadData();
    }
  }

  async function handleDelete(ma_nv: any, ho_ten: any) {
    if (!confirm(`Xóa nhân sự ${ho_ten} (${ma_nv})?`)) return;
    setDanhSach((prev) => (prev || []).filter((x) => x.ma_nv !== ma_nv));
    try {
      await deleteNhanVien(ma_nv);
      baoTin(`Đã xóa nhân sự ${ho_ten}!`);
    } catch (err: any) {
      baoTin(err?.message || 'Lỗi khi xóa', 'error');
      loadData();
    }
  }

  function handleEdit(nv: any) {
    if (!nv) return;
    const duLieuChuan: any = Object.fromEntries(
      Object.entries(nv).map(([key, val]) => [key, val === null ? '' : val])
    );

    // Chuyển đổi ngày sinh sang đúng định dạng YYYY-MM-DD
    if (duLieuChuan.ngay_sinh) {
      duLieuChuan.ngay_sinh = chuanHoaNgayChoInput(duLieuChuan.ngay_sinh);
    }

    setFormData(duLieuChuan as any);
    setDangChinhSua(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLuuMatKhau() {
    const mk = (newPassword || '').trim();
    if (!mk) {
      alert('Vui lòng nhập mật khẩu mới!');
      return;
    }

    const targetNv = modalPass.nv;
    if (!targetNv) return;

    try {
      // 1. Cập nhật mật khẩu lên Supabase
      const { error } = await supabase
        .from('nhan_vien')
        .update({ mat_khau: mk })
        .eq('ma_nv', targetNv.ma_nv);

      if (error) {
        const { error: err2 } = await supabase
          .from('nhan_vien')
          .update({ so_dien_thoai: mk })
          .eq('ma_nv', targetNv.ma_nv);
        if (err2) throw err2;
      }

      // 2. Truy vấn lại chính xác hồ sơ nhân viên từ DB để lấy cột ID Zalo Bot mới nhất
      const { data: freshNv } = await supabase
        .from('nhan_vien')
        .select('*')
        .eq('ma_nv', targetNv.ma_nv)
        .single();

      const nvData = freshNv || targetNv;
      const uidBot =
        nvData.uid_zalo ||
        nvData.id_doan_chat_bot ||
        '';

      let thongBaoZalo = '';

      // 3. Gọi API gửi Zalo Bot
      if (uidBot) {
        const resZalo = await fetch('/api/zalo-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'DOI_MAT_KHAU',
            ma_nv: nvData.ma_nv,
            ho_ten: nvData.ho_ten,
            mat_khau_moi: mk,
            chat_id: uidBot,
          }),
        });
        const dataZalo = await resZalo.json();

        if (dataZalo.success) {
          thongBaoZalo = `\n📲 Đã gửi tin nhắn Zalo`;
        } else {
          thongBaoZalo = `\n❌ Lỗi gửi Zalo: ${JSON.stringify(dataZalo.data || dataZalo.message)}`;
        }
      } else {
        thongBaoZalo = `\n⚠️ Không tìm thấy ID Zalo Bot trong hồ sơ nhân viên này!`;
      }

      // 4. Đóng modal & thông báo kết quả chi tiết
      setModalPass({ open: false, nv: null });
      baoTin(`Đã đổi mật khẩu cho ${nvData.ho_ten}!`);
      alert(`✅ Đã đổi mật khẩu cho ${nvData.ho_ten} thành: ***${thongBaoZalo}`);
      loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + (err?.message || JSON.stringify(err)));
    }
  }

  function layUserTheoLoai(nv: any, loaiId: string): string {
    if (!nv) return '';
    switch (loaiId) {
      case 'email_noi_bo':
        return nv.email_noi_bo || nv.email_cong_ty || '';
      case 'cyber':
        return nv.cyber || nv.tk_cyber || '';
      case 'app_sheet':
        return nv.app_sheet || nv.appsheet || nv.email_appsheet || '';
      case 'sps_id':
        return nv.sps_id || '';
      case 'stars_id':
        return nv.stars_id || '';
      case 'synology':
        return nv.synology || '';
      default:
        return '';
    }
  }

  function layUidZaloNhanVien(nv: any): string {
    if (!nv) return '6d6fb4ffc0b229ec70a3';
    return (
      nv.id_chat_bot ||
      nv.id_zalo_bot ||
      nv.bot_chat_id ||
      nv.uid_zalo ||
      '6d6fb4ffc0b229ec70a3'
    );
  }

  function handleOpenModalZalo(nv: any) {
    if (!nv) return;
    if (nv.phan_quyen === 'LOCKED' || nv.trang_thai === 'LOCKED') {
      baoTin(`Tài khoản ${nv.ho_ten} đang bị khóa!`, 'warning');
      return;
    }
    const loaiMacDinh = 'email_noi_bo';
    const itemLoai = DANH_MUC_TAI_KHOAN.find((x) => x.id === loaiMacDinh);

    setModalZalo({
      open: true,
      ma_nv: nv.ma_nv,
      loai_tk: loaiMacDinh,
      chat_id: layUidZaloNhanVien(nv),
      username: layUserTheoLoai(nv, loaiMacDinh),
      password: '',
      link: itemLoai?.defaultLink || '',
      ghi_chu: '',
      dangGui: false,
    });
  }

  function handleChonNhanVienZalo(maNvMoi: string) {
    const nvMoi = danhSach.find((x) => x.ma_nv === maNvMoi);
    setModalZalo((prev) => ({
      ...prev,
      ma_nv: maNvMoi,
      chat_id: layUidZaloNhanVien(nvMoi),
      username: layUserTheoLoai(nvMoi, prev.loai_tk),
    }));
  }

  function handleChonLoaiTaiKhoan(loaiMoi: string) {
    const nvHienTai = danhSach.find((x) => x.ma_nv === modalZalo.ma_nv);
    const itemLoai = DANH_MUC_TAI_KHOAN.find((x) => x.id === loaiMoi);

    setModalZalo((prev) => ({
      ...prev,
      loai_tk: loaiMoi,
      username: layUserTheoLoai(nvHienTai, loaiMoi),
      link: itemLoai?.defaultLink || '',
    }));
  }

  async function handleGuiTaiKhoanZalo(e: React.FormEvent) {
    e.preventDefault();
    if (!modalZalo.ma_nv || !modalZalo.username.trim() || !modalZalo.password.trim()) {
      alert('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!');
      return;
    }
    if (!modalZalo.chat_id.trim()) {
      alert('Vui lòng nhập ID đoạn chat Zalo nhận!');
      return;
    }

    const nvNhan = danhSach.find((x) => x.ma_nv === modalZalo.ma_nv);
    const itemLoai = DANH_MUC_TAI_KHOAN.find((x) => x.id === modalZalo.loai_tk);
    const tenLoaiSach = (itemLoai?.label || modalZalo.loai_tk).replace(/^[^\w\sÀ-ỹ]+\s*/, '');

    setModalZalo((prev) => ({ ...prev, dangGui: true }));
    try {
      const res = await fetch('/api/zalo-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GUI_TAI_KHOAN',
          ma_nv: modalZalo.ma_nv,
          ho_ten: nvNhan?.ho_ten || modalZalo.ma_nv,
          loai_tai_khoan: tenLoaiSach,
          ten_dang_nhap: modalZalo.username.trim(),
          mat_khau: modalZalo.password.trim(),
          duong_dan: modalZalo.link.trim(),
          ghi_chu: modalZalo.ghi_chu.trim(),
          chat_id: modalZalo.chat_id.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        baoTin(`Đã bắn thông tin ${tenLoaiSach} tới ${nvNhan?.ho_ten || modalZalo.ma_nv}!`);
        setModalZalo((prev) => ({ ...prev, open: false, dangGui: false }));
      } else {
        alert('❌ Lỗi gửi Zalo: ' + (data.message || JSON.stringify(data.data)));
        setModalZalo((prev) => ({ ...prev, dangGui: false }));
      }
    } catch (err: any) {
      alert('Lỗi kết nối: ' + err.message);
      setModalZalo((prev) => ({ ...prev, dangGui: false }));
    }
  }

  const ketQuaLoc = useMemo(() => {
    const k = (tuKhoa || '').toLowerCase().trim();
    if (!Array.isArray(danhSach)) return [];
    if (!k) return danhSach;
    return danhSach.filter((nv: any) =>
      (nv?.ma_nv || '').toLowerCase().includes(k) ||
      (nv?.ho_ten || '').toLowerCase().includes(k) ||
      (nv?.so_dien_thoai || '').includes(k) ||
      (nv?.bo_phan || '').toLowerCase().includes(k)
    );
  }, [danhSach, tuKhoa]);

  // Kiểm tra quyền truy cập an toàn
  const quyenHienTai = currentUser?.phan_quyen || '';
  const coQuyenNhanSu =
    quyenHienTai === 'ADMIN' ||
    quyenHienTai === 'ALL' ||
    quyenHienTai.includes('NHAN_SU') ||
    (typeof kiemTraQuyen === 'function' && kiemTraQuyen('NHAN_SU'));

  if (!currentUser) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        Đang nạp dữ liệu tài khoản...
      </div>
    );
  }

  if (!coQuyenNhanSu) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>⛔</div>
        <h2 style={{ color: '#dc2626', margin: '0 0 8px 0', fontSize: '18px' }}>
          Từ chối quyền truy cập
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>
          Tài khoản <strong>{currentUser?.ho_ten}</strong> ({currentUser?.phan_quyen}) không có quyền quản lý hồ sơ nhân sự.
        </p>
        <a
          href="/ho-so"
          style={{
            display: 'inline-block',
            padding: '9px 18px',
            backgroundColor: '#0284c7',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          🪪 Chuyển đến trang Hồ Sơ Của Tôi
        </a>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '24px 12px' }}>
      <Toast toast={toast} onClose={() => setToast({ show: false, type: 'success', message: '' })} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#047857', fontSize: '20px' }}>👤</span>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857', margin: 0 }}>
            KHAI BÁO & QUẢN LÝ HỒ SƠ NHÂN SỰ
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '12px 24px 0 24px', borderBottom: '1px solid #e2e8f0' }}>
          <a
            href="/"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              textDecoration: 'none',
              color: '#047857',
              borderBottom: '2px solid #047857',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            👤 Hồ Sơ & Thêm Nhân Sự
          </a>
          <a
            href="/phan-quyen"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              color: '#64748b',
              borderBottom: '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            👥 Phân Quyền Tài Khoản
          </a>
        </div>

        <FormNhanSu
          formData={formData}
          setFormData={setFormData}
          dangChinhSua={dangChinhSua}
          dangLuu={dangLuu}
          onSubmit={handleSubmit}
          onReset={() => { setFormData(FORM_MAC_DINH); setDangChinhSua(false); }}
        />

        <BangNhanSu
          danhSach={ketQuaLoc}
          loading={loading}
          tuKhoa={tuKhoa}
          setTuKhoa={setTuKhoa}
          onReload={loadData}
          onEdit={handleEdit}
          onToggleKhoa={handleToggleKhoa}
          onDelete={handleDelete}
          onNotifyZalo={(nv: any) => handleOpenModalZalo(nv)}
          onDoiMatKhau={isAdmin
    ? (nv: any) => {
        if (nv?.phan_quyen === 'LOCKED' || nv?.trang_thai === 'LOCKED') {
          baoTin(`Tài khoản ${nv.ho_ten} (${nv.ma_nv}) đang bị khóa, không thể đổi mật khẩu!`, 'warning');
          return;
        }
        setModalPass({ open: true, nv });
        setNewPassword('123456');
      }
    : null}
        />
      </div>

      {/* POPUP ĐỔI MẬT KHẨU DÀNH CHO ADMIN */}
      {modalPass.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
              🔑 Cấp / Đổi Mật Khẩu
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Đổi mật khẩu cho: <strong style={{ color: '#0284c7' }}>{modalPass.nv?.ho_ten}</strong> ({modalPass.nv?.ma_nv})
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Mật khẩu mới:
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                Mặc định tiêu chuẩn đại lý là: <code>123456</code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setModalPass({ open: false, nv: null })}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleLuuMatKhau}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Lưu mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP GỬI THÔNG TIN TÀI KHOẢN QUA ZALO */}
      {modalZalo.open && (
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
            padding: '16px',
            fontFamily: 'Segoe UI, sans-serif',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✈️</span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0284c7' }}>
                  GỬI THÔNG TIN TÀI KHOẢN QUA ZALO
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalZalo((prev) => ({ ...prev, open: false }))}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuiTaiKhoanZalo} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Chọn nhân viên nhận <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={modalZalo.ma_nv}
                  onChange={(e) => handleChonNhanVienZalo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#0284c7',
                    backgroundColor: '#fff',
                  }}
                >
                  {danhSach
                    .filter((x) => x.phan_quyen !== 'LOCKED')
                    .map((nv) => (
                      <option key={nv.ma_nv} value={nv.ma_nv}>
                        {nv.ma_nv} - {nv.ho_ten}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Loại tài khoản <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={modalZalo.loai_tk}
                    onChange={(e) => handleChonLoaiTaiKhoan(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0f172a',
                      backgroundColor: '#fff',
                    }}
                  >
                    {DANH_MUC_TAI_KHOAN.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    ID đoạn chat Zalo nhận
                  </label>
                  <input
                    type="text"
                    value={modalZalo.chat_id}
                    onChange={(e) => setModalZalo((prev) => ({ ...prev, chat_id: e.target.value }))}
                    placeholder="Nhập UID Zalo..."
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#047857',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Tên đăng nhập (User) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalZalo.username}
                  onChange={(e) => setModalZalo((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Nhập tên đăng nhập..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Mật khẩu (Password) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalZalo.password}
                  onChange={(e) => setModalZalo((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Nhập mật khẩu cấp mới"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Đường dẫn đăng nhập (Link)
                </label>
                <input
                  type="text"
                  value={modalZalo.link}
                  onChange={(e) => setModalZalo((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Ghi chú kèm theo
                </label>
                <input
                  type="text"
                  value={modalZalo.ghi_chu}
                  onChange={(e) => setModalZalo((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                  placeholder="VD: Đổi pass sau khi login"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setModalZalo((prev) => ({ ...prev, open: false }))}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalZalo.dangGui}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#fff',
                    cursor: modalZalo.dangGui ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ✈️ {modalZalo.dangGui ? 'Đang gửi...' : 'Bắn Tin Nhắn Zalo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}