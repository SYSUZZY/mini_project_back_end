const koaRouter = require('koa-router')
const tempController = require('../controllers/temp')

const router = new koaRouter({ prefix: '/temp' })

router.get(
    '/',
    tempController.callFunc,
)

module.exports = router