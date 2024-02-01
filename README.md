<h3 align="center">Wooffer - Monitoring System</h3>

<p align="center">
  Backend-end library for integrate Wooffer into your NodeJS Code.
</p>

## Table of contents

- [Installation](#installation)
- [How to use Wooffer](#how-to-use-wooffer) 
- [Monitor Real-time request analytics](#monitor-real-time-request-analytics)
- [Create custom log](#create-custom-log)
- [How to track third-party APIs](#create-third-party-api-call)

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
const wooffer = require("wooffer");
wooffer(process.env.token, process.env.serviceToken);
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
const express = require("express");
const app = express();
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


## Create third party API Call

Integrating Wooffer for third-party API calls is straightforward. Just use wooffer.axios instead of axios. Here's a simple example.

```javascript
const wooffer = require("wooffer");

const config = {
  method: "post",
  maxBodyLength: Infinity,
  url: "https://countriesnow.space/api/v0.1/countries/population/cities",
  headers: {
    "Content-Type": "application/json",
  },
  data: {
    city: "lagos",
  },
};

const response = await wooffer.axios.request(config);
```

Or

```javascript
const wooffer = require("wooffer");

const response = await wooffer.axios.post(
  `https://countriesnow.space/api/v0.1/countries/population/cities`,
  {
    city: "lagos",
  }
);
```

