<h3 align="center">Wooffer - Monitoring System</h3>

<p align="center">
  Backend-end library for integrate Wooffer into your NodeJS Code.
</p>

## Table of contents

- [Installation](#Installation)
- [How to use Form](#How-to-use-Form)

## Installation

```bash
npm i wooffer
```

or

```bash
yarn add wooffer
```

## How to use Wooffer

Add Below Code into your Root file Like App.js or Index.js

## Example Code

```javascript
const monitoring = require("wooffer");
monitoring(process.env.token, process.env.serviceToken);
```

Add Below Code into your .env File

```javascript
token = "<Your Token>";
serviceToken = "<Your Service Token>";
```

<p>
  Note: If you don't have token and serviceToken then go on <a href="https://app.wooffer.io"> https://app.wooffer.io</a> and generate  
</p>
