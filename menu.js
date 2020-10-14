var Nexmo = require("nexmo")
var mustache = require("mustache");
const version = require('./package.json').version
var bodyParser = require('body-parser')
var atob = require('atob');
var btoa = require('btoa');
var voices = require("./voices.json")


module.exports = function (RED) {
  function menu(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.valid_digits = config.valid_digits
    this.on_invalid = config.on_invalid
    this.on_timeout = config.on_timeout
    if (config.audiotype == 'talk') {
      this.language = voices.properties[config.voicename].code;
      this.style = voices.properties[config.voicename].style
    } 
    this.file_url = config.file_url
    node.on('input', function (msg) {
      if (config.audiotype == 'talk') {
        var data = dataobject(this.context(), msg);
        this.text = mustache.render(config.text, data);
        var ncco = {};
        ncco.action="talk";
        ncco.text=this.text;
        ncco.bargeIn = true
        ncco.style=this.style;
        ncco.language=this.language
        msg.ncco.push(ncco);
      } else if (config.audiotype == 'stream'){
          var ncco = {};
          ncco.action="stream";
          var f = this.file_url.split('/').slice(-1)[0] 
          ncco.streamUrl=[msg.app.baseurl+"/"+f];
          ncco.bargeIn = true
          msg.ncco.push(ncco);
      }
      var ncco = {};
      ncco.action="input";
      ncco.eventUrl=[msg.app.baseurl+"/vonageVoice/menu/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id];
      ncco.dtmf={}
      ncco.dtmf.maxDigits = 1
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);
    });       
  }
  
  RED.nodes.registerType("menu", menu);
      
  RED.httpNode.use('/vonageVoice/menu',bodyParser.json());
  RED.httpNode.post('/vonageVoice/menu/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.query.app_node_id)
    let valid_digits = node.valid_digits.split(",")
    var msg = {}
    msg.app = appnode
    msg.payload = req.body.dtmf
    msg.call = JSON.parse(atob(req.query.call))
    msg.req = req
    msg.res = createResponseWrapper(res)
    msg.ncco = []
    var o = new Array(valid_digits.length)
    if (req.body.dtmf.timed_out){
      if (node.on_timeout == 'continue'){
        let pos = valid_digits.indexOf('timeout')
        o[pos] = msg
        node.send(o)
      } else if (node.on_timeout == 'reprompt'){
        node.emit('input', (msg));
      }
    } else if (valid_digits.includes(req.body.dtmf.digits)){
      let pos = valid_digits.indexOf(req.body.dtmf.digits)
        o[pos] = msg
        node.send(o)
    } else {
      if (node.on_invalid == 'continue'){
        let pos = valid_digits.indexOf('invalid')
        o[pos] = msg
        node.send(o)
      } else if (node.on_timeout == 'reprompt'){
        node.emit('input', (msg));
      }
    }
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
  function dataobject(context, msg){
    data = {}
    data.msg = msg;
    data.global = {};
    data.flow = {};
    g_keys = context.global.keys();
    f_keys = context.flow.keys();
    for (k in g_keys){
      data.global[g_keys[k]] = context.global.get(g_keys[k]);
    };
    for (k in f_keys){
      data.flow[f_keys[k]] = context.flow.get(f_keys[k]);
    };
    return data
  }
  function clean(obj) {
    for (var propName in obj) { 
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
        delete obj[propName];
      }
    }
}
}
