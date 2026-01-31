---
title: "Nginx Docker"
date: "2022-05-21"
tags: ["tech", "nginx"]
category: "devops"
---

## Files

### Dockerfile

```Dockerfile
FROM nginx

COPY default.conf /etc/nginx/conf.d/default.conf
```

### default.conf

```nginx
server {
    listen       80;
    server_name  localhost;

    location / {
      return 200 "hello from /";
    }

    location = / {
      return 200 "hello from = /";
    }

    # NOTE: conflicts with regex something blocks, so
    #       could not have both this block and `^~ /something`
    # location /something {
    #   return 200 "hello from /something";
    # }

    location = /something {
      return 200 "hello from = /something";
    }

    location ^~ /images {
      return 200 "hello from ^~ /images";
    }

    location ^~ /something {
      return 200 "hello from ^~ /something";
    }

    location ~* \.(gif|jpg|jpeg)$ {
      return 200 "hello from ~* .(gif|jpg|jpeg)";
    }

    location ~ \.(gif|jpg|jpeg)$ {
      return 200 "hello from ~ .(gif|jpg|jpeg)";
    }
}
```

### Start Script

```bash
#!/usr/bin/env bash

docker build -t nginx-throwaway .
docker run --rm -it --name nginx-throwaway -p 80:80 nginx-throwaway
```
