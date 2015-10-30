STACKNAME=sshephalopod-lambda

all:
	@echo Use 'make deploy' to deploy the API gateway
	@echo You must have deployed the $(STACKNAME) stack already

build:
	cd aws-apigateway-importer && mvn assembly:assembly

deploy:
	./deploy.sh $(STACKNAME)
