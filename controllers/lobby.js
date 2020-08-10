

const callFunc = async ctx => {
  console.log('Call Func Success.')
  ctx.websocket.send('Hello World')
  ctx.websocket.on('message', function(message) {
    console.log(message)
  })
}

module.exports = {
  callFunc,
}