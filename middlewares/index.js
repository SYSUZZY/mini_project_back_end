const path = require('path')
const koaBodyParser = require('koa-bodyparser')
const errorHandler = require('./errorHandler')
const paramsParser = require('./paramsParser')
const tokenValidator = require('./tokenValidator')
// const koaBody = require('./koaBody')

module.exports = app => {
  app.use(errorHandler)     // 处理错误
  app.use(koaBodyParser())  // 处理 request 传来的数据
  app.use(tokenValidator)   // 验证 token
  app.use(paramsParser)     // 初始化 ctx.params
}
