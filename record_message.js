var Nexmo = require("nexmo")
var mustache = require("mustache");
const version = require('./package.json').version
var bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path');
var atob = require('atob');
var btoa = require('btoa');
var messagerecordings  = {}

module.exports = function (RED) {
  function record_message(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.recordingout = config.recordingout
    this.endonsilence = config.endonsilence
    this.endonkey = config.endonkey
    this.timeOut = config.timeOut
    if (this.recordingout == 'file') {
      this.filename = config.filename
    }
    node.on('input', function (msg) {
      var ncco = {};
      ncco.action="record";
      ncco.eventUrl=[msg.app.baseurl+"/vonageVoice/record_message/recording/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id];
      ncco.beepStart = true
      if (this.endonsilence != '0'){
        ncco.endOnSilence = this.endonsilence
      }
      if (this.endonkey != 'no'){
        ncco.endOnKey = this.endonkey
      }
      ncco.timeOut = this.timeOut
      msg.ncco.push(ncco);
      var ncco = {};
      ncco.action="notify";
      ncco.payload = {call : msg.call, app_node_id : msg.app.id}
      ncco.eventMethod = "POST"
      ncco.eventUrl = [msg.app.baseurl+"/vonageVoice/record_message/call/"+this.id]
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);
    });       
  }
  
  RED.nodes.registerType("record_message", record_message);
      
  RED.httpNode.use('/vonageVoice/record_message/recording',bodyParser.json());
  RED.httpNode.post('/vonageVoice/record_message/recording/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.query.app_node_id)
    let filetype 
    res.send('ok')
    //Download recording here
    const nexmo = new Nexmo({
      apiKey: appnode.credentials.apikey,
      apiSecret: appnode.credentials.apisecret,
      applicationId: appnode.appid,
      privateKey:appnode.credentials.privatekey
      }, {debug: false, appendToUserAgent: "nexmo-nodered/"+version}
    );
    if (node.recordingout == 'file'){
      fileFolder(node.filename, function (t) {
        filetype = t
      })
    }
    nexmo.files.get(req.body.recording_url, (err, data) => {
      if(err) { console.error(err); }
      else {
        // Check if file our node output then write and or send
        if (node.recordingout == 'file'){
          if (filetype == 'file'){
            var fn = node.filename
          } else if (filetype == 'folder'){
            var fn = node.filename+req.body.recording_uuid+".mp3"
          }
          fs.writeFile(fn, data, function(err) {
            if(err) {
              return console.log(err);
            }
            call = JSON.parse(atob(req.query.call))
            var rec = {}
            rec.recording = req.body
            rec.data = fn
            messagerecordings[call.uuid] = rec
          }); 
        } else {
          var rec = {}
          call = JSON.parse(atob(req.query.call))
          rec.recording = req.body
          rec.data = data
          messagerecordings[call.uuid] = rec
        }
      }
    })


    RED.httpNode.use('/vonageVoice/record_message/call',bodyParser.json());
    RED.httpNode.post('/vonageVoice/record_message/call/:id', function(req, res){
      let node = RED.nodes.getNode(req.params.id)
      let appnode = RED.nodes.getNode(req.body.payload.app_node_id)
      var msg = {}
      msg.app = appnode
      msg.payload = req.body.payload.call
      msg.call = req.body.payload.call
      msg.req = req
      msg.res = createResponseWrapper(res)
      msg.ncco = []
      waitForRec(msg.call.uuid, node, msg)
    })
  })

  function waitForRec(uuid, node, msg){
    if(uuid in messagerecordings){
        let rec = messagerecordings[uuid]
        msg.data = rec.data
        msg.recording = rec.recording
        node.send(msg)
        delete messagerecordings[uuid]
    }
    else{
        setTimeout(waitForRec, 250, uuid, node, msg);
    }
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

  function fileFolder(data, callback){
    fs.lstat(data, function (err, res) {
        if (err) { 
            fs.lstat(path.dirname(data), function (err, res) { 
                if (err) { 
                    callback('invalid') 
                }
                else if (res.isDirectory()) {
                    callback('invalid') 
                } else{
                    callback('file') 
                }
            });
        } else if (res.isSymbolicLink()){
            callback('folder')
        } else if (res.isDirectory()) {
            callback('folder') 
        } else {
            callback('file') 
        }
    });  
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
}
