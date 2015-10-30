all:
	@echo "make create: Create the example stack"

create:
	aws cloudformation create-stack \
		--stack-name sshephalopod-example \
		--template-body file://ec2-instance-stack.json \
		--parameters file://ec2-instance-stack-params.json

update:
	aws cloudformation update-stack \
		--stack-name sshephalopod-example \
		--template-body file://ec2-instance-stack.json \
		--parameters file://ec2-instance-stack-params.json

delete:
	aws cloudformation delete-stack \
		--stack-name sshephalopod-example
