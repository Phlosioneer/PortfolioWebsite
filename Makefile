
# Use `make run` to start localhost web server.

WEB_FILES:=index.html mystyles.css
WEB:=$(addprefix src/web/, $(WEB_FILES))
TEMPLATES:=$(wildcard src/templates/*.mustache)

all: $(WEB)

run: all
	node src/script/host.js

clean:
	rm -rf src/web/*
	rm -rf .tmp/

src/web/index.html: $(TEMPLATES) src/script/generator.js
	node src/script/generator.js

src/web/%.css: src/sass/%.scss
	@mkdir -p $(dir .tmp/$@)
	@cp $@ .tmp/$@
	npx sass $^ $@
	@echo "<old< --- >new>"
	@-diff .tmp/$@ $@

.PHONY: all, run, clean
