var Nexmo = require("nexmo")
var mustache = require("mustache");
const version = require('./package.json').version
var bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path');
var atob = require('atob');
var btoa = require('btoa');

module.exports = function (RED) {
  function record_call(config){
    RED.nodes.createNode(this, config);
    var node = this;
    this.recordingout = config.recordingout
    if (this.recordingout == 'file') {
      this.filename = config.filename
    }
    node.on('input', function (msg) {
      var ncco = {};
      ncco.action="record";
      ncco.eventUrl=[msg.app.baseurl+"/vonageVoice/record_call/"+node.id+"?call="+btoa(JSON.stringify(msg.call))+"&app_node_id="+msg.app.id];
      msg.ncco.push(ncco);
      node.send([msg,])
    });       
  }
  
  RED.nodes.registerType("record_call", record_call);
      
  RED.httpNode.use('/vonageVoice/record_call',bodyParser.json());
  RED.httpNode.post('/vonageVoice/record_call/:id', function(req, res){
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
            var msg = {}
            msg.payload = req.body
            msg.filename = fn
            node.send(["", msg])
          }); 
        } else {
          var msg = {}
          msg.payload = req.body
          msg.data = data
          node.send([, msg])
        }
      }
    });
    
    

  })



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
}
