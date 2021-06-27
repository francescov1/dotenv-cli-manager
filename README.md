# Dotenv CLI Manager

## Overview

A CLI-based UI for managing your environment variables. 

This generates a `.env.{environment}` file for each environment and lets you manage them all in one place. 

https://user-images.githubusercontent.com/26126685/122695071-6375bb80-d20d-11eb-8a87-5994c8146273.mov

## Install

You can install this tool locally or globally

```bash
# local
npm install -D dotenv-cli-manager

# globl
npm install -g dotenv-cli-manager
```
## Usage

Create an env file for each environment and name it `.env.{environment}`:

```bash
touch .env.local .env.development .env.staging .env.production
```

Fill in your variables into each file. 

> Projects are expected to use the same variable names across envs. If a varable shows up in any one of the env files, it will be given an empty value in all others. This is to enforce consistency and reduce the risk of missing variables in certain envs.

Run <b>Dotenv CLI Manager</b>

```bash
npx dcm
```

## In Development

This project is in the early stages of development. Here's a few things in the roadmap:
- edit .env files in place to preserve comments and formatting
- edit in real time (let user chose this mode or normal mode)
- user-provided config for env file paths
- convert to TS
- extend available file formats
- walk-through project setup
- remote file editing

# Known bugs

- after editing a value, the table is re-rendered below, rather than rendering in place
- after editing a value, the value's preview length will show its previous length until show/hide is toggled