#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
const Jimp = require('jimp');
const formidable = require('express-formidable');
const socketIO = require('socket.io');

const app = express();

// cert stuff
const privateKey = fs.readFileSync('/etc/letsencrypt/live/rohanakki.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/rohanakki.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/rohanakki.com/chain.pem', 'utf8');

const portNumber = 1256;

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(['/uploadVid', '/uploadPic', '/uploadSlide'], formidable());

/*
const DisplayStates = {
	staticPicture: 0,
	slideshow: 1,
	gif: 2,
	paint: 3,
    vid: 4,
    on: 5
} 
*/
var displayState = "off";
var ngrokStuff = fs.readFileSync(__dirname + '/ngrok.txt', 'utf8').split("\n");
var ngrokNumber = ngrokStuff[0];
var ngrokPort = ngrokStuff[1];

const password = fs.readFileSync(__dirname + '/pass.txt', 'utf8').split("\n")[0];


//FIRST ITERATION OF STOP F, DO NOT PUT SHIT TO RUN BEFORE THIS PLEASE
stopBoardF();

app.use(express.static(__dirname + '/public'));
app.get( '/', function (req, res){
	res.sendFile('public/index.html', {root: __dirname});
});

app.get( '/check', function(req, res){
    res.status(200).send("running");
});

app.get( '/stateCheck', function (req, res){
    try {
        execSync( ngrokSSH(ngrokNumber, ngrokPort) + " 'cd Desktop/;'", {timeout:5000}, function (error, stdOut, stdErr) {
            console.log('stdout: ' + stdOut);
            console.log('stderr: ' + stdErr);
            if (error !== null) {
                 console.log('exec error: ' + error);
            }
        });
        res.status(200).send(displayState);
    } catch {
        res.status(503).send("board not online, but its " + displayState);
    }
    
    
    console.log("state checked, its " + displayState);
});

app.post( '/stateChange', function (req, res){
    if (password.trim() != req.body.pass.trim() ){return res.status(200).send("idiot");}
    temp = req.body.state;
    if (temp == "staticPicture" || temp == "slideshow" || temp == "gif" || temp == "paint" || temp == "off" || temp == "vid"){
        displayState = temp;
        console.log("state changed to " + temp + "")
        res.status(200).send("state changed to " + temp + "");
        if (temp == "off"){
            stopBoardF();
        } else if (temp == "staticPicture"){
            stopBoardF();
            setTimeout(function(){
                startBoardF();
            }, 500);
        } else if (temp == "slideshow"){
            stopBoardF();
            setTimeout(function(){
                startSlideshowF();
            }, 500);
        } else if (temp == "gif"){
            stopBoardF();
            setTimeout(function(){
                startGifF();
            }, 500);
        } else if (temp == "vid"){
            stopBoardF();
            setTimeout(function(){
                startVidF();
            }, 500);
        } else if (temp == "paint"){
            stopBoardF();
            setTimeout(function(){
                //startPaintF();
            }, 500);
        }
    } else {
        console.log(temp + " is not a state stupid");
        res.status(400).send("not a state stupid");
    }
});

app.post('/ngrokChange', function(req, res){
    if (password.trim() != req.body.pass.trim() ){return res.status(200).send("idiot");}
    if (Number.isInteger(req.body.ngrokNumber) && Number.isInteger(req.body.ngrokPort)){
        ngrokNumber = req.body.ngrokNumber;
        ngrokPort = req.body.ngrokPort;
        fs.writeFileSync(__dirname + '/ngrok.txt', ngrokNumber + "\n" + ngrokPort);
        res.status(200).send("ngrok changed to URL " + req.body.ngrokNumber + " and port " + req.body.ngrokPort + "");
        console.log("ngrok changed to URL " + req.body.ngrokNumber + " and port " + req.body.ngrokPort + "")
    } else {
        res.status(400).send("not a number stupid");
    }    
});

app.post('/startBoard', function(req, res){
    if (password.trim() != req.body.pass.trim() ){return res.status(200).send("idiot");}
    displayState = "staticPicture";
    stopBoardF();
    setTimeout(function(){
        startBoardF();
      }, 500);
    res.status(200).send("board started");
});

app.post('/stopBoard', function(req, res){
    if (password.trim() != req.body.pass.trim() ){return res.status(200).send("idiot");}
    displayState = "off";
    stopBoardF();
    res.status(200).send("board stopped");
});

app.post('/uploadPic', function(req, res){
    if (password.trim() != req.fields.pass.trim() ){return res.status(200).send("idiot");}
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }
    const myFile = req.files.myFile;
    if (myFile.type == "image/png"){
        const filePath = __dirname + '/uploaded/' + "frogg.png";
        exec('mv ' + myFile.path + ' ' + filePath, (err, stdout, stderr) => {
            if (err) {
                return res.status(400).send(err);
            }
            pushStaticPicture();   
            res.status(200).send('File uploaded!');
        });     
    } else if (myFile.type == "image/jpeg"){
        const filePath = __dirname + '/uploaded/' + "frogg.jpeg";
        exec('mv ' + myFile.path + ' ' + filePath, (err, stdout, stderr) => {
            if (err) {
                return res.status(400).send(err);
            }
            Jimp.read(filePath, function (err, image) {
                if (err) throw err;
                image.write(__dirname + '/uploaded/' + "frogg.png");
            });
            pushStaticPicture();   
            res.status(200).send('File uploaded!');
        });  
    } else {
        return res.status(400).send('File is not supported.');
    }     
});

app.post('/uploadSlide', function(req, res){
    if (password.trim() != req.fields.pass.trim() ){return res.status(200).send("idiot");}
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }
    const myFile = req.files.myFile;
    console.log(myFile);
    if (myFile.type == "image/png" || myFile.type == "image/jpeg"){
        const filePath = __dirname + '/uploaded/' + myFile.name;
        exec('mv ' + myFile.path + ' ' + "'" + filePath + "'", (err, stdout, stderr) => {
            if (err) {
                return res.status(400).send(err);
            }
            pushSlideshowPicture(myFile.name);   
            res.status(200).send('File uploaded!');
        });   
    } else {
        return res.status(400).send('File is not supported.');
    }     

});

app.post('/clearSlides', function(req, res){
    if (password.trim() != req.body.pass.trim() ){return res.status(200).send("idiot");}
    clearSlideshow();
    res.status(200).send("slides cleared");
});


var red = [];
var green = [];
var blue = [];
const square = 64;

for (let i=0; i<square; i++){
    red.push([]);
    green.push([]);
    blue.push([]);
    for (let j=0; j<square; j++){
        red[i].push(i+j);
        green[i].push(i+j);
        blue[i].push(i+j);
    }
}

app.post('/uploadVid', function(req, res){
    if (password.trim() != req.fields.pass.trim() ){return res.status(200).send("idiot");}
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }
    const myFile = req.files.myFile;
    if (myFile.type == "video/mp4"){
        const filePath = __dirname + '/uploaded/' + "videoFrog.mp4";
        exec('mv ' + myFile.path + ' ' + filePath, (err, stdout, stderr) => {
            if (err) {
                return res.status(400).send(err);
            }
            pushVid(req.fields.videoDowngrade);   
            res.status(200).send('File uploaded!');
        });
    } else {
        return res.status(400).send('File is not mp4');
    }
});

let io = null;
const httpsServer = https.createServer(credentials, app);
io = socketIO(httpsServer);

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log("user disconnected");
    });
    socket.on('paintSqr', (data) => {
        red[data.x][data.y] = data.red;
        green[data.x][data.y] = data.green;
        blue[data.x][data.y] = data.blue;
        socket.broadcast.emit('updatePaint', data);
    });
    socket.on('getPaint', () => {
        socket.emit('updatePaintAll', {red: red, green: green, blue: blue});
    });
    socket.on('clearingPaint', () => {
        clearPaint();
        io.emit('clearPaint');
    });
    
});
function clearPaint () {
    for (let i=0; i<square; i++){
        for (let j=0; j<square; j++){
            red[i][j] = 255;
            green[i][j] = 255;
            blue[i][j] = 255;
        }
    }
}

httpsServer.listen(portNumber, () => {
	console.log('ahem. these nuts?');
});

function ngrokSSH(id, port){
    return "ssh admin@" + id + ".tcp.ngrok.io -o StrictHostKeyChecking=no -p " + port;
}

function ngrokSSHKill(id, port){
    return "ssh admin@" + id + ".tcp.ngrok.io -o StrictHostKeyChecking=no -p " + port;
}

function ngrokSCPImage(id, port){
    return "scp -P " + port + " "+ __dirname + "/uploaded/frogg.png admin@" + id + ".tcp.ngrok.io:~/Desktop/image";
}

function ngrokSCPPaint(id, port){
    return "scp -P " + port + " "+ __dirname + "/uploaded/paint.png admin@" + id + ".tcp.ngrok.io:~/Desktop/image";
}

function ngrokSCPSlide(id, port, name){
    return "scp -P " + port + " "+ __dirname + "/uploaded/'" + name + "' admin@" + id + ".tcp.ngrok.io:~/Desktop/slideshow";
}

function ngrokSCPVideo(id, port){
    return "scp -P " + port + " "+ __dirname + "/uploaded/videoFrogg.mp4 admin@" + id + ".tcp.ngrok.io:~/Desktop/video";
}

function startBoardF(){
    exec( ngrokSSH(ngrokNumber, ngrokPort) + " 'cd Desktop/; sudo ./freddy.py & disown'", {timeout:5000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
}

function stopBoardF(){
    exec( ngrokSSHKill(ngrokNumber, ngrokPort) + " 'sudo killall -SIGKILL sudo; sudo killall -SIGTERM python; cd Desktop/; sudo ./off.py & disown'", {timeout:5000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
}

function startSlideshowF(){
    exec( ngrokSSH(ngrokNumber, ngrokPort) + " 'cd Desktop/; sudo ./slideshow.py & disown'", {timeout:5000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
}

function startGifF(){
    exec( ngrokSSH(ngrokNumber, ngrokPort) + " 'cd Desktop/; sudo ./gifV.py & disown'", {timeout:5000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
                console.log('exec error: ' + error);
        }
    });
}

function startVidF(){
    exec( ngrokSSH(ngrokNumber, ngrokPort) + " 'cd Desktop/; sudo ./videoB.py & disown'", {timeout:5000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
                console.log('exec error: ' + error);
        }
    });
}

function pushStaticPicture(){
    exec( ngrokSCPImage(ngrokNumber, ngrokPort), {timeout:8000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
}

function pushPaint(){
    exec( ngrokSCPPaint(ngrokNumber, ngrokPort), {timeout:8000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
}

function pushSlideshowPicture(fileName){
    exec(ngrokSCPSlide(ngrokNumber, ngrokPort, fileName), {timeout:8000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
        exec('rm ' + __dirname + "/uploaded/'" + fileName + "'", function (error, stdOut, stdErr) {
            console.log('stdout: ' + stdOut);
            console.log('stderr: ' + stdErr);
            if (error !== null) {
                 console.log('exec error: ' + error);
            }
        });
    });
}

function clearSlideshow(){
    exec(ngrokSSH(ngrokNumber, ngrokPort) + " 'cd Desktop/; rm -rf slideshow/*'", {timeout:5000}, function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
}

function pushVid( videoDowngrade){
    videoDowngrade = (videoDowngrade == "true");
    if (videoDowngrade == false){
        exec('cp uploaded/videoFrog.mp4 uploaded/videoFrogg.mp4', function (error, stdOut, stdErr) {
            console.log('stdout: ' + stdOut);
            console.log('stderr: ' + stdErr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
            exec(ngrokSCPVideo(ngrokNumber, ngrokPort), function (error, stdOut, stdErr) {
                console.log('stdout: ' + stdOut);
                console.log('stderr: ' + stdErr);
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
                
                if (displayState == "vid"){
                    stopBoardF();
                    setTimeout(function(){
                        startVidF();
                    }, 500);
                }
            });
        });
        
        return;
    }
    exec ('ffmpeg -y -i uploaded/videoFrog.mp4 -vf "scale=64:64:force_original_aspect_ratio=decrease,pad=64:64:-1:-1:color=black" uploaded/videoFrogg.mp4', function (error, stdOut, stdErr) {
        console.log('stdout: ' + stdOut);
        console.log('stderr: ' + stdErr);
        if (error !== null) {
            console.log('exec error: ' + error);
        }
        exec(ngrokSCPVideo(ngrokNumber, ngrokPort), function (error, stdOut, stdErr) {
            console.log('stdout: ' + stdOut);
            console.log('stderr: ' + stdErr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
            
            if (displayState == "vid"){
                stopBoardF();
                setTimeout(function(){
                    startVidF();
                }, 500);
            }
        });
    });
}


