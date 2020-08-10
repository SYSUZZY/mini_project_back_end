const SE = require('../utils/systemError')
const tokenUtil = require('../utils/token')

connected_clients = {}

waitting_queue = []

function applyMatch(username) {
  client = connected_clients[username]
  console.log('Call Apply Match Function.')
  console.log(waitting_queue.length)

  if (!waitting_queue.includes(client)) {
    waitting_queue.push(client)
    console.log('Add ' + username + ' in waitting queue.')
  }
  else {
    console.log('Fail in waitting queue.')
  }
}

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
      ctx.websocket.on('message', (msg) => {
        console.log(msg)

        json_msg = JSON.parse(msg)

        console.log(json_msg.action)

        if (json_msg.action == 'ApplyMatch') {
          applyMatch(payload.username)
        }
        username = payload.username
        console.log(payload.username)
      })

      ctx.websocket.send('Hello World')

    } else {
      throw new SE(1, 'No Authorization', null)
    }
  }
  else {
    console.log('have not token')
  }
}



module.exports = {
  manageConnection
}