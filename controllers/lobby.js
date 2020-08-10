const SE = require('../utils/systemError')

waitting_queue = []

const callFunc = async ctx => {
  console.log('Call Func Success.')
  console.log(ctx.params.id)
  ctx.websocket.send('Hello World')
  ctx.websocket.on('message', function(message) {
    console.log(message)
  })
}

// Send the match application.
const applyMatch = async ctx => {

}

module.exports = {
  callFunc,
  applyMatch
}