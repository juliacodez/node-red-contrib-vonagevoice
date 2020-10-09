var Nexmo = require("nexmo")
var mustache = require("mustache");
const version = require('./package.json').version
var bodyParser = require('body-parser')
var atob = require('atob');
var btoa = require('btoa');
var voices = require('./voices.json')

module.exports = function (RED) {
  function get_digits(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.digits = config.digits
    this.file_url = config.file_url
    if (config.audiotype == 'talk') {
      this.language = voices.properties[config.voicename].code;
      this.style = voices.properties[config.voicename].style
    }
    node.on('input', function (msg) {
      if (config.audiotype == 'talk') {
        var data = dataobject(this.context(), msg);
        this.text = mustache.render(config.text, data);
        var ncco = {};
        ncco.action="talk";
        ncco.bargeIn=true
        ncco.text=this.text;
        ncco.style=this.style;
        ncco.language=this.language
        msg.ncco.push(ncco);
      } else if (config.audiotype == 'stream'){
          var ncco = {};
          ncco.action="stream";
          ncco.bargeIn=true
          var f = this.file_url.split('/').slice(-1)[0] 
          ncco.streamUrl=[msg.app.credentials.baseurl+"/"+f];
          msg.ncco.push(ncco);
      }
      var ncco = {};
      ncco.action="input";
      ncco.eventUrl=[msg.app.credentials.baseurl+"/vonageVoice/get_digits/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id];
      ncco.dtmf={}
      ncco.dtmf.timeOut = config.timeout 
      ncco.dtmf.maxdigits = config.maxdigits
      ncco.dtmf.submitOnHash = config.submitonhash
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);
    });       
  }
  
  RED.nodes.registerType("get_digits", get_digits);
      
  RED.httpNode.use('/vonageVoice/get_digits',bodyParser.json());
  RED.httpNode.post('/vonageVoice/get_digits/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.query.app_node_id)

    var msg = {}
    msg.app = appnode
    msg.payload = req.body.dtmf
    msg.call = JSON.parse(atob(req.query.call))
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
