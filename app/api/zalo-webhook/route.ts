import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';

const CAU_HINH_6_BOT: Record<
  string,
  { tenBot: string; url: string; groupId: string; secretToken: string; cotDb: string }
> = {
  '1': {
    tenBot: 'Bot 1 (HCNS / Tài khoản)',
    url: process.env.ZALO_BOT_1_URL || '',
    groupId: process.env.ZALO_GROUP_1_ID || '',
    secretToken: process.env.ZALO_BOT_1_SECRET || '',
    cotDb: 'id_doan_chat_bot',
  },
  '2': {
    tenBot: 'Bot 2 (Dịch vụ / Tiếp nhận xe)',
    url: process.env.ZALO_BOT_2_URL || '',
    groupId: process.env.ZALO_GROUP_2_ID || '',
    secretToken: process.env.ZALO_BOT_2_SECRET || '',
    cotDb: 'id_doan_chat_bot_2',
  },
  '3': {
    tenBot: 'Bot 3 (Kinh doanh / Đặt hoa)',
    url: process.env.ZALO_BOT_3_URL || '',
    groupId: process.env.ZALO_GROUP_3_ID || '',
    secretToken: process.env.ZALO_BOT_3_SECRET || '',
    cotDb: 'id_doan_chat_bot_3',
  },
  '4': {
    tenBot: 'Bot 4 (Dự phòng 1)',
    url: process.env.ZALO_BOT_4_URL || '',
    groupId: process.env.ZALO_GROUP_4_ID || '',
    secretToken: process.env.ZALO_BOT_4_SECRET || '',
    cotDb: 'id_doan_chat_bot_4',
  },
  '5': {
    tenBot: 'Bot 5 (Dự phòng 2)',
    url: process.env.ZALO_BOT_5_URL || '',
    groupId: process.env.ZALO_GROUP_5_ID || '',
    secretToken: process.env.ZALO_BOT_5_SECRET || '',
    cotDb: 'id_doan_chat_bot_5',
  },
  '6': {
    tenBot: 'Bot 6 (Dự phòng 3)',
    url: process.env.ZALO_BOT_6_URL || '',
    groupId: process.env.ZALO_GROUP_6_ID || '',
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

    const chatType = String(msgObj?.chat?.type || '').toLowerCase();
    const textNhan = String(msgObj?.text || payload?.message?.text || '').trim();

    if (!chatId) {
      return NextResponse.json({ ok: true, ignored: 'Không tìm thấy chat_id' });
    }

    const isGroupChat =
      chatType === 'group' ||
      (botConfig.groupId && chatId === botConfig.groupId.trim());

    if (isGroupChat) {
      await guiTinNhanZalo(
        botConfig.url,
        chatId,
        `📢 <b>[ID NHÓM CHAT - ${botConfig.tenBot.toUpperCase()}]</b>
━━━━━━━━━━━━━━━━━━━━
🆔 Group Chat ID: <code>${chatId}</code>
<i>(Để liên kết hồ sơ cá nhân, vui lòng nhắn trực tiếp riêng cho Bot thay vì nhắn trong nhóm)</i>`
      );
      return NextResponse.json({ ok: true, groupChatId: chatId });
    }

    const cleanText = textNhan.toUpperCase().replace(/\s+/g, '');
    const matchMaNV = cleanText.match(/^(FNV-?)?(\d{1,5})$/);

    if (matchMaNV) {
      const soMa = matchMaNV[2];
      const maChuan = `FNV-${soMa}`;

      const { data: dsNV, error: queryErr } = await supabaseAdmin
        .from('nhan_vien')
        .select('ma_nv, ho_ten, bo_phan')
        .ilike('ma_nv', `%${soMa}%`);

      if (queryErr) {
        await guiTinNhanZalo(
          botConfig.url,
          chatId,
          `⚠️ Lỗi truy vấn dữ liệu: ${queryErr.message}\n🆔 Chat ID của bạn: <code>${chatId}</code>`
        );
        return NextResponse.json({ ok: false, error: queryErr.message });
      }

      const nvTimThay = (dsNV || []).find((nv) => {
        const maDb = String(nv.ma_nv || '').toUpperCase().replace(/\s+/g, '');
        return maDb === maChuan || maDb === `FNV${soMa}` || maDb === soMa;
      });

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
        } else {
          await guiTinNhanZalo(
            botConfig.url,
            chatId,
            `⚠️ Tìm thấy <b>${nvTimThay.ho_ten}</b> nhưng không lưu được vào DB (${updateErr.message}).\n🆔 Chat ID: <code>${chatId}</code>`
          );
          return NextResponse.json({ ok: false, error: updateErr.message });
        }
      } else {
        await guiTinNhanZalo(
          botConfig.url,
          chatId,
          `⚠️ Không tìm thấy mã nhân viên <b>${maChuan}</b> trên hệ thống.\n\n🆔 Mã Chat ID của bạn trên <b>${botConfig.tenBot}</b> là:\n<code>${chatId}</code>`
        );
        return NextResponse.json({ ok: true, notFound: maChuan, chatId });
      }
    }

    await guiTinNhanZalo(
      botConfig.url,
      chatId,
      `🤖 <b>[BÌNH PHƯỚC FORD - ${botConfig.tenBot.toUpperCase()}]</b>
━━━━━━━━━━━━━━━━━━━━
🆔 Mã Chat ID của bạn là:
<code>${chatId}</code>

👉 <b>Cách tự động cập nhật vào hồ sơ:</b>
Hãy nhắn đúng <b>Mã nhân viên</b> của bạn vào đây (Ví dụ: <b>FNV-113</b>) để hệ thống tự lưu ngay lập tức!`
    );

    return NextResponse.json({ ok: true, repliedChatId: chatId });
  } catch (error: any) {
    console.error('Lỗi Zalo Webhook:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}