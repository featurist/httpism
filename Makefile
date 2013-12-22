all: compile test

compile: index.pogo
	./node_modules/.bin/pogo -c index.pogo

test:
	./node_modules/.bin/mocha test/*Spec.pogo

.PHONY: test