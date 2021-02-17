
# Use `make run` to start localhost web server.

# Input variables
WEB_FILES:=index.html mystyles.css $(notdir $(wildcard src/client/*)) CNAME
DEPENDENCIES:=splide.js splide.min.css fontawesome/fontawesome.js fontawesome/solid.js
WEB_OUTPUT_DIR:=generated/web/
GENERATOR:=src/server/generator.js
HOST:=src/server/host.js
TEMP_DIR:=generated/tmp/
RESOURCES_DIR:=resources/
IMAGES_DIR:=resources/images/
TEMPLATE_DIR:=resources/templates/

# Computed variables
SRC_IMAGES:=$(wildcard $(IMAGES_DIR)*/*.*) $(wildcard $(IMAGES_DIR)*.*)
DEST_IMAGES:=$(subst $(IMAGES_DIR), $(WEB_OUTPUT_DIR), $(SRC_IMAGES))
GENERATED_FILES:=$(addprefix $(WEB_OUTPUT_DIR), $(WEB_FILES) $(DEPENDENCIES)) $(DEST_IMAGES)
GENERATED_HTML_FILES:=$(filter %.html, $(GENERATED_FILES))
TEMPLATES:=$(wildcard $(TEMPLATE_DIR)*.mustache)

# How do we publish?
ifeq ($(OS), Windows_NT)
	PUBLISH_SCRIPT:=powershell.exe publish.ps1
else
	PUBLISH_SCRIPT:=./publish.sh
endif

# Disable all default rules
.SUFFIXES:
MAKEFLAGS+=--no-builtin-rules

# Basic Commands
all: $(GENERATED_FILES)

run: all
	echo $(CURDIR)
	node $(HOST) "$(abspath $(CURDIR))"

clean:
	rm -rf generated

publish: all $(WEB_OUTPUT_DIR)CNAME
	$(PUBLISH_SCRIPT) "$(WEB_OUTPUT_DIR)"

.PHONY: all, run, clean, publish

# Dependency Recipes
$(WEB_OUTPUT_DIR)fontawesome/fontawesome.js:
	@mkdir -p $(dir $@)
	cp node_modules/@fortawesome/fontawesome-free/js/fontawesome.js $@

$(WEB_OUTPUT_DIR)fontawesome/solid.js:
	@mkdir -p $(dir $@)
	cp node_modules/@fortawesome/fontawesome-free/js/solid.js $@

$(WEB_OUTPUT_DIR)splide.js:
	cp node_modules/@splidejs/splide/dist/js/splide.js $@

$(WEB_OUTPUT_DIR)splide.min.css:
	cp node_modules/@splidejs/splide/dist/css/splide.min.css $@


# Generic Recipes
$(GENERATED_HTML_FILES) &: $(TEMPLATES) $(GENERATOR) resources/projects.toml customSpellDictionary.txt
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

$(WEB_OUTPUT_DIR)%.js: src/client/%.js
	cp $^ $@

$(WEB_OUTPUT_DIR)%.png: $(IMAGES_DIR)%.png
	@mkdir -p $(dir $@)
	cp $^ $@

$(WEB_OUTPUT_DIR)%.jpg: $(IMAGES_DIR)%.jpg
	@mkdir -p $(dir $@)
	cp $^ $@

$(WEB_OUTPUT_DIR)%.jpeg: $(IMAGES_DIR)%.jpeg
	@mkdir -p $(dir $@)
	cp $^ $@

# Specific Recipes
$(WEB_OUTPUT_DIR)CNAME: $(RESOURCES_DIR)github_cname.txt
	@mkdir -p $(dir $@)
	cp $^ $@

