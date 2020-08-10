# API

## 1.用户
### 1.1 登录
  POST /api/user/signin
  - 请求参数
    - username
    - password
  - 响应参数
    - token

### 1.2 注册
  POST /api/user/signup
  - 请求参数
    - username
    - password
  - 响应参数
    - token

### 1.3 获取用户信息
  GET /api/user
  - 请求参数
    - 无
  - 响应参数
    - userInfo

### 1.4 更改用户信息
  PUT /api/user
  - 请求参数
    - updates : Object // {profile: {}}
  - 响应参数
    - 无