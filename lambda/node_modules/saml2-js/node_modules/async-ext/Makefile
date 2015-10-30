.PHONY: build test publish

TESTS=$(shell cd test && ls *.coffee | sed s/\.coffee$$//)

build: async-ext.js

async-ext.js: async-ext.coffee
	node_modules/coffee-script/bin/coffee --bare -c async-ext.coffee

test: $(TESTS)

$(TESTS): build
	@echo $(LIBS)
	node_modules/mocha/bin/mocha --bail --timeout 6000 --compilers coffee:coffee-script test/$@.coffee

publish:
	$(eval VERSION := $(shell grep version package.json | sed -ne 's/^[ ]*"version":[ ]*"\([0-9\.]*\)",/\1/p';))
	@echo \'$(VERSION)\'
	$(eval REPLY := $(shell read -p "Publish and tag as $(VERSION)? " -n 1 -r; echo $$REPLY))
	@echo \'$(REPLY)\'
	@if [[ $(REPLY) =~ ^[Yy]$$ ]]; then \
	    npm publish; \
	    git tag -a v$(VERSION) -m "version $(VERSION)"; \
	    git push --tags; \
	fi
