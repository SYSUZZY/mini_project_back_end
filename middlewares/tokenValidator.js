const SE = require('../utils/systemError')
const logger = require('../utils/logger')
const tokenUtil = require('../utils/token')
const redis_client = require('../utils/redis')

const isInWhiteList = ctx => {
  return (ctx.method == 'POST' && ctx.path == '/api/user/signin')
         || (ctx.method == 'POST' && ctx.path == '/api/user/signup')
}

module.exports = async (ctx, next) => {
  // 显示请求
  logger.info(ctx.method, ctx.path)

  // 获取jwt
  token = ctx.header.authorization
  if (token) {
    // 解密 payload
    console.log(token)
    payload = await tokenUtil.verifyToken(token)

    if (!payload) {
      throw new SE(1, 'No Authorization', null)
    }
    if (payload.username) {
      let user = await redis_client.getAsync(payload.username)
      let user_json = JSON.parse(user)
      ctx.user = user_json
    } else {
      throw new SE(1, 'No Authorization', null)
    }
  } else if (!isInWhiteList(ctx)) {
    throw new SE(1, 'No Authorization', null)
  }
  await next()
}