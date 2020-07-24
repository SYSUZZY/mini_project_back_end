const koaRouter = require('koa-router')
const userController = require('../controllers/user')

const router = new koaRouter({ prefix: '/user' })

router.post(
  '/signin',
  userController.signin,
)

router.post(
  '/signup',
  userController.signup,
)

router.get(
  '/',
  userController.getUser
)

router.put(
  '/',
  userController.updateUser
)

router.delete(
  '/',
  userController.deleteUser
)

module.exports = router
