const jwt = require('jsonwebtoken')
const util = require('util')
const config = require('../../config')
const { constants } = require('buffer')
const verify = util.promisify(jwt.verify)

const createToken = info => {
  console.log(config.TOKEN_EXPIRE)
  console.log(info)
  console.log(config.TOKEN_KEY)
  return 'Bearer ' + jwt.sign(info, config.TOKEN_KEY, {expiresIn: config.TOKEN_EXPIRE})
}

const verifyToken = async token => {
  let result
  try {
    result = await verify(token.split(' ')[1], config.TOKEN_KEY);
  } catch (err) {
    console.log(err)
    return
  }
  return result;
}

module.exports = {
  createToken,
  verifyToken
}