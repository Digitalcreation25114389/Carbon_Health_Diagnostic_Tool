const { aesEncrypt, aesDecrypt } = require('./_ecpay_invoice');

// TODO: 電子發票服務正式開通、確認金鑰可用後，記得跟 create-payment.js 的付款站台一起換成正式站
// 正式站：https://einvoice.ecpay.com.tw/B2CInvoice/Issue
const INVOICE_ISSUE_URL = 'https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue';

async function issueInvoice({ relateNumber, amount, meta, contactEmail, companyName }) {
  const { ECPAY_INVOICE_MERCHANT_ID, ECPAY_INVOICE_HASH_KEY, ECPAY_INVOICE_HASH_IV } = process.env;
  if (!ECPAY_INVOICE_MERCHANT_ID || !ECPAY_INVOICE_HASH_KEY || !ECPAY_INVOICE_HASH_IV) {
    return { ok: false, error: '尚未設定電子發票環境變數（ECPAY_INVOICE_MERCHANT_ID / HASH_KEY / HASH_IV）' };
  }

  const isCompany = !!(meta && meta.invoiceType === 'company' && meta.taxId);
  const donate = !isCompany && !!(meta && meta.donate && meta.loveCode);

  const innerData = {
    MerchantID: ECPAY_INVOICE_MERCHANT_ID,
    RelateNumber: relateNumber,
    CustomerID: '',
    CustomerIdentifier: isCompany ? meta.taxId : '',
    CustomerName: isCompany ? (meta.invoiceTitle || companyName || '') : (companyName || ''),
    CustomerAddr: '',
    CustomerPhone: '',
    CustomerEmail: contactEmail || '',
    Print: donate ? '0' : '1',
    Donation: donate ? '1' : '0',
    CarrierType: '',
    CarrierNum: '',
    TaxType: '1',
    SalesAmount: amount,
    InvoiceRemark: '',
    InvType: '07',
    vat: '1',
    Items: [
      {
        ItemSeq: 1,
        ItemName: '企業碳健康健檢報告解鎖',
        ItemCount: 1,
        ItemWord: '式',
        ItemPrice: amount,
        ItemTaxType: '1',
        ItemAmount: amount,
      },
    ],
  };
  if (donate) {
    innerData.LoveCode = meta.loveCode;
  }

  const payload = {
    MerchantID: ECPAY_INVOICE_MERCHANT_ID,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: aesEncrypt(JSON.stringify(innerData), ECPAY_INVOICE_HASH_KEY, ECPAY_INVOICE_HASH_IV),
  };

  let resJson;
  try {
    const res = await fetch(INVOICE_ISSUE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    resJson = await res.json();
  } catch (e) {
    return { ok: false, error: `呼叫綠界電子發票 API 失敗：${e}` };
  }

  if (!resJson || !resJson.Data) {
    return { ok: false, error: `綠界回應格式異常：${JSON.stringify(resJson)}` };
  }

  let decrypted;
  try {
    decrypted = JSON.parse(aesDecrypt(resJson.Data, ECPAY_INVOICE_HASH_KEY, ECPAY_INVOICE_HASH_IV));
  } catch (e) {
    return { ok: false, error: `解密綠界回應失敗：${e}` };
  }

  if (String(decrypted.RtnCode) !== '1') {
    return { ok: false, error: decrypted.RtnMsg || '開立發票失敗', raw: decrypted };
  }

  return { ok: true, invoiceNo: decrypted.InvoiceNo, invoiceDate: decrypted.InvoiceDate };
}

module.exports = { issueInvoice };
