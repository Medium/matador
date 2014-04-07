# Change Log

We're in the process of cleaning up matador, a lot of functionality will be
simplified or removed.  It is recommended you do not depend on the 2.0.0 target.

## 2.0.0-alpha.3

- Removed `res.req`
- Removed `req.res`
- Removed `req.path`, use `req.url` from [http.IncomingMessage](http://nodejs.org/api/http.html#http_http_incomingmessage)
- Removed `req.param(key)`, use `req.params[key]`
- Removed `res.header(key, value)`, use `res.setHeader(key, value)`

## 2.0.0-alpha.2

- Stopped using klass for inheritance
- Removed `v` magic global

## 2.0.0-alpha.1

- Controller specific middleware has been removed.
- Before filters have been removed
- `app.boot` replaced with `app.useCommonMiddleware()` and `app.start()`, extra middleware should
be added between those two calls.
