
const version = require('./package.json').version
const incommingCallNodes = {}

module.exports = function(RED) {
    "use strict";
    var Nexmo = require("nexmo");

    function IncommingCall(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.creds = RED.nodes.getNode(n.creds);
        this.number = n.number;
        this.apikey = this.creds.credentials.apikey
        this.apisecret = this.creds.credentials.apisecret
        this.appid = this.creds.appid
        incommingCallNodes[this.number] = node.id
        //Link Number to App
        const nexmo = new Nexmo({
            apiKey: this.apikey,
            apiSecret: this.apisecret
          }, {debug: false, appendToUserAgent: "nexmo-nodered/"+version});
        nexmo.number.get({pattern: this.number, search_pattern: 0 }, (error, result) => {
            if(error) {
              console.error(JSON.stringify(error))
              node.error(err)
              node.status({fill:"red",shape:"ring",text:"Linking Unknown"});
            }
            else {
              if (result.numbers[0].voiceCallbackValue != this.appid){
                let data = {}
                data.voiceCallbackValue = this.appid
                data.voiceCallbackType = 'app' 
                data.moHttpUrl = result.numbers[0].moHttpUrl
                nexmo.number.update(result.numbers[0].country, result.numbers[0].msisdn, data, (err, res) => {
                    if (err) {
                      console.error(JSON.stringify(err))
                      node.error(err)
                      node.status({fill:"red",shape:"dot",text:"Linking Error"});
                    }
                    else {
                      node.status({fill:"green",shape:"dot",text:"Linked"});
                      setTimeout(function(){node.status({})}, 10000);
                    }
                })
              } else {
                node.status({fill:"green",shape:"ring",text:"Linked"});
                setTimeout(function(){node.status({})}, 10000);
              }
            }
        });

        this.on("close", function() {
            delete incommingCallNodes[this.number]
        });
    }

    RED.nodes.registerType("IncommingCall",IncommingCall);




// Handler for call webhooks to dispatch to node
RED.httpNode.get('/vonageVoice/answer', function(req, res){ 
    let node = RED.nodes.getNode(incommingCallNodes[req.query.to])
    var msg = {}
    msg.app = node.creds
    msg.payload = req.query
    msg.call = req.query
    msg.call.lvn = req.query.to
    msg.req = req
    msg.res = createResponseWrapper(res)
    msg.ncco = []
    node.send(msg)
})
function createResponseWrapper(res) {
    var wrapper = {
        _res: res
    };
    var toWrap = [
        "append",
        "attachment",
        "cookie",
        "clearCookie",
        "download",
        "end",
        "format",
        "get",
        "json",
        "jsonp",
        "links",
        "location",
        "redirect",
        "render",
        "send",
        "sendfile",
        "sendFile",
        "sendStatus",
        "set",
        "status",
        "type",
        "vary"
    ];
    toWrap.forEach(function(f) {
        wrapper[f] = function() {
            var result = res[f].apply(res,arguments);
            if (result === res) {
                return wrapper;
            } else {
                return result;
            }
        }
    });
    return wrapper;
}

// Admin API to List Numbers
RED.httpAdmin.get('/vonageVoice/numbers', RED.auth.needsPermission('vonage.write'), function(req,res){
        if (req.query.creds){
          const creds = RED.nodes.getNode(req.query.creds);
          var api_key = creds.credentials.apikey
          var api_secret = creds.credentials.apisecret
        } else if (req.query.api_key){
          var api_key = req.query.api_key
          var api_secret = req.query.api_secret
        } else {
          res.status(401)
        }
        const nexmo = new Nexmo({
          apiKey: api_key,
          apiSecret: api_secret
          }, {debug: false, appendToUserAgent: "vonagevoice-nodered/"+version}
        );
        nexmo.number.get({}, 
          (err, response) => {
            if (err) {
              console.error(err)
            } else {
              res.send(response.numbers);
            }
          })        
   });

   
    
}
