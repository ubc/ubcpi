const puppeteer = require('puppeteer');
process.env.CHROME_BIN = puppeteer.executablePath();

exports.config = {
    //seleniumAddress: 'http://localhost:4444/wd/hub',
    seleniumServerJar: 'node_modules/protractor/selenium/selenium-server-standalone-2.47.1.jar',
    specs: [
        'ubcpi/static/js/features/*.feature'
    ],
    framework: 'cucumber',
    capabilities: {
        browserName: 'chrome',

        chromeOptions: {
            args: ["--headless", "--disable-gpu", "--window-size=800,600"]
        }
    },
    cucumberOpts: {
        format: 'pretty'
    },
    params: {
        'cmsUrl': 'http://127.0.0.1:8001',
        'lmsUrl': 'http://127.0.0.1:8000'
    }
};
