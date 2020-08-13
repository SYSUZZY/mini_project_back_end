var Room = require('./room.class')
const config = require('../config')
const tokenUtil = require('../utils/token')

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
          connected_servers[username] = { 
            username: username, 
            room_id: undefined, 
            state: 'Idle', 
            server: ctx, 
            health: config.CONNECTED_HEALTH
          }
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
          else if (json_msg.action == 'HeartBeat') {
            resetHealth(username)
          }
        })
  
        ctx.websocket.on('close', ()=> {
          let username = ctx.params.username
          console.log(username + ' close the websocket.')
          serverDead(username)
        })
  
        ctx.websocket.send('Websocket connnect successfully.')
      }
      // Client connected.
      else {

        console.log(username + ' connect to server.')

        if (!connected_clients.hasOwnProperty(username)) {
          // The state of client: Idle & Waitting & Ready & Playing
          connected_clients[username] = { 
            username: username, 
            room_id: undefined, 
            state: 'Idle', 
            client: ctx, 
            health: config.CONNECTED_HEALTH 
          }
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
          else if (json_msg.action == 'HeartBeat') {
            resetHealth(username)
          }
        })
  
        ctx.websocket.on('close', ()=> {
          // TODO: Add a close socket function
          let username = ctx.params.username
          console.log(username + ' close the websocket.')
          clientDead(username)
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

// Client was dead
function clientDead(username) {

  console.log(username + ' is dead.')

  if (connected_clients[username]) {
    if (connected_clients[username].state == 'Waitting') {

      for (let i = 0; i < waitting_queue.length; i++) {
        if (waitting_queue[i].username == username) {
          waitting_queue.splice(i, 1)
          break
        }
      }
  
    }
    else if (connected_clients[username].state == 'Ready') {
  
      let room = room_list[connected_clients[username].room_id]
      for (let i = 0; i < room.waitting_queue.length; i++) {
        if (room.waitting_queue[i].username == username) {
          room.waitting_queue.splice(i, 1)
          break
        }
      }
  
    }
    else if (connected_clients[username].state == 'Playing') {
  
      let room = room_list[connected_clients[username].room_id]
      if (room.players_list[username]) {
        delete room.players_list[username]
      }
  
    }
    delete connected_clients[username]
  }
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
  cleanRoom(room)
  server.state = 'Idle'
}

// Server dead
function serverDead(username) {
  console.log(username + ' is dead.')
  if (connected_servers[username].state == 'Busy') {
    let room = room_list[connected_servers[username].room_id]
    cleanRoom(room)
  }
  delete connected_servers[username]
}

// Lobby Function

// Clean Room
function cleanRoom(room) {
  // Kick out players
  Object.keys(room.players_list).forEach( (key) => {
    if (room.players_list[key]) {
      room.players_list[key].state = 'Idle'
      room.players_list[key].room_id = undefined 
      delete room.players_list[key]
    }
  })
  clearInterval(room.room_server)
  for (let i = 0; i < room.waitting_queue.length; i++) {
    room.waitting_queue[i].state = 'Idle'
    room.waitting_queue[i].room_id = undefined
  }

  // Delete room
  delete room_list[room.id]
}

// Reset health
function resetHealth(username) {
  console.log(username + ' is alive.')
  if (connected_servers[username]) {
    connected_servers[username].health = config.CONNECTED_HEALTH
  }
  if (connected_clients[username]) {
    connected_clients[username].health = config.CONNECTED_HEALTH
  }

}

// Check connected client's health
let health_monitor = setInterval( () => {
  Object.keys(connected_clients).forEach( (key) => {
    if (connected_clients[key].health <= 0) {
      clientDead(key)
    }
  })

  Object.keys(connected_servers).forEach( (key) => {
    if (connected_servers[key].health <= 0) {
      serverDead(key)
    }
  })
}, 5000)

// Damage on client
function applyDamage() {
  Object.keys(connected_clients).forEach( (key) => {
    connected_clients[key].health -= 1
  })
  Object.keys(connected_servers).forEach( (key) => {
    connected_servers[key].health -= 1
  })
}

// Lobby server.
let lobby_server = setInterval( () => {
  
  applyDamage()

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
        room_owner.state = 'Busy'
        room_owner.room_id = new_room.id

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