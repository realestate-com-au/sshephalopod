// handle the initial SAML pre-auth GET request
//

var fs = require('fs');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var async = require('async');
var SAML = require('passport-saml').SAML;

var handler = function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log("Context: %j", context);

    // construct the callback URL
    var callback = 'https://' + 
        event['api-id'] + '.execute-api.' + 'us-west-2' + '.amazonaws.com/' +
        event.stage + event['resource-path'];

    var saml_options = {
        issuer: 'urn:rea:sshephalopod',
        validateInResponseTo: false, // turning this on requires an inmemorycache provider
        requestIdExpirationPeriodMs: 3600000,
        cacheProvider: {}, // since we won't be sticking around ...
        forceAuthn: true,
        privateCert: fs.readFileSync("saml_sp.key").toString(),
        callbackUrl: callback
    };

    var dbParams = {
        Key: { IdpName: 'default' },
        TableName: 'IdpMetadataTable'
    };

    var is_passive = false;
    var loginRequest = {};

    async.waterfall([
        function getIdpData(next) {
            console.log('Getting IDP metadata');
            retrieveMetadata(event.IdpMetadataEndpoint, next);
        },
        function assignEntryPoint(data, next) {
            console.log('Got metadata: %j', data);
            var doc = new dom().parseFromString(data);
            var path = ".//*[local-name()='SingleSignOnService']/@Location";
            saml_options.entryPoint = xpath.select(path, doc)[0].value;
            next(null);
        },
        function createLoginRequest(next) {
            var saml = new SAML(saml_options);
            var saml_request = { callbackUrl: callback, };
            saml.generateAuthorizeRequest(saml_request, is_passive, next);
        },
        function receiveCreatedLoginRequest(req, next) {
            console.log('Got login request: %j', req);
            loginRequest = req;
            next(null);
        }
    ], function(err) {
        if (err) {
            console.error(err, err.stack);
            context.done(err);
        } else {
            console.log("Emitting AuthnRequest: %j", loginRequest);
            context.done(null, loginRequest);
        }
    });
};

var retrieveMetadata = function(IdpURL, callback) {
    console.log('Retrieving metadata from ' + IdpURL);

    var responseData = {};

    if (IdpURL) {
        if (IdpURL.match('https')) {
          https = require('https');
          var url = require('url');
          var parsedUrl = url.parse(IdpURL);
          var options = {
              hostname: parsedUrl.hostname,
              port: parsedUrl.port || 443,
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
            callback(err, null);
          });
          request.end();
        } else {
          callback(new Error('IdP URL not supported'), null);
        }
    } else {
        callback(new Error('IdP URL not supported'), null);
    }
};

module.exports = {
    handler: handler,
    retrieveMetadata: retrieveMetadata
};
