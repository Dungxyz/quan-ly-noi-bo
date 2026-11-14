import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';

const CAU_HINH_6_BOT: Record<
  string,
  { tenBot: string; url: string; groupId: string; secretToken: string; cotDb: string }
> = {
  '1': {
    tenBot: 'Bot 1',
    url: process.env.ZALO_BOT_1_URL || '',
    groupId: process.env.ZALO_GROUP_1_ID || '',
    secretToken: process.env.ZALO_BOT_1_SECRET || '',
    cotDb: 'id_doan_chat_bot',
  },
  '2': {
    tenBot: 'Bot 2',
    url: process.env.ZALO_BOT_2_URL || '',
    groupId: process.env.ZALO_GROUP_2_ID || '',
    secretToken: process.env.ZALO_BOT_2_SECRET || '',
    cotDb: 'id_doan_chat_bot_2',
  },
  '3': {
    tenBot: 'Bot 3',
    url: process.env.ZALO_BOT_3_URL || '',
    groupId: process.env.ZALO_GROUP_3_ID || '',
    secretToken: process.env.ZALO_BOT_3_SECRET || '',
    cotDb: 'id_doan_chat_bot_3',
  },
  '4': {
    tenBot: 'Bot 4',
    url: process.env.ZALO_BOT_4_URL || '',
    groupId: process.env.ZALO_GROUP_4_ID || '',
    secretToken: process.env.ZALO_BOT_4_SECRET || '',
    cotDb: 'id_doan_chat_bot_4',
  },
  '5': {
    tenBot: 'Bot 5',
    url: process.env.ZALO_BOT_5_URL || '',
    groupId: process.env.ZALO_GROUP_5_ID || '',
    secretToken: process.env.ZALO_BOT_5_SECRET || '',
    cotDb: 'id_doan_chat_bot_5',
  },
  '6': {
    tenBot: 'Bot 6',
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
  return NextResponse.json({ ok: true, bot: botSo });
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
          { ok: false, error: 'Unauthorized' },
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

    if (!chatId || !textNhan) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 1. Bỏ qua hoàn toàn mọi tin nhắn từ nhóm chat (không spam nhóm)
    const isGroupChat =
      chatType === 'group' ||
      (botConfig.groupId && chatId === botConfig.groupId.trim());

    if (isGroupChat) {
      return NextResponse.json({ ok: true, ignoredGroup: true });
    }

    const cleanText = textNhan.toUpperCase().replace(/\s+/g, '');

    // 2. Chỉ trả về ID khi nhân viên gõ đúng chữ "ID" hoặc "/ID"
    if (cleanText === 'ID' || cleanText === '/ID') {
      await guiTinNhanZalo(botConfig.url, chatId, `<code>${chatId}</code>`);
      return NextResponse.json({ ok: true, sentId: chatId });
    }

    // 3. Chỉ xử lý khi nhắn đúng cú pháp Mã nhân viên (VD: FNV-113 hoặc 113)
    const matchMaNV = cleanText.match(/^(FNV-?)?(\d{1,5})$/);
    if (!matchMaNV) {
      // Nhắn linh tinh (hi, ok, cảm ơn...) -> Im lặng không trả lời
      return NextResponse.json({ ok: true, ignoredText: true });
    }

    const soMa = matchMaNV[2];
    const maChuan = `FNV-${soMa}`;

    const { data: dsNV, error: queryErr } = await supabaseAdmin
      .from('nhan_vien')
      .select('ma_nv, ho_ten')
      .ilike('ma_nv', `%${soMa}%`);

    if (queryErr) {
      return NextResponse.json({ ok: false, error: queryErr.message });
    }

    const nvTimThay = (dsNV || []).find((nv) => {
      const maDb = String(nv.ma_nv || '').toUpperCase().replace(/\s+/g, '');
      return maDb === maChuan || maDb === `FNV${soMa}` || maDb === soMa;
    });

    if (!nvTimThay) {
      await guiTinNhanZalo(
        botConfig.url,
        chatId,
        `⚠️ Không tìm thấy mã <b>${maChuan}</b>.`
      );
      return NextResponse.json({ ok: true, notFound: maChuan });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('nhan_vien')
      .update({ [botConfig.cotDb]: chatId })
      .eq('ma_nv', nvTimThay.ma_nv);

    if (!updateErr) {
      await guiTinNhanZalo(
        botConfig.url,
        chatId,
        `✅ Đã liên kết <b>${nvTimThay.ho_ten} (${nvTimThay.ma_nv})</b> với <b>${botConfig.tenBot}</b>.`
      );
    }

    return NextResponse.json({ ok: true, linked: nvTimThay.ma_nv });
  } catch (error: any) {
    console.error('Lỗi Zalo Webhook:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}