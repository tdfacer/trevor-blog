---
title: "MongoDB Atlas API"
date: "2022-06-20"
tags: ["tech", "mongodb", "atlas", "api"]
category: "misc"
---

## Authentication

MongoDB Atlas uses digest auth for their REST Admin API. See the following `cURL` example:

### List MongoDB Atlas Network Containers

```bash
#!/usr/bin/env bash

ATLAS_PROJECT_ID=$1

curl \
  -u "<public_key>:<private_key>" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/${ATLAS_PROJECT_ID}/containers" | jq .
```
