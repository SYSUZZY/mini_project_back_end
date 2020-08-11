const SE = require('../utils/systemError')
const tokenUtil = require('../utils/token')

connected_clients = {}
waitting_queue = []
room_list = {}

history_room_num = 0

const max_rooms = 2

class Room {

  constructor(id, state, max_players) {
    this.id = id
    this.state = state
    this.max_players = max_players
    this.player_list = []

    this.DS_started = false
    this.DS_condition = 1

    this.room_server = setInterval(()=> {
      console.log('Room ' + this.id + ' has ' + this.player_list.length + ' players.')
      if (!this.DS_started) {
        if (this.player_list.length > this.DS_condition) {
          // Setup DS
          this.DS_started = true
        }
      }
      // The room is avaliable.
      else if (this.state == 'Avaliable') {
        let cur_player = this.player_list.shift()
        cur_player.state = 'Ready'
      }
      
    }, 1000)
  }
}



const manageConnection = async ctx => {
  console.log(1)
  token = ctx.header.authorization
  if (token) {
    console.log(2)
    payload = await tokenUtil.verifyToken(token)

    if (!payload) {
      throw new SE(1, 'No Authorization', null)
    }
    console.log(3)
    if (payload.username) {
      // Add connected client in list.
      username = payload.username
      if (!connected_clients.hasOwnProperty(username)) {
        connected_clients[payload.username] = { username: username, room_id: -1, state: 'Idle', client: ctx }
      }
      else {
        console.log(payload.username + ' has been already in Lobby.')
      }
      
      console.log(4)
      // Register Event Listener
      ctx.websocket.on('message', (msg) => {
        // console.log(msg)
        json_msg = JSON.parse(msg)
        if (json_msg.action == 'ApplyMatch') {
          applyMatch(payload.username)
        }
        else if (json_msg.action == 'CancelMatch') {
          cancelMatch(payload.username)
        }
      })
      console.log(5)
      ctx.websocket.send('Websocket connnect successfully.')

    } else {
      throw new SE(1, 'No Authorization', null)
    }
  }
  else {
    console.log('have not token')
  }
}

function applyMatch(username) {
  client = connected_clients[username]
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

function cancelMatch(username) {

  client = connected_clients[username]
  console.log(username + ' call Apply Match Function.')

  // The client still in waitting list
  if (client.state == 'Waitting') {
    delete connected_clients[username]
    for (var i = 0; i < waitting_queue.length; i++) {
      if (waitting_queue[i].username == username) {
        waitting_queue.splice(i, 1)
        client.state = 'Idel'
        console.log(username + ' has already canceled the match in waitting queue.')
        break
      }
    }
    
  }
  else if (client.state == 'Ready') {
    room = room_list[client.room_id]
    for (var i = 0; i < room.player_list.length; i++) {
      if (room.player_list[i].username == username) {
        room.player_list.splice(i, 1)
        client.state = 'Idel'
        console.log(username + ' has already canceled the match in Room ' + room.room_id + '.')
        break
      }
    }
  }
  else if (client.state == 'Playing') {
    console.log('The player is playing game.')
  }
  else if (client.state == 'Idel') {
    console.log('The player is not matching.')
  }
}

// Lobby server check the waitting queue.
let lobby_server = setInterval(function() {

  console.log(Object.keys(connected_clients))

  if (waitting_queue.length > 0) {
    // Find a room and add a player.
    var add_room_success = false
    for (var r in room_list) {

      if (r.state == 'Avaliable' && r.player_list.length < r.max_players) {

        // Set the client's info
        cur_client = waitting_queue.shift()
        cur_client.room_id = r.id
        cur_client.state = 'Ready'

        r.player_list.push(cur_client)
        add_room_success = true
        
        console.log(cur_client.username + ' join a room.')
        break
      }

    }

    // Did not find an available room
    if (!add_room_success) {
      if (room_list.length < max_rooms) {
        let new_room = new Room(history_room_num, 'Avaliable', 3)
        history_room_num += 1

        cur_client = waitting_queue.shift()
        cur_client.room_id = new_room.id
        cur_client.state = 'Ready'

        new_room.player_list.push(cur_client)
        room_list[new_room.id] = new_room
        console.log('Server create a new room.')
        console.log(cur_client.username + ' join a room.')
      }
    }
  }

}, 1000)

module.exports = {
  manageConnection
}