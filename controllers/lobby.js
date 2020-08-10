const SE = require('../utils/systemError')
const tokenUtil = require('../utils/token')

connected_clients = {}

waitting_queue = []
room_list = []

const max_rooms = 2

class room {

  room_server

  constructor(room_id, state, max_players) {
    this.room_id = room_id
    this.state = state
    this.max_players = max_players
    this.start_players = 1
    this.player_list = []
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

        new_room.room_server = setInterval(function() {
          console.log('Room ' + new_room.room_id + 'has ' + new_room.player_list.length + ' players.')
          if (new_room.player_list.length > start_players) {
            cur_client = new_room.player_list.shift()
            console.log(cur_client.username + ' add into DS.')
          }
        }, 1000, new_room)
        
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