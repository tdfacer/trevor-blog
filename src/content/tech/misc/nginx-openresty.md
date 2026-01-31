---
title: "Nginx Openresty"
date: "2022-05-21"
tags: ["tech", "nginx", "openresty"]
category: "misc"
---

## Doc Links

* [lua-nginx-module](https://github.com/openresty/lua-nginx-module#directives)
* [nginx-api-for-lua](https://github.com/openresty/lua-nginx-module#nginx-api-for-lua)
* [lua-nginx-api](https://openresty-reference.readthedocs.io/en/latest/Lua-Nginx-API/)

## Directives

* [lua_code_cache](https://github.com/openresty/lua-nginx-module#lua_code_cache)
  * Use this to have all requests run with a new Lua VM instance (for dev only)
  * Inline lua `*_by_lua_block` will _not_ be included and will not get a dedicated Lua VM instance
* [init_by_lua_block](https://github.com/openresty/lua-nginx-module#init_by_lua_block)
  * Good spot for lua module initialization
  * Can also init the `lua_shared_dict` here
  * Do not init global lua vars here (due to performance reasons)
* [init_worker_by_lua_block](https://github.com/openresty/lua-nginx-module#init_worker_by_lua_block)
  * Init that runs on each nginx worker startup
  * Often used to create per-worker reoccurring timers
* [exit_worker_by_lua_block](https://github.com/openresty/lua-nginx-module#exit_worker_by_lua_block)
  * Runs the specified Lua code upon every Nginx worker process's exit when the master process is enabled
* [set_by_lua_block](https://github.com/openresty/lua-nginx-module#set_by_lua_block)
  * Executes code specified inside a pair of curly braces (`{}`), and returns string output to `$res`
  * A handful of API functions are disabled here:
    * Output API functions (e.g., ngx.say and ngx.send_headers)
    * Control API functions (e.g., ngx.exit)
    * Subrequest API functions (e.g., ngx.location.capture and ngx.location.capture_multi)
    * Cosocket API functions (e.g., ngx.socket.tcp and ngx.req.socket).
    * Sleeping API function ngx.sleep.
  * This directive can be freely mixed with all directives of the ngx_http_rewrite_module, set-misc-nginx-module, and array-var-nginx-module modules. All of these directives will run in the same order as they appear in the config file.
  * Can only write a single output at a time, but can work around by doing the following
```lua
 location /foo {
     set $diff ''; # we have to predefine the $diff variable here

     set_by_lua_block $sum {
         local a = 32
         local b = 56

         ngx.var.diff = a - b  -- write to $diff directly
         return a + b          -- return the $sum value normally
     }

     echo "sum = $sum, diff = $diff";
 }
```
* [content_by_lua_block](https://github.com/openresty/lua-nginx-module#content_by_lua_block)
  * Acts as a "content handler" and executes Lua code string specified in the `{ lua-script }` for every request
  * The Lua code may make API calls and is executed as a new spawned coroutine in an independent global environment
  * **important:** Do not use this directive and other content handler directives in the same location. For example, this directive and the proxy_pass directive should not be used in the same location.
* [rewrite_by_lua_block](https://github.com/openresty/lua-nginx-module#rewrite_by_lua_block)
  * Acts as a rewrite phase handler and executes Lua code string specified in `{ lua-script }` for every request
  * Note that this handler always runs after the standard ngx_http_rewrite_module
  * See example in official docs showing that an `if` runs _after_ the `rewrite_by_lua_block`, so even if it occurs after the `rewrite_by_lua_block` in the `location` context, the `rewrite_by_lua_block` will run first
  * Note that when calling ngx.exit(ngx.OK) within a rewrite_by_lua_block handler, the Nginx request processing control flow will still continue to the content handler
  * To terminate the current request from within a rewrite_by_lua_block handler, call ngx.exit with status >= 200 (ngx.HTTP_OK) and status < 300 (ngx.HTTP_SPECIAL_RESPONSE) for successful quits and ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR) (or its friends) for failures
  * If the ngx_http_rewrite_module's rewrite directive is used to change the URI and initiate location re-lookups (internal redirections), then any rewrite_by_lua_block or rewrite_by_lua_file_block code sequences within the current location will not be executed.
  * See this example, in which the `ngx.exit(503)` will _never_ run:
```nginx
location /foo {
   rewrite ^ /bar;
   rewrite_by_lua_block {
       ngx.exit(503)
   }
}
location /bar {
   ...
}
```
  * If the break modifier is used instead, there will be no internal redirection and the rewrite_by_lua_block code will be executed
  * The rewrite_by_lua_block code will always run at the end of the rewrite request-processing phase unless rewrite_by_lua_no_postpone is turned on
* [access_by_lua_block](https://github.com/openresty/lua-nginx-module#access_by_lua_block)
  * Acts as an access phase handler and executes Lua code string specified in `{ <lua-script }` for every request
  * Note that this handler always runs after the standard `ngx_http_access_module`
  * `access_by_lua_block` will not run in subrequests
  * Note that when calling `ngx.exit(ngx.OK)` within a `access_by_lua_block` handler, the Nginx request processing control flow will still continue to the content handler
* [header_filter_by_lua_block](https://github.com/openresty/lua-nginx-module#header_filter_by_lua_block)
  * Uses Lua code specified in `{ lua-script }` to define an output header filter
  * Following APIs are disabled here:
    * Output API functions (e.g., ngx.say and ngx.send_headers)
    * Control API functions (e.g., ngx.redirect and ngx.exec)
    * Subrequest API functions (e.g., ngx.location.capture and ngx.location.capture_multi)
    * Cosocket API functions (e.g., ngx.socket.tcp and ngx.req.socket).
    * Override response header example:
```nginx
location / {
  proxy_pass http://mybackend;
  header_filter_by_lua_block {
    ngx.header.Foo = "blah"
  }
}
```
* [body_filter_by_lua_block](https://github.com/openresty/lua-nginx-module#body_filter_by_lua_block)
  * Uses Lua code specified in `{ lua-script }` to define an output body filter
  * The input data chunk is passed via ngx.arg[1] (as a Lua string value)
  * The "eof" flag indicating the end of the response body data stream is passed via ngx.arg[2] (as a Lua boolean value)
  * Can execute `return ngx.ERROR` to abort the output data stream immediately
    * This will truncate the result
  * See this example for transforming output body:
```nginx
 location / {
     proxy_pass http://mybackend;
     body_filter_by_lua_block {
         ngx.arg[1] = string.upper(ngx.arg[1])
     }
 }
```
  * Following APIs are disabled here:
    * Output API functions (e.g., ngx.say and ngx.send_headers)
    * Control API functions (e.g., ngx.exit and ngx.exec)
    * Subrequest API functions (e.g., ngx.location.capture and ngx.location.capture_multi)
    * Cosocket API functions (e.g., ngx.socket.tcp and ngx.req.socket).
* [log_by_lua_block](https://github.com/openresty/lua-nginx-module#log_by_lua_block)
  * Runs the Lua source code inlined as the { lua-script } at the log request processing phase
  * This does not replace the current access logs, but runs before
  * Following APIs are disabled here:
    * Output API functions (e.g., ngx.say and ngx.send_headers)
    * Control API functions (e.g., ngx.exit)
    * Subrequest API functions (e.g., ngx.location.capture and ngx.location.capture_multi)
    * Cosocket API functions (e.g., ngx.socket.tcp and ngx.req.socket).
* [lua_shared_dict](https://github.com/openresty/lua-nginx-module#lua_shared_dict)
  * Declares a shared memory zone, <name>, to serve as storage for the shm based Lua dictionary `ngx.shared.<name>`
  * Shared memory zones are always shared by all the Nginx worker processes in the current Nginx server instance
* [rewrite_by_lua_no_postpone](https://github.com/openresty/lua-nginx-module#rewrite_by_lua_no_postpone)
  * Controls whether or not to disable postponing `rewrite_by_lua*` directives to run at the end of the rewrite request-processing phase
  * By default, this directive is turned off and the Lua code is postponed to run at the end of the rewrite phase
* [access_by_lua_no_postpone](https://github.com/openresty/lua-nginx-module#access_by_lua_no_postpone)
  * Controls whether or not to disable postponing `access_by_lua*` directives to run at the end of the access request-processing phase
  * By default, this directive is turned off and the Lua code is postponed to run at the end of the access phase

### Precedence

Taken from Openresty GitHub:
![openresty-precedence](/images/openresty_precedence.png)

### Module Notes

* If a given location finishes in an earlier module, a later module's code will not be executed
* Always check the order that things are executed in
* Note that sometimes, even if you return early, the rest of a module will execute through to completion (which may have side effects)


## Nginx API

### General Notes

* Both `ngx` and `ndk` are in the global lua namespace within user lua code

### Lua Nginx API

[ngx.arg](https://github.com/openresty/lua-nginx-module#ngxarg)

* When this is used in the context of the `set_by_lua*` directives, this table is read-only
* holds the input arguments to the config directives
```lua
 value = ngx.arg[n]
```
* This writes out `88`:
```nginx
 location /foo {
     set $a 32;
     set $b 56;

     set_by_lua $sum
         'return tonumber(ngx.arg[1]) + tonumber(ngx.arg[2])'
         $a $b;

     echo $sum;
 }
```
* When this table is used in the context of `body_filter_by_lua*`, the first element holds the input data chunk to the output filter code and the second element holds the boolean flag for the "eof" flag indicating the end of the whole output data stream

[ngx.var.variable](https://github.com/openresty/lua-nginx-module#ngxvarvariable)

* Read and write Nginx variable values
* Note that only already defined Nginx variables can be written to. For example:
```nginx
location /foo {
   set $my_var ''; # this line is required to create $my_var at config time
   content_by_lua_block {
       ngx.var.my_var = 123
       ...
   }
}
 ```
* nginx variables cannot be created on the fly
* Some special Nginx variables like `$args` and `$limit_rate` can be assigned a value, many others are not, like `$query_string,` `$arg_PARAMETER,` and `$http_NAME`
* Setting a variable to `nil` will unset the variable
* When reading from an Nginx variable, Nginx will allocate memory in the per-request memory pool which is freed only at request termination. So when you need to read from an Nginx variable repeatedly in your Lua code, cache the Nginx variable value to your own Lua variable
* To work around this, save to a local var so that memory does not have to be allocated each time
* **Note:** Undefined Nginx variables are evaluated to nil while uninitialized (but defined) Nginx variables are evaluated to an empty Lua string

[core-constants](https://github.com/openresty/lua-nginx-module#core-constants)

```
ngx.OK (0)
ngx.ERROR (-1)
ngx.AGAIN (-2)
ngx.DONE (-4)
ngx.DECLINED (-5)
```

[http-method-constants](https://github.com/openresty/lua-nginx-module#http-method-constants)

```
ngx.HTTP_GET
ngx.HTTP_HEAD
ngx.HTTP_PUT
ngx.HTTP_POST
ngx.HTTP_DELETE
ngx.HTTP_OPTIONS   (added in the v0.5.0rc24 release)
ngx.HTTP_MKCOL     (added in the v0.8.2 release)
ngx.HTTP_COPY      (added in the v0.8.2 release)
ngx.HTTP_MOVE      (added in the v0.8.2 release)
ngx.HTTP_PROPFIND  (added in the v0.8.2 release)
ngx.HTTP_PROPPATCH (added in the v0.8.2 release)
ngx.HTTP_LOCK      (added in the v0.8.2 release)
ngx.HTTP_UNLOCK    (added in the v0.8.2 release)
ngx.HTTP_PATCH     (added in the v0.8.2 release)
ngx.HTTP_TRACE     (added in the v0.8.2 release)
```

[http-status-constants](https://github.com/openresty/lua-nginx-module#http-status-constants)

```
value = ngx.HTTP_CONTINUE (100) (first added in the v0.9.20 release)
value = ngx.HTTP_SWITCHING_PROTOCOLS (101) (first added in the v0.9.20 release)
value = ngx.HTTP_OK (200)
value = ngx.HTTP_CREATED (201)
value = ngx.HTTP_ACCEPTED (202) (first added in the v0.9.20 release)
value = ngx.HTTP_NO_CONTENT (204) (first added in the v0.9.20 release)
value = ngx.HTTP_PARTIAL_CONTENT (206) (first added in the v0.9.20 release)
value = ngx.HTTP_SPECIAL_RESPONSE (300)
value = ngx.HTTP_MOVED_PERMANENTLY (301)
value = ngx.HTTP_MOVED_TEMPORARILY (302)
value = ngx.HTTP_SEE_OTHER (303)
value = ngx.HTTP_NOT_MODIFIED (304)
value = ngx.HTTP_TEMPORARY_REDIRECT (307) (first added in the v0.9.20 release)
value = ngx.HTTP_PERMANENT_REDIRECT (308)
value = ngx.HTTP_BAD_REQUEST (400)
value = ngx.HTTP_UNAUTHORIZED (401)
value = ngx.HTTP_PAYMENT_REQUIRED (402) (first added in the v0.9.20 release)
value = ngx.HTTP_FORBIDDEN (403)
value = ngx.HTTP_NOT_FOUND (404)
value = ngx.HTTP_NOT_ALLOWED (405)
value = ngx.HTTP_NOT_ACCEPTABLE (406) (first added in the v0.9.20 release)
value = ngx.HTTP_REQUEST_TIMEOUT (408) (first added in the v0.9.20 release)
value = ngx.HTTP_CONFLICT (409) (first added in the v0.9.20 release)
value = ngx.HTTP_GONE (410)
value = ngx.HTTP_UPGRADE_REQUIRED (426) (first added in the v0.9.20 release)
value = ngx.HTTP_TOO_MANY_REQUESTS (429) (first added in the v0.9.20 release)
value = ngx.HTTP_CLOSE (444) (first added in the v0.9.20 release)
value = ngx.HTTP_ILLEGAL (451) (first added in the v0.9.20 release)
value = ngx.HTTP_INTERNAL_SERVER_ERROR (500)
value = ngx.HTTP_NOT_IMPLEMENTED (501)
value = ngx.HTTP_METHOD_NOT_IMPLEMENTED (501) (kept for compatibility)
value = ngx.HTTP_BAD_GATEWAY (502) (first added in the v0.9.20 release)
value = ngx.HTTP_SERVICE_UNAVAILABLE (503)
value = ngx.HTTP_GATEWAY_TIMEOUT (504) (first added in the v0.3.1rc38 release)
value = ngx.HTTP_VERSION_NOT_SUPPORTED (505) (first added in the v0.9.20 release)
value = ngx.HTTP_INSUFFICIENT_STORAGE (507) (first added in the v0.9.20 release)
```

[nginx-log-level-constants](https://github.com/openresty/lua-nginx-module#nginx-log-level-constants)

```
ngx.STDERR
ngx.EMERG
ngx.ALERT
ngx.CRIT
ngx.ERR
ngx.WARN
ngx.NOTICE
ngx.INFO
ngx.DEBUG
```

[print](https://github.com/openresty/lua-nginx-module#print)

* Writes argument values into the Nginx error.log file with the `ngx.NOTICE` log level

[ngx.ctx](https://github.com/openresty/lua-nginx-module#ngxctx)

* This table can be used to store per-request Lua context data and has a life time identical to the current request (as with the Nginx variables).
* See example:
```nginx
location /test {
   rewrite_by_lua_block {
       ngx.ctx.foo = 76
   }
   access_by_lua_block {
       ngx.ctx.foo = ngx.ctx.foo + 3
   }
   content_by_lua_block {
       ngx.say(ngx.ctx.foo)
   }
}
```
* Outputs `79`
* Every request, including subrequests, has its own copy of the table
* Because of the metamethod magic, never "local" the ngx.ctx table outside your Lua function scope on the Lua module level due to worker-level data sharing. For example, the following is bad:

[ngx.location.capture](https://github.com/openresty/lua-nginx-module#ngxlocationcapture)

* Issues a synchronous but still non-blocking Nginx Subrequest using uri
* Subrequests are completely different from HTTP 301/302 redirection (via `ngx.redirect`) and internal redirection (via `ngx.exec`)
* You should always read the request body (by either calling `ngx.req.read_body` or configuring lua_need_request_body on) before initiating a subrequest
* Returns a Lua table with 4 slots: `res.status`, `res.header`, `res.body`, and `res.truncated`
  * `res.status` holds the response status code for the subrequest response.
  * `res.header` holds all the response headers of the subrequest and it is a normal Lua table. For multi-value response headers, the value is a Lua (array) table that holds all the values in the order that they appear. For instance, if the subrequest response headers contain the following lines:
  * `res.body` holds the subrequest's response body data, which might be truncated. You always need to check the res.truncated boolean flag to see if res.body contains truncated data. The data truncation here can only be caused by those unrecoverable errors in your subrequests like the cases that the remote end aborts the connection prematurely in the middle of the response body data stream or a read timeout happens when your subrequest is receiving the response body data from the remote.
    * URI query strings can be concatenated to URI itself, for instance,
```
 res = ngx.location.capture('/foo/bar?a=3&b=4')
```

[ngx.status](https://github.com/openresty/lua-nginx-module#ngxstatus)

* Read and write the current request's response status
* This should be called before sending out the response headers

[ngx.header.HEADER](https://github.com/openresty/lua-nginx-module#ngxheaderheader)

* Set, add to, or clear the current request's HEADER response header that is to be sent.

[ngx.resp.get_headers](https://github.com/openresty/lua-nginx-module#ngxrespget_headers)

* Returns a Lua table holding all the current response headers for the current request

[ngx.req.set_method](https://github.com/openresty/lua-nginx-module#ngxreqset_method)

* Overrides the current request's request method with the method_id arguments
* Currently only numerical method constants are supported, like `ngx.HTTP_POST` and `ngx.HTTP_GET`

[ngxreqset_uri](https://github.com/openresty/lua-nginx-module#ngxreqset_uri)

* Rewrite the current request's (parsed) URI by the uri argument
* The uri argument must be a Lua string and cannot be of zero length, or a Lua exception will be thrown.
* For example, the following Nginx config snippet:
```nginx
 rewrite ^ /foo last;
```
can be coded in Lua like this:
```nginx
ngx.req.set_uri("/foo", true)
```

[ngx.req.set_uri_args](https://github.com/openresty/lua-nginx-module#ngxreqset_uri_args)

* Rewrite the current request's URI query arguments by the args argument

[ngx.req.get_uri_args](https://github.com/openresty/lua-nginx-module#ngxreqget_uri_args)

* Returns a Lua table holding all the current request URL query arguments. An optional tab argument can be used to reuse the table returned by this method.

[ngx.req.get_post_args](https://github.com/openresty/lua-nginx-module#ngxreqget_post_args)

* Returns a Lua table holding all the current request POST query arguments (of the MIME type application/x-www-form-urlencoded). Call ngx.req.read_body to read the request body first or turn on the lua_need_request_body directive to avoid errors.

[ngx.req.get_headers](https://github.com/openresty/lua-nginx-module#ngxreqget_headers)

* Returns a Lua table holding all the current request headers

[ngx.req.set_header](https://github.com/openresty/lua-nginx-module#ngxreqset_header)

* Set the current request's request header named header_name to value header_value, overriding any existing ones.

[ngx.req.clear_header](https://github.com/openresty/lua-nginx-module#ngxreqclear_header)

* Clears the current request's request header named header_name
* None of the current request's existing subrequests will be affected but subsequently initiated subrequests will inherit the change by default.

[ngx.exec](https://github.com/openresty/lua-nginx-module#ngxexec)

* Does an internal redirect to uri with args and is similar to the `echo_exec` directive of the `echo-nginx-module`

[ngx.redirect](https://github.com/openresty/lua-nginx-module#ngxredirect)

* Issue an HTTP 301 or 302 redirection to uri

[ngx.send_headers](https://github.com/openresty/lua-nginx-module#ngxsend_headers)

* Explicitly send out the response headers

[ngx.print](https://github.com/openresty/lua-nginx-module#ngxprint)

* Emits arguments concatenated to the HTTP client (as response body)
* If response headers have not been sent, this function will send headers out first and then output body data

[ngx.say](https://github.com/openresty/lua-nginx-module#ngxsay)

* Just as `ngx.print` but also emit a trailing newline

[ngx.log](https://github.com/openresty/lua-nginx-module#ngxlog)

* Log arguments concatenated to `error.log` with the given logging level

[ngx.exit](https://github.com/openresty/lua-nginx-module#ngxexit)

* When status >= 200 (i.e., `ngx.HTTP_OK` and above), it will interrupt the execution of the current request and return status code to Nginx.

[ngx.sleep](https://github.com/openresty/lua-nginx-module#ngxsleep)

* Sleeps for the specified seconds without blocking. One can specify time resolution up to 0.001 seconds (i.e., one millisecond)

[ngx.re.match](https://github.com/openresty/lua-nginx-module#ngxrematch)

* Matches the subject string using the Perl compatible regular expression regex with the optional options

[ngx.re.find](https://github.com/openresty/lua-nginx-module#ngxrefind)

* Similar to ngx.re.match but only returns the beginning index (from) and end index (to) of the matched substring. The returned indexes are 1-based and can be fed directly into the string.sub API function to obtain the matched substring.

[ngx.re.gmatch](https://github.com/openresty/lua-nginx-module#ngxregmatch)

* Similar to `ngx.re.match`, but returns a Lua iterator instead, so as to let the user programmer iterate all the matches over the <subject> string argument with the PCRE regex.

[ngx.shared.dict](https://github.com/openresty/lua-nginx-module#ngxshareddict)

* Fetching the shm-based Lua dictionary object for the shared memory zone named DICT defined by the lua_shared_dict directive.
* The resulting object dict has the following methods:
  * `get`
  * `get_stale`
  * `set`
  * `safe_set`
  * `add`
  * `safe_add`
  * `replace`
  * `delete`
  * `incr`
  * `lpush`
  * `rpush`
  * `lpop`
  * `rpop`
  * `llen`
  * `ttl`
  * `expire`
  * `flush_all`
  * `flush_expired`
  * `get_keys`
  * `capacity`
  * `free_space`

[ngxxget_phase](https://github.com/openresty/lua-nginx-module#ngxget_phase)

* Retrieves the current running phase name. Possible return values are:

```
init for the context of init_by_lua*.
init_worker for the context of init_worker_by_lua*.
ssl_cert for the context of ssl_certificate_by_lua*.
ssl_session_fetch for the context of ssl_session_fetch_by_lua*.
ssl_session_store for the context of ssl_session_store_by_lua*.
ssl_client_hello for the context of ssl_client_hello_by_lua*.
set for the context of set_by_lua*.
rewrite for the context of rewrite_by_lua*.
balancer for the context of balancer_by_lua*.
access for the context of access_by_lua*.
content for the context of content_by_lua*.
header_filter for the context of header_filter_by_lua*.
body_filter for the context of body_filter_by_lua*.
log for the context of log_by_lua*.
timer for the context of user callback functions for ngx.timer.*.
exit_worker for the context of exit_worker_by_lua*.
```
