// 云函数入口文件
const cloud = require('wx-server-sdk')

const axios = require('axios');
const crypto = require('crypto');

// let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
// ip = ip.split(',')[0];
// ip = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip; // 获取IPv4地址


cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 订单数据，具体根据实际情况来填写
var orderInfo = {//变化的
  productId: 0,
  productName: '',
  productPrice: null,
  productBody: '',
  userID: null,
  userIP: null,
  userCode: null,
};


// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database()
  orderInfo = event//传过来的

  const res = await cloud.cloudPay.unifiedOrder({
    "body" : orderInfo.productName, // 商品描述
    "outTradeNo" : orderInfo.productPrice.toString() + Date.now().toString(), // 商户订单号
    "spbillCreateIp" : '58.247.0.18', // 终端 IP
    "subMchId" : "1656209427", // 商户号
    "totalFee" : orderInfo.productPrice, // 总金额
    "envId": "zcy-cloud-0g299nq9f08dce4b", // 云函数环境名称
    "functionName": "paymentSuc", // 支付结果通知回调云函数名
  })
  res.result = true;
  console.log(res);
  return res;
}


//随机字符串
function createNonceStr() {
  return Math.random().toString(36).substr(2, 15);
}

// 函数生成签名
function createSign(params, key) {
  let string = Object.keys(params).sort().map(k => {
    return `${k}=${params[k]}`;
  }).join('&') + `&key=${key}`;

  return crypto.createHash('md5').update(string, 'utf8').digest('hex').toUpperCase();
}

async function createPrepayId(orderData) {
  const url = "https://api.mch.weixin.qq.com/pay/unifiedorder";
  
  let params = {
    appid: 'wx1aa09ba4ca63007f',
    mch_id: 1656209427,
    nonce_str: createNonceStr(),
    body: orderInfo.body,
    out_trade_no: '',
    total_fee: orderInfo.productPrice,
    spbill_create_ip: null,
    notify_url: null,
    trade_type: 'JSAPI',
    openid: orderInfo.userCode,
  };

  // 添加签名
  params.sign = createSign(params, orderData.apiKey);

  // 将参数转换为XML或使用其他方式符合微信API要求
  let xmlData = convertToXML(params);

  // 发送请求并等待响应
  let response = await axios.post(url, xmlData, { headers: { 'Content-Type': 'text/xml' } });

  // 解析响应的XML数据，提取prepay_id
  let result = parseXML(response.data);
  
  // 确认返回数据中有prepay_id
  if (result.prepay_id) {
    return `prepay_id=${result.prepay_id}`;
  } else {
    throw new Error('获取prepay_id失败');
  }
}


async function getPrepayID(){
  const res = await cloud.cloudPay.unifiedOrder({
    "body" : "一项优惠", // 商品描述
    "outTradeNo" : "1234567890", // 商户订单号
    "spbillCreateIp" : orderInfo.userIP, // 终端 IP
    "subMchId" : "1900009231", // 商户号
    "totalFee" : orderInfo.productPrice, // 总金额
    "envId": "test-f0b102", // 云函数环境名称
    "functionName": "pay_cb" // 支付结果通知回调云函数名
  })
  return res;
}
