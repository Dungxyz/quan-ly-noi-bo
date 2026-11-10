'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Khởi tạo phiên đăng nhập từ localStorage
  useEffect(() => {
    async function kiemTraPhien() {
      const savedMaNV = localStorage.getItem('user_ma_nv');
      if (savedMaNV) {
        const { data, error } = await supabase
          .from('nhan_vien')
          .select('*')
          .eq('ma_nv', savedMaNV)
          .single();

        if (!error && data && data.trang_thai !== 'Đã nghỉ việc' && data.phan_quyen !== 'LOCKED') {
          setCurrentUser(data);
        } else {
          localStorage.removeItem('user_ma_nv');
          setCurrentUser(null);
          if (pathname !== '/login') router.push('/login');
        }
      } else {
        if (pathname !== '/login') router.push('/login');
      }
      setLoadingUser(false);
    }

    kiemTraPhien();
  }, [pathname, router]);

  // Hàm Đăng nhập thực tế
  async function dangNhap(taiKhoan, matKhau) {
    const tk = taiKhoan.trim();
    const mk = matKhau.trim();

    // Tìm theo Mã nhân viên hoặc Số điện thoại
    const { data, error } = await supabase
      .from('nhan_vien')
      .select('ma_nv, ho_ten, bo_phan, vi_tri, phan_quyen, so_dien_thoai, mat_khau, trang_thai')
      .or(`ma_nv.eq.${tk},so_dien_thoai.eq.${tk}`)
      .single();

    if (error || !data) {
      throw new Error('Tài khoản không tồn tại trên hệ thống!');
    }

    if (data.trang_thai === 'Đã nghỉ việc') {
      throw new Error('Hồ sơ nhân sự này đã ngưng hoạt động!');
    }

    if (data.phan_quyen === 'LOCKED') {
      throw new Error('Tài khoản của bạn đang bị khóa quyền truy cập!');
    }

    // Kiểm tra mật khẩu (mặc định nếu database chưa có thì so sánh '123456')
    const passDung = data.mat_khau || '123456';
    if (mk !== passDung) {
      throw new Error('Mật khẩu không chính xác!');
    }

    // Đăng nhập thành công
    const userClean = {
      ma_nv: data.ma_nv,
      ho_ten: data.ho_ten,
      bo_phan: data.bo_phan,
      vi_tri: data.vi_tri,
      phan_quyen: data.phan_quyen,
      so_dien_thoai: data.so_dien_thoai,
    };

    // Lưu phiên đăng nhập
    setCurrentUser(userClean);
    localStorage.setItem('user_ma_nv', data.ma_nv);

    // Điều hướng thông minh theo phân quyền thực tế
    setTimeout(() => {
      const role = data.phan_quyen || '';
      if (role === 'ADMIN') {
        router.push('/'); // Admin vào trang Quản lý nhân sự
      } else if (role.includes('DEMO')) {
        router.push('/xe-demo'); // Chỉ có quyền xe demo thì vào thẳng /xe-demo
      } else if (role.includes('HOA')) {
        router.push('/dat-hoa'); // Quyền hoa vào thẳng /dat-hoa
      } else {
        router.push('/xe-demo'); 
      }
    }, 2000); // Delay 2 giây để hiển thị thông báo đăng nhập thành công

    return userClean;
  }

  // Hàm Đăng xuất
  function dangXuat() {
    localStorage.removeItem('user_ma_nv');
    setCurrentUser(null);
    router.push('/login');
  }

  // Kiểm tra quyền theo module và hành động chi tiết
  function kiemTraQuyen(moduleName, action = 'view') {
    if (!currentUser) return false;
    const role = currentUser.phan_quyen || '';

    if (role === 'LOCKED') return false;
    if (role === 'ADMIN') return true; // ADMIN có toàn quyền

    if (moduleName === 'XE_DEMO') {
      switch (action) {
        case 'view':
          // Tất cả tài khoản có quyền DEMO đều được xem
          return role.includes('DEMO');
        case 'edit':
          // Cho phép cập nhật thông tin xe, nhận xe, trả xe
          return role === 'DEMO_FULL' || role === 'DEMO_EDIT';
        case 'history':
          // Chỉ Quản trị hoặc Điều phối mới được tra cứu lịch sử
          return role === 'DEMO_FULL';
        case 'create':
        case 'delete':
          // Chỉ Admin hoặc quản lý xe mới được tạo hoặc xóa xe khỏi hệ thống
          return role === 'DEMO_FULL';
        default:
          return false;
      }
    }

    if (moduleName === 'NHAN_SU') return role === 'ADMIN';
    if (moduleName === 'DAT_HOA') return role === 'ADMIN' || role === 'ACTIVE';

    return false;
  }

  return (
    <AuthContext.Provider value={{ currentUser, loadingUser, dangNhap, dangXuat, kiemTraQuyen }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);