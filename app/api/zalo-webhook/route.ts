import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Ánh xạ 6 Bot với URL, Secret Token và tên cột trong bảng nhan_vien
const CAU_HINH_6_BOT: Record<
  string,
  { tenBot: string; url: string; secretToken: string; cotDb: string }
> = {
  '1': {
    tenBot: 'Bot 1 (HCNS / Tài khoản)',
    url: process.env.ZALO_BOT_1_URL || '',
    secretToken: process.env.ZALO_BOT_1_SECRET || '',
    cotDb: 'id_doan_chat_bot',
  },
  '2': {
    tenBot: 'Bot 2 (Dịch vụ / Tiếp nhận xe)',
    url: process.env.ZALO_BOT_2_URL || '',
    secretToken: process.env.ZALO_BOT_2_SECRET || '',
    cotDb: 'id_doan_chat_bot_2',
  },
  '3': {
    tenBot: 'Bot 3 (Kinh doanh / Đặt hoa)',
    url: process.env.ZALO_BOT_3_URL || '',
    secretToken: process.env.ZALO_BOT_3_SECRET || '',
    cotDb: 'id_doan_chat_bot_3',
  },
  '4': {
    tenBot: 'Bot 4 (Dự phòng 1)',
    url: process.env.ZALO_BOT_4_URL || '',
    secretToken: process.env.ZALO_BOT_4_SECRET || '',
    cotDb: 'id_doan_chat_bot_4',
  },
  '5': {
    tenBot: 'Bot 5 (Dự phòng 2)',
    url: process.env.ZALO_BOT_5_URL || '',
    secretToken: process.env.ZALO_BOT_5_SECRET || '',
    cotDb: 'id_doan_chat_bot_5',
  },
  '6': {
    tenBot: 'Bot 6 (Dự phòng 3)',
    url: process.env.ZALO_BOT_6_URL || '',
    secretToken: process.env.ZALO_BOT_6_SECRET || '',
    cotDb: 'id_doan_chat_bot_6',
  },
};

async function guiTinNhanZalo(botUrl: string, chatId: string, text: string) {
  if (!botUrl || !chatId) return;
  await fetch(botUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  }).catch((err) => console.error('Lỗi phản hồi Webhook Zalo:', err));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const botSo = searchParams.get('bot') || '1';
  return NextResponse.json({
    ok: true,
    message: `Zalo Webhook Bình Phước Ford đang hoạt động (Bot ${botSo})`,
  });
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const botSo = searchParams.get('bot') || '1';
    const botConfig = CAU_HINH_6_BOT[botSo] || CAU_HINH_6_BOT['1'];

    // Xác thực X-Bot-Api-Secret-Token từ Zalo Bot Platform
    if (botConfig.secretToken) {
      const incomingSecret = req.headers.get('x-bot-api-secret-token') || '';
      if (incomingSecret !== botConfig.secretToken) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized: Invalid secret token' },
          { status: 401 }
        );
      }
    }

    const payload = await req.json().catch(() => ({}));

    const msgObj = payload?.message || payload?.result?.message || payload;
    const chatId = String(
      msgObj?.chat?.id ||
      msgObj?.from?.id ||
      payload?.sender?.id ||
      ''
    ).trim();

    const textNhan = String(
      msgObj?.text ||
      payload?.message?.text ||
      ''
    ).trim();

    if (!chatId) {
      return NextResponse.json({ ok: true, ignored: 'Không tìm thấy chat_id trong payload' });
    }

    // Nhận diện mã nhân viên (VD: FNV-115 hoặc 115)
    const cleanText = textNhan.toUpperCase().replace(/\s+/g, '');
    const matchMaNV = cleanText.match(/^(FNV-)?(\d{1,5})$/);

    if (matchMaNV) {
      const soMa = matchMaNV[2];
      const maChuan = `FNV-${soMa}`;

      const { data: dsNV } = await supabaseAdmin
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan')
        .or(`ma_nv.ilike.${maChuan},ma_nv.ilike.${soMa}`)
        .limit(1);

      const nvTimThay = dsNV && dsNV.length > 0 ? dsNV[0] : null;

      if (nvTimThay) {
        const { error: updateErr } = await supabaseAdmin
          .from('nhan_vien')
          .update({ [botConfig.cotDb]: chatId })
          .eq('ma_nv', nvTimThay.ma_nv);

        if (!updateErr) {
          await guiTinNhanZalo(
            botConfig.url,
            chatId,
            `✅ <b>[LIÊN KẾT THÀNH CÔNG - ${botConfig.tenBot.toUpperCase()}]</b>
━━━━━━━━━━━━━━━━━━━━
👤 Nhân sự: <b>${nvTimThay.ho_ten}</b> (${nvTimThay.ma_nv})
🏢 Bộ phận: ${nvTimThay.bo_phan || 'Bình Phước Ford'}
🆔 Mã Chat ID của bạn: <code>${chatId}</code>
💾 Hệ thống đã tự động lưu mã này vào hồ sơ nhân sự của bạn!`
          );
          return NextResponse.json({ ok: true, linked: nvTimThay.ma_nv, chatId });
        }
      } else {
        await guiTinNhanZalo(
          botConfig.url,
          chatId,
          `⚠️ Không tìm thấy mã nhân viên <b>${maChuan}</b> trên hệ thống.\n\n🆔 Mã Chat ID của bạn trên <b>${botConfig.tenBot}</b> là:\n<code>${chatId}</code>\n\nVui lòng kiểm tra lại mã NV hoặc gửi mã ID trên cho HCNS/IT.`
        );
        return NextResponse.json({ ok: true, notFound: maChuan, chatId });
      }
    }

    // Phản hồi Chat ID + hướng dẫn nếu nhân viên nhắn nội dung khác
    await guiTinNhanZalo(
      botConfig.url,
      chatId,
      `🤖 <b>[BÌNH PHƯỚC FORD - ${botConfig.tenBot.toUpperCase()}]</b>
━━━━━━━━━━━━━━━━━━━━
🆔 Mã Chat ID của bạn là:
<code>${chatId}</code>

👉 <b>Cách tự động cập nhật vào hồ sơ:</b>
Hãy nhắn đúng <b>Mã nhân viên</b> của bạn vào đây (Ví dụ: <b>FNV-115</b>) để hệ thống tự lưu ngay lập tức!`
    );

    return NextResponse.json({ ok: true, repliedChatId: chatId });
  } catch (error: any) {
    console.error('Lỗi Zalo Webhook:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}