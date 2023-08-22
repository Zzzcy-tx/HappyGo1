// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    scrollAnimation: {},
    login: false,
    openid: app.globalData.openid,
    swiper:[],
    Notice: "         重要通知:5555555555555555重要通知重要通知重要通知重要通知"
  },
  // 事件处理函数
  bindViewTap() {

  },
  onLoad() {

  },
  onShow: function () {
    // this.checkLoginStatus();
  },

  onReady: function (){
    this.getNoticeScrollWidth();
  },

  
  getUserInfo(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },


  goSever01() {
    wx.navigateTo({
      url: '/pages/sevices/1eat/eat',
    })
  },
  goSever02() {
    wx.navigateTo({
      url: '/pages/sevices/2drink/drink',
    })
  },
  goSever03() {
    wx.navigateTo({
      url: '/pages/sevices/3play/play',
    })
  },
  goSever04() {
    wx.navigateTo({
      url: '/pages/sevices/4fun/fun',
    })
  },

  // 获取公告栏内容宽度并启动滚动
  getNoticeScrollWidth: function () {
    this.createSelectorQuery().select('.notice-scroll-inner').boundingClientRect(rect => {
      this.setData({
        scrollWidth: rect.width
      });
      this.startScroll();
    }).exec();
  },

  startScroll: function () {
    const animation = wx.createAnimation({
      duration: this.data.scrollWidth * 20, // 根据内容宽度设置滚动速度
      timingFunction: 'linear',
      delay: 0
    });
    this.data.scrollAnimation = animation.translateX(-wx.getSystemInfoSync().windowWidth).step();
    this.setData({
      scrollAnimation: this.data.scrollAnimation.export()
    });
    setTimeout(() => {
      this.data.scrollAnimation = animation.translateX((wx.getSystemInfoSync().windowWidth)).step({ duration: 0 });
      this.setData({
        scrollAnimation: this.data.scrollAnimation.export()
      });
      this.startScroll();
    }, this.data.scrollWidth * 10);//两次出现字幕的时间
  },
  


})