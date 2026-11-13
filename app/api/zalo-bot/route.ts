import { NextResponse } from 'next/server';

// Cấu hình 6 Bot Zalo (3 Bot chính + 3 Bot dự phòng) khớp với 6 cột trong bảng nhan_vien
const DANH_SACH_BOT = {
  BOT_1: {
    // Bot 1: HCNS / Tài khoản / Đặt hoa
    url: 'https://bot-api.zaloplatforms.com/bot2842067600454710958:pqPyfvdqzGuNKTaOhCWadVaLzhWflFoYRFwEigLNALpHrhFKPHqiPdEZlvzoqtmE/sendMessage',
    groupId: '6d6fb4ffc0b229ec70a3',
    cotChatId: 'id_doan_chat_bot',
  },
  BOT_2: {
    // Bot 2: Tiếp nhận xe dịch vụ
    url: 'https://bot-api.zaloplatforms.com/bot2285270167614082446:uxQHphWWbHWiPXacUulMXuZzAiiNmSDSkqwbEsvllXjvkqPcyKkrRrWAnHOkYKGV/sendMessage',
    groupId: '4a5293c2e78f0ed1579e',
    cotChatId: 'id_doan_chat_bot_2',
  },
  BOT_3: {
    // Bot 3 (Chính 3 - Điền URL khi kích hoạt)
    url: process.env.ZALO_BOT_3_URL || '',
    groupId: process.env.ZALO_GROUP_3_ID || '',
    cotChatId: 'id_doan_chat_bot_3',
  },
  BOT_4: {
    // Bot 4 (Dự phòng 1)
    url: process.env.ZALO_BOT_4_URL || '',
    groupId: process.env.ZALO_GROUP_4_ID || '',
    cotChatId: 'id_doan_chat_bot_4',
  },
  BOT_5: {
    // Bot 5 (Dự phòng 2)
    url: process.env.ZALO_BOT_5_URL || '',
    groupId: process.env.ZALO_GROUP_5_ID || '',
    cotChatId: 'id_doan_chat_bot_5',
  },
  BOT_6: {
    // Bot 6 (Dự phòng 3)
    url: process.env.ZALO_BOT_6_URL || '',
    groupId: process.env.ZALO_GROUP_6_ID || '',
    cotChatId: 'id_doan_chat_bot_6',
  },
};

// Bộ nhớ đệm chống gửi đúp cùng 1 biển số trong vòng 5 giây
const recentSentCache = new Map<string, number>();

function tachTenCoVan(rawStr: string): string {
  if (!rawStr) return '';
  return rawStr.replace(/^FNV-\d+\s*/i, '').trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Giờ chuẩn Việt Nam
    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const thoiGianStr =
      vnTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      vnTime.toLocaleDateString('vi-VN');

    // =========================================================================
    // 1. NHÁNH GỬI THÔNG BÁO CẤP / ĐỔI MẬT KHẨU (DÙNG BOT 1)
    // =========================================================================
    if (body.type === 'DOI_MAT_KHAU') {
      const { ma_nv, ho_ten, mat_khau_moi, chat_id } = body;
      const cleanUid = chat_id ? String(chat_id).trim() : '';

      if (!cleanUid) {
        return NextResponse.json({
          success: false,
          message: 'Nhân viên chưa có ID Zalo Bot',
        });
      }

      const noiDungMatKhau = `🔑 <b>[BÌNH PHƯỚC FORD - CẤP / ĐỔI MẬT KHẨU]</b>
━━━━━━━━━━━━━━━━━━━━
👤 Nhân sự: <b>${ho_ten}</b> (${ma_nv})
🔐 Mật khẩu mới: <b>${mat_khau_moi}</b>
⏰ Thời gian: ${thoiGianStr}
⚠️ Vui lòng đăng nhập và bảo mật thông tin tài khoản.`;

      const res = await fetch(DANH_SACH_BOT.BOT_1.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanUid,
          text: noiDungMatKhau,
          parse_mode: 'HTML',
        }),
      });

      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, data });
    }

    // =========================================================================
    // 2. NHÁNH GỬI THÔNG BÁO THÔNG TIN TÀI KHOẢN QUA ZALO (DÙNG BOT 1)
    // =========================================================================
    if (body.type === 'GUI_TAI_KHOAN') {
      const {
        ma_nv,
        ho_ten,
        loai_tai_khoan,
        ten_dang_nhap,
        mat_khau,
        duong_dan,
        ghi_chu,
        chat_id,
      } = body;

      const cleanUid = chat_id ? String(chat_id).trim() : '';
      if (!cleanUid) {
        return NextResponse.json({
          success: false,
          message: 'Vui lòng nhập ID đoạn chat Zalo nhận!',
        });
      }

      const noiDungTaiKhoan = `🔐 <b>[BÌNH PHƯỚC FORD - CẤP TÀI KHOẢN HỆ THỐNG]</b>
━━━━━━━━━━━━━━━━━━━━
👤 Nhân sự: <b>${ho_ten}</b> (${ma_nv})
📌 Loại tài khoản: <b>${loai_tai_khoan}</b>
🆔 Tên đăng nhập (User): <b>${ten_dang_nhap}</b>
🔑 Mật khẩu (Password): <b>${mat_khau}</b>${duong_dan ? `\n🌐 Đường dẫn: ${duong_dan}` : ''}${ghi_chu ? `\n📝 Ghi chú: ${ghi_chu}` : ''}
⏰ Thời gian cấp: ${thoiGianStr}
⚠️ Vui lòng đăng nhập và bảo mật thông tin tài khoản.`;

      const res = await fetch(DANH_SACH_BOT.BOT_1.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanUid,
          text: noiDungTaiKhoan,
          parse_mode: 'HTML',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false || (data?.error && data.error !== 0)) {
        return NextResponse.json({ success: false, message: 'Zalo API từ chối', data });
      }

      return NextResponse.json({ success: true, data });
    }

    // =========================================================================
    // 3. NHÁNH GỬI THÔNG BÁO ĐẶT HOA GIAO XE (DÙNG BOT 1)
    // =========================================================================
    if (body.type === 'DAT_HOA') {
      const {
        hanh_dong,
        tu_van_ban_hang,
        phong_kinh_doanh,
        ten_khach_hang,
        hop_dong_so,
        so_vin_bien_so,
        ngay_gio_giao_xe,
        ghi_chu,
        dat_sau_16h30,
        hinh_anh_url,
        nguoi_duyet,
        ly_do_tu_choi,
        chat_id_pgd,
      } = body;

      let noiDungHoa = '';

      if (hanh_dong === 'TAO_MOI') {
        const canhBaoTre = dat_sau_16h30
          ? `\n🚨 <b>ĐẶT SAU 16H30 (ĐÃ ĐÍNH KÈM ẢNH XÁC NHẬN)</b>`
          : '';
        const dongAnh = hinh_anh_url ? `\n🖼️ Hình ảnh: ${hinh_anh_url}` : '';

        noiDungHoa = `💐 <b>[BÌNH PHƯỚC FORD - YÊU CẦU ĐẶT HOA GIAO XE]</b>
━━━━━━━━━━━━━━━━━━━━
🏢 Bộ phận: <b>${phong_kinh_doanh || 'Kinh Doanh'}</b>
👨‍💼 TVBH: <b>${tu_van_ban_hang}</b>
👤 Khách hàng: <b>${ten_khach_hang}</b>
📄 Hợp đồng số: <b>${hop_dong_so}</b>
🚘 Số VIN / Biển số: ${so_vin_bien_so || '---'}
⏰ Ngày/giờ giao xe: <b>${ngay_gio_giao_xe}</b>
📝 Ghi chú: ${ghi_chu || 'Không có'}${canhBaoTre}${dongAnh}
⏳ Trạng thái: <b>CHỜ PHÓ GĐKD DUYỆT</b>`;
      } else if (hanh_dong === 'DA_DUYET' || hanh_dong === 'DUYET_DON') {
        noiDungHoa = `✅ <b>[ĐÃ DUYỆT ĐƠN ĐẶT HOA GIAO XE]</b>
━━━━━━━━━━━━━━━━━━━━
👤 Khách hàng: <b>${ten_khach_hang}</b> (HĐ: ${hop_dong_so})
👨‍💼 TVBH: <b>${tu_van_ban_hang}</b>
⏰ Giao xe lúc: <b>${ngay_gio_giao_xe}</b>
✍️ Người duyệt: <b>${nguoi_duyet}</b>`;
      } else {
        noiDungHoa = `❌ <b>[TỪ CHỐI ĐƠN ĐẶT HOA]</b>
━━━━━━━━━━━━━━━━━━━━
👤 Khách hàng: <b>${ten_khach_hang}</b> (HĐ: ${hop_dong_so})
👨‍💼 TVBH: <b>${tu_van_ban_hang}</b>
✍️ Phó GĐKD: <b>${nguoi_duyet}</b>
⚠️ Lý do: ${ly_do_tu_choi || 'Không đạt điều kiện'}`;
      }

      const danhSachNhan = new Set<string>([DANH_SACH_BOT.BOT_1.groupId]);
      if (chat_id_pgd && String(chat_id_pgd).trim()) {
        danhSachNhan.add(String(chat_id_pgd).trim());
      }

      const ketQua = await Promise.all(
        Array.from(danhSachNhan).map(async (targetId) => {
          const res = await fetch(DANH_SACH_BOT.BOT_1.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetId,
              text: noiDungHoa,
              parse_mode: 'HTML',
            }),
          });
          return res.json().catch(() => ({}));
        })
      );

      return NextResponse.json({ success: true, ketQua });
    }

    // =========================================================================
    // 4. NHÁNH GỬI THÔNG BÁO TIẾP NHẬN / ĐIỀU CHUYỂN XE DỊCH VỤ (DÙNG BOT 2)
    // =========================================================================
    const {
      bien_so,
      ten_khach_hang,
      so_dien_thoai,
      co_van_vien,
      hang_muc_thuc_hien,
      trang_thai_hen,
      ghi_chu,
      chat_id,
      co_van_cu,
    } = body;

    // Chống gọi API 2 lần liên tiếp cho cùng 1 xe + cố vấn trong 5 giây
    const cacheKey = `${bien_so}_${co_van_vien}_${co_van_cu || ''}`;
    const nowMs = Date.now();
    const lastSent = recentSentCache.get(cacheKey);
    if (lastSent && nowMs - lastSent < 5000) {
      return NextResponse.json({ success: true, skipped: 'Duplicate request blocked' });
    }
    recentSentCache.set(cacheKey, nowMs);

    const tenCoVanMoi = tachTenCoVan(co_van_vien);
    const tenCoVanCu = tachTenCoVan(co_van_cu);
    const isDieuChuyen = Boolean(tenCoVanCu && tenCoVanCu !== tenCoVanMoi);

    const tieuDe = isDieuChuyen
      ? '🔄 <b>[BÌNH PHƯỚC FORD - ĐIỀU CHUYỂN XE DỊCH VỤ]</b>'
      : '🚗 <b>[BÌNH PHƯỚC FORD - TIẾP NHẬN XE MỚI]</b>';

    const dongDieuChuyen = isDieuChuyen
      ? `\n🚨 <b>Lưu ý: Điều chuyển từ cố vấn ${tenCoVanCu}</b>`
      : '';

    const noiDungTinNhan = `${tieuDe}
━━━━━━━━━━━━━━━━━━━━
🔹 Biển số xe: <b>${bien_so}</b>
👤 Khách hàng: ${ten_khach_hang}
📞 SĐT: ${so_dien_thoai || '---'}
👨‍💼 Cố vấn tiếp nhận: <b>${tenCoVanMoi}</b>${dongDieuChuyen}
🔧 Hạng mục: ${hang_muc_thuc_hien || '---'}
⏱ Trạng thái hẹn: ${trang_thai_hen || '24H'}
📝 Ghi chú: ${ghi_chu || 'Không có'}
⏰ Thời gian: ${thoiGianStr}`;

    // Gom danh sách người nhận của Bot 2: Nhóm Dịch vụ (4a5293c2e78f0ed1579e) + ID Bot 2 của Cố vấn
    const botTiepNhan = DANH_SACH_BOT.BOT_2;
    const cleanGroupId = String(botTiepNhan.groupId).trim();
    const cleanCvId = chat_id ? String(chat_id).trim() : '';

    const danhSachNhan = new Set<string>([cleanGroupId]);
    if (cleanCvId && cleanCvId !== cleanGroupId) {
      danhSachNhan.add(cleanCvId);
    }

    const ketQua = await Promise.all(
      Array.from(danhSachNhan).map(async (targetId) => {
        const res = await fetch(botTiepNhan.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetId,
            text: noiDungTinNhan,
            parse_mode: 'HTML',
          }),
        });
        const data = await res.json().catch(() => ({}));
        return { targetId, status: res.status, data };
      })
    );

    return NextResponse.json({ success: true, ketQua });
  } catch (error: any) {
    console.error('Lỗi API Zalo Bot:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}