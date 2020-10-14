
const version = require('./package.json').version

module.exports = function(RED) {
    "use strict";
    var Nexmo = require("nexmo");
    function OutgoingCall(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.creds = RED.nodes.getNode(n.creds);
        this.number = n.number;
        this.endpoint = n.endpoint
        this.apikey = this.creds.credentials.apikey
        this.apisecret = this.creds.credentials.apisecret
        this.appid = this.creds.appid
        this.privatekey = this.creds.credentials.privatekey
        this.baseurl = this.creds.credentials.baseurl
        node.on('input', function (msg) {
          this.dest = RED.util.evaluateNodeProperty(n.dest, n.desttype, this, msg)
          const nexmo = new Nexmo({
            apiKey: this.apikey,
            apiSecret: this.apisecret,
            applicationId: this.appid,
            privateKey: this.privatekey
            }, {debug: false, appendToUserAgent: "vonagevoice-nodered/"+version});
          if (this.endpoint == "phone"){
            var ep = {}
            ep.type = "phone"
            ep.number = this.dest.replace(/\D/g,'')
          } else if (this.endpoint == "sip"){
            var ep = {}
            ep.type = "sip"
            ep.uri = this.dest
          }else if (this.endpoint == "vbc"){
            var ep = {}
            ep.type = "vbc"
            ep.extension = this.dest
          }
          var request = {
            to: [ep],
            from: { type: 'phone', number: this.number},
            answer_url: [this.baseurl+"/vonageVoice/outgoing/"+node.id],
            answer_method : "GET"
          };
          nexmo.calls.create(request, (err, response) => {
            if(err) { console.error(err); }
          });  
        });  
    }

    RED.nodes.registerType("OutgoingCall",OutgoingCall);




// Handler for call webhooks to dispatch to node
RED.httpNode.get('/vonageVoice/outgoing/:id', function(req, res){ 
    let node = RED.nodes.getNode(req.params.id)
    var msg = {}
    msg.app = node.creds
    msg.payload = req.query
    msg.call = req.query
    msg.call.lvn = req.query.from
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

RED.httpAdmin.post("/outgoingInject/:id", RED.auth.needsPermission("inject.write"), function(req,res) {
  var node = RED.nodes.getNode(req.params.id);
  if (node != null) {
      try {
          node.receive();
          res.sendStatus(200);
      } catch(err) {
          res.sendStatus(500);
          node.error(RED._("inject.failed",{error:err.toString()}));
      }
  } else {
      res.sendStatus(404);
  }
});

// Admin API to List Numbers
RED.httpAdmin.get('/vonageVoice/numbers', RED.auth.needsPermission('vonage.write'), function(req,res){
        const creds = RED.nodes.getNode(req.query.creds);
        const nexmo = new Nexmo({
          apiKey: creds.credentials.apikey,
          apiSecret: creds.credentials.apisecret
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
