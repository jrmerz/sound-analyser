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
  app.canvasCtx.fillStyle = 'black'
  app.canvasCtx.fillRect(0, 0, app.width, app.height);

  app.canvasCtx.lineWidth = 2;
  app.canvasCtx.strokeStyle = 'white';


  var barWidth = (app.height / (app.max / 2));
  var barHeight;
  var y = app.height-barWidth, v;

  var middle = app.width / 2;


  app.count++;

  for(var i = 0; i < app.max / 2; i++) {
    barHeight = dataArray[i] * 1.5;

    //v = (app.width / 2) - barHeight;

    app.canvasCtx.fillStyle = 'rgb(0,' + (barHeight+100) + ',0)';
    app.canvasCtx.fillRect(middle, y, barHeight, barWidth);
    app.canvasCtx.fillRect(middle-barHeight, y, barHeight, barWidth);

    //app.average[i][0] += v;
    app.average[i][0] += barHeight;
    app.average[i][1] = app.average[i][0] / app.count;

    y -= barWidth + 1;
  }


  // for best fit
  var xValues = [];
  var yValues = [];

  y = app.height-barWidth;
  app.canvasCtx.beginPath();
  for( var i = 0; i < app.average.length; i++ ) {

    if(i === 0) {
      app.canvasCtx.moveTo(middle+app.average[i][1], y);
    } else {
      app.canvasCtx.lineTo(middle+app.average[i][1], y);
    }
    xValues.push(i);
    //yValues.push(dataArray[i]);
    yValues.push(app.average[i][1]);

    y -= barWidth + 1;
  }
  app.canvasCtx.stroke();

  y = app.height-barWidth;
  app.canvasCtx.beginPath();
  for( var i = 0; i < app.average.length; i++ ) {
    if(i === 0) {
      app.canvasCtx.moveTo(middle-app.average[i][1], y);
    } else {
      app.canvasCtx.lineTo(middle-app.average[i][1], y);
    }
    y -= barWidth + 1;
  }
  app.canvasCtx.stroke();

  app.canvasCtx.strokeStyle = 'red';
  var points = findLineByLeastSquares(xValues, yValues);

  app.canvasCtx.beginPath();
  app.canvasCtx.moveTo(middle+points[1][1], 0);
  app.canvasCtx.lineTo(middle+points[0][1], app.height);
  app.canvasCtx.stroke();

  app.canvasCtx.beginPath();
  app.canvasCtx.moveTo(middle-points[1][1], 0);
  app.canvasCtx.lineTo(middle-points[0][1], app.height);
  app.canvasCtx.stroke();

  drawLabels(middle, barWidth);
}

function drawLabels(middle, barWidth) {
  for( var i = 1; i < app.max; i += 15) {
    var hz = (app.analyser.context.sampleRate / app.analyser.fftSize) * i;

    if( hz > 1000 ) hz = (hz / 1000).toFixed(1)+' kHz';
    else hz = Math.round(hz)+' Hz';

    app.canvasCtx.font = '14px Arial';
    app.canvasCtx.lineWidth = 2;

    app.canvasCtx.strokeStyle = '#888';
    app.canvasCtx.strokeText(hz, middle-20, app.height-(i*barWidth));
    app.canvasCtx.fillStyle = 'white';
    app.canvasCtx.fillText(hz, middle-20, app.height-(i*barWidth));

  }
}

// wire events
$(document).on('ready', onload);
$(window).on('resize', resize);
