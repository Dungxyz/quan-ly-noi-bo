'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function ModalCapNhatXe({ isOpen, onClose, xe, onSave }) {
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    loai_xe: '',
    bien_so: '',
    trang_thai: 'Sẵn xe',
    so_km: 0,
    nguoi_di: '',
    khu_vuc: '',
    ghi_chu: '',
    canh_bao: '',
  });

  const [danhSachNV, setDanhSachNV] = useState([]);
  const [loadingNV, setLoadingNV] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);

  const [searchNV, setSearchNV] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function layNhanVien() {
      setLoadingNV(true);
      const { data, error } = await supabase
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan, vi_tri, trang_thai')
        .order('ho_ten', { ascending: true });

      if (!error && data) {
        const danhSachKhaDung = data.filter(
          (nv) => nv.trang_thai !== 'Đã nghỉ việc'
        );
        setDanhSachNV(danhSachKhaDung);
      }
      setLoadingNV(false);
    }

    if (isOpen) {
      layNhanVien();
    }
  }, [isOpen]);

  useEffect(() => {
    if (xe) {
      setFormData({
        loai_xe: xe.loai_xe || '',
        bien_so: xe.bien_so || '',
        trang_thai: xe.trang_thai || 'Sẵn xe',
        so_km: Number(xe.so_km) || 0,
        nguoi_di: xe.nguoi_di || '',
        khu_vuc: xe.khu_vuc || '',
        ghi_chu: xe.ghi_chu || '',
        canh_bao: xe.canh_bao || '',
      });
      setSearchNV(xe.nguoi_di || '');
      setIsSearching(false);
    }
  }, [xe]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen || !xe) return null;

  const isDangDi = formData.trang_thai === 'Đang đi';
  const responsiveInputStyle = {
    ...inputStyle,
    fontSize: isMobile ? '15px' : '13px',
    padding: isMobile ? '10px 12px' : '8px 12px',
  };

  const dsLocNV = danhSachNV.filter((nv) => {
    if (!searchNV.trim()) return true;
    const query = searchNV.toLowerCase().trim();
    return (
      (nv.ma_nv || '').toLowerCase().includes(query) ||
      (nv.ho_ten || '').toLowerCase().includes(query) ||
      (nv.bo_phan || '').toLowerCase().includes(query)
    );
  });

  function handleChonNhanVien(nv) {
    setFormData((prev) => ({ ...prev, nguoi_di: nv.ho_ten }));
    setSearchNV(`${nv.ho_ten} (${nv.ma_nv})`);
    setIsSearching(false);
  }

  function handleXoaChonNV() {
    setFormData((prev) => ({ ...prev, nguoi_di: '' }));
    setSearchNV('');
    setIsSearching(true);
  }

  function thayDoiKm(luong) {
    setFormData((prev) => ({
      ...prev,
      so_km: Math.max(0, Number(prev.so_km || 0) + luong),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isDangDi && !formData.nguoi_di.trim()) {
      alert('Vui lòng chọn nhân viên nhận xe!');
      return;
    }

    setDangLuu(true);
    await onSave({
      ma_xe: xe.ma_xe,
      ...formData,
      so_km: Number(formData.so_km),
      nguoi_di: isDangDi ? formData.nguoi_di : null,
      khu_vuc: isDangDi ? formData.khu_vuc : null,
    });
    setDangLuu(false);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? '10px' : '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: isMobile ? '12px 16px' : '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🚙</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
              CẬP NHẬT THÔNG TIN XE {xe.ma_xe}
            </span>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Nội dung Form (Cuộn mượt bên trong) */}
        <form onSubmit={handleSubmit} style={{ padding: isMobile ? '16px' : '20px', overflowY: 'auto', flex: 1 }}>
          {/* LOẠI XE & BIỂN SỐ (Gộp 2 cột trên mobile cho gọn chiều cao) */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1.3fr 1fr' : '1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>LOẠI XE</label>
              <input
                type="text"
                readOnly
                value={formData.loai_xe}
                style={{ ...responsiveInputStyle, backgroundColor: '#f8fafc', color: '#64748b' }}
              />
            </div>

            <div>
              <label style={labelStyle}>BIỂN SỐ</label>
              <input
                type="text"
                readOnly
                value={formData.bien_so}
                style={{ ...responsiveInputStyle, backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600' }}
              />
            </div>
          </div>

          {/* TRẠNG THÁI */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>TRẠNG THÁI</label>
            <select
              value={formData.trang_thai}
              onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
              style={{
                ...responsiveInputStyle,
                color: isDangDi ? '#d97706' : formData.trang_thai === 'Bảo dưỡng' ? '#dc2626' : '#16a34a',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: '#fff',
              }}
            >
              <option value="Sẵn xe" style={{ color: '#16a34a', fontWeight: 'bold' }}>
                🚘 SẴN XE
              </option>
              <option value="Đang đi" style={{ color: '#d97706', fontWeight: 'bold' }}>
                ⚙ ĐANG ĐI CÔNG TÁC
              </option>
              <option value="Bảo dưỡng" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                🔧 BẢO DƯỠNG / SỬA CHỮA
              </option>
            </select>
          </div>

          {/* KHỐI ĐIỀU XE: TÌM KIẾM NHÂN VIÊN THÔNG MINH */}
          {isDangDi && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ marginBottom: '10px', position: 'relative' }} ref={searchBoxRef}>
                <label style={{ ...labelStyle, color: '#b45309' }}>
                  NGƯỜI ĐI (NHẬP MÃ NV HOẶC TÊN) *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', fontSize: '13px', color: '#94a3b8' }}>
                    🔍
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={loadingNV ? 'Đang nạp danh sách...' : 'Gõ mã NV (VD: 113) hoặc họ tên...'}
                    value={searchNV}
                    onFocus={() => setIsSearching(true)}
                    onChange={(e) => {
                      setSearchNV(e.target.value);
                      setIsSearching(true);
                      setFormData((prev) => ({ ...prev, nguoi_di: e.target.value }));
                    }}
                    style={{
                      ...responsiveInputStyle,
                      paddingLeft: '32px',
                      paddingRight: formData.nguoi_di ? '32px' : '10px',
                      backgroundColor: '#fff',
                      borderColor: '#fcd34d',
                      fontWeight: '600',
                      color: '#0f172a',
                    }}
                  />
                  {searchNV && (
                    <button
                      type="button"
                      onClick={handleXoaChonNV}
                      title="Xóa để chọn lại"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {isSearching && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 100,
                    }}
                  >
                    {dsLocNV.length === 0 ? (
                      <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        Không tìm thấy nhân viên phù hợp
                      </div>
                    ) : (
                      dsLocNV.map((nv) => (
                        <div
                          key={nv.ma_nv}
                          onClick={() => handleChonNhanVien(nv)}
                          style={{
                            padding: '9px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f8fafc',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>
                              {nv.ho_ten}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                              ({nv.bo_phan || 'Nội bộ'})
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#0284c7',
                              backgroundColor: '#e0f2fe',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {nv.ma_nv}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ ...labelStyle, color: '#b45309' }}>KHU VỰC / MỤC ĐÍCH</label>
                <input
                  type="text"
                  placeholder="VD: Showroom, Đồng Xoài, Bình Long..."
                  value={formData.khu_vuc}
                  onChange={(e) => setFormData({ ...formData, khu_vuc: e.target.value })}
                  style={responsiveInputStyle}
                />
              </div>
            </div>
          )}

          {/* SỐ KM */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>
              SỐ KM <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                required
                value={formData.so_km}
                onChange={(e) => setFormData({ ...formData, so_km: e.target.value })}
                style={{
                  ...responsiveInputStyle,
                  paddingRight: '78px',
                  fontWeight: '600',
                  color: '#0f172a',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => thayDoiKm(-10)}
                  title="Giảm 10 km"
                  style={btnStepperStyle}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => thayDoiKm(10)}
                  title="Tăng 10 km"
                  style={btnStepperStyle}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* GHI CHÚ */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>GHI CHÚ</label>
            <input
              type="text"
              placeholder="VD: xe dơ, trầy cản trước..."
              value={formData.ghi_chu}
              onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
              style={responsiveInputStyle}
            />
          </div>

          {/* CẢNH BÁO */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>CẢNH BÁO</label>
            <input
              type="text"
              placeholder="VD: Sắp đến hạn bảo dưỡng 30.000 km..."
              value={formData.canh_bao}
              onChange={(e) => setFormData({ ...formData, canh_bao: e.target.value })}
              style={responsiveInputStyle}
            />
          </div>

          {/* Nút lưu & đóng */}
          <div
            style={{
              display: isMobile ? 'grid' : 'flex',
              gridTemplateColumns: isMobile ? '1fr 1.6fr' : undefined,
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: isMobile ? '11px 14px' : '9px 18px',
                backgroundColor: '#fff',
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
              disabled={dangLuu}
              style={{
                padding: isMobile ? '11px 18px' : '9px 24px',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#fff',
                cursor: dangLuu ? 'not-allowed' : 'pointer',
              }}
            >
              {dangLuu ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.3px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#1e293b',
};

const btnStepperStyle = {
  width: '30px',
  height: '30px',
  border: 'none',
  backgroundColor: '#f1f5f9',
  color: '#334155',
  borderRadius: '4px',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};