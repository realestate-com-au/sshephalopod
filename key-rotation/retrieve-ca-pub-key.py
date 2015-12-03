#!/usr/bin/env python
"""
Script to update sshd trusted certs file with cert from DNS.

Requires python 2.7

Run in cron as:
/path/to/script/retrieve-ca-pub-key.py sshephalopod-ca-cert.example.com

Optional:
--file:  to set trusted certs file
--syslog: log to local syslog daemon instead of stdout
"""
import argparse
import errno
import logging
import logging.handlers
import subprocess
import shlex
import sys

APP_NAME = 'Retrieve-ca-pub-key'


def set_up_logging(use_syslog):
    """Set up logging to either stdout or syslog."""
    logger = logging.getLogger(APP_NAME)
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(name)s: [%(levelname)s] %(message)s')
    if use_syslog:
        handler = logging.handlers.SysLogHandler(
            '/dev/log',
            facility=logging.handlers.SysLogHandler.LOG_SYSLOG)
    else:
        handler = logging.StreamHandler()

    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


def get_pub_cert(endpoint, logger):
    """Return TXT record on 'endpoint'."""
    try:
        dig_cmd = 'dig +short TXT %s' % endpoint
        dig_result = subprocess.check_output(
            shlex.split(dig_cmd)).strip('"\'\n')
    except subprocess.CalledProcessError as exception:
        logger.error("Unable to retrieve cert from DNS: %s",
                     exception.output)

    return dig_result


def read_trusted_certs(filename, logger):
    """Read trusted certs file and return array of certs."""
    certs = []

    try:
        with open(filename, 'r') as certs_file:
            for line in certs_file:
                certs.append(line.strip('\n'))
    except IOError as exception:
        if exception.errno == errno.ENOENT:
            logger.info('Cannot find certs file %s, assuming empty.', filename)
        else:
            logger.error('Unable to open trusted certs file %s', filename)
            sys.exit(0)

    return certs


def write_trusted_certs(certs_list, filename, logger):
    """Take an array of cert strings and writes them to 'filename'."""
    try:
        with open(filename, 'w') as certs_file:
            for line in certs_list:
                certs_file.write(line + '\n')
    except IOError:
        logger.error('Unable to write to trusted certs file %s',
                     filename)


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument('endpoint')
    parser.add_argument('--syslog', dest='log_to_syslog',
                        action='store_true', default=False)
    parser.add_argument('--filename', '-f', dest='certs_file',
                        default='/etc/ssh/trusted_certs')
    args = parser.parse_args()
    logger = set_up_logging(args.log_to_syslog)

    cert_txt = get_pub_cert(args.endpoint, logger)
    logger.info('CA Public key: %s', cert_txt)

    current_trusted = read_trusted_certs(args.certs_file, logger)
    num_trusted = len(current_trusted)
    logger.info('Found %s existing trusted certs in %s', num_trusted,
                args.certs_file)

    if cert_txt in current_trusted:
        logger.info('Found DNS certificate in trusted certs file.')
        if num_trusted > 1:
            logger.info('Removing %s old trusted certs.', num_trusted - 1)
            write_trusted_certs([cert_txt], args.certs_file, logger)
        else:
            logger.info('Nothing to do, exiting.')

    else:
        logger.info('Unable to find DNS certificate in trusted certs file.')
        if num_trusted == 0:
            logger.info('Writing cert to trusted certs.')
            new_cert_list = [cert_txt]
        elif num_trusted == 1:
            logger.info('Only one old cert in file, append new cert.')
            new_cert_list = current_trusted + [cert_txt]
        else:
            logger.info('Two or more old certs found in file,'
                        ' removing all but last one and adding new cert.')
            new_cert_list = current_trusted[-1:]
            new_cert_list.append(cert_txt)
        write_trusted_certs(new_cert_list, args.certs_file, logger)

if __name__ == '__main__':
    main()
