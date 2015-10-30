# XPATH notes

Things to look for which might reveal the actual username:

## shibboleth

well, at least our implementation of it ...

```
<saml2:Attribute FriendlyName="RoleSessionName" ... >
    <saml2:AttributeValue ...>SOMETHING</saml2:AttributeValue>
</saml2:Attribute>
```

## okta

```
<saml2:Attribute FriendlyName="email" ... >
    <saml2:AttributeValue ...>SOMETHING</saml2:AttributeValue>
</saml2:Attribute>
```

## So ...

I wonder if it would be better to parameterise the FriendlyName that's looked for in the SAML
assertion 

Example SAML assertions show that there's a lot of variety (of course); some things return

```
... Attribute Name="something" ...
```

while some use `FriendlyName` instead of Name. Ugh.


