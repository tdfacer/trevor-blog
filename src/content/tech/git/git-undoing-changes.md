---
title: "git undoing changes"
date: "2022-06-03"
tags: ["tech", "git"]
category: "git"
---

## Common types of changes that you may need to undo:

* Example: Added some temporary logs, which aren't committed, and now you'd like to remove them
  * `git restore <file(s)>`, OR
  * `git restore test.lua`

### Move tip of your branch to add or remove commits

* Example: Accidentally committed changes while on the wrong branch
  * _make sure to cherry-pick over to the correct branch first, then_
  * `git reset --hard origin/master`

* Example: Accidentally staged changes that were not ready
  * `git reset [file|dir]`
  * `git reset lua/`

### Revert a commit, but keep it in log history

* Example: A bug was introduced in production and now we want to completely revert it
  * `git revert <commit>`
  * `git revert gfa2d3421`
