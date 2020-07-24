const log4js = require('log4js')
const config = require('../../config')

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      category: 'console',
    },
    default: {
      type: 'dateFile',
      filename: `${config.LOG_PATH}/`,
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
      category: 'default',
    },
  },
  categories: {
    console: { appenders: ['console'], level: 'all' },
    default: { appenders: ['default', 'console'], level: 'all' },
  },
})

const logger = log4js.getLogger('default')

module.exports = logger
