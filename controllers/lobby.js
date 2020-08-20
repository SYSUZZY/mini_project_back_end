var Room = require('./room.class')
const config = require('../config')
const tokenUtil = require('../utils/token')

var connected_clients = {}
var connected_servers = {}
var loss_connection_clients = {}
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

          // Some universal inspection
          if (!connected_servers[username]) {
            console.log('The server ' + username + ' loss connection.')
            return
          }

          // Debug
          if (json_msg.action != 'HeartBeat') {
            console.log('User: ' + username + ' Message: ' + msg)
          }
          
          if (json_msg.action == 'GameCompleted') {
            gameCompleteSetting(username)
          }
          else if (json_msg.action == 'SendSessionId') {
            console.log('Session ID: ' + json_msg.session_id)
            setSessionIdForRoom(username, json_msg)
          }
          else if (json_msg.action == 'GameStarted') {
            setRoomState(username)
          }
          else if (json_msg.action == 'HeartBeat') {
            resetHealth(username)
            heartBeatACK(username)
          }
          else if (json_msg.action == 'EnterSettlement') {
            setDSStateSettlement(username)
          }
          else if (json_msg.action == 'SendDeadPlayer') {
            recordDeadPlayer(username, json_msg.dead_player)
            deleteCharacterInGame(username, json_msg.dead_player)
          }
          else if (json_msg.action == 'DeleteCharacterComplete') {
            kickOutThePlayer(username, json_msg.username)
          }
        })
  
        ctx.websocket.on('close', ()=> {
          let username = ctx.params.username
          console.log(username + ' close the websocket.')
          if (connected_servers[username]) {
            serverDead(username)
          }
        })
  
        ctx.websocket.send('Websocket connnect successfully.')
      }
      // Client connected.
      else {

        console.log(username + ' connect to server.')

        if (!connected_clients.hasOwnProperty(username) && !loss_connection_clients.hasOwnProperty(username)) {
          // The state of client: Idle & Waitting & Ready & Playing
          connected_clients[username] = { 
            username: username, 
            room_id: undefined, 
            state: 'Idle', 
            client: ctx, 
            health: config.CONNECTED_HEALTH 
          }
        }
        else if (connected_clients.hasOwnProperty(username)) {
          console.log(username + ' has been already in Lobby.')
          connected_clients[username].client = ctx
          checkDSState(username)
        }
        else if (loss_connection_clients.hasOwnProperty(username)) {
          console.log(username + ' has been already in Loss connection list.')
          connected_clients[username] = loss_connection_clients[username]
          connected_clients[username].client = ctx
          delete loss_connection_clients[username]
          delete connected_clients[username][loss_health]
          checkDSState(username)
        }
  
        // Register Event Listener
        ctx.websocket.on('message', (msg) => {
          
          let username = ctx.params.username
          let json_msg = JSON.parse(msg)

          if (connected_clients[username]) {
            // Debug
            if (json_msg.action != 'HeartBeat') {
              console.log('User: ' + username + ' Message: ' + msg)
            }

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
              heartBeatACK(username)
            }
            else if (json_msg.action == 'JoinDS') {
              setPlayerStateJoinDS(username)
            }
            else if (json_msg.action == 'CloseSocket') {
              console.log(username + ' wants to close socket.')
              feedbackCloseSocket(username)
            }
            else if (json_msg.action == 'ReturnBattle') {
              returnBattle(username)
            }
            else if (json_msg.action == 'CancelReturnBattle') {
              cancelReturnBattle(username)
            }
          }
          else {
            if (json_msg.action == 'KeepAlive') {
              clientIsAlive(username)
            }
            else {
              console.log('The client ' + username + ' loss connection.')
              return
            }
          }
        })
  
        ctx.websocket.on('close', ()=> {
          let username = ctx.params.username
          console.log(username + ' close the websocket.')

          if (connected_clients[username]) {
            // Close socket normally.
            if (connected_clients[username].state == 'Closing') {
              resetClientState(username)
              delete connected_clients[username]
            }
            // Close socket abnormally.
            else {
              resetClientStateWithoutPlaying(username)
              loss_connection_clients[username] = connected_clients[username]
              loss_connection_clients[username].loss_health = config.DISCONNECTED_HEALTH
              delete connected_clients[username]
            }
          }
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
  if (client == undefined) {
    console.log(username + ' loss connection.')
  }
  else {
    if (!waitting_queue.includes(client) && client.state == 'Idle') {
  
      waitting_queue.push(client)
      client.state = 'Waitting'
      client.apply_match_timer = setTimeout(() => {
        let message = ""
        if (searchIdleServer) {
          message = "Wait for another player."
        }
        else {
          message = "Wait for idle server."
        }
        let send_msg = {
          action: 'ApplyTooLong',
          message: message
        }
        client.client.websocket.send(JSON.stringify(send_msg))
      }, 300)
      console.log('Add ' + client.username + ' in waitting queue.')
    }
    else {
      console.log('!waitting_queue.includes(client): ' + !waitting_queue.includes(client))
      console.log('client.state: ' + client.state)
      console.log('Fail in waitting queue.')
    }
  }
  
}

// Cancel match
function cancelMatch(username) {
  console.log('CancelMatch was called.')
  let client = connected_clients[username]
  if (client == undefined) {
    console.log(username + ' loss connection.')
    // return
  }
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
    if (room.players_list[username]) {
      room.players_list[username].state = 'Idle'
      delete room.players_list[username]
      console.log(username + ' has already canceled the match in Room ' + room.id + '.')
    }
    else {
      for (let i = 0; i < room.waitting_queue.length; i++) {
        if (room.waitting_queue[i].username == username) {
          room.waitting_queue.splice(i, 1)
          client.state = 'Idle'
          console.log(username + ' has already canceled the match in Room ' + room.id + '.')
          break
        }
      }
    }

  }
  else if (client.state == 'Playing') {
    console.log('The player is playing game.')
  }
  else if (client.state == 'Idle') {
    console.log('The player is not matching.')
  }
  else {
    console.log(client.state)
  }
  
  if (client.apply_match_timer) {
    clearTimeout(client.apply_match_timer)
    delete client[apply_match_timer]
  }
}

// When the game over.
function endGame(username) {

  let client = connected_clients[username]
  if (client == undefined) {
    console.log(username + ' loss connection.')
    return
  }
  let room = room_list[client.room_id]
  if (room) {
    if (room.players_list[client.username]) {
      delete room.players_list[client.username]
    }
  }
  client.room_id = undefined
  client.state = 'Idle'
}

function resetClientState(username) {

  resetClientStateWithoutPlaying(username)
  
  if (connected_clients[username]) {

    if (connected_clients[username].state == 'Playing') {
  
      let room = room_list[connected_clients[username].room_id]
      if (room.players_list[username]) {
        delete room.players_list[username]
      }

      connected_clients[username].state = 'Idle'
  
    }
    
  }
}

function resetClientStateWithoutPlaying(username) {
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
    
    if (connected_clients[username].state != 'Playing') {
  
      connected_clients[username].state = 'Idle'
  
    }
  }
}

function setPlayerStateJoinDS(username) {

  if (connected_clients[username]) {
    console.log(username + ' join session success.')
    connected_clients[username].state = 'Playing'
  }

}

// Reset the state of client and change it to 'Closing'.
// Send the close socket command to client.
function feedbackCloseSocket(username) {

  if (connected_clients[username]) {
    console.log('Find client ' + username)
    resetClientState(username)

    connected_clients[username].state = 'Closing'
    let send_msg = {
      action: 'CloseSocket',
    }
    connected_clients[username].client.websocket.send(JSON.stringify(send_msg))
  }
  else {
    console.log('Can not find the client ' + username)
  }

}

// Recover Battle
function checkDSState(username) {
  let connected_client = connected_clients[username]
  if (connected_client) {
    if (connected_client.state == 'Playing') {
      let room = room_list[connected_client.room_id]
      if (room) {
        if (room.checkDeadPlayer(username)) {
          // Clear dead player's state.
          endGame(username)
        }
        else {
          // TODO: Ask player to join battle.
          if (room.state_DS == 'Battle') {
            var send_msg = {
              action: 'CallReturnBattle',
            }
            connected_client.client.websocket.send(JSON.stringify(send_msg))
          }
        }
      }
    }
  }
}

// Call the client back to battle
function returnBattle(username) {
  let connected_client = connected_clients[username]
  if (connected_client) {
    if (connected_client.state == 'Playing') {
      let room = room_list[connected_client.room_id]
      room.players_list[username] = connected_client
      var send_msg = {
        action: 'JoinSession',
        session_id: room.session_id,
        session_name: room.session_name
      }
      connected_client.client.websocket.send(JSON.stringify(send_msg))
    }
    else {
      console.log('Battle is over')
    }
  }
}

// Cancel the opertunity to battle
function cancelReturnBattle(username) {
  let connected_client = connected_clients[username]
  if (connected_client) {
    if (connected_client.state == 'Playing') {
      let send_msg = {
        action: 'DeleteCharacter',
        username: username
      }
      let room = room_list(connected_client.room_id)
      if (room) {
        if (!room.checkDeadPlayer(username)) {
          if (room.state_DS == 'Battle') {
            room.owner.server.websocket.send(JSON.stringify(send_msg))
          }
        }
      }
    }
  }
}

function clientIsAlive(username) {
  let connected_client = loss_connection_clients[username]
  delete connected_client[loss_health]
  connected_client.health = config.CONNECTED_HEALTH
  connected_clients[username] = connected_client
  delete loss_connection_clients[username]
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
function setSessionIdForRoom(username, json_msg) {

  let server = connected_servers[username]
  let room = room_list[server.room_id]
  room.state_DS = 'Awake'
  room.session_id = json_msg.session_id
  room.session_name = json_msg.session_name
  
}

// Set the state of room and players when the game get started.
function setRoomState(username) {

  let server = connected_servers[username]
  let room = room_list[server.room_id]
  room.state = 'Busy'
  server.state = 'Busy'
  room.state_DS = 'Battle'
  // Debug
  console.log('Room owner\'s State: ' + room.owner.state)
  
}

// Do something when the game over.
function gameCompleteSetting(username) {
  let server = connected_servers[username]
  if (server) {
    let room = room_list[server.room_id]
    if (room) {
      cleanRoom(room)
    }
    server.state = 'Idle'
  }
}

// Change DS State
function setDSStateSettlement(username) {
  let server = connected_servers[username]
  if (server) {
    let room = room_list[server.room_id]
    if (room) {
      room.state_DS = 'Settlement'
    }
  }
}

// Record the dead player in room
function recordDeadPlayer(username, dead_player_name) {
  let server = connected_servers[username]
  if (server) {
    let room = room_list[server.room_id]
    if (room) {
      room.dead_players_list.push(dead_player_name)
    }
  }
}

// Delete the character when the player die.
function deleteCharacterInGame(username, dead_player_name) {
  let send_msg = {
    action: 'DeleteCharacterFromServer',
    username: dead_player_name
  }
  connected_servers[username].server.websocket.send(JSON.stringify(send_msg))
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

function kickOutThePlayer(username, client_username) {
  if (connected_servers[username]) {
    if (connected_clients[client_username]) {
      if (connected_clients[client_username].state == 'Playing') {
        let room = room_list[connected_clients[client_username].room_id]
        if (room) {
          if (room.state_DS == 'Battle') {
            endGame(client_username)
            let send_msg = {
              action: 'DeleteCharacterComplete'
            }
            connected_clients[client_username].client.send(JSON.stringify(send_msg))
          }
        }
      }
    }
  }
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
  // console.log(username + ' is alive.')
  if (connected_servers[username]) {
    connected_servers[username].health = config.CONNECTED_HEALTH
  }
  if (connected_clients[username]) {
    connected_clients[username].health = config.CONNECTED_HEALTH
  }
}

// Tell the client that server is running
function heartBeatACK(username) {

  if (connected_clients[username]) {
    let json_msg = {
      action: 'HeartBeat'
    }
    connected_clients[username].client.websocket.send(JSON.stringify(json_msg))
  }

  if (connected_servers[username]) {
    let json_msg = {
      action: 'HeartBeat'
    }
    connected_servers[username].server.websocket.send(JSON.stringify(json_msg))
  }

}

// Check connected client's health
let health_monitor = setInterval( () => {
  Object.keys(connected_clients).forEach( (key) => {
    if (connected_clients[key].health <= 0) {
      resetClientStateWithoutPlaying(key)
      loss_connection_clients[key] = connected_clients[key]
      loss_connection_clients[key].loss_health = config.DISCONNECTED_HEALTH
      delete connected_clients[key]
      // try to ask client to connect socket
      let json_msg = {
        action: 'ReconnectSocket'
      }
      loss_connection_clients[key].client.websocket.send(JSON.stringify(json_msg))
    }
  })

  Object.keys(connected_servers).forEach( (key) => {
    if (connected_servers[key].health <= 0) {
      serverDead(key)
    }
  })

  Object.keys(loss_connection_clients).forEach( (key) => {
    if (loss_connection_clients[key].loss_health <= 0) {
      delete loss_connection_clients[key]
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
  Object,keys(loss_connection_clients).forEach( (key) => {
    loss_connection_clients[key].loss_health -= 1
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
          setup_cond: 0,
          max_players: 2,
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