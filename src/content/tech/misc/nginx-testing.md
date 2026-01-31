---
title: "Nginx Testing"
date: "2022-05-21"
tags: ["tech", "nginx", "testing"]
category: "misc"
---

## Testing Framework

<link to openresty perl testing framework here>

## Examples

### proxy_pass to another location context

```
location = /t {
  proxy_pass http://127.0.0.1:$server_port/r;
}

location /r {
 return 200 "inside r";
}
```
