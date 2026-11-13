'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Toast from '@/components/common/Toast';
import ModalCapNhatXe from '@/components/xe-demo/ModalCapNhatXe';
import ModalLichSuXe from '@/components/xe-demo/ModalLichSuXe';
import ModalThemXeDemo from '@/components/xe-demo/ModalThemXeDemo';
import {
  getDanhSachXeDemo,
  updateXeDemo,
  themLichSuXe,
  subscribeXeDemoRealtime,
} from '@/services/xeDemoService';

export default function TheoDoiXeDemoPage() {
  const { currentUser, kiemTraQuyen } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  const [danhSach, setDanhSach] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Modal Cập nhật & Lịch sử
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedXe, setSelectedXe] = useState<any>(null);
  const [modalHistory, setModalHistory] = useState<{ open: boolean; xe: any }>({ open: false, xe: null });

  const [openModalThemXe, setOpenModalThemXe] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function handleSaveXeDemo(duLieuXe: any) {
    try {
      const payload = {
        bien_so: duLieuXe.bien_so,
        loai_xe: duLieuXe.ten_xe || duLieuXe.loai_xe,
        so_km: Number(duLieuXe.so_km_hien_tai || duLieuXe.so_km || 0),
        trang_thai: duLieuXe.trang_thai === 'DANG_CHAY' ? 'Đang đi' : 'Sẵn xe',
        ghi_chu: duLieuXe.ghi_chu || null,
      };

      const { error } = await supabase
        .from('xe_demo')
        .insert([payload]);

      if (error) throw error;

      baoTin(`Đã thêm thành công xe ${duLieuXe.bien_so}!`);
      loadData();
    } catch (err: any) {
      alert('Lỗi lưu xe: ' + (err?.message || JSON.stringify(err)));
    }
  }

  // Xử lý kiểm tra quyền
  const quyenHienTai = currentUser?.phan_quyen || '';
  const isAdmin = quyenHienTai === 'ADMIN' || quyenHienTai === 'ALL';

  const canView =
    isAdmin ||
    quyenHienTai.includes('DEMO_VIEW') ||
    quyenHienTai.includes('XE_DEMO') ||
    (typeof kiemTraQuyen === 'function' && (kiemTraQuyen('XE_DEMO', 'view') || kiemTraQuyen('XE_DEMO')));

  const canViewHistory =
    isAdmin ||
    quyenHienTai.includes('DEMO_HISTORY') ||
    (typeof kiemTraQuyen === 'function' && (kiemTraQuyen('XE_DEMO', 'history') || kiemTraQuyen('DEMO_HISTORY')));

  const canEdit =
    isAdmin ||
    quyenHienTai.includes('DEMO_EDIT') ||
    (typeof kiemTraQuyen === 'function' && (kiemTraQuyen('XE_DEMO', 'edit') || kiemTraQuyen('DEMO_EDIT')));

  const canCreate =
    isAdmin ||
    quyenHienTai.includes('DEMO_CREATE') ||
    (typeof kiemTraQuyen === 'function' && (kiemTraQuyen('XE_DEMO', 'create') || kiemTraQuyen('DEMO_CREATE')));

  const canDelete =
    isAdmin ||
    quyenHienTai.includes('DEMO_DELETE') ||
    (typeof kiemTraQuyen === 'function' && (kiemTraQuyen('XE_DEMO', 'delete') || kiemTraQuyen('DEMO_DELETE')));

  function baoTin(message: any, type = 'success') {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  }

  async function loadData() {
    try {
      setLoading(true);
      const data = await getDanhSachXeDemo();
      setDanhSach(data || []);
    } catch (err: any) {
      baoTin(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) {
      loadData();
      const unsubscribe = subscribeXeDemoRealtime((payload: any) => {
        if (payload.eventType === 'INSERT') setDanhSach((prev) => [...prev, payload.new]);
        if (payload.eventType === 'UPDATE') {
          setDanhSach((prev) =>
            prev.map((x) => (x.ma_xe === payload.new.ma_xe ? payload.new : x))
          );
        }
        if (payload.eventType === 'DELETE') {
          setDanhSach((prev) => prev.filter((x) => x.ma_xe !== payload.old.ma_xe));
        }
      });
      return () => unsubscribe();
    }
  }, [canView]);

  // 1. KIỂM TRA QUYỀN XEM (VIEW)
  if (!canView) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>⛔</div>
        <h2 style={{ color: '#dc2626', margin: '0 0 8px 0', fontSize: '18px' }}>
          Từ chối quyền truy cập
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Tài khoản <strong>{currentUser?.ho_ten}</strong> ({currentUser?.phan_quyen}) không có quyền xem thông tin đội xe Demo.
        </p>
      </div>
    );
  }

  // Xử lý lưu thông tin xe (EDIT)
  async function handleSaveThongTinXe(thongTinMoi: any) {
    if (!canEdit) {
      baoTin('Bạn không có quyền chỉnh sửa trạng thái xe!', 'error');
      return;
    }
    try {
      await updateXeDemo(thongTinMoi.ma_xe, thongTinMoi);
      await themLichSuXe({
        bien_so_xe: thongTinMoi.bien_so,
        ma_xe: thongTinMoi.ma_xe,
        loai_hanh_dong: thongTinMoi.trang_thai === 'Đang đi' ? 'Đang đi công tác' : 'Sẵn xe',
        so_km: Number(thongTinMoi.so_km),
        nguoi_di: thongTinMoi.nguoi_di || null,
        khu_vuc: thongTinMoi.khu_vuc || null,
        ghi_chu: thongTinMoi.ghi_chu || null,
      });
      baoTin(`Đã cập nhật xe ${thongTinMoi.bien_so}!`);
    } catch (err: any) {
      baoTin(err.message, 'error');
      loadData();
    }
  }

  // Xử lý xóa xe (DELETE)
  async function handleXoaXe(xe: any) {
    if (!canDelete) return;
    if (confirm(`Bạn có chắc chắn muốn xóa xe biển số ${xe.bien_so} khỏi danh mục theo dõi?`)) {
      try {
        baoTin(`Đã xóa xe ${xe.bien_so}!`);
      } catch (err: any) {
        baoTin(err.message, 'error');
      }
    }
  }

  const xeDangDi = danhSach.filter((x) => x.trang_thai === 'Đang đi');
  const xeSanXe = danhSach.filter((x) => x.trang_thai !== 'Đang đi');

  const renderCardXe = (xe: any, isDangChay = false) => (
    <div
      key={xe.ma_xe}
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: isMobile ? '14px' : '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: isMobile ? 'auto' : '135px',
        position: 'relative',
      }}
    >
      <div>
        {/* Dòng 1: Biển số & Nút Lịch sử / Nút Xóa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
          <div
            onClick={() => {
              if (canEdit) {
                setSelectedXe(xe);
                setModalOpen(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: canEdit ? 'pointer' : 'default',
            }}
          >
            <span style={{ fontSize: '16px' }}>🪪</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>{xe.bien_so}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {canViewHistory && (
              <button
                type="button"
                onClick={() => setModalHistory({ open: true, xe })}
                style={{
                  padding: '4px 9px',
                  border: '1px solid #0284c7',
                  borderRadius: '5px',
                  backgroundColor: '#f0f9ff',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#0284c7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                ⏱ Lịch sử
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => handleXoaXe(xe)}
                title="Xóa xe này"
                style={{
                  padding: '4px 7px',
                  border: '1px solid #fecaca',
                  borderRadius: '5px',
                  backgroundColor: '#fff',
                  fontSize: '11px',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
              >
                🗑
              </button>
            )}
          </div>
        </div>

        {/* Dòng 2: Dòng xe & ODO */}
        <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8' }}>↗</span>
          <span>{xe.loai_xe}</span>
          <span style={{ color: '#64748b', fontWeight: 'normal' }}>
            [ {Number(xe.so_km || 0).toLocaleString()} ]
          </span>
        </div>

        {/* Dòng 3: Người nhận xe */}
        <div
          onClick={() => {
            if (canEdit) {
              setSelectedXe(xe);
              setModalOpen(true);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
            cursor: canEdit ? 'pointer' : 'default',
          }}
        >
          <span style={{ color: '#d946ef', fontSize: '15px' }}>👤</span>
          {isDangChay ? (
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>
              {xe.nguoi_di} {xe.khu_vuc ? `(${xe.khu_vuc})` : ''}
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: canEdit ? '#0284c7' : '#94a3b8' }}>
              {canEdit ? '(Bấm để điều xe)' : '(Đang trống)'}
            </span>
          )}
        </div>
      </div>

      {/* Dòng 4: Cảnh báo & Lưu ý */}
      {(xe.canh_bao || xe.ghi_chu) && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
          {xe.canh_bao && (
            <div style={{ color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🚨</span>
              <span>Cảnh báo: {xe.canh_bao}</span>
            </div>
          )}
          {xe.ghi_chu && (
            <div style={{ color: '#d97706', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚠️</span>
              <span>Lưu ý: {xe.ghi_chu}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

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
      <Toast toast={toast} onClose={() => setToast({ show: false, type: 'success', message: '' })} />

      {/* HEADER TOOLBAR */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: '12px',
          marginBottom: isMobile ? '18px' : '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: isMobile ? '20px' : '22px' }}>🚗</span>
          <h1 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            THEO DÕI XE DEMO & CÔNG TÁC
          </h1>
          <span
            style={{
              backgroundColor: '#64748b',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '3px 9px',
              borderRadius: '10px',
              whiteSpace: 'nowrap',
            }}
          >
            {danhSach.length} xe
          </span>
        </div>

        <div
          style={{
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? (canCreate ? '1fr 1fr' : '1fr') : undefined,
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* QUYỀN THÊM XE MỚI (CREATE) */}
          {canCreate && (
            <button
              type="button"
              onClick={() => setOpenModalThemXe(true)}
              style={{
                padding: isMobile ? '10px 10px' : '7px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              ➕ Thêm xe demo
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            style={{
              padding: isMobile ? '10px 10px' : '7px 14px',
              borderRadius: '6px',
              border: '1px solid #bae6fd',
              backgroundColor: '#fff',
              color: '#0284c7',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            🔄 Làm mới dữ liệu
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Đang nạp dữ liệu đội xe...</div>
      ) : (
        <>
          {/* XE ĐANG ĐI CÔNG TÁC */}
          <div style={{ marginBottom: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px', color: '#d97706' }}>⚙</span>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#d97706', margin: 0, textTransform: 'uppercase' }}>
                ĐANG ĐI CÔNG TÁC
              </h2>
              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                {xeDangDi.length}
              </span>
            </div>
            {xeDangDi.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Không có xe nào đang đi.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
                {xeDangDi.map((xe) => renderCardXe(xe, true))}
              </div>
            )}
          </div>

          {/* SẴN XE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px', color: '#16a34a' }}>🚘</span>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a', margin: 0, textTransform: 'uppercase' }}>
                SẴN XE
              </h2>
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                {xeSanXe.length}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
              {xeSanXe.map((xe) => renderCardXe(xe, false))}
            </div>
          </div>
        </>
      )}

      {/* MODAL LỊCH SỬ XE */}
      {canViewHistory && (
        <ModalLichSuXe
          isOpen={modalHistory.open}
          xe={modalHistory.xe}
          onClose={() => setModalHistory({ open: false, xe: null })}
        />
      )}

      {/* MODAL CẬP NHẬT XE (EDIT) */}
      {canEdit && (
        <ModalCapNhatXe
          isOpen={modalOpen}
          xe={selectedXe}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveThongTinXe}
        />
      )}

      {/* Modal thêm xe demo */}
      <ModalThemXeDemo
        isOpen={openModalThemXe}
        onClose={() => setOpenModalThemXe(false)}
        onSave={handleSaveXeDemo}
      />
    </div>
  );
}