#!/bin/bash

if [ $# -ne 1 ]; then
    echo "usage: $0 <stack-name>"
    exit 1
fi

STACK=$1
REGION="us-west-2"

OUTPUTS=$( aws --region $REGION cloudformation describe-stacks \
            --stack-name $STACK \
            --query 'Stacks[].Outputs[]' \
            --output text 2>/dev/null )

if [ $? -ne 0 -o -z "$OUTPUTS" ]; then
    echo "ERROR trying to find the outputs of stack $STACK"
    exit 1
fi

# The URI for the invocation looks like
# arn:aws:apigateway:eu-west-1:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-west-1:MY_ACCOUNT_ID:function:echoLambda/invocations
# 
# We get something like:
# arn:aws:lambda:us-west-2:599768876055:function:sshephalopod-lambda-GenerateMetadata-CBK0OS4O9Y62
# 
# out of the cloudformation stack

Metadata_ARN=$( echo "$OUTPUTS" | awk '/GenerateMetadata/ { print $2 }' )
Request_ARN=$( echo "$OUTPUTS" | awk '/SigningRequest/ { print $2 }' )
PreAuth_ARN=$( echo "$OUTPUTS" | awk '/SigningPreAuth/ { print $2 }' )
ExecRole_ARN=$( echo "$OUTPUTS" | awk '/ExecutionRole/ { print $2 }' )
KeyPair_Bucket=$( echo "$OUTPUTS" | awk '/KeyPairBucket/ { print $2 }' )
KeyPair_Name=$( echo "$OUTPUTS" | awk '/KeyPairName/ { print $2 }' )
IDP_Endpoint=$( echo "$OUTPUTS" | awk '/IdpMetadataEndpoint/ { print $2 }' )

Metadata_name="arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$Metadata_ARN"
Request_name="arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$Request_ARN"
PreAuth_name="arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$PreAuth_ARN"

sed -e "s|%%METADATA_NAME%%|$Metadata_name|" \
    -e "s|%%REQUEST_NAME%%|$Request_name|" \
    -e "s|%%PREAUTH_NAME%%|$PreAuth_name|" \
    -e "s|%%EXECUTION_ROLE%%|$ExecRole_ARN|" \
    -e "s|%%KEYPAIR_BUCKET%%|$KeyPair_Bucket|" \
    -e "s|%%KEYPAIR_NAME%%|$KeyPair_Name|" \
    -e "s|%%IDP_ENDPOINT%%|$IDP_Endpoint|" \
    < swagger-templ.yaml > swagger.yaml

OUT=$( cd aws-apigateway-importer && \
    ./aws-api-import.sh -r $REGION -c -d prod ../swagger.yaml 2>&1 )

# we're looking for a line like:
# 2015-10-19 18:30:32,282 INFO - Creating deployment for API kn0pcmhkja and stage prod

if [ $? -eq 0 ]; then
    # Drag out the API ID
    echo "$OUT" | grep "INFO - Creating deployment for API" | sed -e 's/.* API \(.*\) and stage.*/\1/'
fi
