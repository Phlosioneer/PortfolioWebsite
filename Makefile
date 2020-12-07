
# Use `make run` to start localhost web server.

WEB_FILES:=index.html mystyles.css
WEB:=$(addprefix src/web/, $(WEB_FILES))
TEMPLATES:=$(wildcard src/templates/*.mustache)

all: $(WEB)

run: all
	node src/script/host.js

clean:
	rm -rf src/web/*

src/web/index.html: $(TEMPLATES)
	node src/script/generator.js

src/web/%.css: src/sass/%.scss
	npx sass $^ $@

src/web/%.css: src/sass/%.sass
	npx sass $^ $@

.PHONY: all, run, clean
