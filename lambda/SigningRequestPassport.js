// Handle a signing requst
// Expected inputs:
// {
//      "SAMLResponse": "base64-encoded assertion",
//      "SSHPublicKey": "ssh-rsa pubkey",
//      "Username": "destination host username",
//      "Hostname": "destination hostname"
// }
//

// dirty fscking hack

var fs = require('fs');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var async = require('async');
var SAML = require('passport-saml').SAML;
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var temp = require('temp');
var path = require('path');
var AWS = require('aws-sdk');

// DEFAULTS
var DURATION = 12 * 3600;
var SSH_OPTIONS = [];

// if the duration is more than this, we assume that
// someone passed in a config setting the duration as
// seconds
var MAX_HOURS = 24 * 7;

var configName = "config.json";
var config = {};

var SAML2_RESPONSE_XPATH = ".//*[local-name()='Response' and " +
           "namespace-uri() = 'urn:oasis:names:tc:SAML:2.0:protocol']";
var REALNAME_XPATH = ".//*[local-name()='Attribute' and @Name='email']/*[local-name()='AttributeValue']/text()";
var IDP_X509_CERT_XPATH = ".//*[local-name()='X509Certificate']/text()";

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Context is: %j', context);

    // Need to work out which IDP to pull the metadata for
    var response = new Buffer(event.body.SAMLResponse, 'base64').toString();
    var idpPath = ".//*[local-name()='Issuer']/text()";
    var responsedoc = new dom().parseFromString(response);
    var idp = xpath.select(idpPath, responsedoc)[0].toString();

    var saml_options = {
        issuer: 'urn:rea:sshephalopod',
        validateInResponseTo: false, // turning this on requires an inmemorycache provider
        requestIdExpirationPeriodMs: 3600000,
        cacheProvider: {}, // since we won't be sticking around ...
        privateCert: fs.readFileSync("saml_sp.key").toString(),
        entryPoint: "https://do.not.need.one/",
        callbackUrl: 'https://do.not.need.one/'
    };


    var bucketName = event.KeypairBucket;
    var keyName = event.KeypairName;
    var realName = 'REAL-NAME-HERE';
    var tempdir;
    var db_params = {
        Key: {
            IdpName: 'default'
        },
        TableName: 'IdpMetadataTable'
    };
    var cert = '';
    var returnData = {};

    var xml = new Buffer(event.body.SAMLResponse, 'base64').toString('utf8');
    var saml_doc = new dom().parseFromString(xml);

    async.waterfall([
        function createTempFile(next) {
            temp.mkdir('sshephalopod', next);
        }, function writeTempFile(info, next) {
            tempdir = info;
            fs.writeFile(path.join(tempdir, 'pubkey'), event.body.SSHPublicKey, next);
        }, function logTempDir(next) {
            console.log('Created dir ' + tempdir);
            next(null);
        },
        function getConfig(next) {
            retrieveObject(bucketName, configName, next);
        },
        function parseConfig(cfgJSON, next) {
            config = JSON.parse(cfgJSON);

            // check some basic things
            if (parseInt(config.signatureDuration)) {
                DURATION = parseInt(config.signatureDuration);
            }

            if (config.sshOptions) {
                SSH_OPTIONS = [].concat.apply([], config.sshOptions.map(function(d){ return ['-O', d]; }));
            }

            next(null);
        },
        function getIdpData(next) {
            console.log("Getting metadata from ", event.IdpMetadataEndpoint);
            retrieveMetadata(event.IdpMetadataEndpoint, next);
        },
        function assignCert(data, next) {
            var doc = new dom().parseFromString(data);
            saml_options.cert = xpath.select(IDP_X509_CERT_XPATH, doc)[0].toString('utf8');
            console.log('i has a cert: %j', saml_options.cert);
            next(null);
        }, function AssertResponse(next) {
            var saml = new SAML(saml_options);

            console.log("Going to try and assert a response: %j", saml_options);

            var saml2_response = xpath.select(SAML2_RESPONSE_XPATH, saml_doc).toString();
            console.log('using saml2_response: %j', saml2_response);

            console.log("Retrieving real name from XML");
            realName = xpath.select(REALNAME_XPATH, saml_doc).toString();
            console.log("Got realName of " + realName);
            var encoded_response = new Buffer(saml2_response).toString('base64');
            var response = {
                SAMLResponse: encoded_response
            };
            saml.validatePostResponse(response, next);
        },
        function checkLoggedOut(profile, loggedOut, next) {
            console.log("checkLoggedOut(%j, %j)", profile, loggedOut);
            now = new Date();
            expiry = new Date(now.setSeconds(now.getSeconds() + DURATION));
            if (loggedOut) {
                var err = new Error("User has been logged out")
                next(err);
            } 

            next(null);
        },
        function checkGroupMembership(next) {
            returnData = {
                Result: true,
                Message: "Authentication succeeded",
                Expiry: expiry.toISOString()
            };
            next(null)
        },
        function getKey(next) {
            retrieveObject(bucketName, keyName, next);
        },
        function saveKey(privKey, next) {
            console.log("Saving key to local filesystem");
            fs.writeFileSync(path.join(tempdir, keyName), privKey);
            console.log("Protecting mode of key");
            fs.chmod(path.join(tempdir, keyName), 0700, next);
        },
        function makeCopies(next) {
            console.log("Copying in binaries");
            var args = [
                'cp bin/ssh-keygen bin/libfipscheck.so.1 ' + tempdir,
                '&&',
                'chmod 0700 ' + tempdir
            ];
            var copy = exec(args.join(' '), next);
        },
        function copied(stdout, stderr, next) {
            console.log('copied: ' + stdout);
            next(null);
        },
        function signKey(next) {
            var thing = fs.readFileSync(path.join(tempdir, 'pubkey')).toString();
            console.log("SSH key is: " + thing);

            var now = new Date();
            var args = [
                './ssh-keygen',
                '-s', keyName,
                '-V', '+' + DURATION + 's',
                '-z', now.getTime(),
                '-I', realName,
                '-n', event.body.Username,
            ].concat(SSH_OPTIONS).concat(['pubkey']);

            process.env.LD_LIBRARY_PATH = tempdir;
            process.env.HOME = tempdir;

            var opts = {
                cwd: tempdir,
                env: process.env
            };
            opts.env.HOME = tempdir;

            console.log('process env is %j', process.env);
            console.log('args for exec are: %j', args);
            console.log('opts for exec are: %j', opts);

            var ssh_keygen = exec(args.join(' '), opts, next);
        }, function spawnedKeyGen(stdout, stderr, next) {
            console.log("should be spawned");
            console.log('ssh_keygen: %s', stdout);
            returnData.SignedKey = fs.readFileSync(path.join(tempdir, "pubkey-cert.pub")).toString('base64');
            next(null);
        }
    ], function(err) {
        // temp.cleanupSync();
        if (err) {
            console.error(err, err.stack);
            context.done(err);
        } else {
            console.log("Received successful response: %j", returnData);
            context.done(null, returnData);
        }
    });

};

function retrieveObject(bucketName, keyName, callback) {
    var s3 = new AWS.S3();
    var objectBody = "";

    var objectParams = {
        Bucket: bucketName,
        Key: keyName
    };

    async.waterfall([
        function loadObject(next) {
            console.log("Checking for object ", keyName, " in bucket ", bucketName);
            s3.getObject(objectParams, next);
        }, function handleObject(data, next) {
            console.log("Got object");
            objectBody = data.Body.toString('utf8').trim();
            next(null);
        }
    ], function (err, result) {
        if (err) {
            console.log("Error looking for object");
            console.log(err, err.stack);
            callback(new Error("cannot load object"), null);
        } else if (objectBody === '') {
            callback(new Error("cannot load object"), null);
        } else {
            callback(null, objectBody);
        }
    });
}

function retrieveMetadata(IdpURL, callback) {
    console.log('Retrieving metadata from ' + IdpURL);

    var responseData = {};

    if (IdpURL) {
        if (IdpURL.match('https')) {
          https = require('https');
          var url = require('url');
          var parsedUrl = url.parse(IdpURL);
          var options = {
              hostname: parsedUrl.hostname,
              port: 443,
              path: parsedUrl.path,
              method: 'GET'
          };
          var stringResult = '';
          var request = https.request(options, function(response) {
            console.log('Status code: ' + response.statusCode);
            console.log('Status message: ' + response.statusMessage);
            response.on('data', function(data) {
              stringResult += data.toString();
            });
            response.on('end', function() {
                console.log('Got metadata: ' + stringResult);
                callback(null, stringResult);
            });
          });
          request.on('error', function(err) {
            callback({Error: err, Opts: options}, null);
          });
          request.end();
        } else {
          callback({Error: 'IdP URL not supported'}, null);
        }
    } else {
        callback({Error: 'IdP URL not supported'}, null);
    }
};
