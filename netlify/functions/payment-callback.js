const { genCheckMacValue } = require('./_ecpay');

const SID_RE = /^[a-zA-Z0-9-]{1,50}$/;

function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');
  return Object.fromEntries(new URLSearchParams(raw));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '0|Method Not Allowed' };
  }

  const { ECPAY_HASH_KEY, ECPAY_HASH_IV, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!ECPAY_HASH_KEY || !ECPAY_HASH_IV || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('缺少必要環境變數（ECPay 金鑰或 Supabase service role key）');
    return { statusCode: 200, body: '0|Server Not Configured' };
  }

  const fields = parseBody(event);
  const receivedMac = fields.CheckMacValue;
  const expectedMac = genCheckMacValue(fields, ECPAY_HASH_KEY, ECPAY_HASH_IV);

  if (!receivedMac || receivedMac !== expectedMac) {
    console.error('CheckMacValue 驗證失敗，可能不是綠界送來的通知', fields);
    return { statusCode: 200, body: '0|CheckMacValue Error' };
  }

  const sid = fields.CustomField1;
  if (!SID_RE.test(sid || '')) {
    console.error('CustomField1（sid）格式錯誤', fields);
    return { statusCode: 200, body: '0|Invalid CustomField1' };
  }

  if (fields.RtnCode === '1') {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/submissions?id=eq.${encodeURIComponent(sid)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            paid: true,
            paid_at: new Date().toISOString(),
            merchant_trade_no: fields.MerchantTradeNo || null,
            ecpay_trade_no: fields.TradeNo || null,
          }),
        }
      );
      if (!res.ok) {
        console.error('更新 Supabase paid 狀態失敗', res.status, await res.text());
        return { statusCode: 200, body: '0|DB Update Failed' };
      }
    } catch (e) {
      console.error('呼叫 Supabase 時發生例外', e);
      return { statusCode: 200, body: '0|DB Exception' };
    }
  } else {
    console.warn('收到綠界付款失敗通知', fields.RtnCode, fields.RtnMsg);
  }

  return { statusCode: 200, body: '1|OK' };
};
