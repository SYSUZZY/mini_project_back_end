const koaBody = require('koa-body')
module.exports = koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 20*1024*1024    // 设置上传文件大小最大限制，默认 20 M
  }
})
