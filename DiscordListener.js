const Discord=require('discord.js');
const bot=new Discord.Client();
const ontime = require('ontime');
const mysql = require('mysql');
const config = require('./config.json');

var sqlConnection = mysql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database,
    supportBigNumbers: true
    
});

var approvedUsers = {};


bot.login(config.token);

bot.on('ready', () => {

    SQLConnect().then(result => {
        sqlConnection.query("UPDATE users SET access_level=0", function(err, result) {
            if(err)
            {            
                console.log(err.stack);
                if(err.code==="PROTOCOL_CONNECTION_LOST")
                {
                    SQLConnect();
                }
            }
            console.log("SQL Query successful");
            CheckAllGuilds();
            UpdateAllUsers();  
        });             
    });
});


function CheckAllGuilds()
{
    for(var guild in config.guilds)
    {
        console.log("Checking guild ID "+guild+" for valid members");
        for(var role in config.guilds[guild])
        {
            console.log("Looking for users with role ID "+role);          
            
            let currentRole = bot.guilds.get(guild).roles.get(role);
            
            currentRole.members.forEach(function(member) {
                if(!approvedUsers[member.user.id])
                {
                    approvedUsers[member.user.id] = {};
                    approvedUsers[member.user.id].roles = {};
                    approvedUsers[member.user.id].roles[role] = config.guilds[guild][role];
                    approvedUsers[member.user.id].name = member.user.tag;
                    console.log("User ID "+member.user.id+" approved at level "+config.guilds[guild][role]);                    
                }
                else
                {
                    approvedUsers[member.user.id].roles[role] = config.guilds[guild][role];
                    console.log("User ID "+member.user.id+" approved at level "+config.guilds[guild][role]);                    
                }
            });
        }
    }
}

function UpdateAllUsers()
{

    for(var user in approvedUsers)
    {
        UpdateUser(user);
    }
}

function UpdateUser(user)
{
    if(!approvedUsers[user]) { return; }
    let userLevel = 0;
    for(var role in approvedUsers[user].roles)
    {
        if(approvedUsers[user].roles[role] > userLevel)
        {
            userLevel = approvedUsers[user].roles[role];
        }
    }
    ApproveUser(user, userLevel, approvedUsers[user].name);   
}

function ApproveUser(userID, accessLevel, name)
{    
    let now = new Date().getTime();

    // REPLACE NON ASCII CHARACTERS
    name = name.replace(/[^\x00-\x7F]/g, "");
    
    var sqlStatement = "INSERT INTO users (id,user,access_level,expire_timestamp,login_system) VALUES ("+userID+",'"+name+"',"+accessLevel+",1,'discord') ON DUPLICATE KEY UPDATE user=VALUES(user),access_level=VALUES(access_level),login_system=VALUES(login_system);";
    console.log(sqlStatement);
    sqlConnection.query(sqlStatement, function(err, result) {
        if(err)
        {            
            console.log(err.stack);
            if(err.code==="PROTOCOL_CONNECTION_LOST")
            {
                SQLConnect();
            }
        }
        console.log("SQL Query successful");
    });
}

function UpdateMember(member)
{
    
    let guild = member.guild.id;

    if(!config.guilds[guild]) { return; }

    for(var role in config.guilds[guild])
    {  
        if(member.roles.get(role))
        {
            if(!approvedUsers[member.user.id])
            {
                approvedUsers[member.user.id] = {};
                approvedUsers[member.user.id].roles = {};
                approvedUsers[member.user.id].roles[role] = config.guilds[guild][role];
                approvedUsers[member.user.id].name = member.user.tag;
                console.log("User ID "+member.user.id+" added at level "+config.guilds[guild][role]);                    
            }
            else
            {
                if(!approvedUsers[member.user.id].roles[role])
                {
                    approvedUsers[member.user.id].roles[role] = config.guilds[guild][role];
                    console.log("User ID "+member.user.id+" added at level "+config.guilds[guild][role]);                    
                }
            }
        }
        else
        {
            if(approvedUsers[member.user.id] && approvedUsers[member.user.id].roles[role])
            {
                delete approvedUsers[member.user.id].roles[role];
                console.log("User ID "+member.user.id+" lost role "+role);
            }
        }
    }

    UpdateUser(member.user.id);
}

function SQLConnect()
{
    return new Promise(function(resolve) {
        sqlConnection.connect(function(err) {
            if(err)
            {
                throw err;
                process.exit(1);
            }
            console.log("Connected to SQL!");
            resolve(true);
        });
    });
}

bot.on('guildMemberRemove', member => {
    let guild = member.guild.id;

    if(!config.guilds[guild]) { return; }
    if(!approvedUsers[member.user.id]) { return; }

    for(var role in config.guilds[guild])
    {
        if(approvedUsers[member.user.id].roles[role])
        {
            delete approvedUsers[member.user.id].roles[role];
            console.log("User ID "+member.user.id+" lost role "+role+" due to no longer being in the server");
        }
    }

    UpdateUser(member.user.id);

});

bot.on('guildMemberUpdate', (oldMember, newMember) => {
    UpdateMember(newMember)
});

// CHECK ALL USERS ONCE AN HOUR JUST IN CASE
ontime({
    cycle: ['00:00']
}, function (ot) {
    sqlConnection.query("UPDATE users SET access_level=0", function(err, result) {
        if(err)
        {            
            console.log(err.stack);
            if(err.code==="PROTOCOL_CONNECTION_LOST")
            {
                SQLConnect();
            }
        }
        console.log("SQL Query successful");
        CheckAllGuilds();
        UpdateAllUsers();  
    });  
    ot.done();
    return;
});