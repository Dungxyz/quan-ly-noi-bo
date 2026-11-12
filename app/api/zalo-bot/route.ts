import { NextResponse } from 'next/server';

const ZALO_BOT_URL = 'https://bot-api.zaloplatforms.com/bot2842067600454710958:pqPyfvdqzGuNKTaOhCWadVaLzhWflFoYRFwEigLNALpHrhFKPHqiPdEZlvzoqtmE/sendMessage';
const DEFAULT_GROUP_ID = '6d6fb4ffc0b229ec70a3'; // Nhóm dự phòng nếu CVDV chưa có ID bot riêng

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
      co_van_cu, // Tên cố vấn cũ (nếu là thao tác điều chuyển)
    } = body;

    const now = new Date();
    const thoiGianStr =
      now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      now.toLocaleDateString('vi-VN');

    const isDieuChuyen = Boolean(co_van_cu && co_van_cu !== co_van_vien);

    // Tiêu đề và dòng thông tin điều chuyển
    const tieuDe = isDieuChuyen
      ? '🔄 [BÌNH PHƯỚC FORD - ĐIỀU CHUYỂN XE DỊCH VỤ]'
      : '🚗 [BÌNH PHƯỚC FORD - TIẾP NHẬN XE MỚI]';

    const dongDieuChuyen = isDieuChuyen
      ? `\n⚠️ Lưu ý: Điều chuyển từ cố vấn [${co_van_cu}] sang`
      : '';

    const noiDungTinNhan = `${tieuDe}
━━━━━━━━━━━━━━━━━━━━
🔹 Biển số xe: ${bien_so}
👤 Khách hàng: ${ten_khach_hang}
📞 SĐT: ${so_dien_thoai || '---'}
👨‍💼 Cố vấn tiếp nhận: ${co_van_vien}${dongDieuChuyen}
🔧 Hạng mục: ${hang_muc_thuc_hien || '---'}
⏱ Trạng thái hẹn: ${trang_thai_hen || '24H'}
📝 Ghi chú: ${ghi_chu || 'Không có'}
⏰ Thời gian: ${thoiGianStr}`;

    // Nếu cố vấn có ID bot riêng -> gửi thẳng cho cố vấn đó. Chưa có -> gửi về nhóm chung
    const targetChatId = chat_id && chat_id.trim() ? chat_id.trim() : DEFAULT_GROUP_ID;

    const res = await fetch(ZALO_BOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: noiDungTinNhan,
      }),
    });

    const result = await res.json().catch(() => ({}));
    return NextResponse.json({ success: true, targetChatId, result });
  } catch (error: any) {
    console.error('Lỗi API Zalo Bot:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}