# /signing

## GET

### Method Request

* authorization: none
* API key: no
* URL Query String Parameters:
    * cksum (no caching)
* HTTP Request Headers:
    * Accept
    * PAOS
    * Host
* Request Models: none

### Integration Request

* Integration Type: Lambda
* Mapping Templates:
    * Content-Type: application/json

    ```json
    #set($quote='"')
    #set($escaped='\"')
    {
        "Accept": "$input.params('Accept')",
        "PAOS": "$input.params('PAOS').replace($quote,$escaped)",
        "cksum": "$input.params('cksum')"
    }
    ```

### Integration Response

* Lambda Error Regex: `-`
    * Method Response Status: 200 (Default mapping: yes)

* Mapping Templates
    * *NOTE:* you will have to make substitutions from the above values
    * application/vnd.paos+xml

    ```xml
    #set($inputRoot = $input.path('$'))
    $inputRoot.AuthnRequest
    ```

### Method Response

* HTTP Status: 200
    * Response Models for 200
        * Content-Type: application/vnd.paos+xml
        * Models: empty
