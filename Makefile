all: compile test

compile: index.pogo
	./node_modules/.bin/pogo -c index.pogo

test:
	./node_modules/.bin/mocha test/*Spec.pogo

examples: example.pogo example.js
	./node_modules/.bin/pogo example.pogo
	node example.js

.PHONY: test