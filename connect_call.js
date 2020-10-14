var Nexmo = require("nexmo")
const version = require('./package.json').version
var bodyParser = require('body-parser')
var atob = require('atob');
var btoa = require('btoa');


module.exports = function (RED) {
  function connect_call(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.dest = config.dest.replace(/\D/g,'')
    this.desttype = config.desttype
    node.on('input', function (msg) {
      switch (this.desttype){
      case "phone":
        var ncco = {};
        ncco.action="connect";
        ncco.from = msg.call.lvn
        ncco.endpoint = [{type : 'phone', number : this.dest}]
        ncco.eventMethod = "POST"
        ncco.eventUrl = [msg.app.baseurl+"/vonageVoice/connect_call/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id]
        break;
      case "sip":
        var ncco = {};
        ncco.action="connect";
        ncco.endpoint = [{type : 'sip', uri : this.dest}]
        ncco.eventMethod = "POST"
        ncco.eventUrl = [msg.app.baseurl+"/vonageVoice/connect_call/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id]
        break;
      case "vbc":
          var ncco = {};
          ncco.action="connect";
          ncco.endpoint = [{type : 'vbc', extension : this.dest}]
          ncco.eventMethod = "POST"
          ncco.eventUrl = [msg.app.baseurl+"/vonageVoice/connect_call/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id]
          break;
      }
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);   
    })
  }
  RED.nodes.registerType("connect_call", connect_call);
  RED.httpNode.use('/vonageVoice/connect_call',bodyParser.json());
  RED.httpNode.post('/vonageVoice/connect_call/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.query.app_node_id)
    var msg = {}
    msg.app = appnode
    msg.payload = req.body.payload
    msg.call = JSON.parse(atob(req.query.call))    
    msg.req = req
    msg.ncco = []
    node.send(msg)
    res.send('ok')
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
}
