const crypto = require('crypto');

/**
 * 綠界電子發票 API 加解密：AES-128-CBC，Key/IV 直接使用 HashKey/HashIV，
 * 明文先做 URLEncode 再加密，密文以 Base64 輸出（解密則反向操作）。
 */
function aesEncrypt(plainText, hashKey, hashIv) {
  const encoded = encodeURIComponent(plainText);
  const cipher = crypto.createCipheriv('aes-128-cbc', hashKey, hashIv);
  return Buffer.concat([cipher.update(encoded, 'utf8'), cipher.final()]).toString('base64');
}

function aesDecrypt(base64Data, hashKey, hashIv) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', hashKey, hashIv);
  const decrypted = Buffer.concat([
    decipher.update(base64Data, 'base64'),
    decipher.final(),
  ]).toString('utf8');
  return decodeURIComponent(decrypted);
}

module.exports = { aesEncrypt, aesDecrypt };
