// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  const userID = event.userID;
  const shopID = event.shopID;
  console.log(userID);



  // 生成随机券码
  const couponCode = generateCouponCode();
  console.log(couponCode);
  // 插入数据库记录
  const res = await db.collection('shop_try')
    .where({
      'userID': this.data.userID,
    })
    .get()
    if(res.data.length > 0){
      if(res.data.isUsed === false){  //还未使用
        await db.collection('shop_try')
          .doc(res.data[0]._id)
          .update({
            data: {
              couponCode: couponCode,
              userCerti: true,
              updateAt: new Data()
            },
            fail: err => {
              console.error('券码添加失败', err);
              return '1';
            }
          });
      }
    } else {
      console.log('用户未订购');
      return '0';
    }


  return {
    couponCode,
  };

}

function generateCouponCode() {
  // 生成六位随机券码
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let couponCode = '';
  for (let i = 0; i < 6; i++) {
    couponCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return couponCode;
}