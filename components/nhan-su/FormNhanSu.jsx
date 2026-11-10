'use client';

import { DS_BO_PHAN, DS_VI_TRI } from '@/constants/nhanSuConfig';
import { CO_CAU_TO_CHUC } from '@/constants/nhanSuConfig';

export default function FormNhanSu({
  formData,
  setFormData,
  dangChinhSua,
  dangLuu,
  onSubmit,
  onReset,
}) {
  return (
    <form onSubmit={onSubmit} style={{ padding: '20px 24px' }}>
      {/* 1. THÔNG TIN HỒ SƠ */}
      <div style={{ border: '1px solid #bae6fd', borderRadius: '8px', padding: '18px', marginBottom: '20px', backgroundColor: '#fff' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', margin: '0 0 16px 0', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
          1. THÔNG TIN HỒ SƠ NHÂN SỰ
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Mã NV (Khóa chính) <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              required
              disabled={dangChinhSua}
              placeholder="VD: FNV-113"
              value={formData.ma_nv}
              onChange={(e) => setFormData({ ...formData, ma_nv: e.target.value.trim().toUpperCase() })}
              style={{ ...inputStyle, backgroundColor: dangChinhSua ? '#f3f4f6' : '#fff' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Họ và Tên <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              required
              placeholder="VD: Vũ Đức Dũng"
              value={formData.ho_ten}
              onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Số ĐT (Mật khẩu gốc) <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              required
              placeholder="0376449393"
              value={formData.so_dien_thoai}
              onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Ngày sinh</label>
            <input
              type="date"
              value={formData.ngay_sinh}
              onChange={(e) => setFormData({ ...formData, ngay_sinh: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Giới tính</label>
            <select
              value={formData.gioi_tinh}
              onChange={(e) => setFormData({ ...formData, gioi_tinh: e.target.value })}
              style={inputStyle}
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>
          {/* 1. Ô CHỌN BỘ PHẬN */}
          <div>
            <label style={labelStyle}>Bộ Phận *</label>
            <select
              required
              value={formData.bo_phan || ''}
              onChange={(e) => {
                const boPhanMoi = e.target.value;
                // Khi đổi bộ phận thì tự reset vị trí cũ về rỗng
                setFormData({
                  ...formData,
                  bo_phan: boPhanMoi,
                  vi_tri: '', 
                });
              }}
              style={inputStyle}
            >
              <option value="">-- Chọn Bộ Phận --</option>
              {Object.keys(CO_CAU_TO_CHUC).map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Phòng</label>
            <input
              type="text"
              placeholder="VD: Phòng IT / CVDV"
              value={formData.phong || ''}
              onChange={(e) => setFormData({ ...formData, phong: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
          {/* 2. Ô CHỌN VỊ TRÍ / CHỨC VỤ (Tự động lọc theo Bộ phận) */}
          <div>
            <label style={labelStyle}>Vị Trí / Chức Vụ *</label>
            <select
              required
              value={formData.vi_tri || ''}
              disabled={!formData.bo_phan} // Khóa lại nếu chưa chọn bộ phận
              onChange={(e) => setFormData({ ...formData, vi_tri: e.target.value })}
              style={{
                ...inputStyle,
                backgroundColor: !formData.bo_phan ? '#f1f5f9' : '#fff',
                cursor: !formData.bo_phan ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">
                {!formData.bo_phan ? '-- Vui lòng chọn Bộ Phận trước --' : '-- Chọn Vị Trí / Chức Vụ --'}
              </option>
              
              {/* Lấy mảng vị trí tương ứng từ CO_CAU_TO_CHUC */}
              {(CO_CAU_TO_CHUC[formData.bo_phan] || []).map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Email nội bộ</label>
            <input
              type="email"
              placeholder="name@binhduongford.com.vn"
              value={formData.email_noi_bo}
              onChange={(e) => setFormData({ ...formData, email_noi_bo: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email cá nhân</label>
            <input
              type="email"
              placeholder="name@gmail.com"
              value={formData.email_ca_nhan}
              onChange={(e) => setFormData({ ...formData, email_ca_nhan: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* 2. TÀI KHOẢN HỆ THỐNG / CHUYÊN NGÀNH */}
      <div style={{ border: '1px solid #bae6fd', borderRadius: '8px', padding: '18px', marginBottom: '20px', backgroundColor: '#fff' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', margin: '0 0 16px 0', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
          2. TÀI KHOẢN HỆ THỐNG / CHUYÊN NGÀNH
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>SPS ID</label>
            <input
              type="text"
              value={formData.sps_id}
              onChange={(e) => setFormData({ ...formData, sps_id: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Stars ID</label>
            <input
              type="text"
              value={formData.stars_id}
              onChange={(e) => setFormData({ ...formData, stars_id: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Cyber</label>
            <input
              type="text"
              value={formData.cyber}
              onChange={(e) => setFormData({ ...formData, cyber: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>App Sheet</label>
            <input
              type="text"
              value={formData.appsheet}
              onChange={(e) => setFormData({ ...formData, appsheet: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>VPN</label>
            <input
              type="text"
              value={formData.vpn}
              onChange={(e) => setFormData({ ...formData, vpn: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>DSG</label>
            <input
              type="text"
              value={formData.dsg}
              onChange={(e) => setFormData({ ...formData, dsg: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Wingspan</label>
            <input
              type="text"
              value={formData.wingspan}
              onChange={(e) => setFormData({ ...formData, wingspan: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Servis2</label>
            <input
              type="text"
              value={formData.servis2}
              onChange={(e) => setFormData({ ...formData, servis2: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
            <label style={labelStyle}>LMS</label>
            <input
              type="text"
              value={formData.lms}
              onChange={(e) => setFormData({ ...formData, lms: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Synology</label>
            <input
              type="text"
              value={formData.synology}
              onChange={(e) => setFormData({ ...formData, synology: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>UID Zalo</label>
            <input
              type="text"
              value={formData.uid_zalo}
              onChange={(e) => setFormData({ ...formData, uid_zalo: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>ID chat BOT</label>
            <input
              type="text"
              value={formData.id_doan_chat_bot}
              onChange={(e) => setFormData({ ...formData, id_doan_chat_bot: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Tình trạng công tác</label>
            <select
              value={formData.trang_thai || 'Hoạt động'}
              onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
              style={{
                ...inputStyle,
                fontWeight: 'bold',
                color: formData.trang_thai === 'Đã nghỉ việc' ? '#dc2626' : '#16a34a',
              }}
            >
              <option value="Hoạt động">🟢 Đang làm việc (Hoạt động)</option>
              <option value="Đã nghỉ việc">🔴 Đã nghỉ việc (Ngưng hoạt động)</option>
            </select>
          </div>
        </div>
      </div>

      {/* NÚT THAO TÁC FORM */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            backgroundColor: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '9px 20px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          Làm mới
        </button>
        <button
          type="submit"
          disabled={dangLuu}
          style={{
            backgroundColor: '#047857',
            border: 'none',
            borderRadius: '6px',
            padding: '9px 24px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#fff',
            cursor: dangLuu ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          💾 {dangLuu ? 'Đang lưu...' : dangChinhSua ? 'Cập Nhật Hồ Sơ' : 'Lưu Hồ Sơ Nhân Sự'}
        </button>
      </div>
    </form>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '5px',
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
};