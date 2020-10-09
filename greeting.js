var mustache = require("mustache");
var multer = require("multer");
var voices = require("./voices.json")


module.exports = function (RED) {
  function greeting(config){
    RED.nodes.createNode(this, config);
    var node = this;
    if (config.audiotype == 'talk') {
      this.language = voices.properties[config.voicename].code;
      this.style = voices.properties[config.voicename].style
      node.on('input', function (msg) {
        var data = dataobject(this.context(), msg);
        this.text = mustache.render(config.text, data);
        var ncco = {};
        ncco.action="talk";
        ncco.text=this.text;
        ncco.language=this.language;
        ncco.style = this.style
        clean(ncco);
        msg.ncco.push(ncco);
        node.send(msg);
      });
    } else {
      node.on('input', function (msg) {
        var ncco = {};
        ncco.action="stream";
        var f = config.file_url.split('/').slice(-1)[0] 
        ncco.streamUrl=[msg.app.credentials.baseurl+"/"+f];
        msg.ncco.push(ncco);
        node.send(msg);
      });
    }  
  }

//Helper Functions  
function clean(obj) {
    for (var propName in obj) { 
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
        delete obj[propName];
      }
    }
}
RED.nodes.registerType("greeting", greeting);

// File Upload Handler
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })
RED.httpAdmin.post('/vonageVoice/upload', RED.auth.needsPermission('vonage.write'),  upload.single('file'), function(req,res){
  if (req.file.mimetype == 'audio/mpeg' || req.file.mimetype == 'audio/x-wav'){
    const fs = require('fs');
    var filepath = RED.settings.httpStatic+'/'+req.file.originalname
    fs.writeFileSync(filepath, req.file.buffer);  
    res.send(filepath)
  } else {
    res.status(400).send('Files must be mp3 or wav');
  }
 
});
RED.httpAdmin.get('/vonageVoice/voices', RED.auth.needsPermission('vonage.write'),  function(req,res){
  // Refactor this when the voices.json is hosted
  var voices = require('./voices.json')
  res.send(voices)
  })
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