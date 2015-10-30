* API gateway cloudformation support:
    * update cloudformation stack to include API-GW
    * remove manual steps in README
    * register SP URI as an SRV record automatically
* Remove the need to specify a keypair bucket/keyname in the deployment process
* overall Makefile which:
    * Creates CloudFormation stack with Lambda functions; outputs:
        * CA Public Key
        * Lambda function names
    * creates API gateway from Swagger definition, wiring in Lambda function names taken from
      CloudFormation outputs

# autodiscovery

* auto determine what kind of IdP we need to talk to and choose okta/shibboleth automatically
