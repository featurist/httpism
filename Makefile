index.js: index.pogo
	pogo -c index.pogo

test: .VIRTUAL_TEST

.VIRTUAL_TEST: index.js
	mocha test/*Spec.pogo
