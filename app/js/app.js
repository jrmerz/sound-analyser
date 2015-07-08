var app = {
  count : 0,
  height: 400,
  width: 400,
  samples : 256,
  max : 180,
  //samples : 2048,
  average : []
};

function onload() {
  $(window).css('overflow', 'none')
  resize();
  init();
}

function resize() {
  var win = $(window);
  app.height = win.height();
  app.width = win.width();

  $(document.querySelector('canvas'))
    .attr('width', app.width)
    .attr('height', app.height);

  if( app.analyser ) reset();
}

function reset() {
  var c = app.max / 2;
  app.average = [];
  for( var i = 0; i < c; i++ ) app.average.push([0,0]);
  app.count = 0;
}

function init() {
  navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

  app.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  app.analyser = app.audioCtx.createAnalyser();

  if (navigator.getUserMedia) {
     console.log('getUserMedia supported.');
     navigator.getUserMedia (
        // constraints - only audio needed for this app
        {
           audio: true
        },

        // Success callback
        function(stream) {
           app.source = app.audioCtx.createMediaStreamSource(stream);
           app.source.connect(app.analyser);

        	 visualize();
        },

        // Error callback
        function(err) {
           console.log('The following gUM error occured: ' + err);
        }
     );
  } else {
     alert('getUserMedia not supported on your browser!');
  }
}

function visualize() {
  //app.analyser.fftSize = 2048;
  app.analyser.fftSize = app.samples;
  reset();

  app.canvasCtx = document.querySelector('canvas').getContext('2d');

  //setInterval(function(){
    draw();
  //}, 100);

}

function draw() {
  requestAnimationFrame(draw);

  var bufferLength = app.analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  app.analyser.getByteFrequencyData(dataArray);
  //app.analyser.getByteTimeDomainData(dataArray);

  app.canvasCtx.clearRect(0, 0, app.width, app.height);

  app.canvasCtx.lineWidth = 2;
  app.canvasCtx.strokeStyle = 'rgb(0, 0, 0)';


  var barWidth = (app.width / (app.max / 2));
  var barHeight;
  var x = 0, v;

  app.count++;

  for(var i = 0; i < app.max / 2; i++) {
    barHeight = dataArray[i] * 2.5;

    v = app.height - barHeight;

    app.canvasCtx.fillStyle = 'rgb(0,' + (barHeight+100) + ',0)';
    app.canvasCtx.fillRect(x, app.height-barHeight, barWidth, barHeight);

    app.average[i][0] += v;
    app.average[i][1] = app.average[i][0] / app.count;

    x += barWidth + 1;
  }

  app.canvasCtx.beginPath();

  // for best fit
  var xValues = [];
  var yValues = [];

  x = 0;
  for( var i = 0; i < app.average.length; i++ ) {

    if(i === 0) {
      app.canvasCtx.moveTo(x, app.average[i][1]);
    } else {
      app.canvasCtx.lineTo(x, app.average[i][1]);
    }
    xValues.push(i);
    //yValues.push(dataArray[i]);
    yValues.push(app.average[i][1]);

    x += barWidth + 1;
  }
  app.canvasCtx.stroke();

  app.canvasCtx.beginPath();
  app.canvasCtx.strokeStyle = 'red';
  var points = findLineByLeastSquares(xValues, yValues);
  //var points = jmCalc(xValues, yValues);
  /*for( var i = 0; i < points[0].length; i++ ) {
    if(i === 0) {
      app.canvasCtx.moveTo(points[1][i], points[0][i]);
    } else {
      app.canvasCtx.lineTo(points[1][i], points[0][i]);
    }
  }*/
  app.canvasCtx.moveTo(0, points[0][1]);
  app.canvasCtx.lineTo(app.width, points[1][1]);
  app.canvasCtx.stroke();
}

function jmCalc(xValues, yValues) {
  var avgSlope = 0, avgY = yValues[0];
  for( var i = 1; i < xValues.length; i++ ) {
    avgSlope += (yValues[i] - yValues[i-1]) / (xValues[i] - xValues[i-1]);
    avgY += yValues[i];
  }
  avgSlope = avgSlope / xValues.length-1;
  avgY = avgY / yValues.length;

  var b = avgY - (avgSlope * (xValues.length / 2));

  return [
    [0, b],
    [xValues[xValues.length-1], xValues[xValues.length-1] * avgSlope + b],
  ]

}

// wire events
$(document).on('ready', onload);
$(window).on('resize', resize);
