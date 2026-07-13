const crypto = require('crypto');

/**
 * 綠界 CheckMacValue 官方演算法：
 * 1. 依參數名稱做 A-Z 排序，組成 HashKey=xxx&k1=v1&k2=v2...&HashIV=yyy
 * 2. 對整串做 encodeURIComponent，轉小寫後，把 .NET UrlEncode 會保留、
 *    但 JS encodeURIComponent 會轉義的字元換回來，再把空白（%20）轉成 +
 * 3. SHA256 後轉大寫
 */
function genCheckMacValue(params, hashKey, hashIv) {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'CheckMacValue' && params[k] !== undefined && params[k] !== null)
    .sort();

  let raw = `HashKey=${hashKey}`;
  for (const k of sortedKeys) {
    raw += `&${k}=${params[k]}`;
  }
  raw += `&HashIV=${hashIv}`;

  let encoded = encodeURIComponent(raw).toLowerCase();
  encoded = encoded
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

function genMerchantTradeNo() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `CH${ts}${rand}`.toUpperCase().slice(0, 20);
}

function ecpayTradeDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = { genCheckMacValue, genMerchantTradeNo, ecpayTradeDate };
