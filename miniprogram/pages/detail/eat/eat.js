// detail/eat/eat.js

const app=getApp();
const QRCode = require('weapp-qrcode');
const db = wx.cloud.database();
var userID;
import drawQrcode from 'weapp-qrcode';


Page({

  /**
   * 页面的初始数据
   */
  data: {
    codeReady: true,
    userID: wx.getStorageSync('userID'),
    couponCode: ' ',
    isUsed: false,
    collectionName: ' ',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    userID = this.data.userID;
    const shopID = options.id;
    console.log(shopID);
    switch (shopID){
      case '1':
        this.data.collectionName = 'shop1';
        break
      case '2':
        this.data.collectionName = 'shop2';
        break;
      default:
        break;
    }
    console.log(this.data.collectionName);

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
        collectionName: this.data.collectionName,
      },
      success: res => {
        console.log(res.result);
        if(res.result != '0' && res.result != '1'){
          this.setData({couponCode: res.result.couponCode})
          this.setData({codeReady: true});
          this.setData({isUsed: res.result.isUsed});
          this.generateQRCode(this.data.couponCode);
        } else {
          console.log('用户不存在！');
        }
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
    db.collection('shop1')
      .where({
        'userID': this.data.userID,
      })
      .get()
      .then(res =>{
        console.log('查询结果：', res.data);
        if(res.data.length > 0){
          db.collection(this.data.collectionName)
          .doc(res.data[0]._id)
          .update({
            data: {
              userCerti: false,
              updateAt: new Date()
            },
            success: suc =>{
              console.log('用户退出扫码界面', suc);
            },
            fail: err => {
              console.error('用户退出扫码界面失败', err);
            },
          });
        }
      })
    .catch((err) =>{
      console.log(err)
    })
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
    drawQrcode({
      width: 250,
      height: 250,
      canvasId: 'qrcode',
      text: text,
    })
  },



})