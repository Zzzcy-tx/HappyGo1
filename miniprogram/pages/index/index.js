// index.js
// 获取应用实例
const app = getApp()
var school = 1;

Page({
  data: {
    scrollAnimation: {},
    login: false,
    openid: app.globalData.openid,
    test: {
      hidden: true,
      default: "请选择所在城市",
      txt: ["杭州"]
    },
    swiper:[],
    Notice: "         重要通知:5555555555555555重要通知重要通知重要通知重要通知"
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad() {
    //this.getOpenid();
    wx.cloud.database().collection("swiper")   
    .get()
    .then(res=> {
      console.log("获取轮播图数据成功",res)
      this.setData({
        swiper:res.data
      })
    })
    .catch(err=> {
      console.log("获取轮播图数据失败",err)
    })
  },
  onShow: function () {
    this.checkLoginStatus();
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

  // 检查登录状态
  checkLoginStatus: function () {
    const db = wx.cloud.database();
    const users = db.collection("Users");

    users.get()
      .then(res => {
        if (res.data.length !== 0 && wx.getStorageSync('user')) {
          this.setData({
            login: true
          });
        } else {
          this.setData({
            login: false
          });
        }
      })
      .catch(err => {
        console.log("调用失败", err);
      });
  },

  goSever01() {
    wx.navigateTo({
      url: '/pages/eat1/eat1',
    })
  },
  goSever02() {
    wx.navigateTo({
      url: '/pages/service02/service02',
    })
  },
  goSever03() {
    wx.navigateTo({
      url: '/pages/service03/service03',
    })
  },
  goSever04() {
    wx.navigateTo({
      url: '/pages/service03/service03',
    })
  },

  showSchool:function(){
    var data=this.data.test;
    data["hidden"]=!data.hidden;
    console.log("点击了");
    this.setData({
      test: data
    })
  },
  SelectVal: function (e) {
    // 获取到点击的列表下标，因为是在下拉的父元素点击，所以获取到menus下标
    var index = e.target.dataset.index;
    var data = this.data.test;
    //获取选中的选项的值
    var test_name = data.txt[index];

    console.log("选择了选项:" + test_name);

    //设置区域默认值和隐藏
    data["default"] = test_name;
    school = 0;
    data["hidden"] = !data.hidden;
    this.setData({
      test: data
    })

  },

  getOpenid() {
    let that = this;
    wx.cloud.callFunction({
      name: 'getOpenid',
      complete: res => {
        console.log('云函数获取到的openid: ', res.result.openId)
        var openid = res.result.openId;
        that.setData({
          openid: openid
        })
      }
    })

  },



  // 获取公告栏内容宽度并启动滚动
  getNoticeScrollWidth: function () {
    wx.createSelectorQuery().select('.notice-scroll-inner').boundingClientRect(rect => {
      this.setData({
        scrollWidth: rect.width
      });
      this.startScroll();
    }).exec();
  },

  startScroll: function () {
    const animation = wx.createAnimation({
      duration: this.data.scrollWidth * 55, // 根据内容宽度设置滚动速度
      timingFunction: 'linear',
      delay: 0
    });
    this.data.scrollAnimation = animation.translateX(-this.data.scrollWidth-wx.getSystemInfoSync().windowWidth).step();
    this.setData({
      scrollAnimation: this.data.scrollAnimation.export()
    });
    setTimeout(() => {
      this.data.scrollAnimation = animation.translateX(wx.getSystemInfoSync().windowWidth).step({ duration: 0 });
      this.setData({
        scrollAnimation: this.data.scrollAnimation.export()
      });
      this.startScroll();
    }, this.data.scrollWidth * 15);//两次出现字幕的时间
  },
  


})