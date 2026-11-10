'use client';

import { useState } from 'react';

const DANH_SACH_DONG_XE = [
  'Ford Ranger Wildtrak',
  'Ford Ranger Raptor',
  'Ford Ranger Sport',
  'Ford Ranger XLS',
  'Ford Everest Titanium+',
  'Ford Everest Titanium',
  'Ford Everest Sport',
  'Ford Territory Titanium X',
  'Ford Territory Titanium',
  'Ford Transit',
];

export default function ModalThemXeDemo({ isOpen, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bien_so: '',
    ten_xe: DANH_SACH_DONG_XE[0],
    so_km_hien_tai: 0,
    trang_thai: 'SAN_SANG', // SAN_SANG, DANG_CHAY, BAO_DUONG
    ghi_chu: '',
  });

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.bien_so.trim()) {
      alert('Vui lòng nhập biển số xe!');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...form,
        bien_so: form.bien_so.trim().toUpperCase(),
        so_km_hien_tai: Number(form.so_km_hien_tai) || 0,
      });
      onClose();
    } catch (err) {
      alert('Lỗi thêm xe: ' + (err.message || 'Không thể lưu xe'));
    } finally {
      setLoading(false);
    }
  }

  return (
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
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🚗</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
              Thêm Xe Demo / Xe Công Tác Mới
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>
              Biển số xe <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="VD: 93A-000.81"
              value={form.bien_so}
              onChange={(e) => setForm({ ...form, bien_so: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Dòng xe / Model</label>
            <select
              value={form.ten_xe}
              onChange={(e) => setForm({ ...form, ten_xe: e.target.value })}
              style={inputStyle}
            >
              {DANH_SACH_DONG_XE.map((xe) => (
                <option key={xe} value={xe}>
                  {xe}
                </option>
              ))}
              <option value="Khác">Dòng xe khác...</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Số ODO ban đầu (Km)</label>
              <input
                type="number"
                min="0"
                value={form.so_km_hien_tai}
                onChange={(e) => setForm({ ...form, so_km_hien_tai: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Trạng thái</label>
              <select
                value={form.trang_thai}
                onChange={(e) => setForm({ ...form, trang_thai: e.target.value })}
                style={inputStyle}
              >
                <option value="SAN_SANG">Sẵn sàng</option>
                <option value="DANG_CHAY">Đang đi công tác</option>
                <option value="BAO_DUONG">Bảo dưỡng</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Ghi chú phụ kiện / Trang bị xe</label>
            <textarea
              rows={2}
              placeholder="VD: Xe dán phim cách nhiệt, camera hành trình..."
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
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
              disabled={loading}
              style={{
                padding: '8px 18px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Đang lưu...' : '➕ Thêm xe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box',
  outline: 'none',
};