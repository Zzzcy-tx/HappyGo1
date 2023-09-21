// detail/eat/eat.js

const app=getApp();
const QRCode = require('weapp-qrcode'); // 请确保已经安装了 qrcode 模块
import drawQrcode from 'weapp-qrcode';


Page({

  /**
   * 页面的初始数据
   */
  data: {
    codeReady: true,
    userID: wx.getStorageSync('userID'),
    couponCode: ' ',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const productId = options.id; // 获取从上一页传递过来的商品 ID
    const shopID = options.id;
    console.log(productId);

    //显示商品详情//
    // const itemDetail = goodsData.find(item => item.id === productId);
    // this.setData({
    //   itemDetail: itemDetail, // 将商品详细信息存入页面数据中
    // });
    console.log(this.data.userID);
    wx.cloud.callFunction({
      name: 'generateRandomCouponCode',
      data: {
        shopID: shopID,
        userID: this.data.userID,
      },
      success: res => {
        console.log(res.result);
        this.setData({couponCode: res.result.couponCode})
        //const CouponCode = res.result.couponCode;
        this.setData({codeReady: true});
        // app.globalData.randomCouponCode = randomCouponCode;
        // console.log(app.globalData.randomCouponCode);//全局变量
        console.log(this.data.couponCode);
        this.generateQRCode(this.data.couponCode);
      },
      fail: err => {
        console.error(err);
      }
    });
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



  generateQRCode: function (text) {
    console.log(text);
    drawQrcode({
      width: 200,
      height: 200,
      canvasId: 'qrcode',
      text: text,
    })
  },



})