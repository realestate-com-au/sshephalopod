# sshephalopod (working title)

Providing SSH certificate authority signing of SSH pubkey
requests based on authentication from a trusted third party.

## What problems does it solve?

* Distribution of SSH private keys to users who need to use them
  to authenticate to a remote host, where the corresponding public
  key is in an `authorized_keys` file or similar
* Distribution of user public keys to remote hosts (the inverse of
  the above problem)
* SSH key rotation and revocation (which, in practice, rarely happens
  without implementing some kind of synchronous lookup performed by the
  sshd on the remote host)
* Authenticated access to remote hosts without the need for the remote
  host to be able to contact the authenticating party directly (based
  on cryptographic trusts previously established)
* Minimal reconfiguration to either the SSH client or remote host

## Deployment Risks and Considerations

Deploying sshephalopod into an AWS account has risks where potential attackers have
access to the account as well:

* because EC2 instances trust the public key retrieved from DNS, an attacker
  who can change DNS could substitute their own ssh pubkey into the TXT record;
* because sshephalopod stores keys in S3 to persist certificates across
  invocations, an attacker could load a copy of keys that they have access to
  into the S3 bucket, giving them signing access to create their own trusted
  certificates. They would also have to update the DNS TXT record with their
  substituted public key.

You can mitigate the S3 bucket risk to some extent by clever use of IAM policies --
preventing users writing to that bucket, for example -- but in general, you get fairly
far down the policy-whittling rabbit hole and your overheads in maintaining exceptions
and special cases get both heavy and hairy (and nobody likes shaving yaks).

If you decide to deploy sshephalopod into a different account, you pretty
much eliminate the above risks, because you control the access at the
account boundary; however, you have the tradeoff that the "sshephalopod account"
cannot update the TXT and SRV records for a domain that covers a VPC in an alernate
account. You would then have to:

* configure EC2 instances to trust a public key from a domain not controlled by the
  account that the instance is launched into; and
* configure client-side wrapper scripts to find the SRV record based on a DNS
  domain that isn't the one that hosts the EC2 instances.

This makes it a little more clunky, but much more secure. It's up to you to decide what
level of assurance you need around your remote-access infrastructure; most people
should probably err on the side of caution.

## Prerequisites

* Create a reference to your Service Provider in your Identity
  Provider (IdP). You need to have your IdP return an Attribute of
  `email` as part of the `AttributeStatement`

## Building/Deploying it

### Common prep work

Do this whether you're deploying via Docker or via Makefile:

* Update the top-level `Makefile` and set:
    * `IDP_METADATA` to the http(s) endpoint which returns the SAML metadata of your
      Identity Provider.  For Okta, this will look something like
      `https://foo.okta.com/app/ksdulfvlisndklfgjnsk/sso/saml/metadata`
      Note that you do not need to do anything with this URL, just set it in
      the Makefile -- a Custom Resource will retrieve the data when the
      sshephalopod CloudFormation stack is created.
    * `DOMAIN` to the DNS domain that this sshephalopod instance will serve
    * `CONFIG_BUCKET` to the name of an existing S3 bucket where the Lambda
      code will be uploaded. The bucket must be in `us-west-2` at the moment
    * `KEYPAIR_BUCKET` to the name of an existing S3 bucket where the
      ssh CA keypairs will be persisted, so that subsequent creations of
      sshephalopod for the same domain will use the same keypair. This
      bucket must also be in `us-west-2`

#### Build-time dependencies

* A SAML Identity Provider (IdP). `sshephalopod` is known to work with Okta
* AWS CLI -- a version that can do CloudFormation and S3 commands
* `zip` for bundling the Lambda code into S3

#### Build/deploy

* from the top level, run `make deploy` to deploy the CloudFormation stack
  including Lambda functions, DNS entries, API Gateway configuration

## Configuring your instances

For an EC2 instance, include the following code in your `UserData`:

```json
  "Fn::Base64": {
    "Fn::Join": [
      "",
      [
        "#!/bin/bash\n",
        "CERT=$( eval echo $( dig +short txt sshephalopod-ca-cert.",
                          { "Ref": "DNSDomain" }, " ) )\n",
        "if [ -z \"$CERT\" ]; then\n",
        "    echo ERROR cannot find CA cert\n",
        "    exit 1\n",
        "fi\n",

        "echo $CERT > /etc/ssh/trusted_certs\n",
        "cat >> /etc/ssh/sshd_config <<EoM\n",
        "\n",
        "LogLevel VERBOSE\n",
        "TrustedUserCAKeys /etc/ssh/trusted_certs\n",
        "EoM\n",

        "service sshd restart\n"
      ]
    ]
  }
```

### Automatic CA trusted key rotation

Have a look at the [contributed key-rotation script](key-rotation/README.md)
which replaces the one-time example above.

## Using it

With a deployed sshephalopod and a configured Okta:

* Have an SSH public key in `$HOME/.ssh/id_rsa.pub`
* Run the wrapper script:

    ```
    localhost$ cd ssh-integration && ./wrapper ec2-user domain.where.SRV.record.is
    Using SP https://cnsjdhfbs2.execute-api.us-west-2.amazonaws.com/prod/signing
    Beginning the SAML dance ...
    Please sign in to Okta
    Username: my.username
    Password: ********
    Signing request succeeded: please log in with 'ssh ec2-user@domain.where.SRV.record.is'
    If you are using ssh-agent, please run 'ssh-add' now
    ```
* If you're using `ssh-agent`, run `ssh-add` to add your private key and the signed
  certificate to your agent.  **Note:** `gnome-keyring-daemon` does NOT support
  RSA-certificate signed SSH keys, you have to use OpenSSH's ssh-agent)

    ```
    localhost$ ssh-add -l
    The agent has no identities.

    localhost$ ssh-add
    Enter passphrase for /home/user/.ssh/id_rsa: ********
    Identity added: /home/user/.ssh/id_rsa (/home/user/.ssh/id_rsa)
    Certificate added: /home/user/.ssh/id_rsa-cert.pub (my.username@okta-domain)

    localhost$ ssh-add -l
    4096 SHA256:nBwKsuL3+RRoyV1mw6N4GZJ8I/o2akuit8QXCm1XUBQ /home/user/.ssh/id_rsa (RSA)
    4096 SHA256:nBwKsuL3+RRoyV1mw6N4GZJ8I/o2akuit8QXCm1XUBQ /home/user/.ssh/id_rsa (RSA-CERT)
    ```

# License

`sshephalopod` is licensed under the MIT license; please see the file `LICENSE` for
details.
