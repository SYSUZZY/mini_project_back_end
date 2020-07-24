const redis_client = require('../utils/redis')
const user = require('./user')

const callFunc = async ctx => {
    console.log('Call Func Success.')

    // 保存
    const zz = {
        username: 'zhengzhao',
        password: 123456,
    }
    await redis_client.setAsync(zz.username, JSON.stringify(zz))
    // 获取
    const zz_str = await redis_client.getAsync('zhengzhao')
    const zz_obj = JSON.parse(zz_str)

    ctx.body = {
        code: 1,
        zz: zz_obj,
    }
}

module.exports = {
    callFunc,
}