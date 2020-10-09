var Nexmo = require("nexmo")
const version = require('./package.json').version
var bodyParser = require('body-parser')


module.exports = function (RED) {
  function send_dtmf(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.digits = config.digits    
    node.on('input', function (msg) {
      var ncco = {};
      ncco.action="notify";
      ncco.payload = {call : msg.call, app_node_id : msg.app.id, digits: this.digits}
      ncco.eventMethod = "POST"
      ncco.eventUrl = [msg.app.credentials.baseurl+"/vonageVoice/send_dtmf/"+node.id]
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);
    });       
  }
  
  RED.nodes.registerType("send_dtmf", send_dtmf);
      
  RED.httpNode.use('/vonageVoice/send_dtmf',bodyParser.json());
  RED.httpNode.post('/vonageVoice/send_dtmf/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.body.payload.app_node_id)
    var msg = {}
    msg.app = appnode
    msg.payload = req.body.payload.call
    msg.call = req.body.payload.call
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
}
