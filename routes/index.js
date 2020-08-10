const koaRouter = require('koa-router')
const User = require('./user')
const Temp = require('./temp')
const Lobby = require('./lobby')

module.exports = app => {
  const webAPI = new koaRouter({prefix: '/api'})

  webAPI.use(User.routes())
  webAPI.use(Temp.routes())
  
  app.use(webAPI.routes())
  app.ws.use(Lobby.routes())
}
