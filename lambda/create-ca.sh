#!/bin/bash

if [ $# -ne 4 ]; then
    echo $#
    echo "usage: $0 <keypair-bucket> <dns-domain> <keypair-name> <make-ca-arn>"
    exit 1
fi


export BUCKET=$1
export DNSDOMAIN=$2
export KP_NAME=$3
export FUNCTION_ARN=$4

echo $KP_NAME

LAMBDA_STACK="sshephalopod-ca-${KP_NAME}"


log () {
    date "+%Y-%m-%d %H:%M:%S $1"
}

die () {
    echo "FATAL: $1"
    exit 1
}

wait_completion () {
    local STACK=$1
    echo -n "Waiting for stack $STACK to complete:"
    while true; do
        local STATUS=$( aws cloudformation describe-stack-events \
            --stack-name $STACK \
            --query 'StackEvents[].{x: ResourceStatus, y: ResourceType}' \
            --output text | \
            grep "AWS::CloudFormation::Stack" | head -n 1 | awk '{ print $1 }'
        )
        case $STATUS in
            UPDATE_COMPLETE_CLEANUP_IN_PROGRESS)    : ;;
            UPDATE_COMPLETE|CREATE_COMPLETE)
                echo "stack $STACK complete"
                return 0 ;;
            *ROLLBACK*)
                echo "stack $STACK rolling back"
                return 1 ;;
            FAILED)
                echo "ERROR updating stack"
                return 1 ;;
            "")
                echo "No output while looking for stack completion"
                return 1 ;;
            *) : ;;
        esac
        echo -n "."
        sleep 5
    done
}

create_lambda_stack () {
    local STACK=$1
    log "Creating stack $STACK"
    local OUT=$( aws cloudformation create-stack \
        --stack-name $LAMBDA_STACK \
        --template-body file://ca-stack.json \
        --parameters \
            "ParameterKey=DNSDomain,ParameterValue=$DNSDOMAIN" \
            "ParameterKey=CAKeyPairBucket,ParameterValue=$BUCKET" \
            "ParameterKey=CAKeyPairKeyname,ParameterValue=$KP_NAME" \
            "ParameterKey=MakeKeypairFunctionARN,ParameterValue=$FUNCTION_ARN"
    )
    wait_completion $STACK || return 1
}

update_lambda_stack () {
    local STACK=$1
    log "Updating stack $STACK"
    local OUT=$( aws cloudformation update-stack \
        --stack-name $LAMBDA_STACK \
        --template-body file://ca-stack.json \
        --parameters \
            "ParameterKey=DNSDomain,ParameterValue=$DNSDOMAIN" \
            "ParameterKey=CAKeyPairBucket,ParameterValue=$BUCKET" \
            "ParameterKey=CAKeyPairKeyname,ParameterValue=$KP_NAME" \
            "ParameterKey=MakeKeypairFunctionARN,ParameterValue=$FUNCTION_ARN"
    )
    wait_completion $STACK || return 1
}

# Create the stack of the Lambda function
if [ -z "$( aws cloudformation describe-stacks --stack-name $LAMBDA_STACK 2>/dev/null )" ]; then
    create_lambda_stack $LAMBDA_STACK || die "Can't create stack"
else
    update_lambda_stack $LAMBDA_STACK || die "Can't update stack"
fi

log "Complete"
