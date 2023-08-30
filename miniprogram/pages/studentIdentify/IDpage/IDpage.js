// pages/studentIdentify/IDpage/IDpage.js

const db = wx.cloud.database();
const collectionName = 'userIDs';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    hasUserID: false,
    userID: '0000000000',
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
      if((getDigit(this.data.userID, 6,10) === '2004' || getDigit(this.data.userID, 6,10) === '2003')){
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
              this.setData({hasUserID : true});
              wx.showToast({title: '已通过认证', icon: 'none', duration: 2000})
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