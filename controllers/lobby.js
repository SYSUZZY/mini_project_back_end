const SE = require('../utils/systemError')
const tokenUtil = require('../utils/token')
const redis_client = require('../utils/redis')

connected_clients = {}

waitting_queue = []

const manageConnection = async ctx => {

  token = ctx.header.authorization
  if (token) {
    console.log(token)
    payload = await tokenUtil.verifyToken(token)

    if (!payload) {
      throw new SE(1, 'No Authorization', null)
    }

    if (payload.username) {
      connected_clients[payload.username] = ctx
      // Register Event Listener
      ctx.websocket.on('ApplyMatch', () => {
        username = payload.username
        console.log(payload.username + ' apply match!')
      })

      ctx.websocket.send('Hello World')

    } else {
      throw new SE(1, 'No Authorization', null)
    }
  }
  else {
    console.log('have not token')
  }

  // connected_clients.push(ctx)
  // token = ctx.header.authorization
  // if (token) {
  //   console.log(token)
  // }
  // else {
  //   console.log('have not token')
  // }


  
}

// Send the match application.
const applyMatch = async ctx => {

}

module.exports = {
  manageConnection,
  applyMatch
}