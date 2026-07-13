const SID_RE = /^[a-zA-Z0-9-]{1,50}$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const sid = (event.queryStringParameters && event.queryStringParameters.sid) || '';
  if (!SID_RE.test(sid)) {
    return { statusCode: 400, body: JSON.stringify({ error: '缺少或格式錯誤的 sid 參數' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: '伺服器尚未設定 Supabase 環境變數' }) };
  }

  try {
    const params = new URLSearchParams({
      select: 'id,paid,meta,answers',
      id: `eq.${sid}`,
      limit: '1',
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: '查詢資料庫失敗' }) };
    }
    const rows = await res.json();
    const row = rows[0];
    if (!row || !row.paid) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: false }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: true, meta: row.meta, answers: row.answers }),
    };
  } catch (e) {
    console.error('check-payment-status 發生例外', e);
    return { statusCode: 500, body: JSON.stringify({ error: '伺服器發生例外' }) };
  }
};
