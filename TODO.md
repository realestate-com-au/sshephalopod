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
* KMS encryption for the privkey in S3
* trusted-keys renewal wrapper or example daemon based on DNS TTLs
* an appliance-form of sshephalopod -- an AMI, for example?
* change explicit use of `email` in the key identity (which we are abusing, granted) to 
  some more generic "user identifier" in case others would rather use a GUID or similar

# autodiscovery

* auto determine what kind of IdP we need to talk to and choose okta/shibboleth automatically
