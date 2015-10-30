var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;

console.log('Starting LookupMetadata');

exports.handler = function(event, context) {
    console.log('REQUEST RECEIVED:\\n', JSON.stringify(event));
    console.log('context: %j', context);
    if (event.RequestType == 'Delete') {
        sendResponse(event, context, "SUCCESS");
        return;
    }

    var IdpURL = event.ResourceProperties.IdpURL;
    var IdpNAME = event.ResourceProperties.IdpName;
    var metadataTable = event.ResourceProperties.MetadataTable;
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
              var entityPath = ".//*[local-name()='EntityDescriptor']/@entityID";
              var metadataDoc = new dom().parseFromString(stringResult);
              var entity = xpath.select(entityPath, metadataDoc)[0].value;
              var doc = require('dynamodb-doc');
              var db = new doc.DynamoDB();
              var params = {
                  Key: { IdpName: 'default' },
                  TableName: metadataTable,
                  AttributeUpdates: {
                      Metadata: {
                          Action: 'PUT',
                          Value: stringResult
                      }
                  },
                  ReturnValues: 'UPDATED_NEW'
              };
              db.updateItem(params, function(err, data) {
                if (err) {
                  responseData = {Error: err};
                  sendResponse(event, context, "FAILED", {});
                } else {
                  sendResponse(event, context, "SUCCESS", {Status: 'success'});
                  console.log('Updated DynamoDB with: ' + stringResult);
                  console.log('Dynamo returned: %j', data);
                }
              });
            });
          });
          request.on('error', function(err) {
            responseData = {Error: err, Opts: options};
            rsp.send(event, context, rsp.FAILED, responseData);
          });
          request.end();
        } else {
          responseData = {Error: 'IdP URL not supported'};
          rsp.send(event, context, rsp.FAILED, responseData);
        }
    } else {
        responseData = {Error: 'IdP URL not specified'};
        rsp.send(event, context, rsp.FAILED, responseData);
    }
};

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
