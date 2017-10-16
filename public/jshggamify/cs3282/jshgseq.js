/*!
 * Javascript Hand Gesture Plugin (JSHG) - jQuery Plugin
 * version: 1.0 (12, April 2014)
 * requires jQuery v1.6 or later
 *
 * Copyright 2014 NUS & HCM
 *
 */
 /* ------ WORKER --------- */
INIT_REQUEST = "initRequest";
LEARNING_REQUEST = "learningRequest";
DETECT_REQUEST = "detectRequest";
H_BOUND_LEARN = 15;
S_BOUND_LEARN = 0.15;
V_BOUND_LEARN = 0.15;
var learningPoints_ = []
var skinColorBounds_ = [];
var responseScale_ = [1, 1];
var responseThreshImage_ = false;
var debugMode_ = false;
function trackHand(frame) {
    //var startTime = new Date().getTime();
    var response = {"handPos": null, "fingers": null, "threshImage": null, "debugInfo": null};
    if (!frame || skinColorBounds_.length == 0)
        return response;
    var medianWindow = 5;
    var jscvImage = new jscv.coredt.Image(frame.width, frame.height, jscv.uint8Clamped, frame.data.buffer);
    jscvImage.colorMode = jscv.COLOR_RGBA;
    var thresholdedImage = jscv.imgproc.colorThreshold(jscvImage, skinColorBounds_, jscv.COLOR_HSV);
    var blurImage = jscv.imgproc.boxBlur(thresholdedImage, medianWindow);
    var secondThreshImage = jscv.imgproc.threshold(blurImage, jscv.THRESH_BINARY, 50, 255);
    var contours = jscv.cv.findContours(secondThreshImage);
    var maxDefects = null, maxHull, maxArea, maxIndex;
    maxArea = 0;
    maxIndex = 0;
    var center =  new jscv.coredt.Point();
    for(var i = 0; i < contours.length; ++i) {
        var defects = jscv.geometry.findConvexDefects(contours[i].contour, true);
        if (defects[1].length > 3) {
            var bound = jscv.geometry.boundingRect(defects[1]);
            var area = Math.abs(bound[0].x - bound[1].x) * 
                        Math.abs(bound[1].y - bound[2].y);
            var cx = (bound[0].x + bound[1].x + bound[2].x + bound[3].x)/4;
            var cy = (bound[0].y + bound[1].y + bound[2].y + bound[3].y)/4;
            if (area > maxArea) {
                center.x = cx;
                center.y = cy;
                maxArea = area;
                maxDefects = defects;
                maxHull =  defects[1];
                maxIndex = i;
            }
        }
    }
    defects = [];
    hull = []
    if (maxDefects != null) {
        defects = maxDefects[0];
        hull = maxDefects[1];
    }
    var fingerDefects = [];
    //Find fingers
    for (var i = 0; i < defects.length; ++i) {
        var defect = defects[i];
        var d12 = Math.sqrt(Math.pow(defect.startP.x - defect.depthP.x,2) + Math.pow(defect.startP.y - defect.depthP.y,2));
        var d13 = Math.sqrt(Math.pow(defect.endP.x - defect.depthP.x,2) + Math.pow(defect.endP.y - defect.depthP.y,2));
        var d23 = Math.sqrt(Math.pow(defect.startP.x - defect.endP.x,2) + Math.pow(defect.startP.y - defect.endP.y,2));
        var angle = Math.acos((Math.pow(d12, 2) + Math.pow(d13,2) - Math.pow(d23,2)) / (2* d12 * d13));
        if((angle*180/Math.PI) < 80 && defect.depth > 3) {
            fingerDefects.push(defect);
        }
    }
    var hullLines = [];
    for(var i = 0; i < hull.length; ++i) {
        hullLines[i] = new jscv.coredt.Line(hull[i], hull[(i+1)%hull.length]);
    }
    var defectLines = []
    for(var i = 0; i < fingerDefects.length; ++i) {
        defectLines[i*2] = new jscv.coredt.Line(fingerDefects[i].startP, fingerDefects[i].depthP);
        defectLines[i*2+1] = new jscv.coredt.Line(fingerDefects[i].endP, fingerDefects[i].depthP);
    }
    var fingers = [];
    if (fingerDefects.length > 0) {
        fingers[0] = [fingerDefects[0].startP.x, fingerDefects[0].startP.y];
        for(var i = 0; i < fingerDefects.length-1; ++i) {
            var avgX = (fingerDefects[i].endP.x + fingerDefects[i+1].startP.x) / 2;
            var avgY = (fingerDefects[i].endP.y + fingerDefects[i+1].startP.y) / 2;
            var avgPoint = new jscv.coredt.Point(avgX, avgY);
            fingers.push([avgPoint.x, avgPoint.y]);
        }
        fingers.push([fingerDefects[fingerDefects.length-1].endP.x, fingerDefects[fingerDefects.length-1].endP.y]);
    }
    response.handPos = [center.x, center.y];
    response.fingers = fingers;
    if (responseThreshImage_) {
        var responseThreshImage = jscv.imgproc.resizeMult(secondThreshImage, responseScale_[0], responseScale_[1]);
        response.threshImage = responseThreshImage.data.data;
    }

    if (debugMode_ == true) {
        response.debugInfo = {"contour" : contours[maxIndex], "hullLines": hullLines, "defectLines": defectLines}
    }
    
    //console.log(new Date().getTime() - startTime);
    return response;
}
function learnSkinColors(frame) {
    var hBound = H_BOUND_LEARN;
    var sBound = S_BOUND_LEARN;
    var vBound = V_BOUND_LEARN;
    var jscvImage = new jscv.coredt.Image(frame.width, frame.height, jscv.uint8Clamped, frame.data.buffer);
    var hsvImage = jscv.imgproc.convertColor(jscvImage, jscv.COLOR_HSV);
    skinColorBounds_ = new Array(learningPoints_.length);
    var response = new Array(learningPoints_.length);
    for (var i = 0; i < learningPoints_.length; ++i) {
        var px = parseInt(learningPoints_[i][0]);
        var py = parseInt(learningPoints_[i][1]);

        var h = hsvImage.data.get(py, px, 0);
        var s = hsvImage.data.get(py, px, 1);
        var v = hsvImage.data.get(py, px, 2);
        response[i] = [h, s, v];
        skinColorBounds_[i] = new jscv.imgproc.Bound(h-hBound, h+hBound, 
                                              s-sBound, s+sBound, 
                                              v-vBound, v+vBound);
    }
    return response;
}
function createColorBounds(hsvColors) {
    var hBound = H_BOUND_LEARN;
    var sBound = S_BOUND_LEARN;
    var vBound = V_BOUND_LEARN;
    skinColorBounds_ = new Array(hsvColors.length);
    var h, s, v;
    for (var i = 0; i < hsvColors.length; ++i) {
        h = hsvColors[i][0];
        s = hsvColors[i][1];
        v = hsvColors[i][2]; 
        skinColorBounds_[i] = new jscv.imgproc.Bound(h-hBound, h+hBound, 
                                              s-sBound, s+sBound, 
                                              v-vBound, v+vBound);        
    }
}
function init(data) {
    debugMode_ = data.debugMode;
    responseScale_ = data.responseScale;
    createColorBounds(data.skinColors);
    learningPoints_ = data.learningPoints;
    responseThreshImage_ = data.responseThreshImage;
    jscv.USE_JS_ARRAY_FLAG_ = true;
}
function workerReceiver(receivedData) {
    var response = null;
    if (receivedData.type == INIT_REQUEST) {
        init(receivedData.data);
    } else if (receivedData.type == LEARNING_REQUEST) {
        response = learnSkinColors(receivedData.data);
    } else {
        response = trackHand(receivedData.data);
    }
    return {"type": receivedData.type, "data": response};
}






var JSHG = {};
/* ------- CONSTANTS ------- */
JSHG.INIT_PARAMETERS = {
    "actionCallback": "function", 
    "learnCallback": "function", 
    "learnDivId": "string", 
    "gestureDivId": "string", 
    "settings": "object", 
    "workerConfig": "object"
};
JSHG.WEBCAM_ID = "jshgWebcam";
JSHG.VIDEO_CANVAS_ID = "jshgVideoCanvas";
JSHG.GESTURE_CANVAS_ID = "jshgGestureCanvas";
JSHG.LEARNING_MESSAGE_ID = "jshgLearningMessage";
JSHG.WORKER_INIT_REQUEST = "initRequest";
JSHG.WORKER_LEARN_REQUEST = "learningRequest";
JSHG.WORKER_DETECT_REQUEST = "detectRequest";
JSHG.ACTIONS_BUFFER_SIZE = 3;
JSHG.LEARNING_MESSAGE = "Please place your hand over the dots. The learning process is running in ";
JSHG.EPSILON = 0.0001;

/* ------- DATA STRUCTURE ------ */
JSHG.HandGesture = function() {
    function HandGesture() {
        if (arguments.length == 6) {
            this.isLeft = arguments[0];
            this.isRight = arguments[1];
            this.isUp = arguments[2];
            this.isDown = arguments[3];
            this.nFingers = arguments[4];
            this.handPos = arguments[5];
        } else {
            this.isLeft = false;
            this.isRight = false;
            this.isUp = false;
            this.isDown = false;
            this.nFingers = 0;
            this.handPos = [-1, -1]; // relative to the gestureDisplayWidth & gestureDisplayHeight
        }
    }
    HandGesture.prototype = {
        "isSameRelativePos" : function(obj) {
            // make sure the same type
            if (!(obj instanceof HandGesture)) {
                return false;
            }
            if (obj.isLeft == this.isLeft && 
                obj.isRight == this.isRight && 
                obj.isUp == this.isUp && 
                obj.isDown == this.isDown) {
                return true;
            }
            return false;
        },
        "isSameAbsolutePos" : function(obj) {
            if (!(obj instanceof HandGesture)) {
                return false;
            }

            if (Math.abs(obj.handPos[0] - this.handPos[0]) < JSHG.EPSILON
                && Math.abs(obj.handPos[1] - this.handPos[1]) < JSHG.EPSILON)
                return true;
            return false;           
        },
        "isSameNFingers" : function(obj) {
            if (!(obj instanceof HandGesture)) {
                return false;
            }

            if (obj.nFingers == this.nFingers)
                return true;
            return false;
        },
        "equals" : function(obj) {
            // make sure the same type
            if (!(obj instanceof HandGesture)) {
                return false;
            }
            
            if (this.isSameAbsolutePos(obj) && this.nFingers == obj.nFingers) {
                return true;
            }
            return false;
        }
    }
    return HandGesture;
}();


/* ------- PRIVATE FUNCTION ------- */

JSHG.resetVariables_ = function() {
    // for settings
    JSHG.settings_ = {};
    JSHG.settings_["cameraWidth"] = 500;
    JSHG.settings_["cameraHeight"] = 400;
    JSHG.settings_["gestureDisplayWidth"] = 125;
    JSHG.settings_["gestureDisplayHeight"] = 100;
    JSHG.settings_["actionRate"] = -1; // per second, -1 means calling when worker finishes the frame.
    JSHG.settings_["learningCountDown"] = 10; // seconds
    JSHG.settings_["learningPoints"] = [];
    JSHG.settings_["skinColors"] = [];
    JSHG.settings_["centralAreaRatio"] = 1/3;
    JSHG.settings_["colorLearningPoints"] = "yellow";
    JSHG.settings_["colorBoundingLines"] = "white";
    JSHG.settings_["colorHandPos"] = "red";
    JSHG.settings_["colorFingerPos"] = "yellow";
    JSHG.settings_["workerFilePath"] = "../jshg/gestureRecognizer.js";
    JSHG.settings_["debugMode"] = false;
    // dom comp
    JSHG.video_ = null;
    if (JSHG.videoCanvas_) {
        JSHG.videoCanvas_.remove();
    }
    JSHG.videoCanvas_ = null;
    JSHG.videoCanvasctx_ = null;
    if (JSHG.gestureCanvas_) {
        JSHG.gestureCanvas_.remove();
    }
    JSHG.gestureCanvas_ = null;
    JSHG.gestureCanvasctx_ = null;
    if (JSHG.learningMessage_) {
        JSHG.learningMessage_.remove();
    }
    JSHG.learningMessage_ = null;
    // worker
    JSHG.grWorker_ = null;
    // config
    JSHG.learningArea_ = null;
    JSHG.gestureArea_ = null;
    // callback
    JSHG.actionCallback_ = null;
    JSHG.learnCallback_ = null
    // ids
    JSHG.reqFrameReaderId_ = 0;
    JSHG.actionIntervalId_ = 0;
    JSHG.countDownId_ = 0;
    // buffer
    JSHG.gestures_ = [];
    // state
    JSHG.isRunning_ = false;
    JSHG.isLearning_ = false;
    JSHG.isWorkerBusy_ = false;
    JSHG.learningCountDown_ = 0;
    JSHG.lastGesture_ = null;
    JSHG.handInfo_ = null;
    // performance
    JSHG.performance_ = {"nFrame": 0, "elapsed": 0, "lastTime": 0};
}
// generates a list of pixel points for learning skin color.
JSHG.initLearningPoints_ = function() {
    if (JSHG.settings_["learningPoints"] == null || JSHG.settings_["learningPoints"].length == 0) {
        var centralX = JSHG.settings_["cameraWidth"]/2;
        var centralY = JSHG.settings_["cameraHeight"]/2;
        var radius = JSHG.settings_["cameraWidth"]/4;
        if (radius > 60) radius = 60;
        JSHG.settings_["learningPoints"] = [
            [centralX, centralY - radius],
            [centralX - radius, centralY], [centralX, centralY], [centralX + radius, centralY],
            [centralX, centralY + radius]
        ];
    }
}
// loads the saved skin colors if user does not provide.
JSHG.initSkinColors_ = function() {
    if (JSHG.settings_["skinColors"] == null || JSHG.settings_["skinColors"].length == 0) {
        // load localstorage for learnedColor
        if (localStorage && localStorage.getItem("skinColors")) {
            JSHG.settings_["skinColors"] = JSON.parse(localStorage.getItem("skinColors"));
        } else {
            JSHG.settings_["skinColors"] = [[340, 0.07,0.45]];
        }
    } else {
        if (localStorage) {
            localStorage.setItem('skinColors', JSON.stringify(JSHG.settings_["skinColors"]));
        }
    }
}
// initialize the worker thread to recognize the hand gesture
JSHG.initWorker_ = function(configs) {
    if (JSHG.grWorker_) return;

    var workerInit = {};
    workerInit["debugMode"] = JSHG.settings_["debugMode"];
    workerInit["learningPoints"] = JSHG.settings_["learningPoints"];
    workerInit["skinColors"] = JSHG.settings_["skinColors"];
    workerInit["configs"] = configs;
    workerInit["responseScale"] = [JSHG.settings_["gestureDisplayWidth"]/JSHG.settings_["cameraWidth"], 
                                   JSHG.settings_["gestureDisplayHeight"]/JSHG.settings_["cameraHeight"]];
    if (JSHG.gestureArea_)
        workerInit["responseThreshImage"] = true;
    else
        workerInit["responseThreshImage"] = false;
    JSHG.grWorker_ = 1;
    JSHG.postWorkerMsg_(JSHG.WORKER_INIT_REQUEST, workerInit);
}
// create the DOM components to host camera video, canvases
JSHG.initDOMComponents_ = function() {
    JSHG.video_ = $('<video/>',{'id':JSHG.WEBCAM_ID}).attr({
                    'width':JSHG.settings_["cameraWidth"],
                    'height':JSHG.settings_["cameraHeight"]});
    JSHG.videoCanvas_ = $('<canvas/>',{'id':JSHG.VIDEO_CANVAS_ID}).attr({
                    'width':JSHG.settings_["cameraWidth"],
                    'height':JSHG.settings_["cameraHeight"]});
    JSHG.videoCanvasctx_ = JSHG.videoCanvas_[0].getContext('2d');
    JSHG.learningMessage_ = $('<p/>',{'id':JSHG.LEARNING_MESSAGE_ID});

    if (JSHG.gestureArea_) {
        // only create the gesture output canvas when user requests
        JSHG.gestureCanvas_ = $('<canvas/>',{'id':JSHG.GESTURE_CANVAS_ID}).attr({
                    'width':JSHG.settings_["gestureDisplayWidth"],
                    'height':JSHG.settings_["gestureDisplayHeight"]});
        JSHG.gestureCanvasctx_ = JSHG.gestureCanvas_[0].getContext('2d');
    }
}
// register video tag with web camera to start reading frames
JSHG.startVideo_ = function() {
    try{
        compatibility.getUserMedia({video: true}, function(stream) {
            try {
                JSHG.video_.attr("src", compatibility.URL.createObjectURL(stream));
            } catch (error) {
                JSHG.video_.attr("src", stream);
            }
            setTimeout(function() {
                JSHG.video_[0].play();
                JSHG.reqFrameReaderId_ = compatibility.requestAnimationFrame(JSHG.readFrame_);
                if (JSHG.settings_["actionRate"] > 0) {
                    JSHG.actionIntervalId_ = setInterval(JSHG.scheduleAction_, 1000/JSHG.settings_["actionRate"]);
                }
                if (JSHG.isLearning_) {
                    JSHG.startLearning_();  
                }
                JSHG.isRunning_ = true;
            }, 500);
        }, function (error) {
            // WebRTC not available.
        });
    } catch (error) {
        // something goes wrong...
    }    
}
// resume getting the camera frame
JSHG.resumeVideo_ = function() {
    if (!JSHG.video_) return;

    JSHG.video_[0].play();
    JSHG.reqFrameReaderId_  = compatibility.requestAnimationFrame(JSHG.readFrame_);
    if (JSHG.settings_["actionRate"] > 0) {
        JSHG.actionIntervalId_ = setInterval(JSHG.scheduleAction_, 1000/JSHG.settings_["actionRate"]);
    }
    JSHG.isRunning_ = true;
}

JSHG.showLearningCanvas_ = function() {
    if (!JSHG.learningArea_) return;
    JSHG.learningArea_.append(JSHG.videoCanvas_);
    JSHG.learningArea_.append(JSHG.learningMessage_);
}
JSHG.hideLearningCanvas_ = function() {
    if (!JSHG.learningArea_) return;
    if (JSHG.settings_["debugMode"] == false) {
        JSHG.videoCanvas_.remove();
    }
    JSHG.learningMessage_.remove();
}
JSHG.showGestureCanvas_ = function() {
    if (!JSHG.gestureArea_) return;
    JSHG.gestureArea_.append(JSHG.gestureCanvas_);
}
JSHG.hideGestureCanvas_ = function() {
    if (!JSHG.gestureArea_) return;
    JSHG.gestureCanvas_.remove();  
}

// start the learning process
JSHG.startLearning_ = function() {
    JSHG.learningCountDown_ = JSHG.settings_["learningCountDown"];
    clearTimeout(JSHG.countDownId_);
    JSHG.showLearningCanvas_();
    JSHG.hideGestureCanvas_();

    function countDown() {
        JSHG.learningCountDown_ -= 1;
        if (JSHG.learningCountDown_ > 0) {
            JSHG.learningMessage_.html(JSHG.LEARNING_MESSAGE + JSHG.learningCountDown_);
            JSHG.countDownId_ = setTimeout(countDown, 1000);
        } else {
            JSHG.countDownId_ = 0;
            JSHG.learningMessage_.html("Please wait ...");
        }
    }
    JSHG.countDownId_ = setTimeout(countDown, 1000);
}

// the frame from camera is read and proceeded here
JSHG.readFrame_ = function() {
    if (!JSHG.video_ || JSHG.video_[0].paused) return;

    if (JSHG.video_[0].readyState === JSHG.video_[0].HAVE_ENOUGH_DATA) {
        try {
            JSHG.videoCanvasctx_.drawImage(JSHG.video_[0], 0, 0, JSHG.videoCanvas_[0].width, JSHG.videoCanvas_[0].height);
            var frame = JSHG.videoCanvasctx_.getImageData(0, 0, JSHG.videoCanvas_[0].width, JSHG.videoCanvas_[0].height);

            if (!JSHG.isLearning_) { // normal running mode

                if (JSHG.settings_["debugMode"]) {
                    // record performance
                    if (JSHG.performance_.nFrame > 0) {
                        JSHG.performance_.elapsed += new Date().getTime() - JSHG.performance_.lastTime;
                    }
                    JSHG.performance_.nFrame++;
                    JSHG.performance_.lastTime = new Date().getTime();
                }

                // skip frame if the worker is busy
                JSHG.postWorkerMsg_(JSHG.WORKER_DETECT_REQUEST, frame);
            } else { // learning mode
                if (JSHG.learningCountDown_ == 0) {
                    JSHG.postWorkerMsg_(JSHG.WORKER_LEARN_REQUEST, frame);
                    JSHG.learningCountDown_ = JSHG.settings_["learningCountDown"];
                }
                JSHG.drawLearningPoints_();
            }
        } catch (e) {
            if (e.name == "NS_ERROR_NOT_AVAILABLE") {
                // a bug in firefox for hgCtx.drawImage(video)  
            } else {
                console.log("Error: " + e);
            }
        }
    }
    
    JSHG.reqFrameReaderId_ = compatibility.requestAnimationFrame(JSHG.readFrame_);
}

// post the message to the worker
JSHG.postWorkerMsg_ = function(type, data) {
    if (!JSHG.grWorker_) return;


    JSHG.isWorkerBusy_ = true;
    var receivedData = workerReceiver({
        "type" : type, 
        "data" : data
    })
    if (!JSHG.video_ || JSHG.video_[0].paused || (JSHG.isLearning_ && receivedData.type != JSHG.WORKER_LEARN_REQUEST)) {
        JSHG.isWorkerBusy_ = false; 
        return;
    }

    if (receivedData.type == JSHG.WORKER_INIT_REQUEST) {
        // finish config worker

    } else if (receivedData.type == JSHG.WORKER_LEARN_REQUEST) {
        JSHG.settings_["skinColors"] = receivedData.data;
        // remember skin colors for next times
        if (localStorage) {
            localStorage.setItem('skinColors', JSON.stringify(JSHG.settings_["skinColors"]));
        }
        JSHG.isLearning_ = false;
        JSHG.learningMessage_.html("");
        JSHG.hideLearningCanvas_();
        JSHG.showGestureCanvas_();
        if (JSHG.learnCallback_ != null)
            JSHG.learnCallback_();

    } else if (receivedData.type == JSHG.WORKER_DETECT_REQUEST) {
        // save state
        JSHG.handInfo_ = receivedData.data;
        JSHG.genGesture_();
        if (JSHG.settings_["actionRate"] <= 0) {
            JSHG.scheduleAction_();
        }
        JSHG.drawHandInfo_();
    }
    JSHG.isWorkerBusy_ = false; 
}

// the worker returns the information about the hand, 
// this function generates the corresponding gestures based on thet information
JSHG.genGesture_ = function() {
    var handInfo = JSHG.handInfo_;
    
    var gesture = new JSHG.HandGesture(); 
    var w = JSHG.settings_["cameraWidth"], h = JSHG.settings_["cameraHeight"];
    var centralAreaWidth = JSHG.settings_["cameraWidth"] * JSHG.settings_["centralAreaRatio"];
    var centralAreaHeight = JSHG.settings_["cameraHeight"] * JSHG.settings_["centralAreaRatio"];

    if (handInfo.handPos) {
        gesture.handPos = [handInfo.handPos[0] * JSHG.settings_["gestureDisplayWidth"]/w, handInfo.handPos[1] * JSHG.settings_["gestureDisplayHeight"]/h];
        if (handInfo.fingers)
            gesture.nFingers = handInfo.fingers.length; 

        // LEFT - RIGHT
        if (handInfo.handPos[0] < (w - centralAreaWidth)/2) {
            gesture.isLeft =  true;
        } else if (handInfo.handPos[0] > (w + centralAreaWidth)/2) {
            gesture.isRight =  true;
        }

        // TOP - DOWN
        if (handInfo.handPos[1] < (h - centralAreaHeight)/2) {
            gesture.isUp =  true;
        } else if (handInfo.handPos[1] > (h + centralAreaHeight)/2) {
            gesture.isDown =  true;        
        }
    }      

    JSHG.gestures_.push(gesture);
    if (JSHG.gestures_.length > JSHG.ACTIONS_BUFFER_SIZE)
        JSHG.gestures_.shift();
}

JSHG.scheduleAction_ = function() {
    if (JSHG.gestures_.length > 0) {
        JSHG.lastGesture_ = JSHG.gestures_.shift();
    }

    // if there is not any new gesture, use the latest one.
    if (JSHG.lastGesture_ != null) {
        JSHG.actionCallback_(JSHG.lastGesture_);
    }
}


JSHG.drawHandInfo_ = function() {
    if (!JSHG.gestureArea_) return;

    var w = JSHG.settings_["gestureDisplayWidth"];
    var h = JSHG.settings_["gestureDisplayHeight"];
    var ratioW = w/JSHG.settings_["cameraWidth"];
    var ratioH = h/JSHG.settings_["cameraHeight"];
    var centralAreaWidth = w * JSHG.settings_["centralAreaRatio"];
    var centralAreaHeight = h * JSHG.settings_["centralAreaRatio"];

    // draw threshold
    if (JSHG.handInfo_ && JSHG.handInfo_.threshImage) {
        var canvasImage= JSHG.gestureCanvasctx_.createImageData(JSHG.gestureCanvas_[0].width, JSHG.gestureCanvas_[0].height);
        var totalSize = JSHG.handInfo_.threshImage.length; // pixel
        var ind = 0;
        for (var pixel = 0; pixel < totalSize; pixel++) {
            canvasImage.data[ind] = canvasImage.data[ind + 1] = canvasImage.data[ind + 2] = JSHG.handInfo_.threshImage[pixel];
            canvasImage.data[ind + 3] = 155;
            ind += 4;
        }
        JSHG.gestureCanvasctx_.putImageData(canvasImage, 0, 0);
    } else {
        JSHG.gestureCanvasctx_.drawImage(JSHG.videoCanvas_[0], 0, 0, w, h);
    }
    

    // draw dash line
    JSHG.gestureCanvasctx_.strokeStyle = JSHG.settings_["colorBoundingLines"];
    JSHG.gestureCanvasctx_.beginPath();
    JSHG.gestureCanvasctx_.setLineDash([1]);
    JSHG.gestureCanvasctx_.rect((w - centralAreaWidth)/2, 0, centralAreaWidth, h);
    JSHG.gestureCanvasctx_.rect(0, (h - centralAreaHeight)/2, w, centralAreaHeight);
    JSHG.gestureCanvasctx_.stroke();

    // draw hand pos
    if (JSHG.handInfo_) {

        if (JSHG.settings_["debugMode"]) {
            debugInfo = JSHG.handInfo_.debugInfo;
            drawContour([debugInfo.contour.contour], JSHG.gestureCanvasctx_, ["#FF0000"]);
            drawLines(debugInfo.hullLines, JSHG.gestureCanvasctx_, ["#00FFFF"]);
            drawLines(debugInfo.defectLines, JSHG.gestureCanvasctx_, ["#FF00FF"]);
        }

        if (JSHG.handInfo_.handPos && JSHG.handInfo_.handPos.length == 2) {
            JSHG.gestureCanvasctx_.fillStyle = JSHG.settings_["colorHandPos"];
            var x = JSHG.handInfo_.handPos[0] * ratioW;
            var y = JSHG.handInfo_.handPos[1] * ratioH;
            JSHG.gestureCanvasctx_.fillRect(x, y, 20*ratioW, 20*ratioH);
        }
        if (JSHG.handInfo_.fingers && JSHG.handInfo_.fingers.length > 0) {
            for (var i = 0; i < JSHG.handInfo_.fingers.length; i++) {
                JSHG.gestureCanvasctx_.fillStyle = JSHG.settings_["colorFingerPos"];
                var x = JSHG.handInfo_.fingers[i][0] * ratioW;
                var y = JSHG.handInfo_.fingers[i][1] * ratioW;                
                JSHG.gestureCanvasctx_.fillRect(x, y, 10*ratioW, 10*ratioH);                
            }
        }
    }
}

JSHG.drawLearningPoints_ = function() {
    JSHG.videoCanvasctx_.strokeStyle = JSHG.settings_["colorLearningPoints"];
    for (var i = 0; i < JSHG.settings_["learningPoints"].length; ++i) {
        JSHG.videoCanvasctx_.beginPath();
        JSHG.videoCanvasctx_.arc(JSHG.settings_["learningPoints"][i][0], JSHG.settings_["learningPoints"][i][1], 2, 0, 2*Math.PI);
        JSHG.videoCanvasctx_.stroke();
    }
}


/* ------- PUBLIC API ------- */

JSHG.init = function(arguments) {
    if (JSHG.grWorker_) {
        throw "JSHG is already created."
    }
    // verify the type of arguments
    for (var arg in arguments) {
        if (arg in JSHG.INIT_PARAMETERS && typeof(arguments[arg]) != JSHG.INIT_PARAMETERS[arg])
            throw "the typeof " + arg + "is incorrect. \
                   It must be " + JSHG.INIT_PARAMETERS[arg] + " instead of " + typeof(arguments[arg]);
    }

    JSHG.resetVariables_();

    // actionCallback is compulsory
    if (!("actionCallback" in arguments))
        throw "actionCallback is required!";
    JSHG.actionCallback_ = arguments["actionCallback"];
    if ("learnCallback" in arguments)
        JSHG.learnCallback_ = arguments["learnCallback"];
    if ("learnDivId" in arguments)
        JSHG.learningArea_ = $("#" + arguments["learnDivId"]);
    if ("gestureDivId" in arguments)
        JSHG.gestureArea_ = $("#" + arguments["gestureDivId"]);

    // verify settings
    if ("settings" in arguments) {
        var settings = arguments["settings"];
        for (var prop in settings) {
            if (prop in JSHG.settings_) {
                if (typeof(settings[prop]) == typeof(JSHG.settings_[prop])) {
                    JSHG.settings_[prop] = settings[prop];
                } else {
                    throw "the typeof settings[" + prop +"] is incorrect. \
                           It must be " + typeof(JSHG.settings_[prop]) +" instead of " + typeof(settings[prop]);
                }
            }
        }
    }
    // init
    JSHG.initLearningPoints_();
    JSHG.initSkinColors_();
    JSHG.initWorker_(arguments["workerConfig"]);
    JSHG.initDOMComponents_();
};

JSHG.run = function() {
    if (JSHG.grWorker_ == null)
        throw "JSHG must be initialized first."
    if (JSHG.isRunning_)
        return;

    if (!JSHG.video_.attr("src")) {
        // first time
        JSHG.startVideo_ ();
    } else {
        JSHG.resumeVideo_();
    }
    JSHG.showGestureCanvas_();
    if (JSHG.settings_["debugMode"]) {
        JSHG.showLearningCanvas_();
    }
}

JSHG.learnSkinColor = function() {
    if (JSHG.grWorker_ == null)
        throw "JSHG must be initialized first."

    JSHG.isLearning_  = true;
    if (JSHG.isRunning_) {
        JSHG.startLearning_();
    } else {
        if (!JSHG.video_.attr("src")) {
            // first time
            JSHG.startVideo_ ();
        } else {
            JSHG.resumeVideo_();
            JSHG.startLearning_();
        }
    }
}

JSHG.stop = function() {
    if (JSHG.video_ == null || JSHG.video_[0].paused) return;

    if (JSHG.settings_["debugMode"] == false) {
        JSHG.hideLearningCanvas_();
        JSHG.hideGestureCanvas_();
    }

    JSHG.video_[0].pause();
    compatibility.cancelAnimationFrame(JSHG.reqFrameReaderId_);
    if (JSHG.settings_["actionRate"] > 0) {
        clearInterval(JSHG.actionIntervalId_);
    }
    clearTimeout(JSHG.countDownId_);

    JSHG.frames_ = [];
    JSHG.gestures_ = [];
    JSHG.lastGesture_ = null;
    JSHG.handInfo_ = null;
    JSHG.isRunning_ = false;

    if (JSHG.isLearning_ == true && JSHG.learnCallback_ !=null)
        JSHG.learnCallback_();
    JSHG.isLearning_ = false;
    JSHG.isWorkerBusy_ = false;
}

JSHG.delete = function() {
    JSHG.stop();
    JSHG.resetVariables_();
}

JSHG.isRunning = function() {
    return JSHG.isRunning_;
}

JSHG.isInitialized = function() {
    if (JSHG.grWorker_) {
        return true;
    }
    return false;
}

