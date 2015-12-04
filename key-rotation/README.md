# Automated key rotation

## retrieve-ca-pub-key.py

A script to update the `trusted_certs` file from DNS on a regular basis.

This script is designed to be run in cron on servers you wish to access via `sshephalopod`.
The script retrieves the public certificate from a DNS end point provided and updates the
`trusted_certs` file. The following rules apply to handling older certs found on
the host:

|Number of old Certs found| Cert from DNS found?|Action|
|-------------------------|--------------------|------|
|0|No|Add cert from DNS to file|
|0|Yes|No action|
|1|No|Append cert from DNS to file|
|1|Yes|Remove old cert from file|
|2+|No|Remove all old certs except last one, append cert from DNS to file|
|2+|Yes|Remove all old certs from file|

This will allow for clients signed with an older key to continue working for a period of time.

## How to run

At minimum you need to provide a DNS end point from which to retrieve the key:

```
/path/to/script/retrieve-ca-pub-key.py sshephalopod-ca-cert.example.com
```

Optionally you can also provide the location of your trusted certs file
(Default is: `/etc/ssh/trusted_certs`) and send the output to the local system `syslog` daemon:

```
/path/to/script/retrieve-ca-pub-key.py sshephalopod-ca-cert.example.com --filename /etc/MyTrustedCerts --syslog
```


# License

`sshephalopod` is licensed under the MIT license; please see the file `LICENSE` for
details.

