// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 支付成功回调函数
exports.main = async (event, context) => {
  const {
    return_code, // 状态码
    appid, // 小程序 AppID
    mch_id, // 微信支付的商户号
    device_info, // 微信支付分配的终端设备号
    openid, // 用户在商户appid下的唯一标识
    trade_type, // 交易类型：JSAPI、NATIVE、APP
    bank_type, // 银行类型
    result_code, //SUCCESS/FAIL
    transaction_id, //微信支付订单号
    out_trade_no, //商户系统内部订单号
    total_fee,
     
    // ......
    // 更多参数请参考：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_7&index=8
  } = event;

  const res = await db.collection("paymentRecord")
    .add({
      data:{
        openid: openid,
        device_info: device_info,
        transaction_id: transaction_id,
        out_trade_no: out_trade_no,
        total_fee: total_fee,//总金额
        updateAt: new Date(),
      }
    })

  // 向微信后台返回成功，否则微信后台将会重复调用此函数
  return { errcode: 0 };
};