const path = require('path')

const PORT = 1706
const DATA_PATH = path.join(__dirname, '../data')
const LOG_PATH = path.join(__dirname, '../data', 'logs')
const IMG_PATH = path.join(__dirname, '../data', 'imgs')
const REDIS_URL = 'redis://localhost:6379'

const TOKEN_EXPIRE = '30d'
const TOKEN_KEY = '0714'

module.exports = {
  PORT,
  DATA_PATH,
  LOG_PATH,
  IMG_PATH,
  REDIS_URL,
  TOKEN_EXPIRE,
  TOKEN_KEY,
}
