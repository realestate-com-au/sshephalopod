ZIPFILE=sshephalopod
SOURCES=SigningPreAuth.js \
	Metadata.js \
	CreateCAKeypair.js \
	SigningRequestPassport.js \
	LookupMetadata.js \
	saml_sp.key saml_sp.crt idp.crt \
	bin \
	keys
ZIP_ARGS="-9rq"
REV=$(shell git show-ref --head -s ^HEAD)

CONFIG_BUCKET?=sshephalopod-config-bucket-name
DOMAIN?=sshephalopod-service-domain.com
KEYPAIR_BUCKET?=sshephalopod-keypair-bucket
API_ID?=something
IDP_METADATA?=unknown
API_ID=$(shell cat /tmp/api-gw.id )

CONFIG=config.json
KEYPAIR_NAME=$(DOMAIN)-sshephalopod-ca
SP_HOST=$(API_ID).execute-api.us-west-2.amazonaws.com

all:
	@echo "make upload: publish zipfile to S3 in DEV"
	@echo "make deploy: update the stacks in DEV"

zip: $(SOURCES) node_modules
	rm -f $(ZIPFILE).zip
	zip $(ZIP_ARGS) $(ZIPFILE).zip $(SOURCES) node_modules

upload: zip
	aws s3 cp $(ZIPFILE).zip s3://$(CONFIG_BUCKET)/$(ZIPFILE)-$(REV).zip
	aws s3 cp $(CONFIG) s3://$(KEYPAIR_BUCKET)/$(CONFIG)

deploy: upload
	./deploy.sh $(CONFIG_BUCKET) $(ZIPFILE)-$(REV).zip \
		$(IDP_METADATA) $(DOMAIN) $(KEYPAIR_BUCKET) $(KEYPAIR_NAME) \
		$(SP_HOST)

