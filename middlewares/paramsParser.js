module.exports = async (ctx, next) => {
  ctx.params = {}
  ctx.path = decodeURI(ctx.path)
  console.log(ctx.request.body)
  if (ctx.request.body) {
    Object.assign(ctx.params, ctx.request.body)
  }
  if (ctx.params) {
    Object.assign(ctx.params, ctx.params)
  }
  if (ctx.request.query) {
    Object.assign(ctx.params, ctx.request.query)
  }
  if (ctx.request.files) {
    Object.assign(ctx.params, ctx.request.files)
  }
  await next()
}