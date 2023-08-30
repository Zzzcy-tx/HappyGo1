// pages/shopper/shopper.js

const db = wx.cloud.database();


Page({

  /**
   * 页面的初始数据
   */
  data: {
    scanCodeMsg:'',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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

  openCamera(){
    wx.authorize({
      scope: 'scope.camera',
      success () {

      }
    })
    wx.scanCode({
      success:(res) => { //扫描成功
        this.setData({
          scanCodeMsg: res.result
        });
        console.log(this.data.scanCodeMsg)
        wx.showToast({
          title: '成功',
          duration: 500
        })

        //获得劵码成功后云端对比数据一致性，一致则
        db.collection('couponTickets')
          .where({
            'ticket': this.data.scanCodeMsg,
            // 添加其他查询条件
          })
          .get()
          .then(res => {
            console.log('劵状态：', res.data);
            if(res.data.userCertify === 1){

            } else {
              wx.showToast({'title': '用户未确认！', 'icon': 'error', 'duration': 1000})
            }

          
          })



      
    
      }

    })

  }




})