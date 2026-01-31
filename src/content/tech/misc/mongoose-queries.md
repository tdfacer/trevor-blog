---
title: "mongoose queries"
date: "2022-05-05"
tags: ["tech", "mongoose"]
category: "misc"
---

## Gotchas

* Queries are _not_ promises, but have a `.then()` function to support `async/await`
* Queries are executed each time a callback is passed in _or_ `.then()` is called

## Cursors

* `.cursor()` - returns a wrapper around a MongoDB cursor. It exposes a stream interface and a `.next()` function
* The .cursor() function triggers pre find hooks, but not post find hooks.
* Example iterating through all result docs using a cursor:
```
const cursor = Thing.find({ name: /^hello/ }).cursor();
for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
  console.log(doc);
}
```

## populate

Specifies paths which should be populated with other documents.
