var fs = require('fs');
var exec = require('child_process').exec;
var temp = require('temp');
var path = require('path');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var async = require('async');
var AWS = require('aws-sdk');

console.log('Starting CreateCAKeypair');

exports.handler = function(event, context) {
    console.log('REQUEST RECEIVED:\\n', JSON.stringify(event));
    console.log('context: %j', context);
    if (event.RequestType == 'Delete') {
        // don't actually delete the key
        sendResponse(event, context, "SUCCESS");
        return;
    }

    checkExistingKeys(event, context, function(err, data) {
        if (err) {
            console.log("Creating a keypair");
            createNewKey(event, context);
        } else {
            console.log("Using existing keypair");
            sendResponse(event, context, "SUCCESS", {PublicKey: data});
        }
    });
};

function checkExistingKeys(event, context, callback) {
    console.log("Beginning checkExistingKeys");

    var s3 = new AWS.S3();
    var create = false;
    var privKey = "";
    var pubKey = "";

    var pubKeyParams = {
        Bucket: event.ResourceProperties.Bucket,
        Key: event.ResourceProperties.Key + ".pub"
    };

    var privKeyParams = {
        Bucket: event.ResourceProperties.Bucket,
        Key: event.ResourceProperties.Key
    };

    async.waterfall([
        function checkPrivateKey(next) {
            console.log("Checking for a private key in S3");
            s3.getObject(privKeyParams, next);
        }, function decidePrivateKey(data, next) {
            console.log("Private key exists, re-using: %j", data);
            privKey = data.Body.toString('utf8').trim();
            next(null);
        }, function checkPublicKey(next) {
            console.log("Checking for a public key in S3");
            s3.getObject(pubKeyParams, next);
        }, function decidePublicKey(data, next) {
            console.log("Public key exists, re-using: %j", data);
            pubKey = data.Body.toString('utf8').trim();
            next(null);
        }
    ], function (err, result) {
        if (err) {
            console.log("Error checking existing keys");
            console.log(err, err.stack);
            callback(new Error("some error, creating new keypair"), null);
        } else if ((privKey === '') || (pubKey === '')) {
            callback(new Error("Need to create new keypair"), null);
        } else {
            callback(null, pubKey);
        }
    });
}

function createNewKey(event, context) {
    var tempdir = '';
    var responseData = {};
    var s3 = new AWS.S3();

    async.waterfall([
        function createTempDir(next) {
            temp.mkdir('sshephalopod-ca', next);
        }, function makeCopies(where, next) {
            tempdir = where;
            var args = [
                'cp bin/ssh-keygen bin/libfipscheck.so.1 ' + tempdir,
                '&&',
                'mkdir ' + tempdir + '/keys',
                '&&',
                'cp keys/sshephalopod-ca ' + tempdir + '/keys',
                '&&',
                'chmod 0600 ' + tempdir + '/keys/sshephalopod-ca',
                '&&',
                'chmod 0700 ' + tempdir + '/keys'
            ];
            var copy = exec(args.join(' '), next);
        }, function createKeys(stdout, stderr, next) {
            console.log('Copied: ' + stdout);
            var args = [
                './ssh-keygen', '-t', 'rsa',
                '-b', '1024',
                '-C', 'SSHephalopod-CA',
                '-N', '""',
                '-f', 'ca-key'
            ];
            process.env.LD_LIBRARY_PATH = tempdir;
            process.env.HOME = tempdir;

            var opts = {
                cwd: tempdir,
                env: process.env
            };
            opts.env.HOME = tempdir;
            
            var ssh_keygen = exec(args.join(' '), opts, next);
        }, function spawnedKeyGen(stdout, stderr, next) {
            console.log('ssh-keygen: ' + stdout);
            var params = {
                Bucket: event.ResourceProperties.Bucket,
                Key: event.ResourceProperties.Key,
                ACL: 'private',
                Body: fs.readFileSync(path.join(tempdir, 'ca-key')).toString('utf8')
            };
            console.log('putting privkey into bucket: %j', params);
            s3.putObject(params, next);
        }, function writtenPrivateKey(data, next) {
            console.log('Wrote private key to S3: %j', data);
            var params = {
                Bucket: event.ResourceProperties.Bucket,    //destinationBucket,
                Key: event.ResourceProperties.Key + '.pub', //destinationKey + '.pub',
                ACL: 'bucket-owner-full-control',
                Body: fs.readFileSync(path.join(tempdir, 'ca-key.pub')).toString('utf8')
            };
            s3.putObject(params, next);
        }, function writtenPublicKey(data, next) {
            console.log('Wrote public key to S3: %j', data);
            responseData.PublicKey = fs.readFileSync(path.join(tempdir, 'ca-key.pub')).toString('utf8').trim();
            console.log('Successfully created resource: %j', responseData);
            next(null);
        }
    ], function(err, result) {
        if (err) {
            console.error(err, err.stack);
            sendResponse(event, context, "FAILED", {Error: err});
        } else {
            console.log('finished ok');
            sendResponse(event, context, "SUCCESS", responseData);
        }
    });
}

// Send response to the pre-signed S3 URL
// Harvested from the AWS amilookup example
function sendResponse(event, context, responseStatus, responseData) {

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log("RESPONSE BODY:\n", responseBody);

    var https = require("https");
    var url = require("url");

    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };

    console.log("SENDING RESPONSE...\n");

    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
        // Tell AWS Lambda that the function execution is done
        context.done();
    });

    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        // Tell AWS Lambda that the function execution is done
        context.done();
    });

    // write data to request body
    request.write(responseBody);
    request.end();
}
