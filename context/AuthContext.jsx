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

  // Hàm Đăng xuất
  function dangXuat() {
    localStorage.removeItem('user_ma_nv');
    localStorage.removeItem('user_session_token');
    setCurrentUser(null);
    router.push('/login');
  }

  // 1. Khởi tạo & kiểm tra phiên đăng nhập mỗi khi chuyển trang hoặc F5
  useEffect(() => {
    async function kiemTraPhien() {
      const savedMaNV = localStorage.getItem('user_ma_nv');
      const savedToken = localStorage.getItem('user_session_token');

      if (savedMaNV) {
        const { data, error } = await supabase
          .from('nhan_vien')
          .select('*')
          .eq('ma_nv', savedMaNV)
          .single();

        const hopLeTrangThai =
          !error && data && data.trang_thai !== 'Đã nghỉ việc' && data.phan_quyen !== 'LOCKED';
        // Kiểm tra trùng khớp mã phiên thiết bị (nếu DB đã có session_token)
        const hopLeThietBi = !data?.session_token || data.session_token === savedToken;

        if (hopLeTrangThai && hopLeThietBi) {
          setCurrentUser(data);
        } else {
          localStorage.removeItem('user_ma_nv');
          localStorage.removeItem('user_session_token');
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

  // 2. Lắng nghe Realtime: Tự văng ngay lập tức nếu đăng nhập ở thiết bị khác, đổi MK, hoặc bị khóa
  useEffect(() => {
    if (!currentUser?.ma_nv) return;

    const channel = supabase
      .channel(`force-logout-${currentUser.ma_nv}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nhan_vien',
          filter: `ma_nv=eq.${currentUser.ma_nv}`,
        },
        (payload) => {
          const updated = payload.new;
          const localToken = localStorage.getItem('user_session_token');

          const dangNhapMayKhac =
            updated.session_token && updated.session_token !== localToken;
          const biDoiMatKhau = updated.mat_khau !== currentUser.mat_khau;
          const biKhoa =
            updated.trang_thai === 'Đã nghỉ việc' || updated.phan_quyen === 'LOCKED';

          if (dangNhapMayKhac) {
            alert('Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Phiên hiện tại sẽ tự đăng xuất!');
            dangXuat();
          } else if (biDoiMatKhau || biKhoa) {
            alert('Mật khẩu hoặc trạng thái tài khoản vừa được Admin thay đổi. Vui lòng đăng nhập lại!');
            dangXuat();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.ma_nv, currentUser?.mat_khau]);

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

    // Tạo mã phiên mới duy nhất cho thiết bị này và ghi đè lên Supabase để đá thiết bị cũ
    const newSessionToken = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    await supabase
      .from('nhan_vien')
      .update({ session_token: newSessionToken })
      .eq('ma_nv', data.ma_nv);

    // Đăng nhập thành công
    const userClean = {
      ma_nv: data.ma_nv,
      ho_ten: data.ho_ten,
      bo_phan: data.bo_phan,
      vi_tri: data.vi_tri,
      phan_quyen: data.phan_quyen,
      so_dien_thoai: data.so_dien_thoai,
      mat_khau: data.mat_khau,
      session_token: newSessionToken,
    };

    // Lưu phiên đăng nhập vào trình duyệt hiện tại
    setCurrentUser(userClean);
    localStorage.setItem('user_ma_nv', data.ma_nv);
    localStorage.setItem('user_session_token', newSessionToken);

    // Điều hướng thông minh theo phân quyền thực tế
    setTimeout(() => {
      const role = data.phan_quyen || '';
      if (role === 'ADMIN') {
        router.push('/');
      } else if (role.includes('DEMO')) {
        router.push('/xe-demo');
      } else if (role.includes('HOA')) {
        router.push('/dat-hoa');
      } else {
        router.push('/xe-demo');
      }
    }, 2000);

    return userClean;
  }

  // Hàm nhân viên tự đổi mật khẩu trong trang Hồ sơ cá nhân (bắt buộc nhập đúng mật khẩu cũ)
  async function doiMatKhauCaNhan(matKhauCu, matKhauMoi) {
    if (!currentUser?.ma_nv) {
      throw new Error('Không xác định được phiên đăng nhập!');
    }

    const mkCu = matKhauCu.trim();
    const mkMoi = matKhauMoi.trim();

    if (mkMoi.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự!');
    }

    if (mkCu === mkMoi) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
    }

    // 1. Lấy mật khẩu thực tế mới nhất từ Supabase để đối chiếu
    const { data, error } = await supabase
      .from('nhan_vien')
      .select('mat_khau')
      .eq('ma_nv', currentUser.ma_nv)
      .single();

    if (error || !data) {
      throw new Error('Không thể kiểm tra thông tin tài khoản!');
    }

    const passDungHienTai = data.mat_khau || '123456';
    if (mkCu !== passDungHienTai) {
      throw new Error('Mật khẩu hiện tại không chính xác! Nếu quên, vui lòng liên hệ bộ phận IT.');
    }

    // 2. Tạo session_token mới để giữ phiên máy này và đá văng các máy cũ
    const newSessionToken = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const { error: updateError } = await supabase
      .from('nhan_vien')
      .update({
        mat_khau: mkMoi,
        session_token: newSessionToken,
      })
      .eq('ma_nv', currentUser.ma_nv);

    if (updateError) {
      throw new Error('Lỗi khi cập nhật mật khẩu mới: ' + updateError.message);
    }

    // 3. Cập nhật lại localStorage và state trên máy hiện tại để KHÔNG bị tự đăng xuất
    localStorage.setItem('user_session_token', newSessionToken);
    setCurrentUser((prev) => ({
      ...prev,
      mat_khau: mkMoi,
      session_token: newSessionToken,
    }));
  }

  // Kiểm tra quyền theo module và hành động chi tiết
  function kiemTraQuyen(moduleName, action = 'view') {
    if (!currentUser) return false;
    const role = currentUser.phan_quyen || '';

    if (role === 'LOCKED') return false;
    if (role === 'ADMIN') return true;

    if (moduleName === 'XE_DEMO') {
      switch (action) {
        case 'view':
          return role.includes('DEMO');
        case 'edit':
          return role === 'DEMO_FULL' || role === 'DEMO_EDIT';
        case 'history':
          return role === 'DEMO_FULL';
        case 'create':
        case 'delete':
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
    <AuthContext.Provider
      value={{ currentUser, loadingUser, dangNhap, dangXuat, kiemTraQuyen, doiMatKhauCaNhan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);