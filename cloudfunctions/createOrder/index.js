// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database()
  const orderInfo = event

  // 创建订单的逻辑
  try {
    const orderResult = await db.collection('orderBills').add({
      data: {
        productId: orderInfo.productId,
        productName: orderInfo.productName,
        productPrice: orderInfo.productPrice,
        createdAt: new Date(),
        // 其他需要保存的订单信息
      }
    })

    // 返回创建结果
    return {
      success: true,
      orderId: orderResult._id, // 返回新创建记录的_id
      message: '订单创建成功'
    }
  } catch (error) {
    // 异常处理
    return {
      success: false,
      message: '订单创建失败',
      error: error
    }
  }
}
