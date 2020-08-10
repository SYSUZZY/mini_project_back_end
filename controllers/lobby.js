const SE = require('../utils/systemError')
const tokenUtil = require('../utils/token')

connected_clients = {}
waitting_queue = []
room_list = []

const max_rooms = 2

class room {

  constructor(room_id, state, max_players) {
    this.room_id = room_id
    this.state = state
    this.max_players = max_players
    this.start_players = 1
    this.player_list = []
    this.DS_started = false

    var instance = this
    this.room_server = setInterval(function(instance) {
      console.log('Room ' + instance.room_id + ' has ' + instance.player_list.length + ' players.')
      if (!instance.DS_started) {
        if (instance.player_list.length > instance.start_players) {
          // Setup DS
          instance.DS_started = true
          instance.state = 1
        }
      }
      // The room is avaliable.
      if (instance.state == 1) {
        let cur_player = instance.player_list.shift()
      }
      
    }, 1000, instance)
  }
}

function applyMatch(username) {
  client = { username: username, context: connected_clients[username] }
  console.log(username + ' call Apply Match Function.')
  console.log(waitting_queue.length)
  if (!waitting_queue.includes(client)) {
    waitting_queue.push(client)
    console.log('Add ' + client.username + ' in waitting queue.')
  }
  else {
    console.log('Fail in waitting queue.')
  }
}

const manageConnection = async ctx => {

  token = ctx.header.authorization
  if (token) {
    payload = await tokenUtil.verifyToken(token)

    if (!payload) {
      throw new SE(1, 'No Authorization', null)
    }

    if (payload.username) {
      // Add connected client in list.
      connected_clients[payload.username] = ctx

      // Register Event Listener
      ctx.websocket.on('message', (msg) => {
        // console.log(msg)
        json_msg = JSON.parse(msg)
        if (json_msg.action == 'ApplyMatch') {
          applyMatch(payload.username)
        }
      })

      ctx.websocket.send('Websocket connnect successfully.')

    } else {
      throw new SE(1, 'No Authorization', null)
    }
  }
  else {
    console.log('have not token')
  }
}

// Lobby server check the waitting queue.
let lobby_server = setInterval(function() {

  if (waitting_queue.length > 0) {
    // Find a room and add a player.
    let add_room_success = false
    room_list.every(r => {
      if (r.state == 1 && r.player_list.length < r.max_players) {
        cur_client = waitting_queue.shift()
        r.player_list.push(cur_client)
        add_room_success = true

        console.log(cur_client.username + ' join a room.')

        return false
      } else {
        return true
      }
    });

    // Did not find an available room
    if (!add_room_success) {
      if (room_list.length < max_rooms) {
        let new_room = new room(room_list.length, 1, 3)
        cur_client = waitting_queue.shift()
        new_room.player_list.push(cur_client)
        room_list.push(new_room)
        console.log('Server create a new room.')
        console.log(cur_client.username + ' join a room.')
      }
    }
  }

}, 1000)

module.exports = {
  manageConnection
}