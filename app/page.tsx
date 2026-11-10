'use client';

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
} from '@/services/nhanSuService';
import Toast from '@/components/common/Toast';
import FormNhanSu from '@/components/nhan-su/FormNhanSu';
import BangNhanSu from '@/components/nhan-su/BangNhanSu';

export default function NhanSuPage() {
  const [danhSach, setDanhSach] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState('');
  const [formData, setFormData] = useState(FORM_MAC_DINH);
  const [dangChinhSua, setDangChinhSua] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const { currentUser, kiemTraQuyen } = useAuth();

  function baoTin(message, type = 'success') {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  }

  async function loadData() {
    try {
      setLoading(true);
      const data = await getDanhSachNhanVien();
      setDanhSach(data);
    } catch (err) {
      baoTin(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeNhanVienRealtime((payload) => {
      if (payload.eventType === 'INSERT') setDanhSach((prev) => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setDanhSach((prev) => prev.map((x) => (x.ma_nv === payload.new.ma_nv ? payload.new : x)));
      if (payload.eventType === 'DELETE') setDanhSach((prev) => prev.filter((x) => x.ma_nv !== payload.old.ma_nv));
    });
    return () => unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.ma_nv.trim() || !formData.ho_ten.trim()) {
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
    } catch (err) {
      baoTin(err.message, 'error');
    } finally {
      setDangLuu(false);
    }
  }

  async function handleToggleKhoa(ma_nv, phanQuyen) {
    const nextStatus = phanQuyen === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    setDanhSach((prev) => prev.map((x) => (x.ma_nv === ma_nv ? { ...x, phan_quyen: nextStatus } : x)));
    try {
      await toggleTrangThaiNhanVien(ma_nv, phanQuyen);
      baoTin(`Đã ${nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${ma_nv}!`);
    } catch (err) {
      baoTin(err.message, 'error');
      loadData();
    }
  }

  async function handleDelete(ma_nv, ho_ten) {
    if (!confirm(`Xóa nhân sự ${ho_ten} (${ma_nv})?`)) return;
    setDanhSach((prev) => prev.filter((x) => x.ma_nv !== ma_nv));
    try {
      await deleteNhanVien(ma_nv);
      baoTin(`Đã xóa nhân sự ${ho_ten}!`);
    } catch (err) {
      baoTin(err.message, 'error');
      loadData();
    }
  }

  function handleEdit(nv) {
    // Biến toàn bộ giá trị null thành chuỗi rỗng '' để tránh lỗi input null
    const duLieuChuan = Object.fromEntries(
      Object.entries(nv).map(([key, val]) => [key, val === null ? '' : val])
    );
    setFormData(duLieuChuan);
    setDangChinhSua(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const ketQuaLoc = useMemo(() => {
    const k = tuKhoa.toLowerCase();
    return danhSach.filter((nv) =>
      (nv.ma_nv || '').toLowerCase().includes(k) ||
      (nv.ho_ten || '').toLowerCase().includes(k) ||
      (nv.so_dien_thoai || '').includes(k) ||
      (nv.bo_phan || '').toLowerCase().includes(k)
    );
  }, [danhSach, tuKhoa]);

    // Kiểm tra quyền truy cập module Nhân sự
  if (!kiemTraQuyen('NHAN_SU')) {
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
          href="/xe-demo"
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
          🚗 Chuyển đến trang Xe Demo & Lái thử
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
        {/* Thanh Tab chuyển nhanh như hệ thống cũ */}
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
          onNotifyZalo={(nv) => baoTin(`Gửi Zalo đến ${nv.ho_ten} (${nv.uid_zalo || 'Chưa có UID'})`)}
        />
      </div>
    </div>
  );
}