'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/common/Toast';
import { DANH_MUC_QUYEN, TAT_CA_MA_QUYEN, layBadgeQuyen } from '@/constants/quyenConfig';

export default function PhanQuyenPage() {
  const [danhSach, setDanhSach] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState('');
  const [dangLuu, setDangLuu] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // State thông tin form cấp quyền bên trái
  const [nvDangChon, setNvDangChon] = useState(null);
  const [dsQuyenDaChon, setDsQuyenDaChon] = useState([]);
  const [trangThaiHoatDong, setTrangThaiHoatDong] = useState('ACTIVE');

  function baoTin(message, type = 'success') {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  }

  // 1. Tải danh sách tài khoản
  async function layDanhSach() {
    setLoading(true);
    const { data, error } = await supabase
      .from('nhan_vien')
      .select('ma_nv, ho_ten, so_dien_thoai, bo_phan, vi_tri, phan_quyen')
      .order('ma_nv', { ascending: true });

    if (error) {
      baoTin('Lỗi nạp danh sách: ' + error.message, 'error');
    } else {
      setDanhSach(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    layDanhSach();
  }, []);

  // 2. Khi click vào dòng nhân viên bên bảng phải
  function handleChonNhanVien(nv) {
    setNvDangChon(nv);

    if (nv.phan_quyen === 'LOCKED') {
      setTrangThaiHoatDong('LOCKED');
      setDsQuyenDaChon([]);
    } else {
      setTrangThaiHoatDong('ACTIVE');
      if (nv.phan_quyen === 'ADMIN') {
        setDsQuyenDaChon(TAT_CA_MA_QUYEN);
      } else if (nv.phan_quyen && nv.phan_quyen !== 'ACTIVE') {
        setDsQuyenDaChon(nv.phan_quyen.split(',').map((x) => x.trim()));
      } else {
        setDsQuyenDaChon([]);
      }
    }
  }

  // 3. Reset form
  function handleLamMoi() {
    setNvDangChon(null);
    setDsQuyenDaChon([]);
    setTrangThaiHoatDong('ACTIVE');
  }

  // 4. Bật / Tắt một quyền đơn lẻ
  function toggleQuyen(idQuyen) {
    setDsQuyenDaChon((prev) =>
      prev.includes(idQuyen) ? prev.filter((x) => x !== idQuyen) : [...prev, idQuyen]
    );
  }

  // 5. Nút Chọn hết / Bỏ hết
  function handleChonHet() {
    setDsQuyenDaChon(TAT_CA_MA_QUYEN);
  }
  function handleBoHet() {
    setDsQuyenDaChon([]);
  }

  // 6. Lưu phân quyền xuống Supabase
  async function handleLuuPhanQuyen(e) {
    e.preventDefault();
    if (!nvDangChon) {
      return baoTin('Vui lòng bấm chọn một nhân viên từ danh sách bên phải!', 'warning');
    }

    setDangLuu(true);

    let phanQuyenMoi = 'ACTIVE';
    if (trangThaiHoatDong === 'LOCKED') {
      phanQuyenMoi = 'LOCKED';
    } else if (dsQuyenDaChon.length === TAT_CA_MA_QUYEN.length) {
      phanQuyenMoi = 'ADMIN';
    } else if (dsQuyenDaChon.length > 0) {
      phanQuyenMoi = dsQuyenDaChon.join(',');
    }

    // Optimistic Update
    setDanhSach((prev) =>
      prev.map((item) =>
        item.ma_nv === nvDangChon.ma_nv ? { ...item, phan_quyen: phanQuyenMoi } : item
      )
    );

    const { error } = await supabase
      .from('nhan_vien')
      .update({ phan_quyen: phanQuyenMoi })
      .eq('ma_nv', nvDangChon.ma_nv);

    if (error) {
      baoTin('Lỗi lưu quyền: ' + error.message, 'error');
      layDanhSach();
    } else {
      baoTin(`Đã cập nhật phân quyền cho ${nvDangChon.ho_ten}!`, 'success');
      setNvDangChon({ ...nvDangChon, phan_quyen: phanQuyenMoi });
    }
    setDangLuu(false);
  }

  // 1. Hàm bỏ dấu tiếng Việt
  function boDauTiengViet(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  // 2. Tính lại ketQuaLoc trực tiếp theo tuKhoa và danhSach
  const ketQuaLoc = danhSach.filter((nv) => {
    if (!tuKhoa || !tuKhoa.trim()) return true;

    const tuKhoaChuan = boDauTiengViet(tuKhoa);
    const tenChuan = boDauTiengViet(nv.ho_ten || '');
    const maChuan = boDauTiengViet(nv.ma_nv || '');
    const sdtChuan = (nv.so_dien_thoai || '').trim();

    return (
      tenChuan.includes(tuKhoaChuan) ||
      maChuan.includes(tuKhoaChuan) ||
      sdtChuan.includes(tuKhoa.trim())
    );
  });

  return (
    <div style={{
        padding: '24px',
        backgroundColor: '#f8fafc',
        height: '100vh',           // 👉 Khóa cứng vừa khít chiều cao màn hình
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',        // 👉 Không bao giờ cuộn bung cả trang web 
        }}>
      <Toast toast={toast} onClose={() => setToast({ show: false, type: 'success', message: '' })} />

      {/* TIÊU ĐỀ TRANG */}
      <div style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔐</span>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            PHÂN QUYỀN TRUY CẬP TÀI KHOẢN
          </h1>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
          Cấp quyền chức năng theo từng phân hệ cho nhân sự trong đại lý
        </p>
      </div>

      {/* BỐ CỤC 2 CỘT (Trái: Cấp quyền, Phải: Danh sách tài khoản) */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          flex: 1,                 // Chiếm trọn phần chiều cao còn lại
          minHeight: 0,            // Bắt buộc để con cuộn được độc lập
          alignItems: 'stretch',
        }}
      >
        {/* CỘT TRÁI: FORM CẤP QUYỀN (ĐỨNG IM 100%, TỰ CUỘN NẾU MÀN HÌNH NHỎ) */}
        <div
          style={{
            width: '380px',
            flexShrink: 0,
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflowY: 'auto',     // Form tự cuộn nhẹ nếu màn hình quá ngắn
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0284c7', fontWeight: 'bold', fontSize: '15px' }}>
            <span>👤</span> Cấp quyền tài khoản
          </div>

          <form onSubmit={handleLuuPhanQuyen}>
            {/* Mã NV - Họ tên */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Mã NV - Họ tên</label>
              <input
                type="text"
                readOnly
                value={nvDangChon ? `${nvDangChon.ma_nv} - ${nvDangChon.ho_ten}` : 'Bấm vào danh sách bên phải'}
                style={{
                  ...inputStyle,
                  backgroundColor: nvDangChon ? '#f0fdf4' : '#f8fafc',
                  fontWeight: nvDangChon ? 'bold' : 'normal',
                  color: nvDangChon ? '#15803d' : '#94a3b8',
                }}
              />
            </div>

            {/* Mật khẩu đăng nhập */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Mật khẩu đăng nhập (Số điện thoại)</label>
              <input
                type="text"
                readOnly
                value={nvDangChon?.so_dien_thoai || ''}
                placeholder="Số điện thoại nhân viên"
                style={{ ...inputStyle, backgroundColor: '#f8fafc', color: '#475569' }}
              />
            </div>

            {/* Header Phân quyền các mục truy cập */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7' }}>
                Phân quyền các mục truy cập:
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleChonHet}
                  style={{ border: 'none', background: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Chọn hết
                </button>
                <button
                  type="button"
                  onClick={handleBoHet}
                  style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Bỏ hết
                </button>
              </div>
            </div>

            {/* DANH SÁCH CHECKBOX CÁC NHÓM QUYỀN (Cuộn dọc) */}
            <div style={{ 
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '240px', // 👉 Giới hạn độ cao vừa vặn màn hình
              overflowY: 'auto',  // 👉 Chỉ cho phép cuộn bên trong khối này
              marginBottom: '16px'
              }}>
              {DANH_MUC_QUYEN.map((nhom) => (
                <div key={nhom.nhom} style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>
                    {nhom.icon} {nhom.nhom}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                    {nhom.danhSach.map((quyen) => {
                      const checked = dsQuyenDaChon.includes(quyen.id);
                      return (
                        <label
                          key={quyen.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: checked ? '#0f172a' : '#64748b',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleQuyen(quyen.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          {quyen.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Trạng thái hoạt động */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Trạng thái hoạt động</label>
              <select
                value={trangThaiHoatDong}
                onChange={(e) => setTrangThaiHoatDong(e.target.value)}
                style={{ ...inputStyle, fontWeight: 'bold', color: trangThaiHoatDong === 'LOCKED' ? '#dc2626' : '#15803d' }}
              >
                <option value="ACTIVE">🟢 Đang hoạt động</option>
                <option value="LOCKED">🔴 Khóa tài khoản</option>
              </select>
            </div>

            {/* Nút thao tác form */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleLamMoi}
                style={{ flex: 1, padding: '9px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#475569' }}
              >
                Làm mới form
              </button>
              <button
                type="submit"
                disabled={dangLuu || !nvDangChon}
                style={{
                  flex: 1.5,
                  padding: '9px',
                  backgroundColor: !nvDangChon ? '#94a3b8' : '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  color: '#fff',
                  cursor: !nvDangChon ? 'not-allowed' : 'pointer',
                }}
              >
                {dangLuu ? 'Đang lưu...' : 'Lưu tài khoản'}
              </button>
            </div>
          </form>
        </div>

        {/* CỘT PHẢI: DANH SÁCH TÀI KHOẢN HIỆN CÓ */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* Thanh tìm kiếm & tiêu đề danh sách (Đứng yên) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
              Danh sách tài khoản hiện có{' '}
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>
                (Bấm vào dòng để chỉnh sửa)
              </span>
            </h2>
            <input
              type="text"
              placeholder="🔍 Tìm NV..."
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang nạp danh sách...</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                    <th style={{ padding: '10px 14px' }}>MÃ NV</th>
                    <th style={{ padding: '10px 14px' }}>TÊN NHÂN VIÊN</th>
                    <th style={{ padding: '10px 14px' }}>MẬT KHẨU</th>
                    <th style={{ padding: '10px 14px' }}>CÁC MỤC ĐƯỢC PHÉP TRUY CẬP</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {ketQuaLoc.map((nv) => {
                    const isSelected = nvDangChon?.ma_nv === nv.ma_nv;
                    const isLocked = nv.phan_quyen === 'LOCKED';
                    const badge = layBadgeQuyen(nv.phan_quyen);

                    return (
                      <tr
                        key={nv.ma_nv}
                        onClick={() => handleChonNhanVien(nv)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#eff6ff' : isLocked ? '#fffbfb' : '#fff',
                          cursor: 'pointer',
                          transition: 'background-color 0.1s ease',
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#0284c7' }}>
                          {nv.ma_nv}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b' }}>
                          {nv.ho_ten}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {nv.so_dien_thoai}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              display: 'inline-block',
                              border: '1px solid rgba(0,0,0,0.05)',
                            }}
                          >
                            {badge.text}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isLocked ? '#ef4444' : '#16a34a',
                              color: '#fff',
                            }}
                          >
                            {isLocked ? 'Khóa' : 'Hoạt động'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
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
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};