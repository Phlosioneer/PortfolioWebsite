
# Use `make run` to start localhost web server.

# Input variables
WEB_FILES:=index.html mystyles.css
WEB_OUTPUT_DIR:=generated/web/
TEMPLATE_DIR:=resources/templates/
GENERATOR:=src/server/generator.js
HOST:=src/server/host.js
TEMP_DIR:=generated/tmp/

# Computed variables
GENERATED_FILES:=$(addprefix $(WEB_OUTPUT_DIR), $(WEB_FILES))
GENERATED_HTML_FILES:=$(filter %.html, $(GENERATED_FILES))
TEMPLATES:=$(wildcard $(TEMPLATE_DIR)*.mustache)

# Disable all default rules
.SUFFIXES:
MAKEFLAGS+=--no-builtin-rules

all: $(GENERATED_FILES)

run: all
	echo $(CURDIR)
	node $(HOST) "$(abspath $(CURDIR))"

clean:
	rm -rf generated

$(GENERATED_HTML_FILES) &: $(TEMPLATES) $(GENERATOR) resources/projects.toml
	@mkdir -p $(WEB_OUTPUT_DIR)
	node $(GENERATOR) "$(abspath $(TEMPLATE_DIR))" "$(abspath $(WEB_OUTPUT_DIR))"

$(WEB_OUTPUT_DIR)%.css: src/sass/%.scss
	@mkdir -p $(dir $(TEMP_DIR))
	@cp $@ $(TEMP_DIR)$*.css || echo ""
	npx sass $^ $@
	@echo "<old< --- >new>"
	@# "@-diff..." still prints out stuff like "1 error, ignoring". The OR
	@# followed by an empty echo ignores the return value of diff and prints
	@# nothing else. 
	@diff $(TEMP_DIR)$*.css $@ || echo ""

#.PHONY: all, run, clean
