import { NextResponse } from 'next/server';

const ZALO_BOT_URL = 'https://bot-api.zaloplatforms.com/bot2842067600454710958:pqPyfvdqzGuNKTaOhCWadVaLzhWflFoYRFwEigLNALpHrhFKPHqiPdEZlvzoqtmE/sendMessage';
const DEFAULT_GROUP_ID = '6d6fb4ffc0b229ec70a3';

// Hàm lọc bỏ mã nhân viên (VD: "FNV-070 Lê Phạm Anh Tuấn" -> "Lê Phạm Anh Tuấn")
function tachTenCoVan(rawStr: string): string {
  if (!rawStr) return '';
  return rawStr.replace(/^FNV-\d+\s*/i, '').trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    // Lấy chuẩn giờ Việt Nam (tránh lệch múi giờ UTC trên Vercel)
    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const thoiGianStr =
      vnTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      vnTime.toLocaleDateString('vi-VN');

    // Tách lấy riêng Họ Tên cố vấn
    const tenCoVanMoi = tachTenCoVan(co_van_vien);
    const tenCoVanCu = tachTenCoVan(co_van_cu);

    const isDieuChuyen = Boolean(tenCoVanCu && tenCoVanCu !== tenCoVanMoi);

    const tieuDe = isDieuChuyen
      ? '🔄 <b>[BÌNH PHƯỚC FORD - ĐIỀU CHUYỂN XE DỊCH VỤ]</b>'
      : '🚗 <b>[BÌNH PHƯỚC FORD - TIẾP NHẬN XE MỚI]</b>';

    // Dòng điều chuyển màu đỏ + in đậm tên cố vấn
    const dongDieuChuyen = isDieuChuyen
      ? `\n🚨 <font color="#dc2626"><b>Lưu ý: Điều chuyển từ cố vấn ${tenCoVanCu} sang</b></font>`
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

    const targetChatId = chat_id && chat_id.trim() ? chat_id.trim() : DEFAULT_GROUP_ID;

    // Thử gửi kèm parse_mode: 'HTML' để nhận định dạng in đậm & màu đỏ
    let res = await fetch(ZALO_BOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: noiDungTinNhan,
        parse_mode: 'HTML',
      }),
    });

    let result = await res.json().catch(() => ({}));

    // Dự phòng: Nếu nền tảng Zalo Bot từ chối parse_mode HTML, tự động gỡ thẻ HTML và gửi lại bản sạch
    if (!res.ok || result?.ok === false) {
      const plainText = noiDungTinNhan.replace(/<[^>]*>?/gm, '');
      res = await fetch(ZALO_BOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: plainText,
        }),
      });
      result = await res.json().catch(() => ({}));
    }

    return NextResponse.json({ success: true, targetChatId, result });
  } catch (error: any) {
    console.error('Lỗi API Zalo Bot:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}