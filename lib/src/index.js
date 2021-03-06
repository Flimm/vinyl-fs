'use strict';

var assign = require('object-assign');
var through = require('through2');
var gs = require('glob-stream');
var File = require('vinyl');
var duplexify = require('duplexify');
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');
var filterSince = require('vinyl-filter-since');
var isValidGlob = require('is-valid-glob');

var getContents = require('./getContents');
var resolveSymlinks = require('./resolveSymlinks');

function createFile(globFile, enc, cb) {
  cb(null, new File(globFile));
}

function src(glob, opt) {
  var options = assign({
    read: true,
    buffer: true,
    sourcemaps: false,
    passthrough: false
  }, opt);

  var pass, inputPass;

  if (!isValidGlob(glob)) {
    throw new Error('Invalid glob argument: ' + glob);
  }
  // return dead stream if empty array
  if (Array.isArray(glob) && glob.length === 0) {
    pass = through.obj();
    if (!options.passthrough) {
      process.nextTick(pass.end.bind(pass));
    }
    return pass;
  }

  var globStream = gs.create(glob, options);

  var outputStream = globStream
    .pipe(resolveSymlinks())
    .pipe(through.obj(createFile));

  if (options.since != null) {
    outputStream = outputStream
      .pipe(filterSince(options.since));
  }

  if (options.read !== false) {
    outputStream = outputStream
      .pipe(getContents(options));
  }

  if (options.passthrough === true) {
    inputPass = through.obj();
    outputStream = duplexify.obj(inputPass, merge(outputStream, inputPass));
  }
  if (options.sourcemaps === true) {
    outputStream = outputStream
      .pipe(sourcemaps.init({loadMaps: true}));
  }
  globStream.on('error', outputStream.emit.bind(outputStream, 'error'));
  return outputStream;
}

module.exports = src;
