An IRC Bot for playing around

## Run
```
npm install
node index.js
```
## Settings file
You have to supply a settings file called ```settings.json``` in the same directory as index.js  
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
    ]
}
```
## Features
* Resolves links to websites, posting relevant information to the channel
* For a list of user commands type ```!help``` in a channel where the bot is present

## Remote Control
You may remote control the bot to some extent by sending it private messages (queries).  
Your host must be listed under ```adminHosts``` in the ```settings.json```.
### Supported Admin Commands
* ```!join <channel>```: Joins the supplied ```channel```. Example usage: ```!join #otherChannel```
* ```!part <channel>```: Leaves the supplied ```channel```. Example usage: ```!part #otherChannel```
* ```!nick <nickname>```: Changes the nickname to the supplied ```nickname```. Example usage: ```!nick MyBot2```
* ```!say <target> <message>```: Sends the supplied ```message``` to the supplied ```target```. Example usage: 
```
!say #myChannel Hello World!
!say username Hello friend!
```

## TODOs
* get own youtube api key