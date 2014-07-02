all: compile test

compile: *.pogo
	./node_modules/.bin/pogo -c *.pogo

test:
	./node_modules/.bin/mocha test/*Spec.pogo

examples: example.pogo example.js
	./node_modules/.bin/pogo example.pogo
	node example.js

clean:
	rm *.js

.PHONY: test
