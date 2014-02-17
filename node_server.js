var http = require("http");
var querystring = require('querystring');
var fs = require('fs')

var mailObject = {"sender": { "service": "Gmail", "email" : "<email>", "password" : "<pass>", "from" : "Username <someone@gmail.com>" }, "to" : "<email>" };
var pullRequestRefObject = { "branchesToWatch" : ["some_branch", "some_other_branch"], "actions" : ["reopened", "opened", "closed"] };
var port = 8888;
 
http.createServer(function(request, response) {
  if (request.method == 'POST') {
      var body = ''
      request.on('data', function(data) {
	  logMessage('POST request');
	  body += data;
      });
      request.on('end', function() {
	  response.writeHead(200, {'Content-Type': 'text/json'});
	  var decodedBody = querystring.parse(body);
	  logMessage('Payload received and decoded');
	  payloadToJson(decodedBody, mailBody);
	  response.end('post received');
      });	  
  }
  else
  {
      response.writeHead(200, {"Content-Type": "text/html"});
      response.write("<h3>Hello World!</h3>");
      response.end();
  }
}).listen(port);

function payloadToJson(decodedBody, callback) {
    var dataJson = JSON.parse(decodedBody.payload);
    if (pullRequestRefObject.actions.contains(dataJson.action) && pullRequestRefObject.branchesToWatch.contains(dataJson.pull_request.head.ref)) {
	    logMessage('Valid pull request');
	    callback(dataJson);
    }else {
	    logMessage('Nothing to do with current payload')
    }
}

var mailBody = function(dataJson) {
    var url = dataJson.pull_request.html_url;
    var pullRequestNumber = dataJson.number;
    var branch = dataJson.pull_request.head.ref;
    logMessage('Pull request number: ' + pullRequestNumber);
    var mergeCommit = dataJson.pull_request.merge_commit_sha;
    var marked = require('marked');
    var htmlDescription = marked(dataJson.pull_request.body);
    var htmlBody = '<h3>Url: </h3>'+url+'<br><br>'
	           +'<h3>Merge Commit: </h3>'+mergeCommit+'<br><br>'
                   + htmlDescription;
    logMessage('Payload parsed into html');
    mailer(branch, pullRequestNumber, htmlBody);   
};

function mailer(branch, pullRequestNumber, htmlString) {
    var nodemailer = require("nodemailer");
    var smtpTransport = nodemailer.createTransport("SMTP",{
	service: mailObject.sender.service,
	auth: {
            user: mailObject.sender.email,
            pass: mailObject.sender.password
	}
    });
    var mailOptions = {
	from: mailObject.sender.from,
	to: mailObject.to, 
	replyTo: mailObject.to,    
	subject: "Pull request from "+ branch +" # " + pullRequestNumber, 
	html: htmlString 
    }
    smtpTransport.sendMail(mailOptions, function(error, response){
	if(error){
            logMessage('Error in sending mail: '+ error);
	}else{
	    logMessage("Message sent: " + response.message);
	}
    smtpTransport.close();
    });
}

function logMessage(message){
    var log = new Date() + ' : ' + message;
    console.log(log);   	
} 

Array.prototype.contains = function(val) {
    return this.indexOf(val) > -1;
}

