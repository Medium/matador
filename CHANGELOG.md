# Change Log

We're in the process of cleaning up matador, a lot of functionality will be
simplified or removed.  It is recommended you do not depend on the 2.0.0 target.

## 2.0.0-alpha.1

- Controller specific middleware has been removed.
- Before filters have been removed
- `app.boot` replaced with `app.useCommonMiddleware()` and `app.start()`, extra middleware should
be added between those two calls.
