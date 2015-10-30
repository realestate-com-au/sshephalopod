# sshephalopod example

A cloudformation stack which creates a single EC2 instance inside a VPC,
and configures it for sshephalopod.

You'll need to:

* Deploy sshephalopod via the `make deploy` target from the main directory
* Update the file `ec2-instance-stack-params.json` and set:
    * the VPC id of a VPC in the appropriate region
    * the DNS domain name into which sshephalopod has been deployed
* run `make create` to create the stack (or you can just copy and paste
  the command from the Makefile)

  It may take a minute or two for the instance to spin up and configure itself; SSH
  is started before the UserData is run, so you may actually be able to connect to
  the instance (and be denied access) a short time after it's created; wait a minute
  and try again.
* Authenticate via sshephalopod using the `ssh-integration/wrapper` script:

    ```
    localhost$ cd ssh-integration
    localhost$ ./wrapper ec2-user
    Beginning the SAML dance ...
    Please sign in to My IdP
    Username: jimbo
    Password: ********
    Signing request succeeded: please log in with 'ssh ec2-user@<hostname  or IP>'
    If you are using ssh-agent, please run 'ssh-add' now
    ```

* Add the signed key to your ssh-agent keychain (if you're using ssh-agent):
    
    ```
    localhost$ ssh-add
    Enter passphrase for /home/foo/.ssh/id_rsa: **********
    Identity added: ...
    Certificate added: ...
    ```
    
* Simply SSH to the ec2 instance (the IP address is in the Outputs of the cloudformation
  stack):

    ```
    localhost$ ssh ec2-user@<ip-address>
    ```

## Things to note

* You don't have to distribute any SSH private keys
* You don't have to register your personal SSH public key anywhere
* You don't have to specify a keypair on the EC2 instance

