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

### 1.5 删除用户
  DELETE /api/user
  - 请求参数
    - userId
  - 响应参数
    - 无

### 1.6 获取成员
  GET /api/member
  - 请求参数
    - 无
  - 响应参数
    - members

### 1.7 获取账户
  GET /api/account
  - 请求参数
    - 无
  - 响应参数
    - accounts


## 2.公告
### 2.1 发布公告
  POST /api/notice
  - 请求参数
    - content : Sting
  - 相应参数
    - noticeId

### 2.2 获取公告
  GET /api/notice
  - 请求参数
    - noticeId (可选，有Id则返回一条公告，反之返回全部公告)
  - 相应参数
    - notices : Array

### 2.3 更新公告
  PUT /api/notice
  - 请求参数
    - noticeId
    - updates
  - 响应参数
    - 无

### 2.4 删除公告
  DELETE /api/notice
  - 请求参数
    - noticeId
  - 响应参数
    - 无


## 3.文件集合
### 3.1 发布文件集合
  POST /api/fileCollection
  - 请求参数
    - description
    - public : Boolean
  - 响应参数
    - collectionId

### 3.2 获取文件集合
  GET /api/fileCollection
  - 请求参数
    - collectionId (可选)
  - 响应参数
    collections : Array

### 3.3 删除文件集合
  DELETE /api/filCollection
  - 请求参数
    - collectionId
    - hardDelete(可选)
  - 响应参数
    - 无