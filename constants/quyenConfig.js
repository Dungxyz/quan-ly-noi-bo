export const DANH_MUC_QUYEN = [
  {
    nhom: '1. Tiếp nhận xe',
    icon: '🚗',
    danhSach: [
      { id: 'TN_VIEW', label: 'Xem danh sách' },
      { id: 'TN_ADD', label: 'Thêm mới (Lưu)' },
      { id: 'TN_EDIT', label: 'Sửa nhật ký' },
      { id: 'TN_DELETE', label: 'Xóa dữ liệu' },
    ],
  },
  {
    nhom: '2. Khách hàng hẹn',
    icon: '📅',
    danhSach: [
      { id: 'HEN_VIEW', label: 'Xem danh sách' },
      { id: 'HEN_ADD', label: 'Thêm lịch hẹn' },
      { id: 'HEN_EDIT', label: 'Sửa lịch hẹn' },
      { id: 'HEN_DELETE', label: 'Xóa lịch hẹn' },
    ],
  },
  {
    nhom: '3. Xe Demo',
    icon: '🚙',
    danhSach: [
      { id: 'DEMO_VIEW', label: 'Xem xe demo' },
      { id: 'DEMO_HISTORY', label: 'Xem lịch sử xe' },
      { id: 'DEMO_EDIT', label: 'Chỉnh sửa' },
      { id: 'DEMO_DELETE', label: 'Xóa' },
      { id: 'DEMO_CREATE', label: 'Thêm' },
    ],
  },
  {
    nhom: '4. Đặt hoa bàn giao',
    icon: '🌸',
    danhSach: [
      { id: 'HOA_VIEW', label: 'Xem đơn hoa' },
      { id: 'HOA_ADD', label: 'Tạo đơn mới' },
      { id: 'HOA_APPROVE', label: 'Duyệt chi phí' },
    ],
  },
];

// Tất cả mã quyền gộp lại (dùng cho nút Chọn hết hoặc ADMIN)
export const TAT_CA_MA_QUYEN = DANH_MUC_QUYEN.flatMap((g) => g.danhSach.map((q) => q.id));

// Hàm tính Badge tóm tắt quyền hiển thị ở bảng bên phải
export function layBadgeQuyen(phanQuyenStr) {
  if (!phanQuyenStr || phanQuyenStr === 'Chưa cấp quyền') {
    return { text: 'Chưa cấp quyền', bg: '#f1f5f9', color: '#64748b' };
  }
  if (phanQuyenStr === 'ADMIN') {
    return { text: 'Toàn quyền hệ thống', bg: '#fef3c7', color: '#d97706' };
  }
  if (phanQuyenStr === 'ACTIVE') {
    return { text: 'Mở khóa (Chờ gán quyền)', bg: '#e0f2fe', color: '#0284c7' };
  }
  if (phanQuyenStr === 'LOCKED') {
    return { text: 'Tài khoản khóa', bg: '#fee2e2', color: '#dc2626' };
  }

  const dsQuyen = phanQuyenStr.split(',').map((x) => x.trim());

  // Kiểm tra quyền Xe demo (cập nhật hiển thị theo tối đa 5 quyền)
  const quyenDemo = dsQuyen.filter((x) => x.startsWith('DEMO_'));
  if (quyenDemo.length > 0) {
    return { text: `Xe Demo (${quyenDemo.length}/5)`, bg: '#fef9c3', color: '#a16207' };
  }

  return { text: `Đã cấp (${dsQuyen.length} mục)`, bg: '#dcfce7', color: '#15803d' };
}