var app = {
  count : 0,
  height: 400,
  width: 400,
  samples : 2048,
  maxRange : 1,
  max : 2048,
  //samples : 2048,
  average : []
};

var step = 1.0594;

var notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
var noteHz = [16.35];
for( var i = 1; i < 132; i++ ) noteHz.push(noteHz[i-1] * step);
for( var i = 0; i < 132; i++ ) {
  var mod = i % notes.length;
  noteHz[i] = [notes[mod], Math.round(noteHz[i])];
}

function onload() {
  $(window).css('overflow', 'none')
  resize();
  init();
}

function resize() {
  var win = $(window);
  app.height = win.height();
  app.width = win.width();

  $('canvas')
    .attr('width', app.width)
    .attr('height', app.height);

  $('select')
    .on('change', function() {
      app.samples = parseInt($('#samples').val());
      app.maxRange = parseFloat($('#zoom').val());
      app.max = app.samples * app.maxRange;
      reset();
    });


  if( app.analyser ) reset();
}

function reset() {
  app.analyser.fftSize = app.samples;
  var c = app.max / 2;
  app.average = [];
  for( var i = 0; i < c; i++ ) app.average.push([0,0]);
  app.count = 0;
}

function init() {
  app.peeksEle = document.querySelector('#peeks');

  app.canvasCtx = document.querySelector('canvas').getContext('2d');

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
  reset();
  draw();
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
  //var barWidth = app.height / 100;

  var barHeight;
  var y = app.height-barWidth, v;

  var middle = app.width / 2;


  app.count++;
  var l = app.max / 2;
  for(var i = 0; i < l; i++) {
    barHeight = dataArray[i] * 1.5;

    //v = (app.width / 2) - barHeight;

    app.canvasCtx.fillStyle = 'rgb(0,' + (barHeight+100) + ',0)';
    app.canvasCtx.fillRect(middle, y, barHeight, getBarWidth(barWidth, i));
    app.canvasCtx.fillRect(middle-barHeight, y, barHeight, getBarWidth(barWidth, i));

    //app.average[i][0] += v;
    app.average[i][0] += barHeight;
    app.average[i][1] = app.average[i][0] / app.count;

    y -= getBarWidth(barWidth, i) + 1;
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

    y -= getBarWidth(barWidth, i) + 1;
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
    y -= getBarWidth(barWidth, i) + 1;
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


  var hz, html = '', y;
  var peeks = getPeeks();

  app.canvasCtx.strokeStyle = 'orange';
  app.canvasCtx.fillStyle = 'orange';
  for( var i = 0; i < peeks.length; i++ ) {

    if( peeks[i][0] > 1000 ) hz = (peeks[i][0] / 1000).toFixed(1)+' kHz';
    else hz = Math.round(peeks[i][0])+' Hz';

    y = app.height-((getBarWidth(barWidth, i)+1)*(peeks[i][2]+1));

    app.canvasCtx.beginPath();
    app.canvasCtx.arc(middle-peeks[i][1], y, 5, 0, 2*Math.PI);
    app.canvasCtx.stroke();

    app.canvasCtx.fillText(hz, middle-peeks[i][1] - 75, y+(.5 * barWidth));

    app.canvasCtx.beginPath();
    app.canvasCtx.arc(middle+peeks[i][1], y, 5, 0, 2*Math.PI);
    app.canvasCtx.stroke();

    app.canvasCtx.fillText(hz, middle+peeks[i][1] + 10, y+(.5 * barWidth));

    app.canvasCtx.beginPath();
    app.canvasCtx.moveTo(middle+peeks[i][1], y);
    app.canvasCtx.lineTo(middle-peeks[i][1], y);
    app.canvasCtx.stroke();


    html += hz+'<br />';
  }

  app.peeksEle.innerHTML = html;
}

function getPeeks() {
  var peeks = [];
  var isGoingUp = false;


  for( var i = 1; i < app.average.length; i++ ) {
    if( (isGoingUp || i == 1) && app.average[i-1][1] > app.average[i][1] ) {
        isGoingUp = false;
        peeks.push([(app.analyser.context.sampleRate / app.analyser.fftSize) * i, app.average[i-1][1], i-1]);
    } else if( !isGoingUp && app.average[i-1][1] < app.average[i][1] ) {
      isGoingUp = true;
    }
  }

  peeks.sort(function(a,b){
    if( a[1] > b[1] ) return -1;
    if( a[1] < b[1] ) return 1;
    return 0;
  });

  return peeks.splice(0,10);
}

function drawLabels(middle, barWidth) {
  var skip = Math.round((app.max / 2) / 10);

  for( var i = 1; i < app.max; i += 100) {
    var hz = (app.analyser.context.sampleRate / app.analyser.fftSize) * i;

    if( hz > 1000 ) hz = (hz / 1000).toFixed(1)+' kHz';
    else hz = Math.round(hz)+' Hz';

    app.canvasCtx.font = '14px Arial';
    app.canvasCtx.lineWidth = 2;

    app.canvasCtx.strokeStyle = '#888';
    app.canvasCtx.strokeText(hz, middle-20, app.height-(i*getBarWidth(barWidth, i)));
    app.canvasCtx.fillStyle = 'white';
    app.canvasCtx.fillText(hz, middle-20, app.height-(i*getBarWidth(barWidth, i)));

  }

  drawOctaves(barWidth);
}

function drawOctaves(barWidth) {
  var j = 0, hz = noteHz[0][1];
  app.canvasCtx.strokeStyle = '#ccc';
  var count = 0;

  for( var i = 0; i < noteHz.length; i += 12 ) {

    while( hz < noteHz[i][1] ) {
      hz = (app.analyser.context.sampleRate / app.analyser.fftSize) * j;
      j++;
      count++;
    }

    var h = app.height-(j*getBarWidth(barWidth, i));

    app.canvasCtx.beginPath();
    app.canvasCtx.fillText('Octave: '+(i/12)+' ('+count+' samples/octave)', (i/12)*20, h-2);

    app.canvasCtx.moveTo(0, h);
    app.canvasCtx.lineTo(app.width, h);
    app.canvasCtx.stroke();

    count = 0;
  }
}

// TODO
function getBarWidth(barWidth, index) {
  return barWidth;
  /*var t = barWidth - ((index*step) / 5000 );
  if( t < 1 ) return 1;
  return t;*/
}


// wire events
$(document).on('ready', onload);
$(window).on('resize', resize);
