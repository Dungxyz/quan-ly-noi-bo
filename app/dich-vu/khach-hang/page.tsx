'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface KhachHangItem {
  id?: number;
  bien_so: string;
  ten_khach_hang: string;
  hang_muc_du_kien: string;
  trang_thai_hen: string;
  so_dien_thoai: string;
  co_van: string;
}

const FORM_MAC_DINH: KhachHangItem = {
  bien_so: '',
  ten_khach_hang: '',
  hang_muc_du_kien: 'BDĐK',
  trang_thai_hen: '24H',
  so_dien_thoai: '',
  co_van: '',
};

export default function KhachHangHenPage() {
  const { currentUser, kiemTraQuyen } = useAuth();
  const [screenWidth, setScreenWidth] = useState(1200);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallMobile = screenWidth < 640;
  const isMobile = screenWidth < 768;

  const [danhSach, setDanhSach] = useState<KhachHangItem[]>([]);
  const [tongSoKhach, setTongSoKhach] = useState(0);
  const [danhSachCoVan, setDanhSachCoVan] = useState<any[]>([]);
  const [dsHangMuc, setDsHangMuc] = useState<any[]>([]);
  const [dsTrangThai, setDsTrangThai] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tuKhoa, setTuKhoa] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<KhachHangItem>(FORM_MAC_DINH);
  const [saving, setSaving] = useState(false);

  // Phân quyền
  const role = currentUser?.phan_quyen || '';
  const isAdmin = role === 'ADMIN' || role === 'ALL';
  const canAdd = isAdmin || role.includes('HEN_ADD') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('HEN_ADD'));
  const canEdit = isAdmin || role.includes('HEN_EDIT') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('HEN_EDIT'));
  const canDelete = isAdmin || role.includes('HEN_DELETE') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('HEN_DELETE'));

  // 1. Tải danh mục Cố vấn CVDV, Hạng mục, Trạng thái
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
        const { data: allNv } = await supabase.from('nhan_vien').select('ma_nv, ho_ten').order('ma_nv', { ascending: true });
        if (allNv) setDanhSachCoVan(allNv);
      }

      const { data: hmData } = await supabase.from('cau_hinh_hang_muc').select('*').order('thu_tu', { ascending: true });
      if (hmData && hmData.length > 0) setDsHangMuc(hmData);

      const { data: ttData } = await supabase.from('cau_hinh_trang_thai_hen').select('*').order('thu_tu', { ascending: true });
      if (ttData && ttData.length > 0) setDsTrangThai(ttData);
    } catch (err) {
      console.error('Lỗi nạp danh mục:', err);
    }
  }

  // 2. Tra cứu tìm kiếm trực tiếp trên Database
  async function loadKhachHang(searchKeyword = tuKhoa) {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('dich_vu_khach_hang')
        .select('*', { count: 'exact', head: true });
      if (count !== null) setTongSoKhach(count);

      let query = supabase.from('dich_vu_khach_hang').select('*');

      const k = searchKeyword.trim();
      if (k) {
        query = query
          .or(
            `bien_so.ilike.%${k}%,ten_khach_hang.ilike.%${k}%,so_dien_thoai.ilike.%${k}%,co_van.ilike.%${k}%`
          )
          .limit(100);
      } else {
        query = query.order('id', { ascending: false }).limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDanhSach(data || []);
    } catch (err: any) {
      console.error('Lỗi tải khách hàng:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Tự động tìm kiếm sau khi người dùng dừng gõ 300ms (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadKhachHang(tuKhoa);
    }, 300);
    return () => clearTimeout(timer);
  }, [tuKhoa]);

  useEffect(() => {
    loadDanhMuc();
  }, []);

  // 3. Mở modal thêm mới
  function handleOpenAdd() {
    setIsEditing(false);
    setFormData(FORM_MAC_DINH);
    setModalOpen(true);
  }

  // 4. Mở modal sửa
  function handleOpenEdit(item: KhachHangItem) {
    setIsEditing(true);
    setFormData({
      id: item.id,
      bien_so: item.bien_so || '',
      ten_khach_hang: item.ten_khach_hang || '',
      hang_muc_du_kien: item.hang_muc_du_kien || 'BDĐK',
      trang_thai_hen: item.trang_thai_hen || '24H',
      so_dien_thoai: item.so_dien_thoai || '',
      co_van: item.co_van || '',
    });
    setModalOpen(true);
  }

  // 5. Lưu dữ liệu (Thêm mới hoặc Cập nhật)
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const bsChuan = formData.bien_so.trim().toUpperCase();
    if (!bsChuan || !formData.ten_khach_hang.trim()) {
      alert('Vui lòng nhập Biển số và Tên khách hàng!');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        bien_so: bsChuan,
        ten_khach_hang: formData.ten_khach_hang.trim(),
        hang_muc_du_kien: formData.hang_muc_du_kien || null,
        trang_thai_hen: formData.trang_thai_hen || '24H',
        so_dien_thoai: formData.so_dien_thoai.trim() || null,
        co_van: formData.co_van || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('dich_vu_khach_hang')
          .update(payload)
          .eq('bien_so', bsChuan);
        if (error) throw error;
        alert(`Đã cập nhật thông tin xe ${bsChuan}!`);
      } else {
        const { error } = await supabase
          .from('dich_vu_khach_hang')
          .insert([payload]);
        if (error) throw error;
        alert(`Đã thêm mới lịch hẹn xe ${bsChuan}!`);
      }

      setModalOpen(false);
      loadKhachHang();
    } catch (err: any) {
      alert('Lỗi lưu dữ liệu: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  }

  // 6. Xóa theo biển số
  async function handleDelete(item: KhachHangItem) {
    if (!confirm(`Bạn có chắc chắn muốn xóa khách hẹn xe biển số "${item.bien_so}"?`)) return;

    try {
      const { error } = await supabase
        .from('dich_vu_khach_hang')
        .delete()
        .eq('bien_so', item.bien_so);

      if (error) throw error;
      setDanhSach((prev) => prev.filter((x) => x.bien_so !== item.bien_so));
      setTongSoKhach((prev) => Math.max(0, prev - 1));
      alert(`Đã xóa thành công xe ${item.bien_so}!`);
    } catch (err: any) {
      alert('Lỗi xóa khách hàng: ' + err.message);
    }
  }

  const responsiveInputStyle = {
    ...inputStyle,
    fontSize: isSmallMobile ? '15px' : '13px',
    padding: isSmallMobile ? '10px 11px' : '8px 10px',
  };

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📅</span>
              <h1 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                DANH SÁCH KHÁCH HÀNG HẸN
              </h1>
            </div>
            <span
              style={{
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '3px 9px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {tuKhoa ? `Tìm thấy ${danhSach.length} khách` : `Tổng: ${tongSoKhach || danhSach.length} khách`}
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
                width: isMobile ? '100%' : '260px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              {canAdd && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  style={{
                    flex: isMobile ? 1 : 'none',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: isMobile ? '10px 14px' : '7px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>➕</span> Thêm hẹn mới
                </button>
              )}

              <button
                type="button"
                onClick={() => loadKhachHang()}
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
                  flexShrink: 0,
                }}
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* HIỂN THỊ DỮ LIỆU */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Đang tìm kiếm...</div>
        ) : danhSach.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
            Không tìm thấy khách hàng nào khớp với từ khóa "{tuKhoa}".
          </div>
        ) : isMobile ? (
          /* GIAO DIỆN THẺ (CARD) DỌC TRÊN ĐIỆN THOẠI */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {danhSach.map((kh) => (
              <div
                key={kh.bien_so}
                style={{
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #0284c7',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {/* Hàng 1: Biển số + Hạng mục & Trạng thái */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7' }}>
                    {kh.bien_so}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    {kh.hang_muc_du_kien && (
                      <span
                        style={{
                          backgroundColor: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {kh.hang_muc_du_kien}
                      </span>
                    )}
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      {kh.trang_thai_hen || '24H'}
                    </span>
                  </div>
                </div>

                {/* Hàng 2: Tên khách hàng + Số điện thoại */}
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                  👤 {kh.ten_khach_hang}
                  {kh.so_dien_thoai && (
                    <span style={{ fontWeight: 'normal', color: '#475569', fontSize: '13px' }}>
                      {' '}• 📞 {kh.so_dien_thoai}
                    </span>
                  )}
                </div>

                {/* Hàng 3: Cố vấn viên + Nút Sửa/Xóa */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '8px',
                    marginTop: '6px',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    🧑‍💼 CVDV: <strong>{kh.co_van || 'Chưa chỉ định'}</strong>
                  </div>

                  <div style={{ display: 'inline-flex', gap: '6px', flexShrink: 0 }}>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(kh)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          color: '#0284c7',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ✏️ Sửa
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(kh)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        🗑 Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* BẢNG DỮ LIỆU ĐẦY ĐỦ TRÊN MÁY TÍNH */
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                  <th style={{ padding: '12px 14px' }}>BIỂN SỐ</th>
                  <th style={{ padding: '12px 14px' }}>KHÁCH HÀNG</th>
                  <th style={{ padding: '12px 14px' }}>HẠNG MỤC DỰ KIẾN</th>
                  <th style={{ padding: '12px 14px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 14px' }}>SỐ ĐIỆN THOẠI</th>
                  <th style={{ padding: '12px 14px' }}>CỐ VẤN</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {danhSach.map((kh) => (
                  <tr key={kh.bien_so} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#0284c7', whiteSpace: 'nowrap' }}>
                      {kh.bien_so}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>
                      {kh.ten_khach_hang}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>
                      {kh.hang_muc_du_kien || '---'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {kh.trang_thai_hen || '24H'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {kh.so_dien_thoai || '---'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '500' }}>
                      {kh.co_van || '---'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(kh)}
                            title="Sửa thông tin"
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#fff',
                              border: '1px solid #bae6fd',
                              color: '#0284c7',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            ✏️
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(kh)}
                            title="Xóa khách hẹn"
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#fff',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
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

      {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
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
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
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
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{isEditing ? '✏️' : '➕'}</span>
                {isEditing ? `Cập Nhật Khách Hẹn: ${formData.bien_so}` : 'Thêm Khách Hàng Hẹn Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '18px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>
                  Biển số xe <span style={{ color: '#ef4444' }}>*</span>
                  {isEditing && <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>(Khóa chính)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="VD: 93A46410"
                    value={formData.bien_so}
                    onChange={(e) => setFormData({ ...formData, bien_so: e.target.value.toUpperCase() })}
                    disabled={isEditing}
                    required
                    style={{
                      ...responsiveInputStyle,
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      backgroundColor: isEditing ? '#f1f5f9' : '#fff',
                      color: isEditing ? '#64748b' : '#0f172a',
                      cursor: isEditing ? 'not-allowed' : 'text',
                      borderColor: isEditing ? '#cbd5e1' : '#94a3b8',
                    }}
                  />
                  {isEditing && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>
                      🔒
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isSmallMobile ? '1fr' : '1.2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Tên khách hàng <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="VD: Anh Tuấn"
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
                    placeholder="VD: 0983xxxxxx"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    style={responsiveInputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isSmallMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Hạng mục dự kiến</label>
                  <select
                    value={formData.hang_muc_du_kien}
                    onChange={(e) => setFormData({ ...formData, hang_muc_du_kien: e.target.value })}
                    style={responsiveInputStyle}
                  >
                    {dsHangMuc.map((item, index) => (
                      <option key={item.id || item.ma_hang_muc || index} value={item.ma_hang_muc}>
                        {item.ten_hang_muc || item.ma_hang_muc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Trạng thái hẹn</label>
                  <select
                    value={formData.trang_thai_hen}
                    onChange={(e) => setFormData({ ...formData, trang_thai_hen: e.target.value })}
                    style={responsiveInputStyle}
                  >
                    {dsTrangThai.map((item, index) => (
                      <option key={item.id || item.ma_trang_thai || index} value={item.ma_trang_thai}>
                        {item.ten_trang_thai || item.ma_trang_thai}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Cố vấn viên phụ trách (CVDV)</label>
                <select
                  value={formData.co_van}
                  onChange={(e) => setFormData({ ...formData, co_van: e.target.value })}
                  style={responsiveInputStyle}
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {danhSachCoVan.map((nv) => (
                    <option key={nv.ma_nv} value={`${nv.ma_nv} - ${nv.ho_ten}`}>
                      {nv.ma_nv} - {nv.ho_ten}
                    </option>
                  ))}
                </select>
              </div>

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
                  {saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : '➕ Thêm hẹn'}
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