import { supabase } from '@/lib/supabase';

// Chuẩn hóa lỗi PostgreSQL sang tiếng Việt
export function xuLyLoiSupabase(error) {
  if (!error) return 'Đã có lỗi xảy ra, vui lòng thử lại!';
  const msg = error.message || '';

  if (msg.includes('unique constraint') || error.code === '23505') {
    return 'Mã nhân viên này đã tồn tại trong hệ thống! Vui lòng kiểm tra lại.';
  }
  if (msg.includes('invalid input syntax')) {
    return 'Định dạng dữ liệu nhập vào không hợp lệ.';
  }
  if (msg.includes('JWT') || msg.includes('apikey')) {
    return 'Phiên xác thực hết hạn hoặc khóa API không hợp lệ.';
  }
  return msg;
}

// 1. Lấy toàn bộ danh sách nhân viên
export async function getDanhSachNhanVien() {
  const { data, error } = await supabase
    .from('nhan_vien')
    .select('*')
    .order('ma_nv', { ascending: true });

  if (error) throw new Error(xuLyLoiSupabase(error));
  return data || [];
}

// 2. Thêm mới nhân viên
export async function insertNhanVien(hoSo) {
  const { data, error } = await supabase.from('nhan_vien').insert([hoSo]);
  if (error) throw new Error(xuLyLoiSupabase(error));
  return data;
}

// 3. Cập nhật nhân viên
export async function updateNhanVien(ma_nv, hoSo) {
  const { data, error } = await supabase
    .from('nhan_vien')
    .update(hoSo)
    .eq('ma_nv', ma_nv);

  if (error) throw new Error(xuLyLoiSupabase(error));
  return data;
}

// 4. Chuyển đổi trạng thái Khóa / Mở khóa
export async function toggleTrangThaiNhanVien(ma_nv, trangThaiHienTai) {
  const phanQuyenMoi = trangThaiHienTai === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
  const { error } = await supabase
    .from('nhan_vien')
    .update({ phan_quyen: phanQuyenMoi })
    .eq('ma_nv', ma_nv);

  if (error) throw new Error(xuLyLoiSupabase(error));
  return phanQuyenMoi;
}

// 5. Xóa nhân viên
export async function deleteNhanVien(ma_nv) {
  const { error } = await supabase.from('nhan_vien').delete().eq('ma_nv', ma_nv);
  if (error) throw new Error(xuLyLoiSupabase(error));
  return true;
}

// 6. Lắng nghe thay đổi Realtime
export function subscribeNhanVienRealtime(callback) {
  const channel = supabase
    .channel('kenh_nhan_vien_modular')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nhan_vien' }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function doiMatKhauNhanSu(ma_nv, matKhauMoi) {
  try {
    const { data, error } = await supabase
      .from('nhan_su')
      .update({ mat_khau: matKhauMoi })
      .eq('ma_nv', ma_nv);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Loi doi mat khau:', err);
    throw err;
  }
}