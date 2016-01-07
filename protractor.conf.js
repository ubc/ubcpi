exports.config = {
	//seleniumAddress: 'http://localhost:4444/wd/hub',
   	seleniumServerJar: 'node_modules/protractor/selenium/selenium-server-standalone-2.47.1.jar',
	specs: [
		'ubcpi/static/js/features/*.feature'
	],
    framework: 'cucumber',
    capabilities: {
        browserName: 'phantomjs',
        'phantomjs.binary.path': 'node_modules/phantomjs/bin/phantomjs',
        'phantomjs.cli.args': '--debug=true --webdriver --webdriver-logfile=webdriver.log --webdriver-loglevel=DEBUG',
        version: '',
        platform: 'ANY'
    },
    cucumberOpts: {
        format: 'pretty'
    },
    params: {
        'cmsUrl': 'http://127.0.0.1:8001',
        'lmsUrl': 'http://127.0.0.1:8000'
    }
};
