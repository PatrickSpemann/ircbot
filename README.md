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
    "httpsCertificatePath": "C:/myPath/mockcert.cert",
	"httpsKeyPath": "C:/myPath/mockcert.key",
    "callbackBaseUrl": "http://hostname.com",
    "statsResponse": "https://mywebsite.com/stats.json",
    "quotesResponse": "https://mywebsite.com/quotes.json"
}
```
`callbackBaseUrl` is optional, it is used in place of the public IP of the machine for use by the Twitch API
`statsResponse` is optional and, if present, will be sent to the channel when a user types `!stats`  
`quotesResponse` is optional and, if present, will be sent to the channel when a user types `!quotes`
`httpsCertificatePath` and `httpsKeyPath` should provide valid links to the server's https certificate files (without them twitch integration will not work).


## TODOs
* Fix async (members)
* prevent spam by adding cache of last sent messages