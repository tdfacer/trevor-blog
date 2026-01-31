---
title: "Nginx Location Contexts"
date: "2022-05-21"
tags: ["tech", "nginx"]
category: "misc"
---

## Location Pattern Matching

See official docs [here](https://nginx.org/en/docs/http/ngx_http_core_module.html#location).

* `location =`

```nginx
location = /something {
  # matches the URI exactly
  # search stops after this is matched
}
```

* `location /`

```nginx
location / {
  # matches everything
  # continues checking other regex location contexts
}
```

* `location /something`

```nginx
location /something {
  # matches everything prefixed with /something
  # continues checking other regex location contexts
}
```

* `location ^~ /something`

```nginx
location ^~ /something {
  # matches everything prefixed with /something
  # stops search, so regex location contexts will not be checked
}
```

* `location ~* \.(gif|jpg|jpeg)$`

```nginx
location ~* \.(gif|jpg|jpeg)$ {
  # case-insensitive regex matching
  # matches anything ending in .gif, .jpg, or .jpeg
}
```

* `location ~ \.(gif|jpg|jpeg)$`

```nginx
location ~ \.(gif|jpg|jpeg)$ {
  # case-sensitive regex matching
  # matches anything ending in .GIF, .JpG, .jpeg, etc.
  # /images/something.GIF would match
  # /something/image.GIF would not, it would be picked up by `^~ /something`
}
```

## Regex

Note that the order of the regex location contexts is important. For example, consider the following:

### from

```nginx
server {
    listen       80;
    server_name  localhost;

    location ~* \.(gif|jpg|jpeg)$ {
      return 200 "hello from ~* .(gif|jpg|jpeg)";
    }

    location ~ \.(gif|jpg|jpeg)$ {
      return 200 "hello from ~ .(gif|jpg|jpeg)";
    }
}
```

#### results

```bash
curl localhost/arbitrary/image.gif
> hello from ~* .(gif|jpg|jpeg)

curl localhost/arbitrary/image.GIF
> hello from ~* .(gif|jpg|jpeg)
````

### to

```nginx
server {
    listen       80;
    server_name  localhost;

    location ~ \.(gif|jpg|jpeg)$ {
      return 200 "hello from ~ .(gif|jpg|jpeg)";
    }

    location ~* \.(gif|jpg|jpeg)$ {
      return 200 "hello from ~* .(gif|jpg|jpeg)";
    }
}
```

#### results

```bash
curl localhost/arbitrary/image.gif
> hello from ~ .(gif|jpg|jpeg)

curl localhost/arbitrary/image.GIF 
> hello from ~* .(gif|jpg|jpeg)
````

* We can see that in the _first_ example, where we had the `case-insensitive` matching first, both requests were evaluated by the case-insensitive match, regardless of the casing.
* We can see that in the _second_ example, where we had the `case-sensitive` matching first, the request that did not match case was not evaluated by the case-sensitive match, falling through to the case-insensitive match.

## Docker Example

* See demo Docker container [here](/tech/nginx-docker).
* The following test cases were evaluated using an nginx container built with the `default.conf` from the example.

### Test Cases

Create docker container using `start.sh` script from above in `Docker Example`

| Method    | URL    | Result    |
|---------------- | --------------- | --------------- |
| GET    | localhost    | hello from = /    |
| GET    | localhost/   | hello from = /    |
| GET    | localhost/something    | hello from = /something    |
| GET   | localhost/something/else   | hello from ^~ /something   |
| GET   | localhost/images   | hello from ^~ /images   |
| GET   | localhost/images/   | hello from ^~ /images   |
| GET   | localhost/images/arbitrary   | hello from ^~ /images   |
| GET   | localhost/arbitrary   | hello from /   |
| GET   | localhost/images/image.gif   | hello from ^~ /images   |
| GET   | localhost/arbitrary/image.gif   | hello from ~* .(gif\|jpg\|jpeg)   |
| GET   | localhost/arbitrary/image.GiF   | hello from ~* .(gif\|jpg\|jpeg)   |
| GET   | localhost/arbitrary/image.JPEG   | hello from ~* .(gif\|jpg\|jpeg)   |
