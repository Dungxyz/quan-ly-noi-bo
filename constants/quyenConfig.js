export const DANH_MUC_QUYEN = [
  // 1. Phân hệ Dịch Vụ Đại Lý
  {
    nhom: 'Dịch Vụ - Tiếp Nhận Xe',
    icon: '🚗',
    danhSach: [
      { id: 'TN_VIEW', label: 'Xem trang tiếp nhận' },
      { id: 'TN_ADD', label: 'Thêm mới (Lưu xe)' },
      { id: 'TN_EDIT', label: 'Sửa nhật ký' },
      { id: 'TN_DELETE', label: 'Xóa lượt tiếp nhận' },
    ],
  },
  {
    nhom: 'Dịch Vụ - Khách Hàng Hẹn',
    icon: '📅',
    danhSach: [
      { id: 'HEN_VIEW', label: 'Xem danh sách khách hẹn' },
      { id: 'HEN_ADD', label: 'Thêm khách hẹn mới' },
      { id: 'HEN_EDIT', label: 'Sửa thông tin hẹn' },
      { id: 'HEN_DELETE', label: 'Xóa lịch hẹn' },
    ],
  },
  {
    nhom: 'Dịch Vụ - Báo Cáo',
    icon: '📊',
    danhSach: [
      { id: 'BC_VIEW', label: 'Xem báo cáo & lọc' },
      { id: 'BC_EXCEL', label: 'Xuất file Excel' },
      { id: 'BC_MAU', label: 'BC Ngày (Mẫu)' },
    ],
  },

  // 2. Các phân hệ khác của đại lý
  {
    nhom: 'Xe Demo & Lái Thử',
    icon: '🚙',
    danhSach: [
      { id: 'XE_DEMO', label: 'Xem xe demo' },
      { id: 'DEMO_ADD', label: 'Đăng ký xuất xe' },
      { id: 'DEMO_TRA', label: 'Nhận trả xe' },
    ],
  },
  {
    nhom: 'Quản Lý Đặt Hoa',
    icon: '🌸',
    danhSach: [
      { id: 'DAT_HOA', label: 'Xem danh sách hoa' },
      { id: 'HOA_ADD', label: 'Tạo đơn đặt hoa' },
      { id: 'HOA_DUYET', label: 'Duyệt chi đặt hoa' },
    ],
  },
  {
    nhom: 'Quản Lý Nhân Sự',
    icon: '👤',
    danhSach: [
      { id: 'NHAN_SU', label: 'Quản lý tài khoản & NV' },
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