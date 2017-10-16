$(function(){

    var canvas=document.getElementById("canvas");
    var ctx=canvas.getContext("2d");
    var BB=canvas.getBoundingClientRect();
    var offsetX=BB.left;
    var offsetY=BB.top;

    var lastX,lastY;
    var isDown=false;
    
    console.log(localStorage.getItem('myStorage'));
    var Xcoordinate = [];
    var Xindex=0,Yindex=0,Xmean=0,Ymean=0;
    var Ycoordinate = [];
    
    canvas.onmousedown=handleMousedown;
    canvas.onmousemove=handleMousemove;
    canvas.onmouseup=handleMouseup;
    var t1;
    function handleMousedown(e){
         e.preventDefault();
         e.stopPropagation();
         lastX=e.clientX-offsetX;
         lastY=e.clientY-offsetY;
         isDown=true;
         buildInitial();
         t1 = new Date();
    }
    var arr = []
    var ctr=1,error = 0,index=0;
    var errorsum = 0;
    
    function handleMouseup(e){
         e.preventDefault();
         e.stopPropagation();
         isDown=false;
         console.log("Error = " + errorsum/ctr);

         var value = errorsum/ctr;
         if(value>100)
            value=100;
         obj = JSON.parse(localStorage.getItem('myStorage'));
         if(obj===null) obj = {};
         console.log(obj);
         if(obj['data'] == null){
            obj['data'] = [value];
         } else {
            obj['data'].push(value);
         }
         localStorage.setItem('myStorage',JSON.stringify(obj));
         
         $.post('/mousejson',{data: value},function() {
            console.log("Written to JSON");
         });
         var t2 =  new Date();
           if(t2-t1 > 6000)
            $('#winner').html('You lose !');
           else
            $('#winner').html('You Win !');

         // location.reload();
         //console.log(obj);
    }

    function handleMousemove(e){
         e.preventDefault();
         e.stopPropagation();

         if(!isDown){return;}

         var mouseX=e.clientX-offsetX;
         var mouseY=e.clientY-offsetY;

         ctx.beginPath();
         ctx.moveTo(lastX,lastY);
         ctx.lineTo(mouseX,mouseY);
         ctx.stroke();

         lastX=mouseX;
         lastY=mouseY;
         //console.log(lastX,lastY)
        //  if(lastX>100)
        //     lastX = 100;
        // if(lastY>100)
        //     lastY = 100;
         Xcoordinate[Xindex++] = lastX;
         Xmean+=lastX;
         Ycoordinate[Yindex++] = lastY;
         Ymean+=lastY;
         
         var y = lastX;
         var delta = Math.abs(lastY - y);
         var error = (2*delta/y)*100;
         errorsum+=error;
         ctr++;
    }
           function build() {
            console.log("hello")
        ctx.beginPath();
        ctx.lineWidth=5;
        ctx.moveTo(0,0);
        ctx.lineTo(450,450);
        ctx.stroke();
    }
        build();
    /*
    function buildInitial() {
        console.log("hello")
        ctx.beginPath();
        ctx.lineWidth=5;
        ctx.moveTo(0,0);
        ctx.lineTo(250,250);
        ctx.stroke();
    }
    buildInitial();
    */
    function buildInitial() {
        

        (function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () {
            callback(currTime + timeToCall);
        },
        timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
    };
}());

ctx.lineCap = "round";

// variable to hold how many frames have elapsed in the animation
var t = 1;

// define the path to plot
var vertices = [];
vertices.push({
    x: 0,
    y: 0
});
vertices.push({
    x: 100,
    y: 100
});
vertices.push({
    x: 200,
    y: 200
});
vertices.push({
    x: 300,
    y: 300
});
vertices.push({
    x: 450,
    y: 450
});


// draw the complete line
ctx.lineWidth = 1;
// tell canvas you are beginning a new path
ctx.beginPath();
// draw the path with moveTo and multiple lineTo's
ctx.moveTo(0, 0);
ctx.lineTo(450, 450);

// stroke the path
ctx.stroke();


// set some style
ctx.lineWidth = 5;
ctx.strokeStyle = "blue";
// calculate incremental points along the path
var points = calcWaypoints(vertices);
// extend the line from start to finish with animation
animate(points);


// calc waypoints traveling along vertices
function calcWaypoints(vertices) {
    var waypoints = [];
    for (var i = 1; i < vertices.length; i++) {
        var pt0 = vertices[i - 1];
        var pt1 = vertices[i];
        var dx = pt1.x - pt0.x;
        var dy = pt1.y - pt0.y;
        for (var j = 0; j < 100; j++) {
            var x = pt0.x + dx * j / 100;
            var y = pt0.y + dy * j / 100;
            waypoints.push({
                x: x,
                y: y
            });
        }
    }
    return (waypoints);
}


function animate() {
    if (t < points.length - 1) {
        requestAnimationFrame(animate);
    }
    // draw a line segment from the last waypoint
    // to the current waypoint
    ctx.beginPath();
    ctx.moveTo(points[t - 1].x, points[t - 1].y);
    ctx.lineTo(points[t].x, points[t].y);
    ctx.stroke();
    // increment "t" to get the next waypoint
    t++;
}

    }

for(let i=0;i<Xcoordinate.length;i++)
    Xmean+=Xcoordinate[i];

for(let i=0;i<Ycoordinate.length;i++)
    Ymean+=Ycoordinate[i];
ctr=Ycoordinate.length;


}); // end $(function(){})
