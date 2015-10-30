
CONFIG_BUCKET=sshephalopod-config-bucket
KEYPAIR_BUCKET=sshephalopod-keypair-bucket
DOMAIN=sshephalopod-service-domain.com
IDP_METADATA=https://somewhere.okta.com/app/somejumbleofcharacters/sso/saml/metadata

all:
	@echo "use 'make build' to build sshephalopod components"
	@echo "use 'make deploy' to deploy sshephalopod"

build:
	make -C apigateway build

deploy:
	echo something > /tmp/api-gw.id
	IDP_METADATA=$(IDP_METADATA) CONFIG_BUCKET=$(CONFIG_BUCKET) KEYPAIR_BUCKET=$(KEYPAIR_BUCKET) DOMAIN=$(DOMAIN) make -C lambda deploy
	@echo "Deploying API ..."
	make -s -C apigateway deploy > /tmp/api-gw.id
	@echo "Deployed API"
	IDP_METADATA=$(IDP_METADATA) CONFIG_BUCKET=$(CONFIG_BUCKET) KEYPAIR_BUCKET=$(KEYPAIR_BUCKET) DOMAIN=$(DOMAIN) make -C lambda deploy
	rm /tmp/api-gw.id
