const redis =  require('redis')
const bluebird =  require('bluebird')
const logger =  require('../logger')
const { REDIS_URL } = require('../../config')

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const redis_client = redis.createClient(REDIS_URL);
redis_client.on('connect', () => {
  logger.info('Sucessfully connect to Redis: ' + REDIS_URL)
})
redis_client.on('error', (err) => {
  logger.error('Occur a Redis error.', err)
})

module.exports = redis_client
