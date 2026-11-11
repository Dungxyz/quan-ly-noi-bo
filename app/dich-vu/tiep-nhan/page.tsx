'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TiepNhanXePage() {
  const [nhatKy, setNhatKy] = useState<any[]>([]);
  const [danhSachCoVan, setDanhSachCoVan] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    bien_so: '',
    ten_khach_hang: '',
    so_dien_thoai: '',
    ma_co_van: '',
    ten_co_van: '',
    hang_muc: '',
    trang_thai_hen: 'H - Hẹn trước',
    ghi_chu: '',
  });

  // 1. Tải danh sách cố vấn từ bảng nhan_vien và 25 lượt tiếp nhận gần nhất
  async function loadInitData() {
    // Lấy danh sách nhân viên cố vấn dịch vụ
    const { data: cvData } = await supabase
      .from('nhan_vien')
      .select('ma_nv, ho_ten')
      .eq('bo_phan', 'Dịch vụ');
    if (cvData) setDanhSachCoVan(cvData);

    // Lấy 25 xe gần nhất
    const { data: tnData } = await supabase
      .from('dich_vu_tiep_nhan')
      .select('*')
      .order('no_id', { ascending: false })
      .limit(25);
    if (tnData) setNhatKy(tnData);
  }

  useEffect(() => {
    loadInitData();
  }, []);

  // 2. Logic tự động tra cứu khách hàng khi nhập biển số
  async function handleBienSoBlur() {
    const bs = form.bien_so.trim().toUpperCase();
    if (!bs) return;

    const { data } = await supabase
      .from('dich_vu_khach_hang')
      .select('*')
      .eq('bien_so', bs)
      .maybeSingle();

    if (data) {
      setForm((prev) => ({
        ...prev,
        bien_so: bs,
        ten_khach_hang: data.ten_khach_hang || prev.ten_khach_hang,
        so_dien_thoai: data.so_dien_thoai || prev.so_dien_thoai,
        hang_muc: data.hang_muc_du_kien || prev.hang_muc,
      }));
    }
  }

  // 3. Lưu lượt tiếp nhận & Gửi Zalo Webhook
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bien_so || !form.ten_khach_hang || !form.ten_co_van) {
      alert('Vui lòng điền đầy đủ: Biển số, Khách hàng và Cố vấn!');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('dich_vu_tiep_nhan').insert([form]);
      if (error) throw error;

      // Cập nhật lại danh bạ khách hàng nếu là biển số mới
      await supabase.from('dich_vu_khach_hang').upsert(
        {
          bien_so: form.bien_so,
          ten_khach_hang: form.ten_khach_hang,
          so_dien_thoai: form.so_dien_thoai,
        },
        { onConflict: 'bien_so' }
      );

      // Reset form
      setForm({
        bien_so: '',
        ten_khach_hang: '',
        so_dien_thoai: '',
        ma_co_van: '',
        ten_co_van: '',
        hang_muc: '',
        trang_thai_hen: 'H - Hẹn trước',
        ghi_chu: '',
      });

      loadInitData();
      alert('Lưu tiếp nhận xe thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* FORM BÊN TRÁI */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#0284c7' }}>⊕</span> THÔNG TIN XE VÀO DỊCH VỤ
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Biển số *</label>
            <input
              type="text"
              placeholder="VD: 93A46410"
              value={form.bien_so}
              onChange={(e) => setForm({ ...form, bien_so: e.target.value.toUpperCase() })}
              onBlur={handleBienSoBlur}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', textTransform: 'uppercase', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Khách hàng *</label>
              <input
                type="text"
                placeholder="Tên khách hàng"
                value={form.ten_khach_hang}
                onChange={(e) => setForm({ ...form, ten_khach_hang: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Số điện thoại</label>
              <input
                type="text"
                placeholder="09xxxxxxxx"
                value={form.so_dien_thoai}
                onChange={(e) => setForm({ ...form, so_dien_thoai: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Cố vấn viên *</label>
            <select
              value={form.ten_co_van}
              onChange={(e) => setForm({ ...form, ten_co_van: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
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
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Hạng mục *</label>
              <select
                value={form.hang_muc}
                onChange={(e) => setForm({ ...form, hang_muc: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- Chọn hạng mục --</option>
                <option value="BDĐK">BDĐK (Bảo dưỡng định kỳ)</option>
                <option value="ĐSBH">ĐSBH (Đồng sơn bảo hiểm)</option>
                <option value="FSA">FSA (Chương trình triệu hồi)</option>
                <option value="KT 20HM">KT 20HM (Kiểm tra 20 hạng mục)</option>
                <option value="TTPT">TTPT (Thay thế phụ tùng)</option>
                <option value="BD theo BG">BD theo BG</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Trạng thái hẹn *</label>
              <select
                value={form.trang_thai_hen}
                onChange={(e) => setForm({ ...form, trang_thai_hen: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="H - Hẹn trước">H - Hẹn trước</option>
                <option value="K - Không hẹn">K - Không hẹn</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Ghi chú</label>
            <input
              type="text"
              placeholder="Ghi chú thêm (nếu có)"
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setForm({ bien_so: '', ten_khach_hang: '', so_dien_thoai: '', ma_co_van: '', ten_co_van: '', hang_muc: '', trang_thai_hen: 'H - Hẹn trước', ghi_chu: '' })}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Nhập lại
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1.5, padding: '10px', borderRadius: '4px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🚀 Lưu & Gửi Zalo
            </button>
          </div>
        </form>
      </div>

      {/* NHẬT KÝ DỊCH VỤ BÊN PHẢI */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🕒</span> NHẬT KÝ DỊCH VỤ
          </h3>
          <span style={{ fontSize: '11px', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            25 xe gần nhất
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>NO.</th>
              <th style={{ padding: '8px' }}>THỜI GIAN</th>
              <th style={{ padding: '8px' }}>BIỂN SỐ</th>
              <th style={{ padding: '8px' }}>KHÁCH HÀNG</th>
              <th style={{ padding: '8px' }}>CỐ VẤN VIÊN</th>
              <th style={{ padding: '8px' }}>HẠNG MỤC</th>
              <th style={{ padding: '8px' }}>HẸN</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {nhatKy.map((row) => (
              <tr key={row.no_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.no_id}</td>
                <td style={{ padding: '8px', color: '#64748b' }}>{new Date(row.thoi_gian).toLocaleString('vi-VN')}</td>
                <td style={{ padding: '8px', color: '#0284c7', fontWeight: 'bold' }}>{row.bien_so}</td>
                <td style={{ padding: '8px', fontWeight: '500' }}>{row.ten_khach_hang}</td>
                <td style={{ padding: '8px' }}>{row.ten_co_van}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '11px' }}>
                    {row.hang_muc}
                  </span>
                </td>
                <td style={{ padding: '8px' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0', fontSize: '10px', fontWeight: 'bold' }}>
                    24H
                  </span>
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}>
                    🔒 Khóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}