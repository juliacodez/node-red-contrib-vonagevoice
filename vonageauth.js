const Nexmo = require('nexmo');
const version = require('./package.json').version
const request = require('request');


module.exports = function(RED) {
  function vonagevoiceapp(n){
   RED.nodes.createNode(this, n);
   var node = this
   this.utype = n.utype
   this.appid = n.appid;
   this.name = n.name
   if (this.utype == 'dynamic'){
    try {
      var r = request('http://127.0.0.1:4040/api/tunnels', function (error, response, body) {
        if (error){
          node.baseurl = process.env.EXTERNALURL || "http://example.com"
          updateApp(node.appid, node.name, node.baseurl, node.credentials.apikey, node.credentials.apisecret)
        } else {
          if (response.statusCode == 200){
            var data = JSON.parse(body)
            node.baseurl= data.tunnels[1].public_url
            updateApp(node.appid, node.name, node.baseurl, node.credentials.apikey, node.credentials.apisecret)          
          } else {
            node.baseurl = process.env.EXTERNALURL || "http://example.com"
            updateApp(node.appid, node.name, node.baseurl, node.credentials.apikey, node.credentials.apisecret)    
          }      
        }
      });
    } catch (err) {
      node.baseurl = process.env.EXTERNALURL || "http://example.com"
      updateApp(node.appid, node.name, node.baseurl, node.credentials.apikey, node.credentials.apisecret)    
    }
   } else {
    node.baseurl = n.baseurl;
    updateApp(node.appid, node.name, node.baseurl, node.credentials.apikey, node.credentials.apisecret)   
   }
  }

  function updateApp(appid, name, baseurl, apikey, apisecret){
    const nexmo = new Nexmo({apiKey: apikey, apiSecret: apisecret}, {debug: false, appendToUserAgent: "nexmo-nodered/"+version});
    const data = {
      name: name,
      capabilities: {
        voice: {
        webhooks: {
          answer_url: {
            address: baseurl + '/vonageVoice/answer',
            http_method: "GET"
          },
          event_url: {
            address: baseurl + '/vonageVoice/event',
            http_method: "POST"
          }
        } 
        }
      }
    };
    nexmo.app.update(appid, data, function(error, response){
      if (error) {console.error(error)}
    });
  }


  RED.nodes.registerType("vonagevoiceapp",vonagevoiceapp,{
    credentials: {
      apikey: {type:"text"},
      apisecret: {type:"text"},
      privatekey: {type:"text"}
   }
  });

  RED.httpAdmin.post('/vonageVoice/new-voice-app', RED.auth.needsPermission('nexmo.write'), function(req,res){
    const nexmo = new Nexmo({
      apiKey: req.body.api_key,
      apiSecret: req.body.api_secret
    }, {debug: false, appendToUserAgent: "nexmo-nodered/"+version}
    );
    const options = {};
    var answer_url = req.body.base_url + '/vonageVoice/answer'
    var event_url = req.body.base_url + '/vonageVoice/event'
    nexmo.app.create(req.body.name, 'voice', answer_url, event_url, options, function(error, response){
      res.send(response);
    });
  });   

  RED.httpAdmin.post('/vonageVoice/update-voice-app/:appid', RED.auth.needsPermission('nexmo.write'), function(req,res){
    const nexmo = new Nexmo({
      apiKey: req.body.api_key,
      apiSecret: req.body.api_secret
    }, {debug: false, appendToUserAgent: "nexmo-nodered/"+version}
    );
    const data = {
      name: req.body.name,
      capabilities: {
        voice: {
        webhooks: {
          answer_url: {
            address: req.body.base_url + '/vonageVoice/answer',
            http_method: "GET"
          },
          event_url: {
            address: req.body.base_url + '/vonageVoice/event',
            http_method: "POST"
          }
        }
        }
      }
    };
    nexmo.app.update(req.params.appid, data, function(error, response){
      res.send(response);
    });
  });   
}  
  
 