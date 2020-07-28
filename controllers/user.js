const SE = require('../utils/systemError')
const redis_client = require('../utils/redis')
const tokenUtil = require('../utils/token')

const signin = async ctx => {
  let username = ctx.params.username
  let password = ctx.params.password
  if (typeof(username) != 'string') throw new SE(1, '非法参数: username')
  if (typeof(password) != 'string') throw new SE(1, '非法参数: password')
  if (username.length == 0) throw new SE(2, '用户名不可为空')
  if (password.length == 0) throw new SE(2, '密码不能为空')

  let user = await redis_client.getAsync(username)
  let user_json
  if (user) {
    user_json = JSON.parse(user)
    if (user_json.password != password) throw new SE(2, '用户名/密码错误')
  } else {
    throw new SE(2, '用户名/密码错误')
  }

  let token = tokenUtil.createToken({username})

  ctx.body = {
    token: token,
    userInfo: user,
    code: 0,
    msg: 'ok'
  }
}

const signup = async ctx => {
  console.log(ctx.params)
  let username = ctx.params.username
  let password = ctx.params.password
  if (typeof(username) != 'string') throw new SE(1, '非法参数: username')
  if (typeof(password) != 'string') throw new SE(1, '非法参数: password')
  if (username.length == 0) throw new SE(2, '用户名不可为空')
  if (password.length == 0) throw new SE(2, '密码不能为空')

  let user = await redis_client.getAsync(username)
  if (user) throw new SE(2, '用户名已存在')

  await redis_client.setAsync(username, JSON.stringify({
      'username': username,
      'password': password,
      'world_index': '0',
      'weapon_index': '0',
      'character_index': '0',
    }))

  ctx.body = {
    code: 0,
    msg: '注册成功！'
  }
}


const updateUser = async ctx => {
  let username = ctx.user.username
  let updates = ctx.params.updates
  console.log(username, updates)
  let user = await redis_client.getAsync(username)
  let user_json = JSON.parse(user)

  for (var key in updates) {
    user_json[key] = updates[key]
  }

  await redis_client.setAsync(username, JSON.stringify(user_json))

  ctx.body = {
    code: 0,
    msg: 'ok'
  }
}


const deleteUser = async ctx => {
  let deleteUsername = ctx.params.deleteUsername

  await redis_client.delAsync(deleteUsername)

  ctx.body = {
    code: 0,
    msg: 'ok'
  }
}


const getUser = async ctx => {
  let username = ctx.user.username
  console.log(username)

  let user = await redis_client.getAsync(username)
  let user_json = JSON.parse(user)
  let userInfo = {
    username: user_json.username,
    world_index: user_json.world_index,
    weapon_index: user_json.weapon_index,
    character_index: user_json.character_index,
  }
  let userInfo_str = JSON.stringify(userInfo)

  ctx.body = {
    code: 0,
    msg: 'ok',
    userInfo: userInfo_str,
  }
}

module.exports = {
  signin,
  signup,
  updateUser,
  deleteUser,
  getUser
}