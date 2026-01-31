---
title: "python-pandas"
date: "2023-03-02"
tags: []
category: "misc"
---

## DataFrames

### Filters

Filters are of type `Series` and can be used to tell `pandas` which rows to include in your DataFrame, e.g.

```
filt = df["time_start"].str.contains("2023-02-01")
type(filt)
> pandas.core.series.Series
```

Filters can be used to filter your DataFrame for a subset of rows. It is simple to see how filters will be applied to your DataFrame when printing them out to the console:

```
print(filt)
> 0     False
> 1     False
> 2     False
> 3      True
> 4     False
> 5     False
```

Each boolean value tells the DataFrame whether or not the row should be include included. In the example above, using the `filt` filter, only the row with index `3` would be included.

Pass the filter to your DataFrame as follows:

```
df[filt]
>    time_start    time_end
> 3  2023-02-01  2023-02-02
```

## Functions and Methods

* `isna()`

On a dataframe, we can use the `isna()` function to get values that are N/A
Helpfult to use `df.isna().sum()` to get a count of N/A values on a given Dataframe
