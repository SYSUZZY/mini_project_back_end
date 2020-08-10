const koaRouter = require('koa-router')
const tempController = require('../controllers/lobby.js')

const router = new koaRouter({ prefix: '/lobby' })

router.all(
    '/',
    tempController.callFunc,
)

module.exports = router