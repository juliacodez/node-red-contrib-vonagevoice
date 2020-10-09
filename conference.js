var Nexmo = require("nexmo")
const version = require('./package.json').version
var bodyParser = require('body-parser')
var atob = require('atob');
var btoa = require('btoa');
const fs = require('fs')
const path = require('path');

module.exports = function (RED) {
  function conference(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.name = config.name
    this.moderation = config.moderation
    this.recordingout = config.recordingout
    if (this.recordingout == 'file') {
      this.filename = config.filename
    }
    this.startOnEnter = config.startonenter
    this.endOnExit = config.endonexit
    this.musicOnHoldUrl = config.musiconholdurl
    node.on('input', function (msg) {
      var ncco = {};
      ncco.action="conversation";
      ncco.name = this.name
      if (this.recordingout != 'no'){
        ncco.record = true
        ncco.eventUrl = ncco.eventUrl=[msg.app.credentials.baseurl+"/vonageVoice/record_conf/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id];
      }
      if (this.moderation == "true"){
        ncco.startOnEnter = this.startOnEnter 
        ncco.endOnExit = this.endOnExit 
        this.musicOnHoldUrl ? ncco.musicOnHoldUrl = [this.musicOnHoldUrl] : null
      }
      msg.ncco.push(ncco);
      msg.res._res.status(200).jsonp(msg.ncco);   
    })
  }
  
  RED.nodes.registerType("conference", conference);
  
  RED.httpNode.use('/vonageVoice/record_conf',bodyParser.json());
  RED.httpNode.post('/vonageVoice/record_conf/:id', function(req, res){
    let node = RED.nodes.getNode(req.params.id)
    let appnode = RED.nodes.getNode(req.query.app_node_id)
    let filetype 
    res.send('ok')
    //Download recording here
    const nexmo = new Nexmo({
      apiKey: appnode.credentials.apikey,
      apiSecret: appnode.credentials.apisecret,
      applicationId: appnode.credentials.appid,
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
            var fn = node.filename+'/'+req.body.recording_uuid+".mp3"
          }
          fs.writeFile(fn, data, function(err) {
            if(err) {
              return console.log(err);
            }
            var msg = {}
            msg.payload = req.body
            msg.filename = fn
            node.send(msg)
          }); 
        } else {
          var msg = {}
          msg.payload = req.body
          msg.data = data
          node.send(msg)
        }
      }
    });
  });

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
}
