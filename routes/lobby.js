const koaRouter = require('koa-router')
const lobbyController = require('../controllers/lobby.js')

const router = new koaRouter({ prefix: '/lobby' })

router.all(
    '/:username',
    lobbyController.manageConnection,
)

module.exports = router