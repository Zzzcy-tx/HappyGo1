const cloud = require('wx-server-sdk')
cloud.init()

const wxBizDataCrypt = require('./WXBizDataCrypt') // 请自行实现解密算法，参考微信官方文档

// 云函数入口函数
exports.main = async (event, context) => {
  const { encryptedData, iv, code } = event

  // 调用微信登录凭证校验接口获取 session_key
  const result = await cloud.callFunction({
    name: 'login', // 这里填写你的登录云函数名称
    data: {
      code: code
    }
  })

  const sessionKey = result.result.session_key
  const pc = new wxBizDataCrypt(appId, sessionKey) // 初始化解密对象，appId 为你的小程序 appId

  const data = pc.decryptData(encryptedData , iv) // 解密手机号码
  return data.phoneNumber
}