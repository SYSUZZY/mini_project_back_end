const SE = require('../utils/systemError')
const token = require('../utils/token')

connected_clients = []
waitting_queue = []

const manageConnection = async ctx => {

  connected_clients.push(ctx)
  token = ctx.header.authorization
  if (token) {
    console.log(token)
  }
  else {
    console.log('have not token')
  }

  ctx.websocket.on('connection', () => {
    console.log('Connection')
  })

  ctx.websocket.send('Hello World')
  
}

// Send the match application.
const applyMatch = async ctx => {

}

module.exports = {
  manageConnection,
  applyMatch
}