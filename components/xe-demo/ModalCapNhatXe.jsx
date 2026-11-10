'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function ModalCapNhatXe({ isOpen, onClose, xe, onSave }) {
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

  // State phục vụ tìm kiếm thông minh nhân sự
  const [searchNV, setSearchNV] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchBoxRef = useRef(null);

  // Tải danh sách nhân viên: Chỉ loại trừ nhân viên đã nghỉ việc
  useEffect(() => {
    async function layNhanVien() {
      setLoadingNV(true);
      const { data, error } = await supabase
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan, vi_tri, trang_thai')
        .order('ho_ten', { ascending: true });

      if (!error && data) {
        // Chỉ cần không phải 'Đã nghỉ việc' là lấy tất cả
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

  // Đổ dữ liệu xe vào form khi mở popup
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

  // Đóng dropdown tìm kiếm khi click chuột ra ngoài
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

  // Lọc nhân viên theo từ khóa (Mã NV hoặc Tên)
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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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

        {/* Nội dung Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* LOẠI XE */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>LOẠI XE</label>
            <input
              type="text"
              readOnly
              value={formData.loai_xe}
              style={{ ...inputStyle, backgroundColor: '#f8fafc', color: '#64748b' }}
            />
          </div>

          {/* BIỂN SỐ */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>BIỂN SỐ</label>
            <input
              type="text"
              readOnly
              value={formData.bien_so}
              style={{ ...inputStyle, backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600' }}
            />
          </div>

          {/* TRẠNG THÁI */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>TRẠNG THÁI</label>
            <select
              value={formData.trang_thai}
              onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
              style={{
                ...inputStyle,
                color: isDangDi ? '#d97706' : '#16a34a',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
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
                padding: '14px',
                marginBottom: '14px',
              }}
            >
              {/* SEARCH AUTOCOMPLETE INPUT */}
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
                      ...inputStyle,
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

                {/* DANH SÁCH GỢI Ý POPUP KHI GÕ */}
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
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
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
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f8fafc',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
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

              {/* KHU VỰC / MỤC ĐÍCH */}
              <div>
                <label style={{ ...labelStyle, color: '#b45309' }}>KHU VỰC / MỤC ĐÍCH</label>
                <input
                  type="text"
                  placeholder="VD: Showroom, Đồng Xoài, Bình Long..."
                  value={formData.khu_vuc}
                  onChange={(e) => setFormData({ ...formData, khu_vuc: e.target.value })}
                  style={inputStyle}
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
                  ...inputStyle,
                  paddingRight: '75px',
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
                  gap: '2px',
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
              style={inputStyle}
            />
          </div>

          {/* CẢNH BÁO */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>CẢNH BÁO</label>
            <input
              type="text"
              placeholder="VD: Sắp đến hạn bảo dưỡng 30.000 km..."
              value={formData.canh_bao}
              onChange={(e) => setFormData({ ...formData, canh_bao: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Nút lưu & đóng */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
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
                padding: '9px 24px',
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
  width: '28px',
  height: '28px',
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