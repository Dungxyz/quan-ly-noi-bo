'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TiepNhanXePage() {
  const { currentUser, kiemTraQuyen } = useAuth();

  // Kiểm tra quyền hạn phân hệ Tiếp nhận xe
  const role = currentUser?.phan_quyen || '';
  const isAdmin = role === 'ADMIN' || role === 'ALL';
  const canView = isAdmin || role.includes('TN_VIEW') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('TN_VIEW'));
  const canAdd = isAdmin || role.includes('TN_ADD') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('TN_ADD'));
  const canEdit = isAdmin || role.includes('TN_EDIT') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('TN_EDIT'));
  const canDelete = isAdmin || role.includes('TN_DELETE') || (typeof kiemTraQuyen === 'function' && kiemTraQuyen('TN_DELETE'));

  const [nhatKy, setNhatKy] = useState<any[]>([]);
  const [danhSachCoVan, setDanhSachCoVan] = useState<any[]>([]);
  const [dsHangMuc, setDsHangMuc] = useState<any[]>([]);
  const [dsTrangThai, setDsTrangThai] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dangTraCuu, setDangTraCuu] = useState(false);

  // Modal Sửa state
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Form state
  const [form, setForm] = useState({
    bien_so: '',
    ten_khach_hang: '',
    so_dien_thoai: '',
    co_van_vien: '',
    hang_muc_thuc_hien: '',
    trang_thai_hen: '24H',
    ghi_chu: '',
  });

  // 1. Tải danh mục cố vấn CVDV, hạng mục, trạng thái và nhật ký gần nhất
  async function loadInitData() {
    try {
      const { data: cvData } = await supabase
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan, vi_tri, id_doan_chat_bot')
        .or('bo_phan.eq.CVDV,vi_tri.ilike.%CVDV%,bo_phan.ilike.%Cố vấn%')
        .order('ma_nv', { ascending: true });

      if (cvData && cvData.length > 0) {
        setDanhSachCoVan(cvData);
      } else {
        const { data: allNv } = await supabase
          .from('nhan_vien')
          .select('ma_nv, ho_ten, id_doan_chat_bot')
          .order('ma_nv', { ascending: true });
        if (allNv) setDanhSachCoVan(allNv);
      }

      const { data: hmData } = await supabase
        .from('cau_hinh_hang_muc')
        .select('*')
        .order('thu_tu', { ascending: true });
      if (hmData && hmData.length > 0) {
        setDsHangMuc(hmData);
      } else {
        setDsHangMuc([
          { ma_hang_muc: 'BDĐK', ten_hang_muc: 'BDĐK (Bảo dưỡng định kỳ)' },
          { ma_hang_muc: 'ĐSBH', ten_hang_muc: 'ĐSBH (Đồng sơn bảo hiểm)' },
          { ma_hang_muc: 'FSA', ten_hang_muc: 'FSA (Triệu hồi)' },
          { ma_hang_muc: 'KT 20HM', ten_hang_muc: 'KT 20HM (Kiểm tra 20 hạng mục)' },
          { ma_hang_muc: 'TTPT', ten_hang_muc: 'TTPT (Thay thế phụ tùng)' },
          { ma_hang_muc: 'Thay nhớt', ten_hang_muc: 'Thay nhớt' },
          { ma_hang_muc: 'Kiểm tra xe', ten_hang_muc: 'Kiểm tra xe' },
        ]);
      }

      const { data: ttData } = await supabase
        .from('cau_hinh_trang_thai_hen')
        .select('*')
        .order('thu_tu', { ascending: true });
      if (ttData && ttData.length > 0) {
        setDsTrangThai(ttData);
      } else {
        setDsTrangThai([
          { ma_trang_thai: '24H', ten_trang_thai: '24H' },
          { ma_trang_thai: 'H', ten_trang_thai: 'H (Hẹn trước)' },
          { ma_trang_thai: 'XVL', ten_trang_thai: 'XVL (Xe vãng lai)' },
        ]);
      }

      const { data: tnData } = await supabase
        .from('dich_vu_tiep_nhan')
        .select('*')
        .order('thoi_gian', { ascending: false })
        .limit(25);
      if (tnData) setNhatKy(tnData);
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu ban đầu:', err);
    }
  }

  useEffect(() => {
    loadInitData();
  }, []);

  // 2. Tra cứu tự động từ danh sách Khách Hàng khi nhập biển số
  async function handleBienSoBlur() {
    const bsNhap = form.bien_so.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!bsNhap) return;

    setDangTraCuu(true);
    try {
      const { data, error } = await supabase
        .from('dich_vu_khach_hang')
        .select('*')
        .ilike('bien_so', `%${bsNhap}%`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setForm((prev) => ({
          ...prev,
          bien_so: data.bien_so || prev.bien_so,
          ten_khach_hang: data.ten_khach_hang || prev.ten_khach_hang,
          so_dien_thoai: data.so_dien_thoai || prev.so_dien_thoai,
          hang_muc_thuc_hien: data.hang_muc_du_kien || prev.hang_muc_thuc_hien,
          trang_thai_hen: data.trang_thai_hen || prev.trang_thai_hen,
          co_van_vien: data.co_van || prev.co_van_vien,
        }));
      }
    } catch (err: any) {
      console.error('Lỗi tra cứu khách hàng:', err);
    } finally {
      setDangTraCuu(false);
    }
  }

  // 3. Lưu lượt tiếp nhận xe & Gửi Zalo Bot
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) {
      alert('Tài khoản của bạn không có quyền thêm mới tiếp nhận xe!');
      return;
    }

    const bs = form.bien_so.trim().toUpperCase();
    if (!bs || !form.ten_khach_hang.trim() || !form.co_van_vien) {
      alert('Vui lòng điền đủ: Biển số, Tên khách hàng và Cố vấn viên!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        bien_so: bs,
        ten_khach_hang: form.ten_khach_hang.trim(),
        so_dien_thoai: form.so_dien_thoai.trim() || null,
        co_van_vien: form.co_van_vien,
        hang_muc_thuc_hien: form.hang_muc_thuc_hien || null,
        trang_thai_hen: form.trang_thai_hen || '24H',
        ghi_chu: form.ghi_chu.trim() || null,
        thoi_gian: new Date().toISOString(),
      };

      // 1. Lưu vào bảng tiếp nhận
      const { error: insertErr } = await supabase
        .from('dich_vu_tiep_nhan')
        .insert([payload]);

      if (insertErr) throw insertErr;

      // 2. Cập nhật sang bảng khách hàng
      await supabase.from('dich_vu_khach_hang').upsert(
        {
          bien_so: bs,
          ten_khach_hang: form.ten_khach_hang.trim(),
          so_dien_thoai: form.so_dien_thoai.trim() || null,
          hang_muc_du_kien: form.hang_muc_thuc_hien || null,
          trang_thai_hen: form.trang_thai_hen || '24H',
          co_van: form.co_van_vien,
        },
        { onConflict: 'bien_so' }
      );

      // 3. Tìm id_chat_bot của cố vấn được chọn
      const coVanChon = danhSachCoVan.find((cv) =>
        form.co_van_vien.includes(cv.ma_nv) || cv.ho_ten === form.co_van_vien
      );
      const chatIdCVDV = coVanChon?.id_chat_bot || '';

      // 4. Bắn Zalo Bot qua API Next.js
      try {
        await fetch('/api/zalo-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            chat_id: chatIdCVDV,
          }),
        });
      } catch (botErr) {
        console.warn('Lỗi gửi Zalo Bot:', botErr);
      }

      // 5. Làm mới form
      setForm({
        bien_so: '',
        ten_khach_hang: '',
        so_dien_thoai: '',
        co_van_vien: '',
        hang_muc_thuc_hien: '',
        trang_thai_hen: '24H',
        ghi_chu: '',
      });

      alert(`✅ Đã lưu tiếp nhận xe ${bs} và gửi thông báo Zalo Bot thành công!`);
      loadInitData();
    } catch (err: any) {
      alert('Lỗi lưu tiếp nhận: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 4. Kiểm tra khóa (Khóa sau 18h00 hoặc khi qua ngày khác)
  function kiemTraBiKhoa(thoiGianStr: string) {
    if (!thoiGianStr) return true;
    const rowTime = new Date(thoiGianStr);
    const now = new Date();

    const rowDateStr = rowTime.toLocaleDateString('vi-VN');
    const nowDateStr = now.toLocaleDateString('vi-VN');

    if (rowDateStr !== nowDateStr) {
      return true;
    }

    if (now.getHours() >= 18) {
      return true;
    }

    return false;
  }

  // 5. Mở modal Sửa
  function handleOpenEdit(row: any) {
    if (!canEdit) {
      alert('Tài khoản của bạn không có quyền chỉnh sửa tiếp nhận xe!');
      return;
    }
    if (kiemTraBiKhoa(row.thoi_gian)) {
      alert('Lượt tiếp nhận này đã bị khóa (sau 18h00 hoặc đã qua ngày), không thể sửa!');
      return;
    }
    setEditRow({ ...row });
    setModalEditOpen(true);
  }

  // 6. Lưu Sửa
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow || !canEdit) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('dich_vu_tiep_nhan')
        .update({
          ten_khach_hang: editRow.ten_khach_hang,
          so_dien_thoai: editRow.so_dien_thoai,
          co_van_vien: editRow.co_van_vien,
          hang_muc_thuc_hien: editRow.hang_muc_thuc_hien,
          trang_thai_hen: editRow.trang_thai_hen,
          ghi_chu: editRow.ghi_chu,
        })
        .eq('no_id', editRow.no_id);

      if (error) throw error;
      alert(`Đã cập nhật lượt tiếp nhận xe ${editRow.bien_so}!`);
      setModalEditOpen(false);
      loadInitData();
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  // 7. Xóa lượt tiếp nhận
  async function handleDelete(row: any) {
    if (!canDelete) {
      alert('Tài khoản của bạn không có quyền xóa lượt tiếp nhận xe!');
      return;
    }
    if (kiemTraBiKhoa(row.thoi_gian)) {
      alert('Lượt tiếp nhận này đã bị khóa (sau 18h00 hoặc đã qua ngày), không thể xóa!');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa lượt tiếp nhận xe ${row.bien_so} (NO: ${row.no_id})?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dich_vu_tiep_nhan')
        .delete()
        .eq('no_id', row.no_id);

      if (error) throw error;
      setNhatKy((prev) => prev.filter((x) => x.no_id !== row.no_id));
      alert(`Đã xóa lượt tiếp nhận xe ${row.bien_so}!`);
    } catch (err: any) {
      alert('Lỗi xóa tiếp nhận: ' + err.message);
    }
  }

  // Chặn truy cập nếu không có quyền TN_VIEW
  if (!canView) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', backgroundColor: '#fff', padding: '30px', borderRadius: '10px', border: '1px solid #fecaca', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 8px 0' }}>
            Truy Cập Bị Từ Chối
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
            Tài khoản của bạn chưa được cấp quyền <strong>Xem Tiếp nhận xe (TN_VIEW)</strong>. Vui lòng liên hệ quản trị viên để được phân quyền.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* FORM BÊN TRÁI: NHẬP TIẾP NHẬN */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#0284c7' }}>⊕</span> THÔNG TIN XE VÀO DỊCH VỤ
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={labelStyle}>Biển số *</label>
              {dangTraCuu && <span style={{ fontSize: '11px', color: '#0284c7' }}>Đang tra cứu...</span>}
            </div>
            <input
              type="text"
              placeholder="VD: 93A46410"
              value={form.bien_so}
              onChange={(e) => setForm({ ...form, bien_so: e.target.value.toUpperCase() })}
              onBlur={handleBienSoBlur}
              required
              style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 'bold', fontSize: '14px', color: '#0284c7' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Khách hàng *</label>
              <input
                type="text"
                placeholder="Tên khách hàng"
                value={form.ten_khach_hang}
                onChange={(e) => setForm({ ...form, ten_khach_hang: e.target.value })}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Số điện thoại</label>
              <input
                type="text"
                placeholder="09xxxxxxxx"
                value={form.so_dien_thoai}
                onChange={(e) => setForm({ ...form, so_dien_thoai: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Cố vấn viên *</label>
            <select
              value={form.co_van_vien}
              onChange={(e) => setForm({ ...form, co_van_vien: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Chọn cố vấn --</option>
              {danhSachCoVan.map((cv) => (
                <option key={cv.ma_nv} value={`${cv.ma_nv} ${cv.ho_ten}`}>
                  {cv.ma_nv} - {cv.ho_ten}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Hạng mục thực hiện *</label>
              <select
                value={form.hang_muc_thuc_hien}
                onChange={(e) => setForm({ ...form, hang_muc_thuc_hien: e.target.value })}
                required
                style={inputStyle}
              >
                <option value="">-- Chọn hạng mục --</option>
                {dsHangMuc.map((item, idx) => (
                  <option key={item.id || item.ma_hang_muc || idx} value={item.ma_hang_muc}>
                    {item.ma_hang_muc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Trạng thái hẹn *</label>
              <select
                value={form.trang_thai_hen}
                onChange={(e) => setForm({ ...form, trang_thai_hen: e.target.value })}
                required
                style={inputStyle}
              >
                {dsTrangThai.map((item, idx) => (
                  <option key={item.id || item.ma_trang_thai || idx} value={item.ma_trang_thai}>
                    {item.ma_trang_thai}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ghi chú</label>
            <input
              type="text"
              placeholder="Ghi chú thêm (nếu có)"
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() =>
                setForm({
                  bien_so: '',
                  ten_khach_hang: '',
                  so_dien_thoai: '',
                  co_van_vien: '',
                  hang_muc_thuc_hien: '',
                  trang_thai_hen: '24H',
                  ghi_chu: '',
                })
              }
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                color: '#475569',
              }}
            >
              Nhập lại
            </button>

            {/* Chặn nút lưu nếu không có quyền TN_ADD */}
            {canAdd ? (
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {loading ? 'Đang lưu...' : '🚀 Lưu & Gửi Zalo'}
              </button>
            ) : (
              <button
                type="button"
                disabled
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  fontSize: '12px',
                }}
              >
                🔒 Không có quyền lưu
              </button>
            )}
          </div>
        </form>
      </div>

      {/* NHẬT KÝ DỊCH VỤ BÊN PHẢI */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🕒</span> NHẬT KÝ DỊCH VỤ
          </h3>
          <span style={{ fontSize: '11px', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            25 xe gần nhất
          </span>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>NO.</th>
                <th style={{ padding: '10px' }}>THỜI GIAN</th>
                <th style={{ padding: '10px' }}>BIỂN SỐ</th>
                <th style={{ padding: '10px' }}>KHÁCH HÀNG</th>
                <th style={{ padding: '10px' }}>CỐ VẤN VIÊN</th>
                <th style={{ padding: '10px' }}>HẠNG MỤC</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>HẸN</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {nhatKy.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Chưa có nhật ký tiếp nhận xe nào.
                  </td>
                </tr>
              ) : (
                nhatKy.map((row, index) => {
                  const daKhoa = kiemTraBiKhoa(row.thoi_gian);

                  return (
                    <tr key={row.no_id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.no_id || index + 1}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>
                        {row.thoi_gian ? new Date(row.thoi_gian).toLocaleString('vi-VN') : '---'}
                      </td>
                      <td style={{ padding: '10px', color: '#0284c7', fontWeight: 'bold' }}>{row.bien_so}</td>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{row.ten_khach_hang}</td>
                      <td style={{ padding: '10px' }}>{row.co_van_vien || row.ten_co_van || '---'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '11px', border: '1px solid #e2e8f0' }}>
                          {row.hang_muc_thuc_hien || row.hang_muc || '---'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0', fontSize: '11px', fontWeight: 'bold' }}>
                          {row.trang_thai_hen || '24H'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {daKhoa ? (
                          <span
                            title="Đã khóa (sau 18h00 hoặc qua ngày)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              fontSize: '11px',
                              fontWeight: '500',
                              cursor: 'not-allowed',
                            }}
                          >
                            🔒 Khóa
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(row)}
                                title="Sửa thông tin"
                                style={{
                                  padding: '3px 7px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #bae6fd',
                                  color: '#0284c7',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                ✏️
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                title="Xóa tiếp nhận"
                                style={{
                                  padding: '3px 7px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                🗑
                              </button>
                            )}

                            {!canEdit && !canDelete && (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Chỉ xem</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL SỬA LƯỢT TIẾP NHẬN */}
      {modalEditOpen && editRow && (
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
              borderRadius: '10px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                ✏️ Chỉnh Sửa Tiếp Nhận: {editRow.bien_so}
              </h3>
              <button
                type="button"
                onClick={() => setModalEditOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tên khách hàng</label>
                <input
                  type="text"
                  value={editRow.ten_khach_hang || ''}
                  onChange={(e) => setEditRow({ ...editRow, ten_khach_hang: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Số điện thoại</label>
                <input
                  type="text"
                  value={editRow.so_dien_thoai || ''}
                  onChange={(e) => setEditRow({ ...editRow, so_dien_thoai: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Cố vấn viên</label>
                <select
                  value={editRow.co_van_vien || ''}
                  onChange={(e) => setEditRow({ ...editRow, co_van_vien: e.target.value })}
                  required
                  style={inputStyle}
                >
                  {danhSachCoVan.map((cv) => (
                    <option key={cv.ma_nv} value={`${cv.ma_nv} ${cv.ho_ten}`}>
                      {cv.ma_nv} - {cv.ho_ten}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Hạng mục</label>
                  <select
                    value={editRow.hang_muc_thuc_hien || ''}
                    onChange={(e) => setEditRow({ ...editRow, hang_muc_thuc_hien: e.target.value })}
                    style={inputStyle}
                  >
                    {dsHangMuc.map((item, idx) => (
                      <option key={item.id || idx} value={item.ma_hang_muc}>
                        {item.ma_hang_muc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Trạng thái hẹn</label>
                  <select
                    value={editRow.trang_thai_hen || '24H'}
                    onChange={(e) => setEditRow({ ...editRow, trang_thai_hen: e.target.value })}
                    style={inputStyle}
                  >
                    {dsTrangThai.map((item, idx) => (
                      <option key={item.id || idx} value={item.ma_trang_thai}>
                        {item.ma_trang_thai}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Ghi chú</label>
                <input
                  type="text"
                  value={editRow.ghi_chu || ''}
                  onChange={(e) => setEditRow({ ...editRow, ghi_chu: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
                  disabled={savingEdit}
                  style={{ padding: '7px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ padding: '7px 18px', borderRadius: '4px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
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
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};