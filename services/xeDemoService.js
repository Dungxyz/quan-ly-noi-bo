import { supabase } from '@/lib/supabase';

// Lấy danh sách xe demo
export async function getDanhSachXeDemo() {
  const { data, error } = await supabase
    .from('xe_demo')
    .select('*')
    .order('ma_xe', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// Thêm xe mới
export async function insertXeDemo(xe) {
  const { data, error } = await supabase.from('xe_demo').insert([xe]);
  if (error) throw new Error(error.message);
  return data;
}

// Cập nhật thông tin xe
export async function updateXeDemo(ma_xe, thongTin) {
  const { data, error } = await supabase
    .from('xe_demo')
    .update(thongTin)
    .eq('ma_xe', ma_xe);

  if (error) throw new Error(error.message);
  return data;
}

// Xuất xe (Giao cho người đi)
export async function xuatXe(ma_xe, nguoi_di, khu_vuc, so_km, ghi_chu) {
  const { data, error } = await supabase
    .from('xe_demo')
    .update({
      trang_thai: 'Đang đi',
      nguoi_di,
      khu_vuc,
      so_km,
      ghi_chu: ghi_chu || null,
      updated_at: new Date().toISOString(),
    })
    .eq('ma_xe', ma_xe);

  if (error) throw new Error(error.message);
  return data;
}

// Tiếp nhận nhận xe về bãi
export async function traXe(ma_xe, so_km_ve, ghi_chu) {
  const { data, error } = await supabase
    .from('xe_demo')
    .update({
      trang_thai: 'Sẵn xe',
      nguoi_di: null,
      khu_vuc: null,
      so_km: so_km_ve,
      ghi_chu: ghi_chu || null,
      updated_at: new Date().toISOString(),
    })
    .eq('ma_xe', ma_xe);

  if (error) throw new Error(error.message);
  return data;
}

// Xóa xe
export async function deleteXeDemo(ma_xe) {
  const { error } = await supabase.from('xe_demo').delete().eq('ma_xe', ma_xe);
  if (error) throw new Error(error.message);
  return true;
}

// Lắng nghe Realtime
export function subscribeXeDemoRealtime(callback) {
  const channel = supabase
    .channel('kenh_xe_demo_sheet')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'xe_demo' }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Lấy lịch sử theo biển số xe (sắp xếp mới nhất lên đầu)
export async function getLichSuXe(bien_so_xe) {
  const { data, error } = await supabase
    .from('lich_su_xe')
    .select('*')
    .eq('bien_so_xe', bien_so_xe)
    .order('thoi_gian', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Ghi một dòng log nhật ký mới
export async function themLichSuXe(log) {
  const { data, error } = await supabase.from('lich_su_xe').insert([
    {
      ...log,
      thoi_gian: new Date().toISOString(),
    },
  ]);
  if (error) throw new Error(error.message);
  return data;
}