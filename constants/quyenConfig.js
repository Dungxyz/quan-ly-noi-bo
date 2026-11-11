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

// Hàm hiển thị huy hiệu các mục được phép truy cập chuyên nghiệp
export function layBadgeQuyen(phanQuyen) {
  if (phanQuyen === 'LOCKED') {
    return [
      { text: 'Khóa tài khoản', bg: '#fee2e2', color: '#dc2626' }
    ];
  }
  if (phanQuyen === 'ADMIN') {
    return [
      { text: 'Toàn quyền (ADMIN)', bg: '#dcfce7', color: '#15803d' }
    ];
  }
  if (!phanQuyen || phanQuyen === 'ACTIVE') {
    return [
      { text: 'Chưa cấp quyền', bg: '#f1f5f9', color: '#64748b' }
    ];
  }

  const dsQuyen = phanQuyen.split(',').map((x) => x.trim()).filter(Boolean);
  if (dsQuyen.length === 0) {
    return [{ text: 'Chưa cấp quyền', bg: '#f1f5f9', color: '#64748b' }];
  }

  // Gom nhóm theo từng phân hệ thực tế
  const nhomTags = [];

  // 1. Phân hệ Dịch Vụ Đại Lý
  const quyenDichVu = dsQuyen.filter((q) => q.startsWith('TN_') || q.startsWith('HEN_') || q.startsWith('BC_'));
  if (quyenDichVu.length > 0) {
    nhomTags.push({
      text: `Dịch Vụ (${quyenDichVu.length})`,
      bg: '#e0f2fe',
      color: '#0369a1',
      title: quyenDichVu.join(', '),
    });
  }

  // 2. Xe Demo
  const quyenDemo = dsQuyen.filter((q) => q.includes('DEMO'));
  if (quyenDemo.length > 0) {
    nhomTags.push({
      text: `Xe Demo (${quyenDemo.length})`,
      bg: '#fef3c7',
      color: '#b45309',
      title: quyenDemo.join(', '),
    });
  }

  // 3. Đặt Hoa
  const quyenHoa = dsQuyen.filter((q) => q.includes('HOA'));
  if (quyenHoa.length > 0) {
    nhomTags.push({
      text: `Đặt Hoa (${quyenHoa.length})`,
      bg: '#fce7f3',
      color: '#be185d',
      title: quyenHoa.join(', '),
    });
  }

  // 4. Quản Lý Nhân Sự / Khác
  const quyenKhac = dsQuyen.filter(
    (q) => !q.startsWith('TN_') && !q.startsWith('HEN_') && !q.startsWith('BC_') && !q.includes('DEMO') && !q.includes('HOA')
  );
  if (quyenKhac.length > 0) {
    nhomTags.push({
      text: `Khác (${quyenKhac.length})`,
      bg: '#f1f5f9',
      color: '#475569',
      title: quyenKhac.join(', '),
    });
  }

  return nhomTags.length > 0 ? nhomTags : [{ text: `${dsQuyen.length} quyền`, bg: '#e0f2fe', color: '#0369a1' }];
}