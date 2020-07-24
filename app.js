const Koa = require('koa')
const Middlewares = require('./middlewares')
const Routes = require('./routes')
const logger = require('./utils/logger')
const config = require('./config')

const app = new Koa()

Middlewares(app)
Routes(app)

app.listen(`${config.PORT}`, () => {
  logger.info(`Server is running at port ${config.PORT}.`)
})

app.on('error', err => {
  logger.error('Server error.', err)
})
