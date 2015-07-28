// Karma configuration

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: 'ubcpi/static/js',


    plugins: [
      'karma-coverage',
      'karma-jasmine',
	  'karma-jasmine-jquery',
      'karma-chrome-launcher',
      'karma-phantomjs-launcher',
      'karma-ng-html2js-preprocessor'
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [ 'jasmine-jquery', 'jasmine' ],


    // list of files / patterns to load in the browser
    files: [
      'lib/jquery.min.js',
      'lib/angular.js',
      'lib/angular-messages.js',
      'lib/angular-sanitize.js',
      'lib/jquery.cookie.js',
      'lib/d3.js',
      'https://code.angularjs.org/1.3.13/angular-mocks.js',
	  'https://cdnjs.cloudflare.com/ajax/libs/jasmine/2.3.4/jasmine.js',
	  'https://cdnjs.cloudflare.com/ajax/libs/jasmine/2.3.4/jasmine-html.js',
      'src/ubcpi.js',
      'src/*.js',
      'spec/*.js',
      // templates
      'partials/*.html',

      // fixtures
      {
        pattern: 'fixtures/*.html',
        served: true,
		included: false
      }
    ],


    // list of files to exclude
    exclude: [

    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/*.js': 'coverage',
      'partials/*.html': ['ng-html2js']
    },

    ngHtml2JsPreprocessor: {
      // custom transform function to reverse the $httpProvider.interceptor
      stripPrefix: 'partials/',
      prependPrefix: 'cache?f='
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],

    coverageReporter: {
        type : 'text'
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    // browsers: ['PhantomJS'],
    browsers: ['Chrome'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    // singleRun: true
    singleRun: false

  });

};
