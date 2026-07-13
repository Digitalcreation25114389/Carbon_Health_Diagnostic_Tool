const { genCheckMacValue, genMerchantTradeNo, ecpayTradeDate } = require('./_ecpay');

const ECPAY_CHECKOUT_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
const AMOUNT = 1000; // 固定金額，絕不信任前端傳來的金額
const SID_RE = /^[a-zA-Z0-9-]{1,50}$/;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

exports.handler = async (event) => {
  const sid = (event.queryStringParameters && event.queryStringParameters.sid) || '';

  if (!SID_RE.test(sid)) {
    return { statusCode: 400, body: '缺少或格式錯誤的 sid 參數' };
  }

  const { ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV } = process.env;
  if (!ECPAY_MERCHANT_ID || !ECPAY_HASH_KEY || !ECPAY_HASH_IV) {
    return { statusCode: 500, body: '伺服器尚未設定綠界金流環境變數' };
  }

  const siteUrl = `https://${event.headers.host}`;

  const params = {
    MerchantID: ECPAY_MERCHANT_ID,
    MerchantTradeNo: genMerchantTradeNo(),
    MerchantTradeDate: ecpayTradeDate(),
    PaymentType: 'aio',
    TotalAmount: String(AMOUNT),
    TradeDesc: 'CarbonHealthReport',
    ItemName: '企業碳健康健檢報告解鎖',
    ReturnURL: `${siteUrl}/.netlify/functions/payment-callback`,
    ChoosePayment: 'Credit',
    ClientBackURL: `${siteUrl}/?sid=${sid}&paid=1`,
    CustomField1: sid,
    EncryptType: '1',
  };

  params.CheckMacValue = genCheckMacValue(params, ECPAY_HASH_KEY, ECPAY_HASH_IV);

  const inputs = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8"><title>正在導向付款頁面...</title></head>
<body onload="document.forms[0].submit()">
  <p>正在導向綠界付款頁面，請稍候...</p>
  <form method="POST" action="${ECPAY_CHECKOUT_URL}">
    ${inputs}
    <noscript><button type="submit">前往付款</button></noscript>
  </form>
</body></html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html,
  };
};
