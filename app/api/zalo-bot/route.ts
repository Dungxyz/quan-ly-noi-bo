import { NextResponse } from 'next/server';

const ZALO_BOT_URL = 'https://bot-api.zaloplatforms.com/bot2842067600454710958:pqPyfvdqzGuNKTaOhCWadVaLzhWflFoYRFwEigLNALpHrhFKPHqiPdEZlvzoqtmE/sendMessage';
const DEFAULT_CHAT_ID = '6d6fb4ffc0b229ec70a3';

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
      chat_id, // id_chat_bot của cố vấn phụ trách
    } = body;

    // Thời gian tiếp nhận
    const now = new Date();
    const thoiGianStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    // Nội dung thông điệp gửi bot Zalo
    const noiDungTinNhan = 
`🚗 [BÌNH PHƯỚC FORD - TIẾP NHẬN XE]
━━━━━━━━━━━━━━━━━━━━
🔹 Biển số xe: ${bien_so}
👤 Khách hàng: ${ten_khach_hang}
📞 SĐT: ${so_dien_thoai || '---'}
👨‍💼 Cố vấn: ${co_van_vien}
🔧 Hạng mục: ${hang_muc_thuc_hien || '---'}
⏱ Trạng thái hẹn: ${trang_thai_hen || '24H'}
📝 Ghi chú: ${ghi_chu || 'Không có'}
⏰ Giờ tiếp nhận: ${thoiGianStr}`;

    // Gom danh sách chat_id cần gửi: luôn gửi nhóm chung + gửi riêng CVDV nếu có
    const danhSachChatId: string[] = [DEFAULT_CHAT_ID];
    if (chat_id && chat_id.trim() && chat_id !== DEFAULT_CHAT_ID) {
      danhSachChatId.push(chat_id.trim());
    }

    // Bắn tin nhắn song song đến các chat_id
    const ketQuaGui = await Promise.all(
      danhSachChatId.map(async (targetId) => {
        try {
          const res = await fetch(ZALO_BOT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetId,
              text: noiDungTinNhan,
            }),
          });
          return await res.json();
        } catch (err: any) {
          return { error: err.message, targetId };
        }
      })
    );

    return NextResponse.json({ success: true, ketQua: ketQuaGui });
  } catch (error: any) {
    console.error('Lỗi API Zalo Bot:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}