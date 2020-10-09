const Nexmo = require('nexmo');
const version = require('./package.json').version


module.exports = function(RED) {
  function vonagevoiceapp(n){
   RED.nodes.createNode(this, n);
   this.apikey = n.apikey;
   this.apisecret = n.apisecret;
   this.name = n.name;
   this.baseurl = n.baserurl; // TODO Consider moving to env var
   this.appid = n.appid;
   this.privatekey = n.privatekey;
 }

  RED.nodes.registerType("vonagevoiceapp",vonagevoiceapp,{
    credentials: {
      apikey: {type:"text"},
      apisecret: {type:"text"},
      privatekey: {type:"text"},
      appid: {type:"text"},
      baseurl: {type:"text"}
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
  
 