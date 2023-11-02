// pages/studentIdentify/IDpage/IDpage.js

const db = wx.cloud.database();
const collectionName = 'userIDs';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    hasUserID: false,
    userID: wx.getStorageSync('userID'),
    certificatedState: "false"
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      hasUserID : wx.getStorageSync('hasUserID'),
      userID : wx.getStorageSync('userID'),
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  idInput:function(e){
    this.setData({
      userID : e.detail.value
    })
  },


  confirmID:function(){
    // console.log('1')
    if(this.data.userID.length === 18 && validateIDCard(this.data.userID) ){
      if((getDigit(this.data.userID, 6,10) === '2004' || getDigit(this.data.userID, 6,10) === '2003' || getDigit(this.data.userID, 6,10) === '2005') ){
        db.collection(collectionName)
          .where({
            'userID': this.data.userID,
            // 添加其他查询条件
          })
          .get()
          .then(res => {
            console.log('查询结果：', res.data);
            if(res.data.length === 0){
              db.collection(collectionName).add({
                data: {
                  userID: this.data.userID,
                },
                success: res => {
                  console.log('数据添加成功', res);//
                  this.setData({hasUserID : true});
                  wx.showToast({title: '已通过验证', icon: 'none', duration: 2000});
                  wx.setStorageSync('hasUserID', this.data.hasUserID)
                  wx.setStorageSync('userID', this.data.userID)
                },
                fail: err => {
                  console.error('数据添加失败', err);//
                  wx.showToast({title: '网络错误请重试',icon: 'error',duration: 1500});
                }
              })

            } else {
              this.setData({
                hasUserID : true,
              });
              wx.showToast({title: '已通过认证', icon: 'none', duration: 2000})
              console.log(this.data.userID)
              wx.setStorageSync('hasUserID', this.data.hasUserID)
              wx.setStorageSync('userID', this.data.userID)
            }
            
          })
          .catch(err => {
            console.error('查询失败：', err);
            wx.showToast({title: '网络错误请重试',icon: 'error',duration: 1500});
          });
      } else {
        wx.showToast({title: '你不是学生！', icon: 'error', duration: 2000});
        wx.setStorageSync('userID', this.data.userID);
      }


    } else {
      wx.showToast({title: '请输入格式正确的身份证号',icon: 'none',duration: 2000})
    }
  },

  purchase:function(){
    let self = this;
    console.log(self.data.userID);
    //weixin
    createOrder();


    //zhifu
    

  }

  
})

//获取一个数据的第 n 到 m 位
function getDigit(data, n, m) {
  if (typeof data !== 'string') {
    return null;  // 数据类型不是字符串，返回null或其他适当的值
  }
  if (n >= 0 && m >= n && m <= data.length) {
    return data.slice(n, m);
  } else {
    return null;  // 范围不合法，返回null或其他适当的值
  }
}


//身份证合法性校验
function validateIDCard(idCard) {
  // 正则表达式验证身份证号码的基本格式
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  if (!reg.test(idCard)) {
    return false;
  }

  // 对于18位身份证，校验位计算
  if (idCard.length === 18) {
    const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkSum = [1, 0, 'X', 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * factors[i];
    }
    const remainder = sum % 11;
    const checkDigit = checkSum[remainder];
    if (idCard[17].toUpperCase() !== checkDigit.toString()) {
      return false;
    }
  }

  // 校验出生日期
  const birthYear = parseInt(idCard.substr(6, 4));
  const birthMonth = parseInt(idCard.substr(10, 2));
  const birthDay = parseInt(idCard.substr(12, 2));
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  if (
    birthYear < 1900 ||
    birthYear > currentYear ||
    birthMonth < 1 ||
    birthMonth > 12 ||
    birthDay < 1 ||
    birthDay > 31 ||
    (birthYear === currentYear && birthMonth > currentMonth) ||
    (birthYear === currentYear && birthMonth === currentMonth && birthDay > currentDay)
  ) {
    return false;
  }

  return true;
}

function createOrder() {
  // “创建订单”按钮时调用的函数
  let orderInfo = {
    productId: '0',
    productName: '30天学生优惠（普通）',
    productPrice: 9.9,
  };
  wx.cloud.callFunction({
    name: 'createOrder', // 云函数名称
    data: orderInfo,
    success(res) {
      if (res.result && res.result.success) {
        // 订单创建成功后的操作
        console.log('订单创建成功', res.result);
        // 支付操作

        //成功后的操作
        afterBill();
      } else {
        // 订单创建失败的操作
        console.error('订单创建失败', res.result.message);
      }
    },
    fail(err) {
      // 网络请求或服务器响应失败的操作
      console.error('云函数调用失败:', err);
    }
  });
}

function afterBill(){
  let self=this;
  var userID = this.data;
  console.log(this.data.userID);
  db.collection("shop1")
    .where({'userID': userID})
    .get()
    .then(res =>{
      console.log(res.data);
      if(res.data.length ===1){
        db.collection("shop1").doc(res.data[0]._id)
        .update({
          data:  {
            isUsed : false,
            userCerti : false,
            updateAt: new Date()
          },
          success: function(res){
            if (res.stats.updated === 0) {//没有更新数据
              db.collection("shop1").add({
                data: {
                  userID: self.data.userID,
                  isUsed: false,
                  userCerti : false,
                }
              })
            } else {
              console.log(res,"购买成功");
              wx.showToast({title: '购买成功',icon: 'success',duration: 2000})
            }        
          }
        })
      }else if (res.data.length === 0) {
        db.collection("shop1").add({
          data: {
            userID: self.data.userID,
            isUsed: false,
            userCerti: false,
            updateAt: new Date(),
          }
        }).then(addResult => { // 正确使用then来处理Promise
          console.log("记录添加成功", addResult);
          wx.showToast({title: '购买成功',icon: 'success',duration: 2000});
        }).catch(error => {
          // 这里是处理错误的地方
          console.error("记录添加失败", error);
        });
      }
    })
}
