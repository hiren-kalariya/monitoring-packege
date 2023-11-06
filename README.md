<h3 align="center">Wooffer - Monitoring System</h3>

<p align="center">
  Backend-end library for integrate Wooffer into your NodeJS Code.
</p>

## Table of contents

- [Installation](#Installation)
- [How to use Form](#How-to-use-Form)
- [Create custom log](#Create-custom-log)

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

## Monitor Real-time request analytics

To monitor real-time request usage, add the code into the root files such as app.js or index.js. Just below, create the 'app' variable and make the necessary modifications.

```javascript
app.use(wooffer.requestMonitoring);
```


## Create custom log

To create Create Custom Alert Message

```javascript
const wooffer = require("wooffer");

wooffer.alert("EventName: Login \nUsername:Jhon Due");
```

To create Create Custom Success Message

```javascript
const wooffer = require("wooffer");

wooffer.success("EventName: Login \nUsername:Jhon Due");
```

To create Create Custom Fail Message

```javascript
const wooffer = require("wooffer");

wooffer.fail("EventName: Login \nUsername:Jhon Due");
```



