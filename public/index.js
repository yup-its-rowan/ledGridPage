
const socket = io();
socket.on('connect', () => {
    console.log('connected');
    socket.emit('getPaint');
});

var red = [];
var green = [];
var blue = [];

const sqr = 64;

for (var i = 0; i < sqr; i++) {
    red.push([]);
    green.push([]);
    blue.push([]);
    for (var j = 0; j < sqr; j++) {
        red[i].push(255);
        green[i].push(255);
        blue[i].push(255);
    }
}

socket.on('updatePaintAll', (data) => {
    red = data.red;
    green = data.green;
    blue = data.blue;
    updateAll();
});

function updateAll() {
    for (var i = 0; i < sqr; i++) {
        for (var j = 0; j < sqr; j++) {
            var element = document.getElementById('row-'+i).children[j];
            element.style.backgroundColor = 'rgb(' + red[i][j] + ',' + green[i][j] + ',' + blue[i][j] + ')';
        }
    }

}

socket.on('updatePaint', (data) => {
    red[data.x][data.y] = data.red;
    green[data.x][data.y] = data.green;
    blue[data.x][data.y] = data.blue;
    var element = document.getElementById('row-'+data.x).children[data.y];
    element.style.backgroundColor = 'rgb(' + data.red + ',' + data.green + ',' + data.blue + ')';
});

socket.on('clearPaint', () => {
    for (var i = 0; i < sqr; i++) {
        for (var j = 0; j < sqr; j++) {
            red[i][j] = 255;
            green[i][j] = 255;
            blue[i][j] = 255;
            var element = document.getElementById('row-'+i).children[j];
            element.style.backgroundColor = 'rgb(' + red[i][j] + ',' + green[i][j] + ',' + blue[i][j] + ')';
        }
    }
});



function createGrid(numRows, numSquares) {
    var container = document.getElementById('container');;
    for (var i=0; i<numRows; i++) {
        ul = document.createElement('ul');
        ul.setAttribute('id', 'row-'+i);
        ul.setAttribute('class', 'row');
        container.appendChild(ul);
        for (var j=0; j<numSquares; j++) {
            li = document.createElement('li');
            li.setAttribute('id', 'sq-'+j);
            li.setAttribute('class', 'square');
            li.setAttribute('onmouseover', 'changeColor(' + i + ', '+ j + ', '+ false + ')');
            li.setAttribute('onmousedown', 'changeColor(' + i + ', '+ j + ', '+ true + ')');
            ul.appendChild(li);
        }
    }
}
const gridNumber = 64;
const containerWidth = 50;
var mouseDonw = false;

let prevx = -1;
let prevy = -1;
function changeColor(row, square, click) {
    var element = document.getElementById('row-'+row).children[square];
    if (mouseDonw || click) {
        element.style.backgroundColor = 'black';
        socket.emit('paintSqr', {x: row, y: square, red: 0, green: 0, blue: 0});
    }
}

document.addEventListener('keydown', function(event) {
    if(event.key == 'x' || event.key == 'X') {
        socket.emit('clearingPaint');
    }
});

document.addEventListener("DOMContentLoaded", function(event) {
    createGrid(gridNumber, gridNumber);
    const stylesheet = document.styleSheets[0];
    let elementRules;

    for (var i=0; i<stylesheet.cssRules.length; i++) {
        if (stylesheet.cssRules[i].selectorText === '.square') {
            elementRules = stylesheet.cssRules[i];
        }
    }

    elementRules.style.width = (containerWidth/gridNumber) + 'em';
    elementRules.style.height = (containerWidth/gridNumber) + 'em';

    document.onmousedown = function() { 
        mouseDonw = true;
    }
    document.onmouseup = function() {
        mouseDonw = false;
    }

    document.ondragstart = function() { //i think this stops drag errors 
        return false;
    }
    
    document.ondrop = function() { //minorly untested
        return false;
    }
});