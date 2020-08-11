const SE = require('../utils/systemError')
const tokenUtil = require('../utils/token')

connected_clients = {}
connected_servers = {}
waitting_queue = []
room_list = {}

history_room_num = 0

const max_rooms = 2

class Room {

  constructor(id, state, max_players, owner) {
    this.id = id
    this.state = state
    this.max_players = max_players
    this.player_list = []

    owner.room_id = id
    owner.state = 'Ready'
    this.owner = owner
    this.session_id = undefined
    this.DS_started = false
    this.DS_condition = 1

    this.room_server = setInterval(()=> {
      console.log('Room ' + this.id + ' has ' + this.player_list.length + ' players.')
      if (!this.DS_started) {
        if (this.player_list.length > this.DS_condition) {
          // Send setup DS command.
          send_msg = {
            action: 'CreateSession',
            session_name: owner.username
          }
          this.owner.server.websocket.send(JSON.stringify(send_msg))
        }
      }
      // The room is avaliable.
      else if (this.state == 'Avaliable' && this.player_list.length > 0) {
        let cur_player = this.player_list.shift()
        if (cur_player != undefined) {
          cur_player.state = 'Ready'
          send_msg = {
            action: 'JoinSession',
            session_id: this.session_id
          }
          cur_player.client.websocket.send(JSON.stringify(send_msg))
          console.log(cur_player.username + ' join session.')
        }
      }
      
    }, 1000)
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
      username = payload.username

      // Server connected.
      if (username.length < 8) {
        console.log(username + ' connect to server.')
        if (!connected_servers.hasOwnProperty(username)) {
          connected_servers[username] = { username: username, room_id: -1, state: 'Idle', server: ctx }
        }
        else {
          console.log(username + ' has been already in Lobby.')
        }

        // Register Event Listener
        ctx.websocket.on('message', (msg) => {
          // console.log(msg)
          json_msg = JSON.parse(msg)
          if (json_msg.action == 'GameComplete') {
            // applyMatch(username)
          }
          else if (json_msg.action == 'SendSessionId') {
            setSessionIdForRoom(username, json_msg.session_id)
          }
        })
  
        ctx.websocket.on('close', ()=> {
          console.log(username + ' close the websocket.')
          delete connected_servers[username]
        })
  
        ctx.websocket.send('Websocket connnect successfully.')
      }
      // Client connected.
      else {
        if (!connected_clients.hasOwnProperty(username)) {
          connected_clients[username] = { username: username, room_id: -1, state: 'Idle', client: ctx }
        }
        else {
          console.log(username + ' has been already in Lobby.')
        }
        
  
        // Register Event Listener
        ctx.websocket.on('message', (msg) => {
          // console.log(msg)
          json_msg = JSON.parse(msg)
          if (json_msg.action == 'ApplyMatch') {
            applyMatch(username)
          }
          else if (json_msg.action == 'CancelMatch') {
            cancelMatch(username)
          }
          
        })
  
        ctx.websocket.on('close', ()=> {
          console.log(username + ' close the websocket.')
          cancelMatch(username)
          delete connected_clients[username]
        })
  
        ctx.websocket.send('Websocket connnect successfully.')
      }
      
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
  console.log(client.username + ' call Apply Match Function.')
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

    for (var i = 0; i < waitting_queue.length; i++) {
      if (waitting_queue[i].username == username) {
        waitting_queue.splice(i, 1)
        client.state = 'Idle'
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
        client.state = 'Idle'
        console.log(username + ' has already canceled the match in Room ' + room.id + '.')
        break
      }
    }
  }
  else if (client.state == 'Playing') {
    console.log('The player is playing game.')
  }
  else if (client.state == 'Idle') {
    console.log('The player is not matching.')
  }
}

// Search a idle server to create a room.
function searchIdleServer() {
  idle_server = undefined
  Object.keys(connected_servers).every((key)=> {
    if (connected_servers[key].state == 'Idle') {
      idle_server = connected_servers[key]
      return false
    }
    else {
      return true
    }
  })
  return idle_server
}

function setSessionIdForRoom(username, session_id) {
  server = connected_servers[username]
  console.log(username + ' call setSessionIdForRoom Function.')

  room = room_list[server.room_id]
  room.session_id = session_id
  room.DS_started = true
}

// Lobby server check the waitting queue.
let lobby_server = setInterval(function() {

  console.log(Object.keys(connected_clients))
  
  if (waitting_queue.length > 0) {
    // Find a room and add a player.
    var add_room_success = false
    Object.keys(room_list).every((key)=>{
      if (room_list[key].state == 'Avaliable' && room_list[key].player_list.length < room_list[key].max_players) {
        // Set the client's info
        cur_client = waitting_queue.shift()
        cur_client.room_id = room_list[key].id
        cur_client.state = 'Ready'

        room_list[key].player_list.push(cur_client)
        add_room_success = true

        console.log(cur_client.username + ' join a room.')
        return false
      } else {
        return true
      }
    })
    

    // Did not find an available room
    if (!add_room_success) {
      if (Object.keys(room_list).length < max_rooms) {
        room_owner = searchIdleServer()
        if (room_owner != undefined) {
          let new_room = new Room(history_room_num, 'Avaliable', 3, room_owner)
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
  }

}, 1000)

module.exports = {
  manageConnection
}