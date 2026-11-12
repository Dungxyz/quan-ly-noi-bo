import { NextResponse } from 'next/server';

const ZALO_BOT_URL = 'https://bot-api.zaloplatforms.com/bot2842067600454710958:pqPyfvdqzGuNKTaOhCWadVaLzhWflFoYRFwEigLNALpHrhFKPHqiPdEZlvzoqtmE/sendMessage';
const DEFAULT_GROUP_ID = '6d6fb4ffc0b229ec70a3';

const recentSentCache = new Map<string, number>();

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

    // Chống gửi đúp trong 5 giây
    const cacheKey = `${bien_so}_${co_van_vien}_${co_van_cu || ''}`;
    const nowMs = Date.now();
    const lastSent = recentSentCache.get(cacheKey);
    if (lastSent && nowMs - lastSent < 5000) {
      return NextResponse.json({ success: true, skipped: 'Duplicate blocked' });
    }
    recentSentCache.set(cacheKey, nowMs);

    // Giờ chuẩn Việt Nam
    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const thoiGianStr =
      vnTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      vnTime.toLocaleDateString('vi-VN');

    const tenCoVanMoi = tachTenCoVan(co_van_vien);
    const tenCoVanCu = tachTenCoVan(co_van_cu);
    const isDieuChuyen = Boolean(tenCoVanCu && tenCoVanCu !== tenCoVanMoi);

    const tieuDe = isDieuChuyen
      ? '🔄 **XE LÀM DỊCH VỤ (ĐIỀU CHUYỂN)**'
      : '🚗 **XE LÀM DỊCH VỤ**';

    // Nếu là điều chuyển -> tô đỏ nguyên dòng ghi chú bằng thẻ {red}...{/red}
    const dongGhiChu = isDieuChuyen
      ? `🚨 Ghi chú: {red}**Điều chuyển từ cố vấn ${tenCoVanCu} sang${ghi_chu ? ` (${ghi_chu})` : ''}**{/red}`
      : `📝 Ghi chú: **${ghi_chu || 'Không có'}**`;

    const noiDungTinNhan = `${tieuDe}
——————————
⏰ Thời gian: **${thoiGianStr}**
👤 Khách hàng: **${ten_khach_hang}**
📞 Số điện thoại: **${so_dien_thoai || 'Không có'}**
🚘 Biển số: **${bien_so}**
👨‍💼 Cố vấn viên: **${tenCoVanMoi}**
🛠 Hạng mục: **${hang_muc_thuc_hien || '---'}**
📌 Trạng thái hẹn: **${trang_thai_hen || '24H'}**
${dongGhiChu}
——————————`;

    // Gom danh sách nhận: Nhóm chung + riêng Cố vấn (nếu có và khác ID nhóm)
    const cleanGroupId = String(DEFAULT_GROUP_ID).trim();
    const cleanCvId = chat_id ? String(chat_id).trim() : '';

    const danhSachNhan = new Set<string>([cleanGroupId]);
    if (cleanCvId && cleanCvId !== cleanGroupId) {
      danhSachNhan.add(cleanCvId);
    }

    const ketQua = await Promise.all(
      Array.from(danhSachNhan).map(async (targetId) => {
        const res = await fetch(ZALO_BOT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetId,
            text: noiDungTinNhan,
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