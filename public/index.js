
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
            red[i][j] = 54;
            green[i][j] = 69;
            blue[i][j] = 79;
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
    if (click) {
        plotPoint(row, square, cR, cG, cB);
    } else if (mouseDonw) {
        plotPoint(row, square, cR, cG, cB);
        if (prevx != -1) {
            var x = prevx;
            var y = prevy;
            var dx = Math.abs(row - x);
            var dy = Math.abs(square - y);
            var directionToGoX = row > x ? 1 : -1;
            var directionToGoY = square > y ? 1 : -1;
            while(true) {
                plotPoint(x, y, cR, cG, cB);
                if (x == row && y == square) {
                    break;
                }
                if (dx > dy) {
                    x += directionToGoX;
                    dx -= 1;
                } else {
                    y += directionToGoY;
                    dy -= 1;
                }
            }
        }
    }
    prevx = row;
    prevy = square;
}


let cR = 0;
let cG = 0;
let cB = 0;

function colorUpdaterHex(re, gree, blu){
    cR = hexToDec(re);
    cG = hexToDec(gree);
    cB = hexToDec(blu);
}

function hexToDec(hex) {
    return parseInt(hex, 16);
}

function plotPoint(x1, y1, red1, green1, blue1) {
    var element = document.getElementById('row-'+x1).children[y1];
    element.style.backgroundColor = 'rgb(' + red1 + ',' + green1 + ',' + blue1 + ')';
    socket.emit('paintSqr', {x: x1, y: y1, red: red1, green: green1, blue: blue1});
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
    document.onmouseup = function() { //this should proberly be bresenham's line gen
        mouseDonw = false;
        prevx = -1;
        prevy = -1;
        console.log( 'mouseup'  + prevx + ' ' + prevy);
    }

    document.ondragstart = function() { //i think this stops drag errors 
        return false;
    }
    
    document.ondrop = function() { //minorly untested
        return false;
    }

    colorPicker = document.getElementById('colorPick');
    colorUpdaterHex(colorPicker.value.substring(1,3), colorPicker.value.substring(3,5), colorPicker.value.substring(5,7)); //this is here to make sure that duplicating the tab doesn't break stuff
    colorPicker.addEventListener('change', function() { //this runs ater you close the color picker
        colorUpdaterHex(this.value.substring(1,3), this.value.substring(3,5), this.value.substring(5,7));
    });
    colorPicker.addEventListener('input', function() { //this runs while you're changing values in the color picker
        colorUpdaterHex(this.value.substring(1,3), this.value.substring(3,5), this.value.substring(5,7));
    });
});