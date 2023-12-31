const db = wx.cloud.database();
// pages/services/1eat/eat.js
Page({

  /**
   * 页面的初始数据
   */
  data: {



    // 商品信息
    goodsList: [
      { id: 1, name: '超级香烤韭菜', address:'地下一楼', pic:'/img/2.jpg'},
      { id: 2, name: '陈府板鸭', address:'二楼18号', pic:'/img/2.jpg'},
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    
    db.collection('eatDetail') // 替换成您的集合名称
      .get()
      .then(res => {
        const productList = res.data; // 获取商品列表
        console.log('店铺列表获取成功：', productList);
      })
      .catch(err => {
        console.error('查询商品信息失败', err);
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


  goToDetail(event) {
    const productId = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/eat/eat?id=${productId}`,
    });
  },


})