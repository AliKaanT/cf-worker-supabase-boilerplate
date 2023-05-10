# POST: /login

### Request

```json
{
  "username": "required",
  "password": "required"
}
```

### Response

#### success

```json
{
  "body": {
    "status"  : "success",
    "message" : "Login successful"
  },
  "cookie":{
    "AUTH-ACCESS-TOKEN" : "xxxxxxxxxxxx - 1 day - path: /",
    "AUTH-REFRESH-TOKEN": "xxxxxxxxxxxx - 1 day - path: /"
  }
  "statusCode": 200
}
```

#### error

```json
{
  "body": {
    "status"  : "error",
    "message" : "Something went wrong"
  },
  "statusCode": 400
}
```
***
***
# POST: /register

### Request

```json
{
  "email"    : "z.string().email()",
  "password" : "z.string().min(6).max(128)",
  "username" : "z.string().min(3).max(128)",
  "name"     : "z.string().min(3).max(128)",
  "surname"  : "z.string().min(3).max(128)"
}
```

### Response

#### success

```json
{
  "body": { 
    "status"  : "success", 
    "message" : "Successfully registered, Please confirm your email"
  },
  "statusCode": 200
}
```

#### error

```json
{
  "body": { 
    "status"     : "error", 
    "code"       : "AUTH-XXX", 
    "message"    : "Something",
    "devMessage" : "Something",
    "data"       : "object" 
  },
  "statusCode": 400
}
```
