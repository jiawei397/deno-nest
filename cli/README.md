# deno_nest cli

[![deno version](https://img.shields.io/badge/deno-^2.0.0-blue?logo=deno)](https://github.com/denoland/deno)
[![Deno](https://github.com/jiawei397/deno-nest/actions/workflows/deno.yml/badge.svg)](https://github.com/jiawei397/deno-nest/actions/workflows/deno.yml)
[![codecov](https://codecov.io/github/jiawei397/deno-nest/graph/badge.svg?token=NKP41TU4SL)](https://codecov.io/github/jiawei397/deno-nest)

## Usage & Guide

Install the cli globally:

```bash
deno install -g --allow-env --allow-run --allow-net --allow-read --allow-write -n nest  -f  jsr:@nest/cli
```

Then you can use the `nests` command to create a new project:

```bash
nests
```

Or create by the following command:

```bash
deno run --allow-env --allow-run --allow-net --allow-read --allow-write jsr:@nest/cli
```
