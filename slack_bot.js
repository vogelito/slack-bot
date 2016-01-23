var Slack = require('slack-client')
var yaml = require('js-yaml');
var fs   = require('fs');

var config = yaml.safeLoad(fs.readFileSync('keys.yml', 'utf8'));

var slackToken = config.slack_bot_api_key;
var autoReconnect = true;
var autoMark = true;

var slack = new Slack(slackToken, autoReconnect, autoMark);

var makeMention = function(userId) {
    return '<@' + userId + '>';
};

var isDirect = function(userId, messageText) {
    var userTag = makeMention(userId);
    return messageText &&
           messageText.length >= userTag.length &&
           messageText.substr(0, userTag.length) === userTag;
};

var getOnlineHumansForChannel = function(channel) {
    if (!channel) return [];

    return (channel.members || [])
        .map(function(id) { return slack.users[id]; })
        .filter(function(u) { return !!u && !u.is_bot });
};

slack.on('open', function () {
    var channels = Object.keys(slack.channels)
        .map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member; })
        .map(function (c) { return c.name; });

    var groups = Object.keys(slack.groups)
        .map(function (k) { return slack.groups[k]; })
        .filter(function (g) { return g.is_open && !g.is_archived; })
        .map(function (g) { return g.name; });

    console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);

    if (channels.length > 0) {
        console.log('You are in: ' + channels.join(', '));
    }
    else {
        console.log('You are not in any channels.');
    }

    if (groups.length > 0) {
       console.log('As well as: ' + groups.join(', '));
    }
});

slack.on('message', function(message) {
  var channel = slack.getChannelGroupOrDMByID(message.channel);
  var user = slack.getUserByID(message.user);

  if (message.type === 'message' && isDirect(slack.self.id, message.text)) {
    if(message.text.indexOf("users") > 0) {
      var onlineUsers = getOnlineHumansForChannel(channel)
          .map(function(u) { return makeMention(u.id); });
      channel.send("These people are in this channel: " + '\r\n' + onlineUsers.join('\r\n'));
    }

    if(message.text.indexOf("active") > 0) {
      var onlineUsers = getOnlineHumansForChannel(channel)
          .filter(function(u) { return u.presence === 'active'; })
          .map(function(u) { return makeMention(u.id); });
      channel.send("These people are active in this channel: " + '\r\n' + onlineUsers.join('\r\n'));
    }

    if(message.text.indexOf("emails") > 0) {
      var onlineUsers = getOnlineHumansForChannel(channel)
          .map(function(u) { return makeMention(u.id) + " (" + u.profile.first_name + " " + u.profile.last_name + "):  \t\t\t" + u.profile.email });
      channel.send("Here are everyones emails: " + '\r\n' + onlineUsers.join('\r\n'));
    }

  }
});

slack.login();
