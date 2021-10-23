# Dotenv CLI Manager

A CLI-based UI for managing your environment variables. 

[![Version](https://img.shields.io/npm/v/dotenv-cli-manager.svg)](https://npmjs.org/package/dotenv-cli-manager)
[![License](https://img.shields.io/npm/l/dotenv-cli-manager.svg)](https://github.com/francescov1/dotenv-cli-manager/blob/master/package.json)
<!-- [![npm](https://img.shields.io/npm/dt/dotenv-cli-manager)](https://www.npmjs.com/package/dotenv-cli-manager) -->

## Overview

This generates a `.env.{environment}` file for each environment and lets you manage them all in one place. 

https://user-images.githubusercontent.com/26126685/122695071-6375bb80-d20d-11eb-8a87-5994c8146273.mov

_This project started as a fork of [inquirer-table-prompt](https://github.com/eduardoboucas/inquirer-table-prompt)_

## Install

You can install this tool locally or globally

```bash
# local
npm install -D dotenv-cli-manager

# globl
npm install -g dotenv-cli-manager
```
## Usage

> ⚠ Warning ⚠️ Still in development. Not recommended for production use. See [In Development](#in-development).

Create an env file for each environment and name it `.env.{environment}`:

```bash
touch .env.local .env.development .env.staging .env.production
```

Fill in your variables into each file. The `examples` folder has some .env files you can start with if you dont have any.

> Projects are expected to use the same variable names across envs. If a varable shows up in any one of the env files, it will be given an empty value in all others. This is to enforce consistency and reduce the risk of missing variables in certain envs.

Run <b>Dotenv CLI Manager</b>

```bash
npx dcm
```

## In Development

This project is in the early stages of development.

### Roadmap

- user-provided config for env file paths
- convert to TS
- edit files in real time, dont require a final "save" (let user chose between this mode and normal mode)
- extend available file formats
- a walk-through project setup
- remote file editing
- encrypted file editing

### Known bugs

- after editing a value, the table is re-rendered below, rather than rendering in place
- after editing a value, the value's preview length will show its previous length until show/hide is toggled