var Nexmo = require("nexmo")
var mustache = require("mustache");
const version = require('./package.json').version
var bodyParser = require('body-parser')
var atob = require('atob');
var btoa = require('btoa');
var voices = require('./voices.json')

module.exports = function (RED) {
  function speech_req(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.file_url = config.file_url
    if (config.audiotype == 'talk') {
      this.language = voices.properties[config.voicename].code;
      this.style = voices.properties[config.voicename].style
    }
    this.language = config.language
    this.rules = config.rules
    this.endOnSilence = config.endOnSilence
    this.confidence = config.confidence/100
    this.oninvalid = config.oninvalid
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
      ncco.eventUrl=[msg.app.credentials.baseurl+"/vonageVoice/speech_req/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id];
      ncco.speech={}
      ncco.speech.language = this.language 
      ncco.speech.context = this.rules
      ncco.speech.endOnSilence = this.endOnSilence
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);
    });       
  }
  
  RED.nodes.registerType("speech_req", speech_req);
      
  RED.httpNode.use('/vonageVoice/speech_req',bodyParser.json());
  RED.httpNode.post('/vonageVoice/speech_req/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.query.app_node_id)
    if ('error' in req.body.speech ){
      if (node.oninvalid == 'continue'){
        var msg_arr = []
        msg_arr.length = node.rules.length
        var msg = {}
        msg.app = appnode
        msg.payload = req.body.speech
        msg.call = JSON.parse(atob(req.query.call))
        msg.req = req
        msg.res = createResponseWrapper(res)
        msg.ncco = []
        msg_arr.push(msg)
        node.send(msg_arr)
      } else if (node.oninvalid == 'reprompt'){
        var msg = {}
        msg.app = appnode
        msg.call = JSON.parse(atob(req.query.call))
        msg.req = req
        msg.res = createResponseWrapper(res)
        msg.ncco = []
        node.emit('input', (msg));
      }
    } else {
      var results = req.body.speech.results
      var output = checkASR(node.rules, req.body.speech.results, node.confidence)
      if (output !== -1){
        var msg_arr = []
        msg_arr.length = node.rules.length
        var msg = {}
        msg.app = appnode
        msg.payload = req.body.speech
        msg.call = JSON.parse(atob(req.query.call))
        msg.req = req
        msg.res = createResponseWrapper(res)
        msg.ncco = []
        msg_arr.splice(output, 1, msg)
        node.send(msg_arr)
      } else if (node.oninvalid == 'continue'){
        var msg_arr = []
        msg_arr.length = node.rules.length
        var msg = {}
        msg.app = appnode
        msg.payload = req.body.speech
        msg.call = JSON.parse(atob(req.query.call))
        msg.req = req
        msg.res = createResponseWrapper(res)
        msg.ncco = []
        msg_arr.push(msg)
        node.send(msg_arr)
      } else if (node.oninvalid == 'reprompt'){
        var msg = {}
        msg.app = appnode
        msg.call = JSON.parse(atob(req.query.call))
        msg.req = req
        msg.res = createResponseWrapper(res)
        msg.ncco = []
        node.emit('input', (msg));
      }
    }
    
    

  })

  RED.httpAdmin.get('/vonageVoice/languages', RED.auth.needsPermission('vonage.write'),  function(req,res){
    // Refactor this when the langs.json is hosted
    var langs = require('./languages.json')
    res.send(langs)
  })
  

  function checkASR(rules, results, confidence){
    for (i in results){
      var rule = rules.indexOf(results[i].text)
      if (rule !== -1){
        if (results[i].confidence >= confidence){
          return rule
        } else { return -1}
      } else { return -1}
    }
  }

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
