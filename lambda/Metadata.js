// Emit the necessary SAML SP metadata
//

console.log('Starting function - metadata');

var SAML = require('passport-saml').SAML;
var fs = require('fs');

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Got context: %j', context);

    var saml_options = {
        issuer: 'urn:rea:sshephalopod',
        validateInResponseTo: false, // turning this on requires an inmemorycache provider
        requestIdExpirationPeriodMs: 3600000,
        cacheProvider: {}, // since we won't be sticking around ...
        forceAuthn: true,
        identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
        decryptionPvk: fs.readFileSync("saml_sp.key").toString()
    };

    saml_options.callbackUrl =
        'https://' + event['api-id'] + '.execute-api.' + 'us-west-2' + '.amazonaws.com/' +
        event.stage + event['resource-path'];

    console.log('callbackURL is ' + saml_options.callbackUrl);

    var certificate = fs.readFileSync("saml_sp.crt").toString();

    var saml = new SAML(saml_options);

    var metadata = saml.generateServiceProviderMetadata(certificate);

    console.log("Created metadata: %j", metadata);
    context.done(null, metadata);
};
