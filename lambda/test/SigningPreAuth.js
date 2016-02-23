console.log("Testing SigningPreAuth");

var fs = require('fs');
var st = require('st');
var https = require('https');
var assert = require('assert');
var sp = require('../SigningPreAuth.js');

describe('SigningPreAuth', function() {

    var port;
    var server;

    before(function(done) {
        // start a test HTTPS server
        var options = {
            key: fs.readFileSync(__dirname + '/server.key'),
            cert: fs.readFileSync(__dirname + '/server.crt')
        };
        server = https.createServer(options, st(__dirname));
        server.listen(function() {
            port = server.address().port;
            done();
        });
    });

    after(function(done) {
        server.once('close', function() { done(); });
        server.close();
    });

    describe('retrieveMetadata()', function() {
        it('should return valid metadata', function(done) {

            var IdpURL = 'https://localhost:' + port + '/testMetadata.xml';
            fs.readFile(__dirname + '/testMetadata.xml', 'utf8', function(err, actual) {
                if (err) return done(err);
                // dodgy hack for testing only
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                sp.retrieveMetadata(IdpURL, function(err, res) {
                    if (err) return done(err);
                    assert.equal(res, actual);
                    done();
                });
            });

        });
    });

    describe('handler()', function() {
        it('should return valid loginRequest', function(done) {
            var testEvent = {
                'api-id': 'abcd1234',
                'resource-path': '/sshephalopod',
                IdpMetadataEndpoint: 'https://localhost:' + port + '/testMetadata.xml'
            };

            testContext = {
                done: function(err, data) {
                    if (err) return done(err);
                    console.log("testContext.done() called: ", data);
                    assert.ok(data.match('samlp:AuthnRequest'));
                    done();
                }
            };

            sp.handler(testEvent, testContext);

        });

    });
});

