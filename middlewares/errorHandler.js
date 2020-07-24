const logger = require('../utils/logger')
const SE = require('../utils/systemError')

errorHandler = async (ctx, next) => {
  try {
    await next()
    logger.info(ctx.body)
  } catch (err) {
    if (err instanceof SE && err.code !== -1) {
      if (err.msg == 'No Authorization') {
        ctx.status = 401
      } else {
        ctx.body = {
          code: err.code,
          msg: err.msg
        }
        logger.info(ctx.body)
      }
    } else {
      ctx.body = {
        code: err.code,
        msg: 'Internal Server Error.'
      }
      logger.error(err)
    }
  }
}

module.exports = errorHandler