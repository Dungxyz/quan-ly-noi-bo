export const DANH_MUC_QUYEN = [
  {
    nhom: '1. Xe Demo',
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
    nhom: '2. Đặt hoa bàn giao',
    icon: '🌸',
    danhSach: [
      { id: 'HOA_VIEW', label: 'Xem đơn hoa' },
      { id: 'HOA_ADD', label: 'Tạo đơn mới' },
      { id: 'HOA_APPROVE', label: 'Duyệt chi phí' },
    ],
  },
  {
    nhom: '3.Dịch Vụ - Tiếp Nhận Xe',
    icon: '🚗',
    danhSach: [
      { id: 'TN_VIEW', label: 'Xem trang tiếp nhận' },
      { id: 'TN_ADD', label: 'Thêm mới (Lưu & Gửi Zalo)' },
      { id: 'TN_EDIT', label: 'Sửa lượt tiếp nhận' },
      { id: 'TN_DELETE', label: 'Xóa lượt tiếp nhận' },
    ],
  },
  {
    nhom: '4. Dịch Vụ - Khách Hàng Hẹn',
    icon: '📅',
    danhSach: [
      { id: 'HEN_VIEW', label: 'Xem danh sách khách hẹn' },
      { id: 'HEN_ADD', label: 'Thêm khách hẹn mới' },
      { id: 'HEN_EDIT', label: 'Sửa khách hẹn' },
      { id: 'HEN_DELETE', label: 'Xóa khách hẹn' },
    ],
  },
  {
    nhom: '5. Dịch Vụ - Báo Cáo',
    icon: '📊',
    danhSach: [
      { id: 'BC_VIEW', label: 'Xem báo cáo & lọc dữ liệu' },
      { id: 'BC_EXCEL', label: 'Xuất file Excel' },
      { id: 'BC_MAU', label: 'Tải Báo cáo ngày' },
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