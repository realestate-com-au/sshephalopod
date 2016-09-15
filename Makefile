
CONFIG_BUCKET=sshephalopod-config-bucket
KEYPAIR_BUCKET=sshephalopod-keypair-bucket
DOMAIN=sshephalopod-service-domain.com
IDP_METADATA=https://somewhere.okta.com/app/somejumbleofcharacters/sso/saml/metadata

all:
	IDP_METADATA=$(IDP_METADATA) CONFIG_BUCKET=$(CONFIG_BUCKET) KEYPAIR_BUCKET=$(KEYPAIR_BUCKET) DOMAIN=$(DOMAIN) make -C lambda deploy
