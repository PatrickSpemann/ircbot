An IRC Bot for playing around

## Features
* Resolves links to websites, posting relevant information to the channel
* For a list of user commands, see [docs](docs/)

## Run
```
npm install
node index.js
```
## Settings file
You have to supply a settings file called `settings.json` in the same directory as index.js  
This file must contain all the properties and data types as this example:

```javascript
//settings.json
{
    "networkUrl": "irc.quakenet.org",
    "nickname": "MyBot",
    "channels": [
        "#myChannel"
    ],
    "adminHosts": [
        "botAdmin.users.quakenet.org"
    ],
    "twitchClientID": "0123456789abcdefghijABCDEFGHIJ",
    "twitchClientSecret": "abcdefghijABCDEFGHIJ0123456789",
    "port": 80,
    "statsResponse": "https://mywebsite.com/stats.json",
    "quotesResponse": "https://mywebsite.com/quotes.json"
}
```
`port` is optional and will default to 80 if not present
`statsResponse` is optional and, if present, will be sent to the channel when a user types `!stats`  
`quotesResponse` is optional and, if present, will be sent to the channel when a user types `!quotes`

## Notes
* Port 80 needs to be open and forwarded for the Twitch API to work.

## TODOs
* Fix async (members)
* prevent spam by adding cache of last sent messages