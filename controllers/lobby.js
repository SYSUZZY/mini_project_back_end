const SE = require('../utils/systemError')
const token = require('../utils/token')

connected_clients = []
waitting_queue = []

const manageConnection = async ctx => {
  
  ctx.websocket.send('Hello World')

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
  
}

// Send the match application.
const applyMatch = async ctx => {

}

module.exports = {
  manageConnection,
  applyMatch
}