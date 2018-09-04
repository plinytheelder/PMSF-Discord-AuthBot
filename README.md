# PMSF ALT Discord AuthBot

Great thanks to Chuckleslove for writing this bot.

This piece of work is only intended to work with https://github.com/whitewillem/PMSF

## Getting Started

```
npm install discord.js
npm install ontime
npm install mysql
ALTER TABLE users ADD access_level TINYINT(1);
The script will 1) set all access_level to 0
2) check all guilds/roles in the config file and set users to that value on startup, also performs this check once an hour just in case it missed something
3) Monitor guild members for adding or losing roles and updating as needed
4) monitor for guild leave/kick/ban and adjust access_level as needed



¯\_(ツ)_/¯
```
