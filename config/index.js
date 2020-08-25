const path = require('path')

const PORT = 1706
const DATA_PATH = path.join(__dirname, '../data')
const LOG_PATH = path.join(__dirname, '../data', 'logs')
const IMG_PATH = path.join(__dirname, '../data', 'imgs')
const REDIS_URL = 'redis://zzy_redis:6379'

const TOKEN_EXPIRE = '3d'
const TOKEN_KEY = '0714'

const CONNECTED_HEALTH = 25
const DISCONNECTED_HEALTH = 300

const CURRENT_WAIT_TO_COUNT_DOWN_DURATION = 30.0
const BEGIN_COUNT_DOWN_PLAYER_AMOUNT = 2
const COUNT_DOWN_TIME = 30
const MAX_PLAYERS = 3


module.exports = {
  PORT,
  DATA_PATH,
  LOG_PATH,
  IMG_PATH,
  REDIS_URL,
  TOKEN_EXPIRE,
  TOKEN_KEY,
  CONNECTED_HEALTH,
  DISCONNECTED_HEALTH,
  CURRENT_WAIT_TO_COUNT_DOWN_DURATION,
  BEGIN_COUNT_DOWN_PLAYER_AMOUNT,
  COUNT_DOWN_TIME,
  MAX_PLAYERS
}
