// pages/index3/index3.js

const getDefaultData = () => ({
  showMakePhone: false,
  userInfo: {},
  hasUserInfo: false,
  menuData,
  orderTagInfos,
  customerServiceInfo: {},
  currAuthStep: 1,
  showKefu: true,
  versionNo: '',
});

Page({

  /**
   * 页面的初始数据
   */

  data: {
    show: false,
    barHeight: 80, //  顶部状态栏高度
    navBarHeight: 66, // 顶部高度
    nickName: '请点击头像登录',
    phoneNumber: '',
    hasUserInfo: false,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    var that = this;
    // 胶囊信息
    var menu = wx.getMenuButtonBoundingClientRect();
    wx.getSystemInfo({
        success(res) {
            that.setData({
                barHeight: res.statusBarHeight,
                navBarHeight: menu.top + menu.height
            })
        }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
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

  // 页面滚动监听
  onPageScroll(e) {
    if (e.scrollTop > 60) {
        this.setData({
            show: true
        })
    } else {
        this.setData({
            show: false
        })
    }
  },

  studentIdentify() {
    if (this.data.hasUserInfo) {
      wx.navigateTo({
        url: '/pages/studentIdentify/IDpage/IDpage',
      })
    } else {
      wx.showToast({title: '请点击头像登录！',icon: 'error',duration: 2000})
      console.error(0)
    }
  },

  getUserProfile(e) {
    // 推荐使用 wx.getUserProfile 获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    // 开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        wx.showToast({title: '登陆成功',icon: 'success',duration: 2000})
      }
    })
  },

  getUserInfo(e) {
    // 不推荐使用 getUserInfo 获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },




})