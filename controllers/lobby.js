// var Room = require('./room.class')
const tokenUtil = require('../utils/token')

class Room {
  
  constructor(id, state, owner, setting) {
    
    this.id = id        // Unique ID
    this.state = state  // Current State: Busy & Ready
    this.owner = owner  // Room owner

    this.players_list = {}   // Players in Game
    this.waitting_queue = [] // Players in waitting list
    
    this.setup_cond = setting.setup_cond    // The condition of setting up DS server
    this.max_players = setting.max_players  // Maximum number of players

    this.state_DS = 'Sleep'      // The state of DS server: Sleep & Awake
    this.session_id = undefined  // Unique session ID of DS server
    
    this.room_server = setInterval( () => {

      console.log('Room ' + this.id + ' has ' + this.waitting_queue.length + ' players.')

      // Check the number of players in this room.
      if (!this.checkPlayerNumValid()) {
        this.state = 'Busy'
      }

      // Check the state of DS server.
      if (this.state_DS == 'Sleep') {

        // Satisfy the setup condition.
        if (this.waitting_queue.length > this.setup_cond) {
          // Send setup DS command.
          let send_msg = {
            action: 'CreateSession',
            session_name: owner.username
          }
          this.owner.server.websocket.send(JSON.stringify(send_msg))
        }
      }
      // The DS has been built and there is somebody in waitting queue and the room is ready.
      else if (this.state == 'Ready' && this.waitting_queue.length > 0) {

        let cur_player = this.waitting_queue.shift()
        cur_player.state = 'Playing'
        this.players_list[cur_player.username] = cur_player
        var send_msg = {
          action: 'JoinSession',
          session_id: this.session_id
        }
        cur_player.client.websocket.send(JSON.stringify(send_msg))
        console.log(cur_player.username + ' join session.')
      }
    }, 1000)
  }

  // Check the number of players in the room exceed limitation or not.
  checkPlayerNumValid = function() {

    let players_num = Object.keys(this.players_list).length + this.waitting_queue.length
    if (players_num >= this.max_players) {
      return false
    }
    return true
  }

}

var connected_clients = {}
var connected_servers = {}
var waitting_queue = []
var room_list = {}

var history_room_num = 0


const manageConnection = async ctx => {

  let token = ctx.header.authorization
  let username = ctx.params.username

  if (token) {

    let payload = await tokenUtil.verifyToken(token)

    if (!payload) {
      console.log('No Authorization')
    }

    if (payload.username == username && payload.username != undefined) {

      // Server connected.
      if (username.length < 8) {

        console.log(username + ' connect to server.')

        if (!connected_servers.hasOwnProperty(username)) {
          // Bind the username to websocket
          // The state of manager: Busy & Idle
          connected_servers[username] = { username: username, room_id: undefined, state: 'Idle', server: ctx }
        }
        else {
          console.log(username + ' has been already in Lobby.')
        }

        // Register Event Listener
        ctx.websocket.on('message', (msg) => {

          let username = ctx.params.username
          let json_msg = JSON.parse(msg)

          console.log('User: ' + username + ' Message: ' + msg)
          
          if (json_msg.action == 'GameCompleted') {
            gameCompleteSetting(username)
          }
          else if (json_msg.action == 'SendSessionId') {
            console.log('Session ID: ' + json_msg.session_id)
            setSessionIdForRoom(username, json_msg.session_id)
          }
          else if (json_msg.action == 'GameStarted') {
            setRoomState(username)
          }
        })
  
        ctx.websocket.on('close', ()=> {
          let username = ctx.params.username
          console.log(username + ' close the websocket.')
          delete connected_servers[username]
        })
  
        ctx.websocket.send('Websocket connnect successfully.')
      }
      // Client connected.
      else {

        console.log(username + ' connect to server.')

        if (!connected_clients.hasOwnProperty(username)) {
          // The state of client: Idle & Waitting & Ready & Playing
          connected_clients[username] = { username: username, room_id: undefined, state: 'Idle', client: ctx }
        }
        else {
          console.log(username + ' has been already in Lobby.')
        }
  
        // Register Event Listener
        ctx.websocket.on('message', (msg) => {
          
          let username = ctx.params.username
          let json_msg = JSON.parse(msg)

          console.log('User: ' + username + ' Message: ' + msg)

          if (json_msg.action == 'ApplyMatch') {
            applyMatch(username)
          }
          else if (json_msg.action == 'CancelMatch') {
            cancelMatch(username)
          }
          else if (json_msg.action == 'EndGame') {
            endGame(username)
          }
        })
  
        ctx.websocket.on('close', ()=> {
          // TODO: Add a close socket function
          let username = ctx.params.username
          console.log(username + ' close the websocket.')
          cancelMatch(username)
          delete connected_clients[username]
        })
  
        ctx.websocket.send('Websocket connnect successfully.')
      }
    } else {
      console.log('No Authorization')
    }
  }
  else {
    console.log('Have not token')
  }
}

// Client Functions

// Apply match
function applyMatch(username) {

  let client = connected_clients[username]

  if (!waitting_queue.includes(client) && client.state == 'Idle') {

    waitting_queue.push(client)
    client.state = 'Waitting'
    console.log('Add ' + client.username + ' in waitting queue.')

  }
  else {
    console.log('Fail in waitting queue.')
  }
}

// Cancel match
function cancelMatch(username) {

  let client = connected_clients[username]

  // The client still in waitting list
  if (client.state == 'Waitting') {

    for (let i = 0; i < waitting_queue.length; i++) {
      if (waitting_queue[i].username == username) {
        waitting_queue.splice(i, 1)
        client.state = 'Idle'
        console.log(username + ' has already canceled the match in waitting queue.')
        break
      }
    }

  }
  else if (client.state == 'Ready') {

    let room = room_list[client.room_id]
    for (let i = 0; i < room.waitting_queue.length; i++) {
      if (room.waitting_queue[i].username == username) {
        room.waitting_queue.splice(i, 1)
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

// When the game over.
function endGame(username) {

  let client = connected_clients[username]
  let room = room_list[client.room_id]

  if (room.players_list[client.username]) {
    delete room.players_list[client.username]
  }

  client.room_id = undefined
  client.state = 'Idle'
}

// Server Function

// Search a idle manager to create a room.
function searchIdleServer() {

  let idle_server = undefined
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

// Get the unique session ID from Client and set it to the room.
function setSessionIdForRoom(username, session_id) {

  let server = connected_servers[username]
  let room = room_list[server.room_id]
  console.log('!!!!!!!!!!!!!!!!!!!!!!!1' + room.session_id)
  room.state_DS = 'Awake'
  room.session_id = session_id
  
}

// Set the state of room and players when the game get started.
function setRoomState(username) {

  let server = connected_servers[username]
  let room = room_list[server.room_id]
  room.state = 'Busy'
  server.state = 'Busy'
  // Debug
  console.log('Room owner\'s State: ' + room.owner.state)
  
}

// Do something when the game over.
function gameCompleteSetting(username) {

  let server = connected_servers[username]
  let room = room_list[server.room_id]
  Object.keys(room.players_list).forEach((key) => {
    if (room.players_list[key]) {
      room.players_list[key].state = 'Idle'
      room.players_list[key].room_id = undefined
      delete room.players_list[key]
    }
  })
  clearInterval(room.room_server)
  if (room_list[server.room_id]) {
    delete room_list[server.room_id]
  }
  server.state = 'Idle'

}

// Lobby server.
let lobby_server = setInterval(function() {
  
  if (waitting_queue.length > 0) {

    // Find a room and add a player.
    let add_room_success = false
    Object.keys(room_list).every( (key) => {

      if (room_list[key].state == 'Ready' && room_list[key].checkPlayerNumValid()) {

        // Set the client's info
        let cur_client = waitting_queue.shift()
        cur_client.room_id = room_list[key].id
        cur_client.state = 'Ready'

        room_list[key].waitting_queue.push(cur_client)
        add_room_success = true

        console.log(cur_client.username + ' join a room.')
        return false
      } else {
        return true
      }
    })
    
    // Did not find an idle room
    if (!add_room_success) {

      let room_owner = searchIdleServer()
      if (room_owner) {

        // Some room setting.
        let setting = {
          setup_cond: 1,
          max_players: 3
        }

        let new_room = new Room(history_room_num, 'Ready', room_owner, setting)
        history_room_num += 1

        let cur_client = waitting_queue.shift()
        cur_client.room_id = new_room.id
        cur_client.state = 'Ready'

        new_room.waitting_queue.push(cur_client)
        room_list[new_room.id] = new_room
        console.log('Server create a new room.')
        console.log(cur_client.username + ' join a room.')
      }
      else {
        console.log('There is no idle manager.')
      }
    }
  }
}, 1000)

module.exports = {
  manageConnection
}