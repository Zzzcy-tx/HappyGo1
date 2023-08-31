// 云函数入口文件
const cloud = require('wx-server-sdk')
<<<<<<< HEAD
=======
const db = wx.cloud.database()
>>>>>>> a571dec4ff7e50a9b218d8181c95074ca1bfac6a

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const userID = event.userID;
  console.log(userID);



  // 生成随机券码
  const couponCode = generateCouponCode();
  console.log(couponCode);
  // 插入数据库记录
  const res = await db.collection('couponTickets').add({
    data: {
      couponCode: couponCode,
      userID: userID,
      createdAt: new Date()
    }
  });

  return {
    couponCode,
  };

}

function generateCouponCode() {
  // 生成六位随机券码
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let couponCode = '';
  for (let i = 0; i < 6; i++) {
    couponCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return couponCode;
}