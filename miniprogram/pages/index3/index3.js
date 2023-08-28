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
    userInfo: '',

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
    if (wx.getStorageSync('hasUserInfoKey') === true) {
      this.setData({
        hasUserInfo : true,
        userInfo: wx.getStorageSync('userInfoKey')
      })
      // this.data.hasUserInfo = true;
      // this.data.nickName = wx.getStorageSync('userInfoKey').nickName
      wx.showToast({title: '登陆成功',icon: 'success',duration: 1000})
    }
    // this.data.userInfo = wx.getStorageSync('userInfoKey')
    // console.log(this.data.userInfo.nickName)

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
        url: '/pages/studentIdentify/suc/suc',
      })
    } else {
      wx.showToast({title: '请点击头像登录！',icon: 'error',duration: 2000})
      // console.error(0)
    }
  },

  manageCoupon() {
    if (this.data.hasUserInfo) {
      wx.navigateTo({
        url: '/pages/myCoupon/myCoupon',//goto优惠券界面
      })
    } else {
      wx.showToast({title: '请点击头像登录！',icon: 'error',duration: 2000})
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



        try{
          wx.setStorageSync('hasUserInfoKey',this.data.hasUserInfo)
          wx.setStorageSync('userInfoKey',this.data.userInfo)
          console.log('数据存储成功');
        } catch (e){
          console.error('数据存储失败:', e);
        }

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