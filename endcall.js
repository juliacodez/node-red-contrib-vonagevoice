var Nexmo = require("nexmo")
const version = require('./package.json').version
var bodyParser = require('body-parser')


module.exports = function (RED) {
  function endcall(config){
    RED.nodes.createNode(this, config);
    var node = this;
    node.on('input', function (msg) {
          var ncco = {};
          ncco.action="notify";
          ncco.payload = {call : msg.call, app_node_id : msg.app.id}
          ncco.eventMethod = "POST"
          ncco.eventUrl = [msg.app.credentials.baseurl+"/vonageVoice/endcall"]
        msg.ncco.push(ncco);
        msg.res._res.status(200).jsonp(msg.ncco);
    });       
  }
  RED.nodes.registerType("endcall", endcall);

  

  RED.httpNode.use('/vonageVoice/endcall',bodyParser.json());
  RED.httpNode.post('/vonageVoice/endcall', function(req, res){ 
    let appnode = RED.nodes.getNode(req.body.payload.app_node_id)
    const nexmo = new Nexmo({
      apiKey: appnode.credentials.apikey,
      apiSecret: appnode.credentials.apisecret,
      applicationId: appnode.credentials.appid,
      privateKey:appnode.credentials.privatekey
      }, {debug: false, appendToUserAgent: "nexmo-nodered/"+version}
    );
    nexmo.calls.update(req.body.payload.call.uuid, { action: 'hangup' }, (err, response) => {
      if(err) { 
          console.error(err); 
      }
      res.status(200).jsonp([]);
    })
  })
}
