'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TiepNhanXePage() {
  const [nhatKy, setNhatKy] = useState<any[]>([]);
  const [danhSachCoVan, setDanhSachCoVan] = useState<any[]>([]);
  const [dsHangMuc, setDsHangMuc] = useState<any[]>([]);
  const [dsTrangThai, setDsTrangThai] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dangTraCuu, setDangTraCuu] = useState(false);

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
      // Lấy danh sách nhân viên thuộc bộ phận CVDV
      const { data: cvData } = await supabase
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan, vi_tri')
        .or('bo_phan.eq.CVDV,vi_tri.ilike.%CVDV%,bo_phan.ilike.%Cố vấn%')
        .order('ma_nv', { ascending: true });

      if (cvData && cvData.length > 0) {
        setDanhSachCoVan(cvData);
      } else {
        // Fallback lấy toàn bộ nhân viên nếu chưa gắn nhãn CVDV
        const { data: allNv } = await supabase
          .from('nhan_vien')
          .select('ma_nv, ho_ten')
          .order('ma_nv', { ascending: true });
        if (allNv) setDanhSachCoVan(allNv);
      }

      // Lấy danh mục hạng mục dịch vụ
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

      // Lấy danh mục trạng thái hẹn
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

      // Lấy 25 xe vào gần nhất
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

  // 2. Logic tra cứu tự động từ bảng Khách Hàng đổ về Form khi nhập Biển Số
  async function handleBienSoBlur() {
    const bsNhap = form.bien_so.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!bsNhap) return;

    setDangTraCuu(true);
    try {
      // Tìm theo biển số chính xác hoặc tương đối
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

  // 3. Lưu lượt tiếp nhận xe & cập nhật danh sách
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      const { error: insertErr } = await supabase
        .from('dich_vu_tiep_nhan')
        .insert([payload]);

      if (insertErr) throw insertErr;

      // Cập nhật hoặc lưu mới vào danh bạ khách hàng
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

      // Reset form
      setForm({
        bien_so: '',
        ten_khach_hang: '',
        so_dien_thoai: '',
        co_van_vien: '',
        hang_muc_thuc_hien: '',
        trang_thai_hen: '24H',
        ghi_chu: '',
      });

      alert(`Đã lưu lượt tiếp nhận xe ${bs}!`);
      loadInitData();
    } catch (err: any) {
      alert('Lỗi lưu tiếp nhận: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* FORM BÊN TRÁI: NHẬP TIẾP NHẬN */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#0284c7' }}>⊕</span> THÔNG TIN XE VÀO DỊCH VỤ
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Biển số xe */}
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

          {/* Tên khách hàng & Số điện thoại */}
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

          {/* Cố vấn viên */}
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

          {/* Hạng mục thực hiện & Trạng thái hẹn */}
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

          {/* Ghi chú */}
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

          {/* Nút bấm */}
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
                nhatKy.map((row, index) => (
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
                      <button
                        type="button"
                        style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        🔒 Khóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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