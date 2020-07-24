module.exports =  class SystemError extends Error {
  constructor(code, msg, err) {
    super(msg)
    this.code = code
    this.msg = msg
    this.err = err
  }
}
