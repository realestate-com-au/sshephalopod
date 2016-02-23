console.log("Testing SigningPreAuth");

var fs = require('fs');
var https = require('https');
var assert = require('assert');
var signingPreAuth = require('../SigningPreAuth.js');

describe('SigningPreAuth', function() {
    describe('retrieveMetadata()', function() {
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

        it('should return valid metadata', function(done) {

            var testEvent = {
                'api-id': 'abcd1234',
                'resource-path': '/sshephalopod',
                IdpMetadataEndpoint: 'https://localhost:8000/metadata.xml'
            };

            testContext = {
                done: function(message) {
                    console.log("testContext.done() called: ", message);
                }
            };

            var IdpURL = 'https://localhost:' + port + '/testMetadata.xml';
            fs.readFile(__dirname + '/testMetadata.xml', 'utf8', function(err, actual) {
                if (err) return done(err);
                signingPreAuth.retrieveMetadata(IdpUrl, function(err, res) {
                    if (err) return done(err);
                    assert.equal(res, actual);
                    done();
                });
            });

        });
    });
});

