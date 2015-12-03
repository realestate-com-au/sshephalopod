# retrieve-ca-pub-key.py

A script to update sshd trusted certs file with cert from DNS.

This script is designed to be run in cron on servers you wish to access via sshephalopod.
The script retrieves the public certificate from a DNS end point provided and updated the
trusted certs file as required. The following rules apply to handling older certs found on
the host:

|Number of old Certs found| Current cert found?|Action|
|-------------------------|--------------------|------|
|0|No|Add cert from DNS to file|
|0|Yes|No action|
|1|No|Append cert from DNS to file|
|1|Yes|Remove old cert from file|
|2+|No|Remove all old certs except last one, append cert from DNS to file|
|2+|Yes|Remove all old certs from file|

This will allow for clients signed with an older key to continue working for a period of time.

## How to run

At minimum you need to provide a DNS end point from which to retrieve the key from:

```
/path/to/script/retrieve-ca-pub-key.py sshephalopod-ca-cert.example.com
```

Optionally you can also provide the location of your trusted certs file
(Default is: /etc/ssh/trusted_certs) and send the output to the local system syslod daemon:

```
/path/to/script/retrieve-ca-pub-key.py sshephalopod-ca-cert.example.com --filename /etc/MyTrustedCerts --syslog
```


# License

`sshephalopod` is licensed under the MIT license; please see the file `LICENSE` for
details.

