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

module.exports = Room