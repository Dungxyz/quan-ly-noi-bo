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
    const duLieuChuan = Object.fromEntries(
      Object.entries(nv).map(([key, val]) => [key, val === null ? '' : val])
    );
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

    try {
      // 1. Cập nhật thẳng vào bảng nhan_vien trên Supabase
      const { error } = await supabase
        .from('nhan_vien')
        .update({ mat_khau: mk })
        .eq('ma_nv', modalPass.nv.ma_nv);

      if (error) {
        // Dự phòng nếu cơ sở dữ liệu dùng cột so_dien_thoai làm mật khẩu
        const { error: err2 } = await supabase
          .from('nhan_vien')
          .update({ so_dien_thoai: mk })
          .eq('ma_nv', modalPass.nv.ma_nv);
        if (err2) throw err2;
      }

      // 2. Đóng popup
      setModalPass({ open: false, nv: null });

      // 3. Thông báo thành công
      alert(`Đã đổi mật khẩu cho ${modalPass.nv.ho_ten} thành: ${mk}`);
      
      // 4. Load lại dữ liệu
      loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + (err?.message || JSON.stringify(err)));
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
          onNotifyZalo={(nv: any) => baoTin(`Gửi Zalo đến ${nv?.ho_ten || ''} (${nv?.uid_zalo || 'Chưa có UID'})`)}
          onDoiMatKhau={isAdmin ? (nv: any) => { setModalPass({ open: true, nv }); setNewPassword('123456'); } : null}
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
    </div>
  );
}