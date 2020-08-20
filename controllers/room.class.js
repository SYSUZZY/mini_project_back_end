class Room {
  
  constructor(id, state, owner, setting) {
    
    this.id = id        // Unique ID
    this.state = state  // Current State: Busy & Ready
    this.owner = owner  // Room owner

    this.players_list = {}   // Players in Game
    this.waitting_queue = [] // Players in waitting list
    this.dead_players_list = []  // Players die in Game
    
    this.setup_cond = setting.setup_cond    // The condition of setting up DS server
    this.max_players = setting.max_players  // Maximum number of players

    this.state_DS = 'Sleep'      // The state of DS server: Sleep & Awake & Battle & Settlement
    this.session_id = undefined  // Unique session ID of DS server
    this.session_name = owner.username  // Unique session name of DS server
    
    this.room_server = setInterval( () => {

      // console.log('Room ' + this.id + ' has ' + this.waitting_queue.length + ' players.')

      // Check the state of DS server.
      // Debug
      // console.log('state_DS: ' + this.state_DS)
      // console.log("state: " + this.state)
      if (this.state_DS == 'Sleep') {

        // Satisfy the setup condition.
        if (this.waitting_queue.length > this.setup_cond) {
          // Send setup DS command.
          let send_msg = {
            action: 'CreateSession',
            session_name: this.session_name
          }
          this.owner.server.websocket.send(JSON.stringify(send_msg))
          // Debug
          console.log('Send_Msg: ' + JSON.stringify(send_msg))
        }
      }
      else if (this.state == 'Ready' && this.waitting_queue.length > 0) {
        // The DS has been built and there is somebody in waitting queue and the room is ready.
        
        let cur_player = this.waitting_queue.shift()
        console.log(cur_player.username + ' call Join Session.')
        
        this.players_list[cur_player.username] = cur_player
        if (cur_player.apply_match_timer) {
          clearTimeout(cur_player.apply_match_timer)
          delete cur_player[apply_match_timer]
        }
        var send_msg = {
          action: 'JoinSession',
          session_id: this.session_id,
          session_name: this.session_name
        }
        cur_player.client.websocket.send(JSON.stringify(send_msg))
      }

      if (this.waitting_queue.length > 0) {
        console.log("this.waitting_queue.length = " + this.waitting_queue.length)
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

  // Check dead player list
  checkDeadPlayer = function(username) {
    let is_found = false
    for (let i = 0; i < this.dead_players_list.length; i++) {
      if (this.dead_players_list[i] == username) {
        is_found = true
        break
      }
    }
    return is_found
  }

}

module.exports = Room